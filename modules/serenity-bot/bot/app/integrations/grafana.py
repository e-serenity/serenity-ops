import functools
from typing import Any
from langchain_core.tools import tool
import requests

from app.config import settings
from app.core.utils.logging import get_logger

logger = get_logger("integrations.grafana")
MAX_PAYLOAD_SIZE = 35_000


def _get_headers() -> dict[str, str]:
    headers = {
        "Accept": "application/json",
        "User-Agent": "serenity-ops-bot",
    }
    if settings.grafana_token:
        headers["Authorization"] = f"Bearer {settings.grafana_token}"
    return headers


def _safe_wrapper(fn):
    @functools.wraps(fn)
    def inner(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:
            logger.warning("Grafana action '%s' failed: %s", fn.__name__, exc)
            return f"[Tool Error] {fn.__name__}: {exc}"
    return inner


@tool
@_safe_wrapper
def grafana_list_alerts() -> str:
    """Query currently configured or firing alert rules from Grafana.

    Useful during root-cause analysis to correlate firing alerts with infrastructure anomalies.
    """
    if not settings.grafana_url:
        return "Grafana URL is not configured."

    url = f"{settings.grafana_url}/api/v1/provisioning/alert-rules"
    resp = requests.get(url, headers=_get_headers(), timeout=10)

    # Fallback to legacy alerts API if provisioning API is not available
    if resp.status_code == 404:
        url = f"{settings.grafana_url}/api/alerts"
        resp = requests.get(url, headers=_get_headers(), timeout=10)

    resp.raise_for_status()
    data = resp.json()

    if not data:
        return "No alert rules returned from Grafana."

    lines: list[str] = []
    if isinstance(data, list):
        for item in data[:20]:
            title = item.get("title") or item.get("name", "Unnamed Alert")
            state = item.get("state") or (item.get("condition") and "CONFIGURED") or "UNKNOWN"
            folder = item.get("folderTitle") or item.get("folderUID", "Default")
            lines.append(f"• [{state}] {title} (Folder: {folder})")
    elif isinstance(data, dict):
        lines.append(str(data)[:1000])

    return "\n".join(lines) if lines else "No alert rules found in Grafana response."


@tool
@_safe_wrapper
def grafana_query_metric(query: str, datasource_uid: str | None = None) -> str:
    """Query Prometheus or Loki metrics through the Grafana DataSource proxy API.

    Args:
        query: PromQL or LogQL query string (e.g. 'rate(http_requests_total[5m])').
        datasource_uid: Optional UID of the Prometheus datasource in Grafana.
    """
    if not settings.grafana_url:
        return "Grafana URL is not configured."

    url = f"{settings.grafana_url}/api/ds/query"
    payload: dict[str, Any] = {
        "queries": [
            {
                "expr": query,
                "refId": "A",
                "format": "time_series",
                "instant": True,
            }
        ]
    }
    if datasource_uid:
        payload["queries"][0]["datasource"] = {"uid": datasource_uid}

    resp = requests.post(url, headers=_get_headers(), json=payload, timeout=12)
    resp.raise_for_status()

    content = resp.text
    if len(content) > MAX_PAYLOAD_SIZE:
        return content[:MAX_PAYLOAD_SIZE] + f"\n... [truncated at {MAX_PAYLOAD_SIZE} chars]"
    return content


def load_grafana_tools() -> list[Any]:
    """Returns Grafana correlation tools if integration is active and URL is configured."""
    if not settings.enable_grafana or not settings.grafana_url:
        logger.info(
            "Grafana integration inactive (enable_grafana=%s, url_set=%s)",
            settings.enable_grafana,
            bool(settings.grafana_url),
        )
        return []

    logger.info("Grafana integration active: loading metrics and alert investigation tools")
    return [
        grafana_list_alerts,
        grafana_query_metric,
    ]
