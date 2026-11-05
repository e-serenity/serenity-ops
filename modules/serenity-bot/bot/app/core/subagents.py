"""Sub-Agent Manager & Dynamic Toolset for Serenity-Ops.

Handles:
- sts:AssumeRole delegation for scoped sub-agents (serenity-agent-ses, serenity-agent-cw).
- Dynamic tool registration based on modules discovered in DynamoDB Hub.
"""

import logging
import os
from typing import Any
import boto3
from langchain_core.tools import tool

from app.core import confirmations, hub

logger = logging.getLogger("serenity-ops.subagents")
AWS_REGION = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "eu-west-3"))


def assume_subagent_role(role_arn: str, session_name: str = "serenity-subagent") -> boto3.Session:
    """Assumes a scoped IAM role and returns an authenticated boto3 Session."""
    sts_client = boto3.client("sts", region_name=AWS_REGION)
    logger.info("Assuming scoped sub-agent role: %s", role_arn)

    response = sts_client.assume_role(
        RoleArn=role_arn,
        RoleSessionName=session_name,
        DurationSeconds=900,  # 15 minutes minimum duration
    )

    creds = response["Credentials"]
    return boto3.Session(
        aws_access_key_id=creds["AccessKeyId"],
        aws_secret_access_key=creds["SecretAccessKey"],
        aws_session_token=creds["SessionToken"],
        region_name=AWS_REGION,
    )


def create_ses_tools(agent_role_arn: str) -> list[Any]:
    """Creates scoped write tools for serenity-agent-ses."""

    @tool
    def ses_suppress_destination(email: str, reason: str = "BOUNCE") -> str:
        """Add an email address to the SES Account Suppression List.

        This action requires explicit human confirmation (Human-in-the-Loop) before executing.
        Args:
            email: Email address to suppress / quarantine.
            reason: Reason for suppression (BOUNCE or COMPLAINT).
        """
        def execute_suppression() -> str:
            session = assume_subagent_role(agent_role_arn, "ses-suppression")
            ses_client = session.client("sesv2", region_name=AWS_REGION)
            ses_client.put_suppressed_destination(
                EmailAddress=email,
                Reason=reason
            )
            return f"Address '{email}' was successfully added to the SES suppression list (Reason: {reason})."

        # Register incident in DynamoDB Hub
        incident_id = hub.record_incident(
            trigger=f"SES-Bounce-Event: {email}",
            rca=f"Requested suppression of email address {email} due to {reason}.",
            mcp_traces=["serenity-agent-ses: SuppressionList requested"],
            proposed_action={
                "agent": "serenity-agent-ses",
                "action": "put_suppressed_destination",
                "target": email,
                "status": "PENDING_APPROVAL",
                "details": f"Add {email} to SES Account Suppression List (Reason: {reason})"
            }
        )

        action_id = confirmations.register_pending(
            agent_name="serenity-agent-ses",
            action_name="put_suppressed_destination",
            target=email,
            details=f"Block address {email} on SES",
            callback=execute_suppression,
            incident_id=incident_id
        )

        return (
            f":warning: *Modifying action prepared (Action ID: `{action_id}`)*\n"
            f"Adding `{email}` to the SES suppression list was submitted for human approval.\n"
            f"Please click [ ✅ Approve Execution ] in Slack or view on Web Dashboard (`{incident_id}`)."
        )

    return [ses_suppress_destination]


def create_cloudwatch_tools(agent_role_arn: str) -> list[Any]:
    """Creates scoped write tools for serenity-agent-cw."""

    @tool
    def cw_create_metric_alarm(
        alarm_name: str,
        metric_name: str,
        namespace: str,
        threshold: float,
        comparison_operator: str = "GreaterThanOrEqualToThreshold",
        evaluation_periods: int = 1,
        period_seconds: int = 60,
        statistic: str = "Average",
    ) -> str:
        """Create or update a CloudWatch metric alarm for resource saturation monitoring.

        This action requires explicit human confirmation (Human-in-the-Loop) before executing.
        """
        def execute_alarm_creation() -> str:
            session = assume_subagent_role(agent_role_arn, "cw-alarm-creation")
            cw_client = session.client("cloudwatch", region_name=AWS_REGION)
            cw_client.put_metric_alarm(
                AlarmName=alarm_name,
                MetricName=metric_name,
                Namespace=namespace,
                Threshold=threshold,
                ComparisonOperator=comparison_operator,
                EvaluationPeriods=evaluation_periods,
                Period=period_seconds,
                Statistic=statistic,
                Tags=[{"Key": "ManagedBy", "Value": "serenity-ops"}],
            )
            return f"CloudWatch alarm '{alarm_name}' was successfully created on metric {namespace}/{metric_name}."

        incident_id = hub.record_incident(
            trigger=f"CloudWatch Saturation: {namespace}/{metric_name}",
            rca=f"Preventive alarm creation on {alarm_name}.",
            mcp_traces=["serenity-agent-cw: PutMetricAlarm proposed"],
            proposed_action={
                "agent": "serenity-agent-cw",
                "action": "put_metric_alarm",
                "target": alarm_name,
                "status": "PENDING_APPROVAL",
                "details": f"Create alarm {alarm_name} ({namespace}/{metric_name})"
            }
        )

        action_id = confirmations.register_pending(
            agent_name="serenity-agent-cw",
            action_name="put_metric_alarm",
            target=alarm_name,
            details=f"Create alarm {alarm_name}",
            callback=execute_alarm_creation,
            incident_id=incident_id
        )

        return (
            f":warning: *Modifying action prepared (Action ID: `{action_id}`)*\n"
            f"Creation of CloudWatch alarm `{alarm_name}` was submitted for human approval.\n"
            f"Please approve via [ ✅ Approve Execution ] button in Slack or on Web Dashboard (`{incident_id}`)."
        )

    return [cw_create_metric_alarm]


def get_dynamic_tools() -> tuple[list[Any], list[str]]:
    """Discovers active modules in DynamoDB and returns their active tools and sub-agent summaries."""
    active_modules = hub.get_active_modules()
    tools: list[Any] = []
    agent_descriptions: list[str] = [
        "- `serenity-agent-investigator` (100% READ-ONLY): Native GitLab, GitHub, Grafana, Datadog and AWS/CloudWatch inspection tools."
    ]

    for mod in active_modules:
        mod_id = mod["id"]
        role_arn = mod.get("agent_role_arn")

        if mod_id == "serenity-ses" and role_arn:
            tools.extend(create_ses_tools(role_arn))
            agent_descriptions.append(
                f"- `serenity-agent-ses` (SCOPED WRITE - {role_arn}): Management of SES suppression list and deliverability (subject to human approval)."
            )

        if mod_id == "serenity-cloudwatch" and role_arn:
            tools.extend(create_cloudwatch_tools(role_arn))
            agent_descriptions.append(
                f"- `serenity-agent-cw` (SCOPED WRITE - {role_arn}): Creation and modification of CloudWatch alarms (subject to human approval)."
            )

    return tools, agent_descriptions
