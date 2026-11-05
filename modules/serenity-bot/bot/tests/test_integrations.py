import json
import logging
from app.config import settings
from app.core.utils.logging import JsonFormatter
from app.integrations import load_all_integration_tools
from app.integrations.alert_detector import is_inbound_alert, parse_inbound_alert
from app.integrations.datadog import enrich_mcp_config
from app.integrations.github import load_github_tools
from app.integrations.gitlab import load_gitlab_tools
from app.integrations.grafana import load_grafana_tools


def test_gitlab_tools_disabled_by_default(monkeypatch):
    monkeypatch.setattr(settings, "enable_gitlab", False)
    tools = load_gitlab_tools()
    assert tools == []


def test_gitlab_tools_enabled_without_token(monkeypatch):
    monkeypatch.setattr(settings, "enable_gitlab", True)
    monkeypatch.setattr(settings, "gitlab_token", "")
    tools = load_gitlab_tools()
    assert tools == []


def test_gitlab_tools_enabled_with_token(monkeypatch):
    monkeypatch.setattr(settings, "enable_gitlab", True)
    monkeypatch.setattr(settings, "gitlab_token", "glpat-fake-token")
    tools = load_gitlab_tools()
    assert len(tools) == 5
    tool_names = [t.name for t in tools]
    assert "gitlab_list_recent_mrs" in tool_names
    assert "gitlab_inspect_file" in tool_names


def test_github_tools_disabled_by_default(monkeypatch):
    monkeypatch.setattr(settings, "enable_github", False)
    tools = load_github_tools()
    assert tools == []


def test_github_tools_enabled_with_token(monkeypatch):
    monkeypatch.setattr(settings, "enable_github", True)
    monkeypatch.setattr(settings, "github_token", "ghp_fake_token")
    tools = load_github_tools()
    assert len(tools) == 3
    tool_names = [t.name for t in tools]
    assert "github_list_recent_prs" in tool_names
    assert "github_inspect_file" in tool_names


def test_grafana_tools_disabled_by_default(monkeypatch):
    monkeypatch.setattr(settings, "enable_grafana", False)
    tools = load_grafana_tools()
    assert tools == []


def test_grafana_tools_enabled_with_url(monkeypatch):
    monkeypatch.setattr(settings, "enable_grafana", True)
    monkeypatch.setattr(settings, "grafana_url", "https://grafana.internal.com")
    tools = load_grafana_tools()
    assert len(tools) == 2
    tool_names = [t.name for t in tools]
    assert "grafana_list_alerts" in tool_names
    assert "grafana_query_metric" in tool_names


def test_load_all_integration_tools(monkeypatch):
    monkeypatch.setattr(settings, "enable_gitlab", True)
    monkeypatch.setattr(settings, "gitlab_token", "glpat-fake")
    monkeypatch.setattr(settings, "enable_github", True)
    monkeypatch.setattr(settings, "github_token", "ghp_fake")
    monkeypatch.setattr(settings, "enable_grafana", False)

    all_tools = load_all_integration_tools()
    assert len(all_tools) == 5 + 5 + 3  # 5 AWS + 5 GitLab + 3 GitHub
    names = [t.name for t in all_tools]
    assert "aws_cloudwatch_describe_alarms" in names
    assert "aws_dynamodb_describe_table" in names
    assert "gitlab_list_commits" in names
    assert "github_list_commits" in names


def test_alert_detector_ignore_recovery():
    recovery_event = {
        "subtype": "bot_message",
        "bot_id": "B12345",
        "text": "CRITICAL: Service high latency",
        "attachments": [{"text": "Recovered: latency back to normal"}],
    }
    assert is_inbound_alert(recovery_event) is False
    assert parse_inbound_alert(recovery_event) is None


def test_alert_detector_active_alert():
    alert_event = {
        "subtype": "bot_message",
        "bot_id": "B12345",
        "text": "ALARM: High 5XX error rate on API Gateway",
        "attachments": [{"text": "Triggered: threshold > 5%"}],
    }
    assert is_inbound_alert(alert_event) is True
    parsed = parse_inbound_alert(alert_event)
    assert parsed is not None
    assert parsed.is_alert is True
    assert parsed.source == "aws_cloudwatch"
    assert parsed.severity == "HIGH"


def test_alert_detector_cloudwatch_platform_alarm():
    platform_alarm_event = {
        "subtype": "bot_message",
        "bot_id": "B99999",
        "text": ":rotating_light: alarm: [ALARM] CloudWatch Alarm firing on Serenity-Ops Platform",
        "blocks": [
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": "Alarm Name: serenity-bot-preprod-ecs-high-cpu"},
            }
        ],
    }
    parsed = parse_inbound_alert(platform_alarm_event)
    assert parsed is not None
    assert parsed.source == "aws_cloudwatch"
    assert parsed.severity == "CRITICAL"


def test_alert_detector_grafana_alert():
    grafana_event = {
        "subtype": "bot_message",
        "bot_id": "B88888",
        "username": "Grafana Alertmanager",
        "text": "[FIRING:1] HighMemoryUsage env:prod service:backend-api",
    }
    parsed = parse_inbound_alert(grafana_event)
    assert parsed is not None
    assert parsed.source == "grafana_alertmanager"
    assert parsed.environment == "prod"
    assert parsed.service == "backend-api"


def test_alert_detector_datadog_alert(monkeypatch):
    monkeypatch.setattr(settings, "enable_datadog", True)
    datadog_event = {
        "subtype": "bot_message",
        "bot_id": "B77777",
        "username": "Datadog",
        "text": "[Triggered] Latency > 500ms on production cluster",
    }
    parsed = parse_inbound_alert(datadog_event)
    assert parsed is not None
    assert parsed.source == "datadog"


def test_alert_detector_ignore_self_diagnostic():
    self_event = {
        "subtype": "bot_message",
        "bot_id": "B99999",
        "text": ":mag: *Serenity-Ops* is investigating this alert (AWS CLOUDWATCH)…",
    }
    assert is_inbound_alert(self_event) is False


def test_datadog_mcp_enrichment(monkeypatch):
    monkeypatch.setattr(settings, "enable_datadog", True)
    monkeypatch.setattr(settings, "dd_api_key", "fake-api-key")
    monkeypatch.setattr(settings, "dd_app_key", "fake-app-key")

    base_config = {"datadog": {"transport": "sse", "url": "https://mcp.datadoghq.com"}}
    enriched = enrich_mcp_config(base_config)
    assert enriched["datadog"]["headers"]["DD_API_KEY"] == "fake-api-key"
    assert enriched["datadog"]["headers"]["DD_APPLICATION_KEY"] == "fake-app-key"


def test_json_formatter():
    formatter = JsonFormatter()
    record = logging.LogRecord(
        name="serenity.test",
        level=logging.WARNING,
        pathname=__file__,
        lineno=10,
        msg="Test warning message",
        args=(),
        exc_info=None,
    )
    record.custom_field = "extra_value"

    formatted = formatter.format(record)
    parsed = json.loads(formatted)
    assert parsed["level"] == "WARNING"
    assert parsed["logger"] == "serenity.test"
    assert parsed["message"] == "Test warning message"
    assert parsed["custom_field"] == "extra_value"
    assert "timestamp" in parsed


def test_alert_detector_matches_known_services():
    alert_event = {
        "subtype": "bot_message",
        "bot_id": "B12345",
        "text": "ALARM: High memory usage in container order-api task",
    }
    parsed = parse_inbound_alert(alert_event, known_services=["order-api", "payment-processor"])
    assert parsed is not None
    assert parsed.service == "order-api"


def test_context_hub_and_tools(monkeypatch):
    from app.integrations.context_hub import (
        get_known_service_names,
        load_context_tools,
        lookup_workload_architecture,
    )

    sample_context = {
        "organization_name": "Acme Corp",
        "business_domain": "e-commerce",
        "architecture_summary": "Preprod environment",
        "services": [
            {
                "name": "order-api",
                "description": "Public ordering API",
                "criticality": "HIGH",
                "tech_stack": "Node.js / Express",
                "repository": "acme/order-api",
                "log_group": "/aws/ecs/preprod-order-api",
            },
            {
                "name": "payment-processor",
                "description": "Worker consuming SQS payment jobs",
                "criticality": "CRITICAL",
                "tech_stack": "Python / FastAPI",
                "repository": "acme/payment-processor",
                "log_group": "/aws/ecs/preprod-payment-processor",
            },
        ],
        "runbooks": {
            "Aurora CPU": "https://wiki.acme.com/runbooks/aurora",
        },
    }
    monkeypatch.setattr(settings, "application_context_raw", json.dumps(sample_context))

    assert get_known_service_names() == ["order-api", "payment-processor"]

    tools = load_context_tools()
    assert len(tools) == 1
    assert tools[0].name == "lookup_workload_architecture"

    # Query overview
    overview = lookup_workload_architecture.invoke({"service_or_keyword": ""})
    assert "Acme Corp" in overview
    assert "order-api" in overview

    # Query specific service
    svc_info = lookup_workload_architecture.invoke({"service_or_keyword": "payment-processor"})
    assert "CRITICAL" in svc_info
    assert "acme/payment-processor" in svc_info
    assert "/aws/ecs/preprod-payment-processor" in svc_info

    # Query runbook
    rb_info = lookup_workload_architecture.invoke({"service_or_keyword": "aurora"})
    assert "https://wiki.acme.com/runbooks/aurora" in rb_info

