"""Generic Human-in-the-Loop Confirmation Manager for Serenity-Ops.

Any mutating action proposed by an agent (CloudWatch, SES, etc.) is registered
here and posted to Slack with interactive confirmation buttons.
When an operator approves (via Slack or Web UI), the callback is triggered
using the scoped IAM role credentials.
"""

import logging
import threading
import time
import uuid
from typing import Any, Callable

from app.core import hub

logger = logging.getLogger("serenity-ops.confirmations")

# Pending actions awaiting human confirmation.
# {action_id: {"agent", "action", "target", "details", "callback", "incident_id", "created_at"}}
_PENDING: dict[str, dict[str, Any]] = {}
_PENDING_LOCK = threading.Lock()
_PENDING_TTL_SECONDS = 3600  # 1 hour expiration


def register_pending(
    agent_name: str,
    action_name: str,
    target: str,
    details: str,
    callback: Callable[[], str],
    incident_id: str | None = None,
) -> str:
    """Registers a pending action and returns its unique action_id."""
    action_id = str(uuid.uuid4())
    now = time.time()

    with _PENDING_LOCK:
        # Purge expired actions
        expired = [aid for aid, act in _PENDING.items() if now - act["created_at"] > _PENDING_TTL_SECONDS]
        for aid in expired:
            _PENDING.pop(aid, None)

        _PENDING[action_id] = {
            "action_id": action_id,
            "agent": agent_name,
            "action": action_name,
            "target": target,
            "details": details,
            "callback": callback,
            "incident_id": incident_id,
            "created_at": now,
        }

    logger.info("Registered pending action [%s] for %s (%s on %s)", action_id, agent_name, action_name, target)
    return action_id


def pop_pending(action_id: str) -> dict[str, Any] | None:
    """Atomically retrieves and removes a pending action."""
    with _PENDING_LOCK:
        action = _PENDING.pop(action_id, None)

    if not action:
        return None

    if time.time() - action["created_at"] > _PENDING_TTL_SECONDS:
        logger.warning("Pending action %s expired", action_id)
        return None

    return action


def execute_pending(action: dict[str, Any], approved_by: str = "operator") -> str:
    """Executes the action callback and updates DynamoDB Hub."""
    callback = action["callback"]
    incident_id = action.get("incident_id")

    try:
        result = callback()
        if incident_id:
            hub.update_incident_status(
                incident_id=incident_id,
                status="APPROVED",
                executed_by=approved_by,
                execution_result=result
            )
        logger.info("Action %s executed successfully by %s", action["action_id"], approved_by)
        return result
    except Exception as exc:
        logger.error("Execution failed for action %s: %s", action["action_id"], exc, exc_info=True)
        if incident_id:
            hub.update_incident_status(
                incident_id=incident_id,
                status="FAILED",
                executed_by=approved_by,
                execution_result=str(exc)
            )
        raise


def cancel_pending(action: dict[str, Any], rejected_by: str = "operator") -> None:
    """Cancels a pending action and updates DynamoDB Hub."""
    incident_id = action.get("incident_id")
    if incident_id:
        hub.update_incident_status(
            incident_id=incident_id,
            status="REJECTED",
            executed_by=rejected_by
        )
    logger.info("Action %s rejected by %s", action["action_id"], rejected_by)


def create_slack_approval_blocks(action_id: str, summary: str, incident_id: str | None = None) -> list[dict]:
    """Generates Slack Block Kit interactive blocks with Approve & Reject buttons."""
    blocks = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f":warning: *Modifying action pending human approval (Human-in-the-Loop)*\n"
                    f"{summary}"
                ),
            },
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "✅ Approve Execution", "emoji": True},
                    "style": "primary",
                    "action_id": "serenity_confirm",
                    "value": action_id,
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "❌ Reject", "emoji": True},
                    "style": "danger",
                    "action_id": "serenity_cancel",
                    "value": action_id,
                },
            ],
        },
    ]

    if incident_id:
        blocks.append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"Incident Hub: `{incident_id}` • Reviewable and approvable from the Web Dashboard",
                }
            ],
        })

    return blocks
