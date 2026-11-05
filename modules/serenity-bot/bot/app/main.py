import asyncio
import threading
import time
from typing import Any

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
import uvicorn

from app.config import settings
from app.core import confirmations, hub
from app.core.utils.logging import get_logger, log_message, setup_logging
from app.integrations import (
    extract_slack_event_content,
    get_known_service_names,
    parse_inbound_alert,
)
from app.integrations.datadog import setup_datadog_environment
from app.llm.orchestrator import process_investigation

# Initialize structured JSON logging across the service
setup_logging(level=settings.log_level)

# Ensure tracing headers are ready prior to runtime instrumentation
setup_datadog_environment()

logger = get_logger("main")
slack_app = App(token=settings.slack_bot_token)
health_app = FastAPI(title="Serenity-Ops Health Service")
socket_handler: SocketModeHandler | None = None

MAX_SLACK_TEXT_SIZE = 39_000


def _update_slack_message(client, channel: str, message_ts: str, text: str) -> None:
    client.chat_update(
        channel=channel,
        ts=message_ts,
        text=text,
        blocks=[{"type": "section", "text": {"type": "mrkdwn", "text": text[:2900]}}],
    )


def _execute_agent_workflow(query_text: str, channel: str, thread_ts: str, client) -> None:
    with confirmations._PENDING_LOCK:
        baseline_action_ids = set(confirmations._PENDING.keys())

    try:
        outcome = asyncio.run(process_investigation(query_text))
    except Exception as exc:
        logger.exception("Investigation processing encountered an error")
        outcome = f":rotating_light: *Erreur :* L'investigation n'a pas pu aboutir. `{exc}`"

    if len(outcome) > MAX_SLACK_TEXT_SIZE:
        outcome = outcome[:MAX_SLACK_TEXT_SIZE] + "\n[... réponse tronquée]"

    try:
        client.chat_postMessage(channel=channel, thread_ts=thread_ts, text=outcome)

        # Post approval cards for newly registered pending actions
        with confirmations._PENDING_LOCK:
            fresh_actions = [
                act for aid, act in confirmations._PENDING.items()
                if aid not in baseline_action_ids and time.time() - act["created_at"] < 60
            ]

        for action_data in fresh_actions:
            detail_summary = (
                f"• Agent : `{action_data['agent']}`\n"
                f"• Action : `{action_data['action']}`\n"
                f"• Cible : `{action_data['target']}`\n"
                f"• Description : {action_data['details']}"
            )
            ui_blocks = confirmations.create_slack_approval_blocks(
                action_id=action_data["action_id"],
                summary=detail_summary,
                incident_id=action_data.get("incident_id"),
            )
            client.chat_postMessage(
                channel=channel,
                thread_ts=thread_ts,
                blocks=ui_blocks,
                text="Infrastructure action submitted for human approval",
            )

    except Exception:
        logger.exception("Failed to deliver investigation results to Slack thread")


def _gather_thread_context(event: dict[str, Any], client) -> str:
    original_input = event.get("text") or ""
    thread_ts = event.get("thread_ts")
    if not thread_ts:
        return original_input

    try:
        feed = client.conversations_replies(channel=event["channel"], ts=thread_ts, limit=25)
        raw_msgs = feed.get("messages") or []
    except Exception:
        logger.warning("Unable to fetch conversation history for thread %s", thread_ts, exc_info=True)
        return original_input

    context_lines: list[str] = []
    current_ts = event.get("ts")
    for msg in raw_msgs:
        if msg.get("ts") == current_ts:
            continue
        msg_body = extract_slack_event_content(msg)
        if not msg_body:
            continue
        role_label = "assistant" if msg.get("bot_id") else f"user <@{msg.get('user', 'operator')}>"
        context_lines.append(f"[{role_label}] {msg_body}")

    if not context_lines:
        return original_input

    return (
        "Slack thread conversation history:\n"
        + "\n---\n".join(context_lines)
        + f"\n\nNew user query:\n{original_input}"
    )


@slack_app.event("message")
def on_slack_message(event, client, ack):
    ack()

    # Handle 1-on-1 Direct Messages (DM) from human users
    if event.get("channel_type") == "im" and not event.get("bot_id") and not event.get("subtype"):
        logger.info("Processing 1-on-1 Direct Message from user %s in channel %s", event.get("user"), event.get("channel"))
        channel = event["channel"]
        thread_ts = event.get("thread_ts") or event["ts"]
        user_prompt = _gather_thread_context(event, client)

        client.chat_postMessage(
            channel=channel,
            thread_ts=thread_ts,
            text=":mag: *Serenity-Ops* is processing your request…",
        )

        threading.Thread(
            target=_execute_agent_workflow,
            args=(user_prompt, channel, thread_ts, client),
            daemon=True,
            name=f"im-handler-{thread_ts}",
        ).start()
        return

    known_services = get_known_service_names()
    parsed_alert = parse_inbound_alert(event, known_services=known_services)
    if not parsed_alert:
        return

    channel = event["channel"]
    thread_ts = event.get("thread_ts") or event["ts"]

    log_message(
        "Monitoring alert intercepted",
        extra={
            "source": parsed_alert.source,
            "severity": parsed_alert.severity,
            "service": parsed_alert.service,
            "title": parsed_alert.title,
            "channel": channel,
            "thread": thread_ts,
        },
    )
    source_label = parsed_alert.source.replace("_", " ").upper()
    svc_annotation = f" for service *{parsed_alert.service}*" if parsed_alert.service else ""
    client.chat_postMessage(
        channel=channel,
        thread_ts=thread_ts,
        text=f":mag: *Serenity-Ops* is investigating this alert ({source_label}){svc_annotation}…",
    )

    investigation_payload = (
        f"[INCIDENT ALERT]\n"
        f"Source: {source_label}\n"
        f"Severity: {parsed_alert.severity}\n"
        f"Target Service: {parsed_alert.service or 'Auto-detecting from architecture context'}\n"
        f"Alert Title: {parsed_alert.title}\n\n"
        f"Raw Alert Details:\n{parsed_alert.full_text}"
    )

    threading.Thread(
        target=_execute_agent_workflow,
        args=(investigation_payload, channel, thread_ts, client),
        daemon=True,
        name=f"alert-investigation-{thread_ts}",
    ).start()


@slack_app.event("app_mention")
def on_slack_mention(event, client, ack):
    ack()
    enriched_prompt = _gather_thread_context(event, client)
    channel = event["channel"]
    thread_ts = event.get("thread_ts") or event["ts"]

    client.chat_postMessage(
        channel=channel,
        thread_ts=thread_ts,
        text=":mag: *Serenity-Ops* is processing your request…",
    )

    threading.Thread(
        target=_execute_agent_workflow,
        args=(enriched_prompt, channel, thread_ts, client),
        daemon=True,
        name=f"mention-handler-{thread_ts}",
    ).start()


@slack_app.action("serenity_confirm")
def on_action_confirmed(ack, body, client):
    ack()
    action_key = body["actions"][0]["value"]
    pending_record = confirmations.pop_pending(action_key)
    operator = body["user"]["id"]

    if not pending_record:
        _update_slack_message(
            client,
            channel=body["channel"]["id"],
            message_ts=body["message"]["ts"],
            text=":hourglass: This action has expired or was already processed.",
        )
        return

    logger.info("Human confirmed action %s by operator <@%s>", action_key, operator)
    try:
        cmd_result = confirmations.execute_pending(pending_record, approved_by=f"<@{operator}>")
        msg = (
            f":white_check_mark: *Action approved and executed successfully (by <@{operator}>)*\n"
            f"• Agent: `{pending_record['agent']}`\n"
            f"• Target: `{pending_record['target']}`\n"
            f"```{cmd_result}```"
        )
        _update_slack_message(client, body["channel"]["id"], body["message"]["ts"], msg)
    except Exception as exc:
        logger.error("Execution failed for action %s: %s", action_key, exc)
        _update_slack_message(
            client,
            body["channel"]["id"],
            body["message"]["ts"],
            f":x: *Failed to execute action approved by <@{operator}>*\n```{exc}```",
        )


@slack_app.action("serenity_cancel")
def on_action_cancelled(ack, body, client):
    ack()
    action_key = body["actions"][0]["value"]
    pending_record = confirmations.pop_pending(action_key)
    operator = body["user"]["id"]

    if pending_record:
        confirmations.cancel_pending(pending_record, rejected_by=f"<@{operator}>")

    _update_slack_message(
        client,
        body["channel"]["id"],
        body["message"]["ts"],
        f":no_entry_sign: *Action cancelled by <@{operator}> — no resources modified.*",
    )


@health_app.get("/health")
def api_health():
    is_connected = False
    if socket_handler and getattr(socket_handler, "client", None):
        try:
            is_connected = socket_handler.client.is_connected()
        except Exception:
            pass

    active_items = hub.get_active_modules()
    return JSONResponse(
        content={
            "status": "healthy" if is_connected else "degraded",
            "orchestrator": "serenity-ops",
            "slack_connected": is_connected,
            "registered_modules": [m["id"] for m in active_items],
        },
        status_code=200 if is_connected else 503,
    )


def start() -> None:
    global socket_handler
    threading.Thread(
        target=lambda: uvicorn.run(health_app, host="127.0.0.1", port=settings.health_port, log_level="warning"),
        daemon=True,
        name="health-server",
    ).start()

    logger.info("Initializing Serenity-Ops Slack Socket Mode listener...")
    socket_handler = SocketModeHandler(slack_app, settings.slack_app_token)
    socket_handler.start()


if __name__ == "__main__":
    start()
