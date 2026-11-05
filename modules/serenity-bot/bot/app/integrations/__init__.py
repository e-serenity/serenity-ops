from typing import Any

from app.core.utils.logging import get_logger
from app.integrations.alert_detector import (
    ParsedAlert,
    extract_slack_event_content,
    is_inbound_alert,
    parse_inbound_alert,
)
from app.integrations.context_hub import (
    get_known_service_names,
    load_context_tools,
    lookup_workload_architecture,
)
from app.integrations.aws import load_aws_tools
from app.integrations.datadog import enrich_mcp_config, setup_datadog_environment
from app.integrations.github import load_github_tools
from app.integrations.gitlab import load_gitlab_tools
from app.integrations.grafana import load_grafana_tools

logger = get_logger("integrations")


def load_all_integration_tools() -> list[Any]:
    """Dynamically loads and combines all enabled integration toolsets (AWS, GitLab, GitHub, Grafana, Workload Context)."""
    tools: list[Any] = []

    aws_tools = load_aws_tools()
    tools.extend(aws_tools)

    gitlab_tools = load_gitlab_tools()
    tools.extend(gitlab_tools)

    github_tools = load_github_tools()
    tools.extend(github_tools)

    grafana_tools = load_grafana_tools()
    tools.extend(grafana_tools)

    context_tools = load_context_tools()
    tools.extend(context_tools)

    logger.info(
        "Active integration tools: %d (AWS: %d, GitLab: %d, GitHub: %d, Grafana: %d, Context: %d)",
        len(tools),
        len(aws_tools),
        len(gitlab_tools),
        len(github_tools),
        len(grafana_tools),
        len(context_tools),
    )
    return tools


__all__ = [
    "ParsedAlert",
    "extract_slack_event_content",
    "get_known_service_names",
    "is_inbound_alert",
    "load_all_integration_tools",
    "load_aws_tools",
    "load_context_tools",
    "load_github_tools",
    "load_gitlab_tools",
    "load_grafana_tools",
    "lookup_workload_architecture",
    "parse_inbound_alert",
    "setup_datadog_environment",
    "enrich_mcp_config",
]
