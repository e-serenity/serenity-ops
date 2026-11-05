"""DynamoDB Hub Client for Serenity-Ops (Single-Table Design).

Interacts with the central `serenity-ops-hub` table:
- Module discovery: queries `SERENITY#MODULES` for active modules and sub-agent roles.
- Incident logging: writes RCA reports and proposed actions to `SERENITY#OPS / INCIDENT#...`.
- State updates: marks actions as APPROVED or REJECTED when human approves in Slack/Web.
"""

from datetime import datetime, timezone
import logging
import os
import uuid
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger("serenity-ops.hub")

TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "")
AWS_REGION = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "eu-west-3"))
DEFAULT_RETENTION_DAYS = int(os.environ.get("HISTORY_RETENTION_DAYS", "90"))


def _get_table():
    if not TABLE_NAME:
        return None
    try:
        dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
        return dynamodb.Table(TABLE_NAME)
    except Exception as exc:
        logger.warning("Could not initialize DynamoDB resource for %s: %s", TABLE_NAME, exc)
        return None


def get_active_modules() -> list[dict]:
    """Retrieves all active modules registered in serenity-ops-hub.

    Returns:
        List of dicts, each containing:
        {'id': 'serenity-ses', 'name': 'serenity-ses', 'status': 'ACTIVE',
         'agent_role_arn': 'arn:aws:iam:...', 'version': '2.0.0'}
    """
    table = _get_table()
    if not table:
        return []

    try:
        response = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("PK").eq("SERENITY#MODULES")
        )
        items = response.get("Items", [])
        active = []
        for item in items:
            if item.get("status") == "ACTIVE":
                mod_id = item.get("name") or item.get("SK", "").replace("MOD#", "")
                active.append({
                    "id": mod_id,
                    "name": item.get("name", mod_id),
                    "status": item.get("status", "ACTIVE"),
                    "version": item.get("version", "1.0.0"),
                    "agent_role_arn": item.get("agent_role_arn", ""),
                })
        logger.info("Discovered %d active module(s) in %s: %s", len(active), TABLE_NAME, [m['id'] for m in active])
        return active
    except ClientError as exc:
        logger.warning("Failed to query active modules from %s (table might not exist yet): %s", TABLE_NAME, exc)
        return []
    except Exception as exc:
        logger.warning("Unexpected error querying active modules: %s", exc)
        return []


def record_incident(
    trigger: str,
    rca: str,
    mcp_traces: list[str],
    proposed_action: dict | None = None,
    severity: str = "HIGH",
    ttl_days: int | None = None,
    kind: str = "ALERT",
    source: str = "Slack",
    requester: str | None = None,
) -> str:
    """Records an AI investigation report or user request in serenity-ops-hub.

    Returns:
        The generated incident ID (e.g. 'inc-2026-10-27T12:00:00Z-abcd')
    """
    table = _get_table()
    now_iso = datetime.now(timezone.utc).isoformat()
    short_id = str(uuid.uuid4())[:8]
    incident_id = f"inc-{now_iso}-{short_id}"
    effective_ttl_days = ttl_days if ttl_days is not None else DEFAULT_RETENTION_DAYS
    ttl_epoch = int(datetime.now(timezone.utc).timestamp()) + (effective_ttl_days * 86400)

    action_payload = proposed_action or {
        "agent": "serenity-agent-investigator",
        "action": "none",
        "target": "none",
        "status": "COMPLETED",
        "details": "Investigation terminée sans action d'écriture requise."
    }

    item = {
        "PK": "SERENITY#OPS",
        "SK": f"INCIDENT#{now_iso}#{short_id}",
        "incident_id": incident_id,
        "trigger": trigger,
        "severity": severity,
        "rca": rca,
        "mcp_traces": mcp_traces,
        "proposed_action": action_payload,
        "ttl": ttl_epoch,
        "created_at": now_iso
    }

    if not table:
        logger.info("DynamoDB hub not available, simulated incident record: %s", incident_id)
        return incident_id

    try:
        table.put_item(Item=item)
        logger.info("Recorded incident %s in %s (status: %s)", incident_id, TABLE_NAME, action_payload.get("status"))
    except Exception as exc:
        logger.warning("Failed to write incident %s to %s: %s", incident_id, TABLE_NAME, exc)

    return incident_id


def update_incident_status(
    incident_id: str,
    status: str,
    executed_by: str = "",
    execution_result: str = ""
) -> bool:
    """Updates the status of a proposed action (e.g. APPROVED or REJECTED)."""
    table = _get_table()
    if not table:
        return False

    try:
        # Scan or query for the incident item
        # Since SK contains timestamp and short_id, we scan with filter or query GSI if present.
        response = table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr("incident_id").eq(incident_id),
            Limit=1
        )
        items = response.get("Items", [])
        if not items:
            logger.warning("Incident %s not found in %s", incident_id, TABLE_NAME)
            return False

        item = items[0]
        pk = item["PK"]
        sk = item["SK"]

        update_expr = "SET proposed_action.#st = :status, proposed_action.updated_at = :now"
        expr_attr_names = {"#st": "status"}
        expr_attr_values = {
            ":status": status,
            ":now": datetime.now(timezone.utc).isoformat()
        }

        if executed_by:
            update_expr += ", proposed_action.executed_by = :by"
            expr_attr_values[":by"] = executed_by
        if execution_result:
            update_expr += ", proposed_action.execution_result = :res"
            expr_attr_values[":res"] = execution_result

        table.update_item(
            Key={"PK": pk, "SK": sk},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values
        )
        logger.info("Updated incident %s to status %s", incident_id, status)
        return True
    except Exception as exc:
        logger.warning("Failed to update incident %s in DynamoDB: %s", incident_id, exc)
        return False
