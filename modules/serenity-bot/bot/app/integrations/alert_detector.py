from dataclasses import dataclass
import re
from typing import Any

from app.integrations.datadog import is_datadog_alert

RECOVERY_KEYWORDS = (
    "recovered:", "fixed:", "ok:", "resolved:", "[ok]", "status: ok",
    "statechange: ok", "state: ok", "healthy"
)

ALERT_KEYWORDS = (
    "warn:", "warning:", "triggered:", "[triggered]", "critical:", "alert:", "alarm:",
    "[alarm]", "firing:", "[firing]", "[firing:", "status: firing", "statechange: alarm",
    "fatal:", "incident:", ":rotating_light:", ":warning:", ":fire:"
)


@dataclass
class ParsedAlert:
    """Structured representation of an intercepted monitoring alert."""
    is_alert: bool
    source: str  # "aws_cloudwatch", "datadog", "grafana_alertmanager", "generic"
    severity: str  # "CRITICAL", "HIGH", "WARN", "INFO"
    title: str
    full_text: str
    service: str | None = None
    environment: str | None = None


def extract_slack_event_content(event: dict[str, Any]) -> str:
    """Extracts all readable text content from a Slack event payload, traversing blocks and attachments."""
    fragments: list[str] = []

    if raw_text := event.get("text"):
        fragments.append(raw_text)

    for item in event.get("attachments") or []:
        for field in ("title", "pretext", "text", "fallback", "footer"):
            if val := item.get(field):
                fragments.append(str(val))
        for custom_field in item.get("fields") or []:
            for key in ("title", "value"):
                if val := custom_field.get(key):
                    fragments.append(str(val))

    def _traverse_blocks(blocks: list[Any]) -> None:
        for blk in blocks:
            if not isinstance(blk, dict):
                continue
            if txt_obj := blk.get("text"):
                if isinstance(txt_obj, dict) and txt_obj.get("text"):
                    fragments.append(txt_obj["text"])
                elif isinstance(txt_obj, str):
                    fragments.append(txt_obj)
            for sub_key in ("elements", "fields", "blocks"):
                if nested := blk.get(sub_key):
                    if isinstance(nested, list):
                        _traverse_blocks(nested)

    _traverse_blocks(event.get("blocks") or [])
    for item in event.get("attachments") or []:
        _traverse_blocks(item.get("blocks") or [])

    seen: set[str] = set()
    deduped = [f for f in fragments if f and not (f in seen or seen.add(f))]
    return "\n".join(deduped)


def is_cloudwatch_alert(event: dict[str, Any], text_lower: str) -> bool:
    """Detects if an event originates from AWS CloudWatch, SNS, or AWS Chatbot."""
    username = (event.get("username") or "").lower()
    return (
        "aws" in username
        or "cloudwatch" in text_lower
        or "alarm" in text_lower
        or "aws/ecs" in text_lower
        or "aws/apigateway" in text_lower
        or "aws/dynamodb" in text_lower
        or "statechange: alarm" in text_lower
    )


def is_grafana_alert(event: dict[str, Any], text_lower: str) -> bool:
    """Detects if an event originates from Grafana or Prometheus Alertmanager."""
    username = (event.get("username") or "").lower()
    return (
        "grafana" in username
        or "alertmanager" in text_lower
        or "prom" in username
        or "[firing" in text_lower
        or "generatorurl:" in text_lower
    )


def _detect_severity(text_lower: str) -> str:
    """Infers severity level from alert keywords."""
    if any(k in text_lower for k in ("critical", "fatal", "sev-1", "p1", ":rotating_light:", "high-error")):
        return "CRITICAL"
    if any(k in text_lower for k in ("alarm:", "[alarm]", "triggered:", "sev-2", "p2")):
        return "HIGH"
    if any(k in text_lower for k in ("warn:", "warning:", "sev-3", "p3", ":warning:")):
        return "WARN"
    return "INFO"


def _extract_title(full_text: str) -> str:
    """Extracts a succinct title from the first meaningful line."""
    for line in full_text.splitlines():
        cleaned = line.strip()
        if cleaned and not cleaned.startswith(("{", "[", "http", "```")):
            return cleaned[:120]
    return "Infrastructure Alert"


def parse_inbound_alert(
    event: dict[str, Any], known_services: list[str] | None = None
) -> ParsedAlert | None:
    """Analyzes a Slack event and returns a structured ParsedAlert if actionable, or None if skipped.

    Optionally matches alert text against known registered services from application_context.
    """
    subtype = event.get("subtype")
    bot_id = event.get("bot_id")

    # Only process bot messages or external webhooks
    if subtype != "bot_message" and not (subtype is None and bot_id):
        return None

    full_text = extract_slack_event_content(event)
    text_lower = full_text.lower()

    # Prevent bot from responding to its own diagnostic outputs or acknowledgement messages
    if "serenity-ops" in text_lower and (
        "is investigating" in text_lower
        or "is processing your request" in text_lower
        or "initiating automated investigation" in text_lower
        or "lance une enquête" in text_lower
        or "prend en charge" in text_lower
        or "diagnostic" in text_lower
    ):
        return None

    # Skip recovery notifications
    if any(k in text_lower for k in RECOVERY_KEYWORDS):
        return None

    # Check alert status keywords
    has_alert_indicator = any(k in text_lower for k in ALERT_KEYWORDS)
    if not has_alert_indicator:
        return None

    # Classify origin source
    if is_cloudwatch_alert(event, text_lower):
        source = "aws_cloudwatch"
    elif is_datadog_alert(event, text_lower):
        source = "datadog"
    elif is_grafana_alert(event, text_lower):
        source = "grafana_alertmanager"
    else:
        source = "generic"

    severity = _detect_severity(text_lower)
    title = _extract_title(full_text)

    # Extract optional service or environment if tagged (e.g. env:prod, service:auth)
    env_match = re.search(r"\b(?:env|environment)[:=]\s*([a-zA-Z0-9_-]+)", text_lower)
    service_match = re.search(r"\b(?:service|app|application)[:=]\s*([a-zA-Z0-9_-]+)", text_lower)

    detected_service: str | None = service_match.group(1) if service_match else None
    if not detected_service and known_services:
        for candidate in known_services:
            if not candidate:
                continue
            pattern = rf"\b{re.escape(candidate.lower())}\b"
            if re.search(pattern, text_lower):
                detected_service = candidate
                break

    return ParsedAlert(
        is_alert=True,
        source=source,
        severity=severity,
        title=title,
        full_text=full_text,
        service=detected_service,
        environment=env_match.group(1) if env_match else None,
    )


def is_inbound_alert(event: dict[str, Any], known_services: list[str] | None = None) -> bool:
    """Boolean compatibility wrapper around parse_inbound_alert."""
    return parse_inbound_alert(event, known_services=known_services) is not None
