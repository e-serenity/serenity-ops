import json
import os
import time
import boto3
from boto3.dynamodb.conditions import Key

TABLE_NAME = os.environ.get("HUB_TABLE_NAME", "serenity-ops-hub")
ACCOUNT_ID = os.environ.get("AWS_ACCOUNT_ID", "")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "preprod")
REGION = os.environ.get("AWS_REGION", "eu-west-3")
ORIGIN_SECRET = os.environ.get("ORIGIN_SECRET", "")
RETENTION_DAYS = int(os.environ.get("RETENTION_DAYS", "90"))

dynamodb = boto3.resource("dynamodb", region_name=REGION)
cw_client = boto3.client("cloudwatch", region_name=REGION)


def _resp(status: int, body: dict):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store, no-cache, must-revalidate",
        },
        "body": json.dumps(body, default=str),
    }


def _query_pk(table, pk_val: str, limit: int = 50, scan_forward: bool = False):
    try:
        res = table.query(
            KeyConditionExpression=Key("PK").eq(pk_val),
            Limit=limit,
            ScanIndexForward=scan_forward,
        )
        return res.get("Items", [])
    except Exception:
        return []


def _get_live_state():
    table = dynamodb.Table(TABLE_NAME)

    mod_items = _query_pk(table, "SERENITY#MODULES", limit=50)
    installed_modules = ["serenity-core"]
    retention_days = RETENTION_DAYS

    for item in mod_items:
        sk = item.get("SK", "")
        status = item.get("status", "ACTIVE")
        mod_name = item.get("name") or sk.replace("MOD#", "")
        if status == "ACTIVE" and mod_name and mod_name not in installed_modules:
            installed_modules.append(mod_name)
        if item.get("retention_days"):
            try:
                retention_days = int(item["retention_days"])
            except Exception:
                pass

    ses_items = _query_pk(table, "MOD#serenity-ses", limit=50)
    ses_summary = {
        "dmarc": "valid",
        "spf": "valid",
        "dkim": "valid",
        "bounceRate": 0.0,
        "complaintRate": 0.0,
        "dedicatedIps": [],
    }
    email_events = []
    for item in ses_items:
        sk = item.get("SK", "")
        if sk == "STATE#SUMMARY":
            raw_ips = item.get("dedicatedIps") or item.get("dedicated_ips") or []
            if isinstance(raw_ips, str):
                try:
                    raw_ips = json.loads(raw_ips)
                except Exception:
                    raw_ips = []
            normalized_ips = []
            for idx, ip_entry in enumerate(raw_ips):
                if isinstance(ip_entry, dict):
                    normalized_ips.append({
                        "ip": ip_entry.get("ip") or ip_entry.get("pool") or f"Pool-{idx + 1}",
                        "warmup": int(ip_entry.get("warmup", 100)),
                        "status": ip_entry.get("status") or ip_entry.get("mode", "MANAGED"),
                    })
            ses_summary = {
                "dmarc": item.get("dmarc", "valid"),
                "spf": item.get("spf", "valid"),
                "dkim": item.get("dkim", "valid"),
                "bounceRate": float(item.get("bounceRate", item.get("bounce_rate", 0.0))),
                "complaintRate": float(item.get("complaintRate", item.get("complaint_rate", 0.0))),
                "dedicatedIps": normalized_ips,
            }
        elif sk.startswith("EVENT#"):
            diag = item.get("diagnosticCode") or item.get("smtp_code") or "SMTP Notification"
            evt_type = item.get("type", "HardBounce")
            if evt_type == "Bounce":
                evt_type = "HardBounce"
            email_events.append({
                "id": item.get("id", sk),
                "timestamp": item.get("timestamp", sk.replace("EVENT#", "")[:19]),
                "type": evt_type,
                "recipient": item.get("recipient", "unknown"),
                "smtpCode": diag,
                "reason": item.get("reason") or f"Domain: {item.get('domain', 'unknown')} ({item.get('subType', 'General')})",
                "suggestedAction": item.get("aiRecommendation") or "Add to SES Account Suppression List",
                "actionStatus": item.get("actionStatus", "PENDING"),
            })

    cw_alarms = []
    try:
        paginator = (
            cw_client.DescribeAlarms(MaxRecords=50)
            if hasattr(cw_client, "DescribeAlarms")
            else cw_client.describe_alarms(MaxRecords=50)
        )
        for alarm in paginator.get("MetricAlarms", []):
            state_val = alarm.get("StateValue", "OK")
            mapped_state = (
                "ALARM"
                if state_val == "ALARM"
                else ("INSUFFICIENT_DATA" if state_val == "INSUFFICIENT_DATA" else "OK")
            )
            cw_alarms.append({
                "name": alarm.get("AlarmName", "alarm"),
                "namespace": alarm.get("Namespace", "AWS/Custom"),
                "metric": alarm.get("MetricName", "Metric"),
                "threshold": f"{alarm.get('ComparisonOperator', '>=')} {alarm.get('Threshold', '')}",
                "state": mapped_state,
                "updatedAt": str(alarm.get("StateUpdatedTimestamp", ""))[:19],
            })
    except Exception:
        pass

    inc_items = _query_pk(table, "SERENITY#INCIDENTS", limit=50)
    incidents = []
    for item in inc_items:
        incidents.append({
            "id": item.get("id", item.get("SK", "")),
            "timestamp": item.get("timestamp", ""),
            "kind": item.get("kind", "ALERT"),
            "source": item.get("source", "Slack (@Serenity-Ops)"),
            "requester": item.get("requester", ""),
            "trigger": item.get("trigger", ""),
            "severity": item.get("severity", "INFO"),
            "mcpTraces": item.get("mcpTraces", []),
            "rca": item.get("rca", ""),
            "proposedAction": item.get("proposedAction"),
        })

    chat_items = _query_pk(table, "SERENITY#CHAT", limit=50, scan_forward=True)
    chat_messages = []
    for item in chat_items:
        chat_messages.append({
            "id": item.get("id", item.get("SK", "")),
            "sender": item.get("sender", "bot"),
            "author": item.get("author", "Serenity-Ops"),
            "channel": item.get("channel", "Web Console"),
            "timestamp": item.get("timestamp", ""),
            "text": item.get("text", ""),
            "toolsUsed": item.get("toolsUsed", []),
        })

    return {
        "mode": "live",
        "accountId": ACCOUNT_ID,
        "environment": ENVIRONMENT,
        "region": REGION,
        "hubTableName": TABLE_NAME,
        "retentionDays": retention_days,
        "installedModules": installed_modules,
        "sesSummary": ses_summary,
        "emailEvents": email_events,
        "cloudWatchAlarms": cw_alarms,
        "incidents": incidents,
        "chatMessages": chat_messages,
    }


def handler(event, context):
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    if ORIGIN_SECRET and headers.get("x-serenity-origin-secret") != ORIGIN_SECRET:
        return _resp(403, {"error": "Direct access forbidden"})

    raw_path = event.get("rawPath", "/api/state")
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")

    if raw_path == "/api/state" and method == "GET":
        return _resp(200, _get_live_state())

    if raw_path == "/api/chat" and method == "POST":
        table = dynamodb.Table(TABLE_NAME)
        body = json.loads(event.get("body") or "{}")
        text = (body.get("text") or "").strip()
        if not text:
            return _resp(400, {"error": "Empty message"})
        now_ts = int(time.time() * 1000)
        ttl_val = int(time.time()) + (RETENTION_DAYS * 86400)
        time_str = time.strftime("%H:%M", time.gmtime())

        user_msg = {
            "PK": "SERENITY#CHAT",
            "SK": f"MSG#{now_ts}#1",
            "id": f"msg-u-{now_ts}",
            "sender": "user",
            "author": "Operator (Web Console)",
            "channel": "Web Console",
            "timestamp": time_str,
            "text": text,
            "ttl": ttl_val,
        }
        table.put_item(Item=user_msg)
        return _resp(200, {"ok": True, "message": user_msg})

    return _resp(404, {"error": f"Unknown route {method} {raw_path}"})
