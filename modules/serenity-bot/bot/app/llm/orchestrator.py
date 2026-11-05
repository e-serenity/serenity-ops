from typing import Any

from langchain_aws import ChatBedrock
from langchain_core.rate_limiters import InMemoryRateLimiter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent

from app.config import settings
from app.core import subagents
from app.core.utils.logging import get_logger
from app.integrations import enrich_mcp_config, load_all_integration_tools

logger = get_logger("orchestrator")


def _unwrap_exception(exc: BaseException) -> str:
    if isinstance(exc, BaseExceptionGroup):
        return " | ".join(_unwrap_exception(sub) for sub in exc.exceptions)
    return f"{type(exc).__name__}: {exc}"


def _sanitize_toolset(tools: list[Any]) -> list[Any]:
    for tool in tools:
        raw_coroutine = tool.coroutine
        if raw_coroutine is None:
            continue

        async def wrapped_coroutine(*args, _target=raw_coroutine, _name=tool.name, _t=tool, **kwargs):
            try:
                return await _target(*args, **kwargs)
            except Exception as err:
                detail = _unwrap_exception(err)
                logger.warning("Tool execution '%s' failed non-fatally: %s", _name, detail)
                msg = f"Tool '{_name}' error: {detail}. Continue investigation with alternative evidence."
                if getattr(_t, "response_format", None) == "content_and_artifact":
                    return (msg, None)
                return msg

        tool.coroutine = wrapped_coroutine
    return tools


def _extract_text_blocks(raw_content: Any) -> str:
    if isinstance(raw_content, str):
        return raw_content
    if isinstance(raw_content, list):
        accumulated: list[str] = []
        for blk in raw_content:
            if isinstance(blk, dict) and blk.get("type") == "text":
                accumulated.append(blk.get("text", ""))
            elif hasattr(blk, "type") and blk.type == "text":
                accumulated.append(getattr(blk, "text", ""))
            elif isinstance(blk, str):
                accumulated.append(blk)
        return "".join(accumulated).strip()
    return str(raw_content)


def format_application_context(context: dict[str, Any]) -> str:
    """Formats custom user application and workload context into markdown for the prompt."""
    if not context or not isinstance(context, dict):
        return ""

    sections: list[str] = []
    org = context.get("organization_name")
    domain = context.get("business_domain")
    summary = context.get("architecture_summary")

    if org or domain or summary:
        overview_lines = []
        if org:
            overview_lines.append(f"- **Organization**: {org}")
        if domain:
            overview_lines.append(f"- **Business Domain**: {domain}")
        if summary:
            overview_lines.append(f"- **Summary**: {summary}")
        sections.append("## Business & System Overview:\n" + "\n".join(overview_lines))

    services = context.get("services") or []
    if isinstance(services, list) and services:
        svc_lines = ["## Registered Services & Workloads:"]
        for svc in services:
            if not isinstance(svc, dict):
                continue
            name = svc.get("name", "unnamed")
            crit = svc.get("criticality", "MEDIUM")
            svc_lines.append(f"- **`{name}`** (Criticality: {crit})")
            if desc := svc.get("description"):
                svc_lines.append(f"  • Role: {desc}")
            if stack := svc.get("tech_stack"):
                svc_lines.append(f"  • Tech Stack: {stack}")
            if repo := svc.get("repository"):
                svc_lines.append(f"  • Repository: `{repo}`")
            if log_grp := svc.get("log_group"):
                svc_lines.append(f"  • Log Group: `{log_grp}`")
        sections.append("\n".join(svc_lines))

    runbooks = context.get("runbooks") or {}
    if isinstance(runbooks, dict) and runbooks:
        rb_lines = ["## Operational Runbooks & Procedures:"]
        for topic, link in runbooks.items():
            rb_lines.append(f"- **{topic}**: {link}")
        sections.append("\n".join(rb_lines))

    if extra := context.get("extra_notes"):
        sections.append(f"## Architecture Notes:\n{extra}")

    if not sections:
        return ""

    return (
        "# Target Application Architecture & Workload Context:\n"
        + "\n\n".join(sections)
        + "\n\nUse this context to accurately map alerts to their corresponding services, code repositories, and log groups.\n"
    )


def generate_system_prompt(subagent_notes: list[str], app_context: dict[str, Any] | None = None) -> str:
    listing = "\n".join(subagent_notes) if subagent_notes else "- No extra write subagents active."
    app_section = format_application_context(app_context or settings.application_context)
    app_block = f"\n{app_section}\n" if app_section else ""
    return f"""You are Serenity-Ops, the autonomous CloudSecOps & AIOps orchestrator by e-serenity.
You investigate infrastructure incidents and user inquiries to produce accurate Root Cause Analysis (RCA) and actionable remediations.
{app_block}
# Active Sub-Agents & Delegated Capabilities:
{listing}

# Operational Rules:
1. Investigation is strictly read-only by default.
2. Any state mutation (creating alarms, modifying suppression lists, mutating infra) CANNOT execute directly.
3. Invoking an action tool only registers a pending confirmation. Always clarify in your answer that human approval is pending.
4. Base conclusions on verified evidence (logs, metrics, git commits). Distinguish correlation from root cause.

# Expected Output Format (Slack mrkdwn, concise):
:mag: *<Scope/Service> — <One-line incident summary>*

*Diagnostic*: 2-3 sentences based on verified facts.
*Key Evidence*: 1-3 bullet points (metric spikes, log traces, commits).
*Next Steps / Proposed Actions*:
• <concrete action submitted for human approval or recommended fix>
"""


async def _run_gemini_fallback(prompt: str, user_query: str, tools: list[Any] | None, limiter: InMemoryRateLimiter) -> str:
    if not settings.gemini_api_key:
        raise RuntimeError("No Gemini API key available for fallback")

    candidate_models = list(
        dict.fromkeys([
            settings.gemini_model,
            "gemini-3.5-flash",
            settings.gemini_fallback_model,
            "gemini-3.1-flash-lite",
        ])
    )
    last_failure: Exception | None = None

    for model_name in candidate_models:
        try:
            logger.info("Engaging Gemini fallback model: %s", model_name)
            llm = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=settings.gemini_api_key,
                rate_limiter=limiter,
                include_thoughts=False,
                max_retries=1,
            )
            messages = [("system", prompt), ("user", user_query)]
            if not tools:
                res = await llm.with_retry(stop_after_attempt=3).ainvoke(messages)
                return _extract_text_blocks(res.content)

            agent = create_react_agent(llm, tools)
            res = await agent.ainvoke({"messages": messages})
            return _extract_text_blocks(res["messages"][-1].content)
        except Exception as exc:
            logger.warning("Gemini model '%s' error: %s", model_name, exc)
            last_failure = exc

    raise RuntimeError(f"All fallback models exhausted. Last error: {last_failure}")


async def process_investigation(query_text: str) -> str:
    rate_limiter = InMemoryRateLimiter(requests_per_second=0.1, check_every_n_seconds=0.1, max_bucket_size=5)

    # 1. Collect dynamic tools & sub-agent topology
    dynamic_tools, subagent_notes = subagents.get_dynamic_tools()
    prompt = generate_system_prompt(subagent_notes)

    # 2. Collect integrated tools (GitLab, GitHub, Grafana, MCP servers)
    available_tools: list[Any] = []
    mcp_config = enrich_mcp_config(settings.mcp_servers_config)
    if mcp_config:
        try:
            mcp_client = MultiServerMCPClient(mcp_config)
            available_tools.extend(_sanitize_toolset(await mcp_client.get_tools()))
        except Exception as err:
            logger.error("Failed to connect to MCP servers: %s", err)

    available_tools.extend(load_all_integration_tools())
    available_tools.extend(dynamic_tools)

    # 3. Primary execution via AWS Bedrock (Claude Sonnet)
    try:
        logger.info("Running primary agent on AWS Bedrock (%s) with %d tool(s)", settings.claude_model, len(available_tools))
        llm = ChatBedrock(
            model_id=settings.claude_model,
            region_name=settings.aws_region,
            model_kwargs={"max_tokens": 4096},
        )
        if available_tools:
            resilient_llm = llm.bind_tools(available_tools).with_retry(stop_after_attempt=3)
            agent_executor = create_react_agent(resilient_llm, available_tools)
            output = await agent_executor.ainvoke({"messages": [("system", prompt), ("user", query_text)]})
            return _extract_text_blocks(output["messages"][-1].content)
        else:
            res = await llm.with_retry(stop_after_attempt=3).ainvoke([("system", prompt), ("user", query_text)])
            return _extract_text_blocks(res.content)

    except Exception as bedrock_err:
        logger.warning("Bedrock invocation failed: %s", _unwrap_exception(bedrock_err))
        try:
            fallback_text = await _run_gemini_fallback(prompt, query_text, available_tools, rate_limiter)
            return f":warning: *Note: Execution failed over to Gemini fallback model (Degraded Mode).*\n\n{fallback_text}"
        except Exception as fallback_err:
            logger.error("Critical: both Bedrock and Gemini fallback failed: %s", fallback_err)
            raise RuntimeError(f"Bedrock: {bedrock_err} | Fallback: {fallback_err}")
