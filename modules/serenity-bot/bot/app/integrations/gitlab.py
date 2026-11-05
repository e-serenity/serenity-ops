import functools
from typing import Any
import gitlab
from langchain_core.tools import tool

from app.config import settings
from app.core.utils.logging import get_logger

logger = get_logger("integrations.gitlab")
_client: gitlab.Gitlab | None = None
MAX_PAYLOAD_SIZE = 35_000


def _get_client() -> gitlab.Gitlab:
    global _client
    if _client is None:
        if not settings.gitlab_token:
            raise ValueError("GitLab token is not configured")
        _client = gitlab.Gitlab(settings.gitlab_url, private_token=settings.gitlab_token, timeout=12)
    return _client


def _fetch_project(repo_path: str):
    clean_path = repo_path.strip().strip("/")
    allowed = settings.gitlab_allowed_namespace
    if allowed and not (clean_path == allowed or clean_path.startswith(f"{allowed}/")):
        raise PermissionError(f"Namespace restriction: '{clean_path}' is not within '{allowed}'")
    return _get_client().projects.get(clean_path)


def _safe_wrapper(fn):
    @functools.wraps(fn)
    def inner(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:
            logger.warning("GitLab action '%s' failed: %s", fn.__name__, exc)
            return f"[Tool Error] {fn.__name__}: {exc}"
    return inner


@tool
@_safe_wrapper
def gitlab_list_recent_mrs(project_path: str, count: int = 10) -> str:
    """Retrieve the latest merged merge requests for a given GitLab repository."""
    proj = _fetch_project(project_path)
    records = proj.mergerequests.list(state="merged", order_by="updated_at", sort="desc", per_page=count, get_all=False)
    if not records:
        return "No recent merged MRs found."
    lines = [f"!{mr.iid} ({mr.merged_at}) '{mr.title}' by @{mr.author.get('username')} -> {mr.target_branch}" for mr in records]
    return "\n".join(lines)


@tool
@_safe_wrapper
def gitlab_list_pipelines(project_path: str, branch: str | None = None, limit: int = 10) -> str:
    """Inspect recent CI/CD pipeline executions, optionally scoped to a git branch."""
    proj = _fetch_project(project_path)
    params = {"order_by": "updated_at", "sort": "desc", "per_page": limit, "get_all": False}
    if branch:
        params["ref"] = branch
    items = proj.pipelines.list(**params)
    if not items:
        return "No pipeline runs located."
    return "\n".join(f"#{p.id} [{p.status}] ref:{p.ref} sha:{p.sha[:8]} -> {p.web_url}" for p in items)


@tool
@_safe_wrapper
def gitlab_list_commits(project_path: str, revision: str | None = None, limit: int = 15) -> str:
    """Query recent commit history on a repository or target branch."""
    proj = _fetch_project(project_path)
    kwargs = {"per_page": limit, "get_all": False}
    if revision:
        kwargs["ref_name"] = revision
    commits = proj.commits.list(**kwargs)
    if not commits:
        return "No commits found."
    return "\n".join(f"{c.short_id} ({c.created_at}) {c.author_name}: {c.title}" for c in commits)


@tool
@_safe_wrapper
def gitlab_inspect_file(file_path: str, project_path: str, branch: str | None = None) -> str:
    """Read file content from a repository for root cause investigation."""
    proj = _fetch_project(project_path)
    target_ref = branch or proj.default_branch
    f = proj.files.get(file_path=file_path, ref=target_ref)
    text = f.decode().decode("utf-8", errors="replace")
    if len(text) > MAX_PAYLOAD_SIZE:
        return text[:MAX_PAYLOAD_SIZE] + f"\n... [truncated at {MAX_PAYLOAD_SIZE} chars]"
    return text


@tool
@_safe_wrapper
def gitlab_search_code(query: str, project_path: str, limit: int = 10) -> str:
    """Search for string occurrences or error traces across repository code."""
    proj = _fetch_project(project_path)
    hits = proj.search("blobs", query, per_page=limit, get_all=False)
    if not hits:
        return "No matches found."
    snippets = [f"{h.get('path')} (line {h.get('startline', '?')}):\n{h.get('data', '').strip()}" for h in hits]
    return "\n---\n".join(snippets)


def load_gitlab_tools() -> list[Any]:
    if not settings.enable_gitlab or not settings.gitlab_token:
        logger.info("GitLab integration inactive (enable_gitlab=%s, token_set=%s)",
                    settings.enable_gitlab, bool(settings.gitlab_token))
        return []
    logger.info("GitLab integration active: loading read-only analysis tools")
    return [
        gitlab_list_recent_mrs,
        gitlab_list_pipelines,
        gitlab_list_commits,
        gitlab_inspect_file,
        gitlab_search_code,
    ]
