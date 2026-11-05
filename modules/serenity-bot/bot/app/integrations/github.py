import base64
import functools
from typing import Any
from langchain_core.tools import tool
import requests

from app.config import settings
from app.core.utils.logging import get_logger

logger = get_logger("integrations.github")
MAX_PAYLOAD_SIZE = 35_000


def _get_headers() -> dict[str, str]:
    if not settings.github_token:
        raise ValueError("GitHub token (GITHUB_TOKEN) is not configured")
    return {
        "Authorization": f"Bearer {settings.github_token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "serenity-ops-bot",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _verify_repo_allowed(repo_name: str) -> str:
    clean_repo = repo_name.strip().strip("/")
    allowed_owner = settings.github_allowed_owner
    if allowed_owner:
        owner = clean_repo.split("/")[0] if "/" in clean_repo else clean_repo
        if owner != allowed_owner:
            raise PermissionError(
                f"Security restriction: Repository '{clean_repo}' is not within allowed organization '{allowed_owner}'."
            )
    return clean_repo


def _safe_wrapper(fn):
    @functools.wraps(fn)
    def inner(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:
            logger.warning("GitHub action '%s' failed: %s", fn.__name__, exc)
            return f"[Tool Error] {fn.__name__}: {exc}"
    return inner


@tool
@_safe_wrapper
def github_list_recent_prs(repo_name: str, count: int = 10) -> str:
    """Retrieve recent pull requests (merged, open, or closed) for a GitHub repository.

    Args:
        repo_name: Full repository name formatted as 'owner/repo'.
        count: Number of pull requests to retrieve (defaults to 10).
    """
    repo = _verify_repo_allowed(repo_name)
    url = f"{settings.github_url.rstrip('/')}/repos/{repo}/pulls"
    params = {"state": "all", "sort": "updated", "direction": "desc", "per_page": min(count, 30)}
    resp = requests.get(url, headers=_get_headers(), params=params, timeout=12)
    resp.raise_for_status()

    prs = resp.json()
    if not prs:
        return f"No pull requests found for repository {repo}."

    lines = []
    for pr in prs:
        author = (pr.get("user") or {}).get("login", "unknown")
        status = "MERGED" if pr.get("merged_at") else pr.get("state", "open").upper()
        lines.append(f"#{pr.get('number')} [{status}] '{pr.get('title')}' by @{author} -> {pr.get('base', {}).get('ref')}")
    return "\n".join(lines)


@tool
@_safe_wrapper
def github_list_commits(repo_name: str, branch: str | None = None, limit: int = 15) -> str:
    """Inspect recent commit history on a GitHub repository or specific branch.

    Args:
        repo_name: Full repository name formatted as 'owner/repo'.
        branch: Optional branch name or commit SHA to inspect.
        limit: Number of commits to retrieve (defaults to 15).
    """
    repo = _verify_repo_allowed(repo_name)
    url = f"{settings.github_url.rstrip('/')}/repos/{repo}/commits"
    params: dict[str, Any] = {"per_page": min(limit, 30)}
    if branch:
        params["sha"] = branch
    resp = requests.get(url, headers=_get_headers(), params=params, timeout=12)
    resp.raise_for_status()

    commits = resp.json()
    if not commits:
        return f"No commits found on repository {repo}."

    lines = []
    for c in commits:
        sha = c.get("sha", "")[:8]
        author = (c.get("commit", {}).get("author") or {}).get("name", "unknown")
        date_str = (c.get("commit", {}).get("author") or {}).get("date", "")[:19]
        msg = c.get("commit", {}).get("message", "").split("\n")[0]
        lines.append(f"{sha} ({date_str}) {author}: {msg}")
    return "\n".join(lines)


@tool
@_safe_wrapper
def github_inspect_file(repo_name: str, file_path: str, branch: str | None = None) -> str:
    """Read source code or configuration file contents from a GitHub repository for investigation.

    Args:
        repo_name: Full repository name formatted as 'owner/repo'.
        file_path: Relative path to the file in the repository (e.g. 'src/server.py').
        branch: Optional git branch or ref (defaults to repository default branch).
    """
    repo = _verify_repo_allowed(repo_name)
    url = f"{settings.github_url.rstrip('/')}/repos/{repo}/contents/{file_path.lstrip('/')}"
    params = {}
    if branch:
        params["ref"] = branch
    resp = requests.get(url, headers=_get_headers(), params=params, timeout=12)
    resp.raise_for_status()

    data = resp.json()
    if data.get("encoding") == "base64" and data.get("content"):
        raw_bytes = base64.b64decode(data["content"])
        text = raw_bytes.decode("utf-8", errors="replace")
    else:
        text = str(data)

    if len(text) > MAX_PAYLOAD_SIZE:
        return text[:MAX_PAYLOAD_SIZE] + f"\n... [truncated at {MAX_PAYLOAD_SIZE} chars]"
    return text


def load_github_tools() -> list[Any]:
    """Returns read-only GitHub inspection tools if integration is active and token is configured."""
    if not settings.enable_github or not settings.github_token:
        logger.info(
            "GitHub integration inactive (enable_github=%s, token_set=%s)",
            settings.enable_github,
            bool(settings.github_token),
        )
        return []

    logger.info("GitHub integration active: loading read-only analysis tools")
    return [
        github_list_recent_prs,
        github_list_commits,
        github_inspect_file,
    ]
