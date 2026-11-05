from typing import Any
from langchain_core.tools import tool

from app.config import settings
from app.core.utils.logging import get_logger

logger = get_logger("integrations.context_hub")


def get_known_service_names() -> list[str]:
    """Returns the list of registered service names from application_context."""
    ctx = settings.application_context
    if not isinstance(ctx, dict):
        return []
    services = ctx.get("services") or []
    names: list[str] = []
    if isinstance(services, list):
        for svc in services:
            if isinstance(svc, dict) and (name := svc.get("name")):
                names.append(str(name).strip())
    return names


@tool
def lookup_workload_architecture(service_or_keyword: str = "") -> str:
    """Inspects target application architecture, service metadata, tech stacks, repositories, and runbooks.

    Use this tool to find which service handles a capability, what its CloudWatch log group is,
    which Git repository holds its source code, or what runbook procedure to follow during incidents.
    """
    ctx = settings.application_context
    if not isinstance(ctx, dict) or not ctx:
        return "No application context has been configured in APPLICATION_CONTEXT."

    query = (service_or_keyword or "").strip().lower()

    services = ctx.get("services") or []
    runbooks = ctx.get("runbooks") or {}

    if not query:
        # Return complete overview
        summary_lines = []
        if org := ctx.get("organization_name"):
            summary_lines.append(f"Organization: {org}")
        if domain := ctx.get("business_domain"):
            summary_lines.append(f"Business Domain: {domain}")
        if summary := ctx.get("architecture_summary"):
            summary_lines.append(f"Summary: {summary}")

        svc_names = [s.get("name", "unnamed") for s in services if isinstance(s, dict)]
        summary_lines.append(f"Registered Services ({len(svc_names)}): {', '.join(svc_names)}")
        summary_lines.append(f"Runbooks ({len(runbooks)}): {', '.join(runbooks.keys())}")
        return "\n".join(summary_lines)

    # Filter matching service
    matched_services: list[dict[str, Any]] = []
    for svc in services:
        if not isinstance(svc, dict):
            continue
        svc_name = str(svc.get("name", "")).lower()
        desc = str(svc.get("description", "")).lower()
        repo = str(svc.get("repository", "")).lower()
        stack = str(svc.get("tech_stack", "")).lower()
        log_grp = str(svc.get("log_group", "")).lower()

        if (
            query in svc_name
            or query in desc
            or query in repo
            or query in stack
            or query in log_grp
        ):
            matched_services.append(svc)

    # Filter matching runbooks
    matched_runbooks: dict[str, str] = {}
    for topic, url in runbooks.items():
        if query in topic.lower() or query in str(url).lower():
            matched_runbooks[topic] = str(url)

    if not matched_services and not matched_runbooks:
        return f"No services or runbooks matched keyword '{service_or_keyword}'. Available services: {get_known_service_names()}"

    output_lines: list[str] = []
    if matched_services:
        output_lines.append(f"=== Matched Services ({len(matched_services)}) ===")
        for s in matched_services:
            output_lines.append(f"- Name: {s.get('name')}")
            output_lines.append(f"  Criticality: {s.get('criticality', 'MEDIUM')}")
            output_lines.append(f"  Description: {s.get('description', 'N/A')}")
            output_lines.append(f"  Tech Stack: {s.get('tech_stack', 'N/A')}")
            output_lines.append(f"  Repository: {s.get('repository', 'N/A')}")
            output_lines.append(f"  Log Group: {s.get('log_group', 'N/A')}")

    if matched_runbooks:
        output_lines.append("\n=== Matched Runbooks ===")
        for topic, url in matched_runbooks.items():
            output_lines.append(f"- {topic}: {url}")

    return "\n".join(output_lines)


def load_context_tools() -> list[Any]:
    """Returns application context inspection tools if context is populated."""
    if settings.application_context:
        return [lookup_workload_architecture]
    return []
