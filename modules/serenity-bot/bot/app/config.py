import json
import os
from dataclasses import dataclass, field
from typing import Any


def _as_bool(val: str | None, default: bool = False) -> bool:
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")


@dataclass
class Settings:
    environment: str = os.getenv("ENVIRONMENT", "preprod")
    aws_region: str = os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION", "eu-west-3"))
    health_port: int = int(os.getenv("HEALTH_PORT", "8000"))
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    # Slack Credentials
    slack_bot_token: str = os.getenv("SLACK_BOT_TOKEN", "")
    slack_app_token: str = os.getenv("SLACK_APP_TOKEN", "")

    # LLM Settings (AWS Bedrock primary with Gemini fallback)
    claude_model: str = os.getenv("CLAUDE_MODEL", "global.anthropic.claude-sonnet-4-6")
    gemini_api_key: str = os.getenv("GEMINI_APIKEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
    gemini_fallback_model: str = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3.8-flash")

    # DynamoDB Hub (serenity-ops-hub)
    dynamodb_table_name: str = os.getenv("DYNAMODB_TABLE_NAME", "")
    history_retention_days: int = int(os.getenv("HISTORY_RETENTION_DAYS", "90"))

    # Integrations: Datadog
    enable_datadog: bool = _as_bool(os.getenv("ENABLE_DATADOG"))
    dd_api_key: str = os.getenv("DD_API_KEY", "")
    dd_app_key: str = os.getenv("DD_APP_KEY", "")
    datadog_bot_ids: set[str] = field(
        default_factory=lambda: {b.strip() for b in os.getenv("DATADOG_BOT_IDS", "").split(",") if b.strip()}
    )

    # Integrations: GitLab
    enable_gitlab: bool = _as_bool(os.getenv("ENABLE_GITLAB"))
    gitlab_token: str = os.getenv("GITLAB_TOKEN", "")
    gitlab_url: str = os.getenv("GITLAB_URL", "https://gitlab.com")
    gitlab_allowed_namespace: str = os.getenv("GITLAB_ALLOWED_NAMESPACE", "").strip()

    # Integrations: GitHub
    enable_github: bool = _as_bool(os.getenv("ENABLE_GITHUB"))
    github_token: str = os.getenv("GITHUB_TOKEN", "")
    github_url: str = os.getenv("GITHUB_URL", "https://api.github.com")
    github_allowed_owner: str = os.getenv("GITHUB_ALLOWED_OWNER", "").strip()

    # Integrations: Grafana / Prometheus Alertmanager
    enable_grafana: bool = _as_bool(os.getenv("ENABLE_GRAFANA"))
    grafana_url: str = os.getenv("GRAFANA_URL", "").rstrip("/")
    grafana_token: str = os.getenv("GRAFANA_TOKEN", "")

    # MCP Dynamic Configuration
    mcp_servers_raw: str = os.getenv("MCP_SERVERS_CONFIG", "{}")

    # Custom Application & Architecture Context
    application_context_raw: str = os.getenv("APPLICATION_CONTEXT", "{}")

    @property
    def mcp_servers_config(self) -> dict[str, Any]:
        try:
            return json.loads(self.mcp_servers_raw)
        except Exception:
            return {}

    @property
    def application_context(self) -> dict[str, Any]:
        try:
            return json.loads(self.application_context_raw)
        except Exception:
            return {}


settings = Settings()
