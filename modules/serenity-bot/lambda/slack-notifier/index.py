"""AWS Lambda function forwarding Serenity-Ops platform CloudWatch alarms to Slack.

Subscribed to the platform SNS topic. When a CloudWatch alarm enters ALARM state,
it formats the payload and posts it to the designated Slack channel using SLACK_BOT_TOKEN
stored in AWS Secrets Manager.
"""

import json
import logging
import os
import urllib.error
import urllib.request
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

SECRETS_ARN = os.environ.get("SECRETS_ARN", "")
SLACK_CHANNEL = os.environ.get("SLACK_CHANNEL", "")
AWS_REGION = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "eu-west-3"))

_cached_slack_token = None


def get_slack_bot_token() -> str | None:
    global _cached_slack_token
    if _cached_slack_token:
        return _cached_slack_token

    if not SECRETS_ARN:
        logger.warning("SECRETS_ARN environment variable is not defined.")
        return None

    try:
        client = boto3.client("secretsmanager", region_name=AWS_REGION)
        resp = client.get_secret_value(SecretId=SECRETS_ARN)
        secret_data = json.loads(resp.get("SecretString", "{}"))
        token = secret_data.get("SLACK_BOT_TOKEN", "").strip()
        if token and token != "to-fill-manually":
            _cached_slack_token = token
            return _cached_slack_token
        logger.warning("SLACK_BOT_TOKEN in Secrets Manager is empty or placeholder ('to-fill-manually').")
        return None
    except Exception as exc:
        logger.error("Failed to retrieve SLACK_BOT_TOKEN from Secrets Manager: %s", exc)
        return None


def handler(event, context):
    logger.info("Received event: %s", json.dumps(event))

    if not SLACK_CHANNEL:
        logger.warning("SLACK_CHANNEL is not configured, skipping notification.")
        return {"status": "skipped", "reason": "missing_channel"}

    slack_token = get_slack_bot_token()
    if not slack_token:
        logger.warning("Valid SLACK_BOT_TOKEN not found, skipping Slack delivery.")
        return {"status": "skipped", "reason": "missing_token"}

    for record in event.get("Records", []):
        sns_data = record.get("Sns", {})
        subject = sns_data.get("Subject", "CloudWatch Alarm Notification")
        raw_msg = sns_data.get("Message", "")

        try:
            alarm_data = json.loads(raw_msg)
        except Exception:
            alarm_data = {"AlarmName": subject, "NewStateReason": raw_msg}

        alarm_name = alarm_data.get("AlarmName", subject)
        new_state = alarm_data.get("NewStateValue", "ALARM")
        old_state = alarm_data.get("OldStateValue", "OK")
        reason = alarm_data.get("NewStateReason", "")
        desc = alarm_data.get("AlarmDescription", "")
        trigger = alarm_data.get("Trigger", {})
        metric_name = trigger.get("MetricName", "")
        namespace = trigger.get("Namespace", "")
        timestamp = alarm_data.get("StateChangeTime", sns_data.get("Timestamp", ""))

        is_alarm = new_state == "ALARM"
        emoji = ":rotating_light:" if is_alarm else (":white_check_mark:" if new_state == "OK" else ":warning:")

        # The message includes "alarm:" and "CloudWatch" so serenity-bot's alert detector recognizes it
        header_text = f"{emoji} *alarm: [{new_state}] CloudWatch Alarm firing on Serenity-Ops Platform*"
        fields = [
            {"type": "mrkdwn", "text": f"*Alarm Name:*\n`{alarm_name}`"},
            {"type": "mrkdwn", "text": f"*State Transition:*\n`{old_state}` ➔ *{new_state}*"},
        ]
        if metric_name and namespace:
            fields.append({"type": "mrkdwn", "text": f"*Metric:*\n`{namespace}/{metric_name}`"})
        if timestamp:
            fields.append({"type": "mrkdwn", "text": f"*Timestamp:*\n{timestamp}"})

        blocks = [
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": header_text},
            },
            {
                "type": "section",
                "fields": fields,
            },
        ]

        if desc:
            blocks.append({
                "type": "context",
                "elements": [{"type": "mrkdwn", "text": f"ℹ️ *Description:* {desc}"}],
            })

        if reason:
            blocks.append({
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"*Reason:*\n```{reason[:1200]}```"},
            })

        payload = {
            "channel": SLACK_CHANNEL,
            "text": f"{emoji} alarm: [{new_state}] {alarm_name} — {reason[:200]}",
            "blocks": blocks,
        }

        req = urllib.request.Request(
            "https://slack.com/api/chat.postMessage",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": f"Bearer {slack_token}",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                resp_json = json.loads(resp.read().decode("utf-8"))
                if not resp_json.get("ok"):
                    logger.error("Slack chat.postMessage failed: %s", resp_json)
                else:
                    logger.info("Successfully delivered alarm '%s' to Slack channel '%s'", alarm_name, SLACK_CHANNEL)
        except urllib.error.URLError as err:
            logger.error("HTTP request to Slack failed: %s", err)

    return {"status": "ok"}
