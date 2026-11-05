import os
from typing import Any

from app.config import settings
from app.core.utils.logging import get_logger

logger = get_logger("integrations.datadog")


def setup_datadog_environment() -> None:
    """Configures Datadog OTLP tracing headers if enabled."""
    if not settings.enable_datadog:
        return

    if settings.dd_api_key:
        otlp_source = os.getenv("DD_OTLP_SOURCE", "llmobs")
        os.environ.setdefault(
            "OTEL_EXPORTER_OTLP_TRACES_HEADERS",
            f"dd-api-key={settings.dd_api_key},dd-otlp-source={otlp_source}",
        )
        logger.info("Configured Datadog OTLP exporter headers")


def enrich_mcp_config(mcp_config: dict[str, Any]) -> dict[str, Any]:
    """Injects authentication headers into the Datadog MCP server definition if enabled."""
    if not settings.enable_datadog or not settings.dd_api_key or not settings.dd_app_key:
        return mcp_config

    cfg = dict(mcp_config)
    dd_server = cfg.get("datadog")
    if dd_server:
        dd_server.setdefault("headers", {})
        dd_server["headers"]["DD_API_KEY"] = settings.dd_api_key
        dd_server["headers"]["DD_APPLICATION_KEY"] = settings.dd_app_key
        logger.info("Injected Datadog credentials into MCP servers configuration")
    return cfg


def is_datadog_alert(event: dict, message_text: str) -> bool:
    """Checks if a Slack event originated from a Datadog monitor."""
    if not settings.enable_datadog:
        return False

    bot_id = event.get("bot_id")
    if bot_id and bot_id in settings.datadog_bot_ids:
        return True

    username = (event.get("username") or "").lower()
    profile_name = ((event.get("bot_profile") or {}).get("name") or "").lower()
    text_lower = message_text.lower()

    return "datadog" in username or "datadog" in profile_name or "datadog" in text_lower
