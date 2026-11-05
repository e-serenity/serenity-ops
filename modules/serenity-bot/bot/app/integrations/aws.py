import functools
import json
import time
from typing import Any
import boto3
from langchain_core.tools import tool

from app.config import settings
from app.core.utils.logging import get_logger

logger = get_logger("integrations.aws")
MAX_PAYLOAD_SIZE = 35_000


def _safe_wrapper(fn):
    @functools.wraps(fn)
    def inner(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:
            logger.warning("AWS action '%s' failed: %s", fn.__name__, exc)
            return f"[Tool Error] {fn.__name__}: {exc}"
    return inner


@tool
@_safe_wrapper
def aws_cloudwatch_describe_alarms(state_value: str = "ALARM", alarm_name_prefix: str = "") -> str:
    """Lists CloudWatch alarms, optionally filtered by state (e.g., 'ALARM', 'OK', 'INSUFFICIENT_DATA') or prefix.
    
    Use this to see which alarms are currently firing across the AWS infrastructure.
    """
    client = boto3.client("cloudwatch", region_name=settings.aws_region)
    params: dict[str, Any] = {"MaxRecords": 25}
    if state_value in ("ALARM", "OK", "INSUFFICIENT_DATA"):
        params["StateValue"] = state_value
    if alarm_name_prefix:
        params["AlarmNamePrefix"] = alarm_name_prefix

    resp = client.describe_alarms(**params)
    metric_alarms = resp.get("MetricAlarms", [])
    if not metric_alarms:
        return f"No CloudWatch alarms found with state='{state_value}'."

    summaries = []
    for a in metric_alarms:
        name = a.get("AlarmName", "unknown")
        state = a.get("StateValue", "unknown")
        reason = a.get("StateReason", "")[:200]
        metric = f"{a.get('Namespace', '')}/{a.get('MetricName', '')}"
        summaries.append(f"• **`{name}`** [{state}] — Metric: `{metric}`\n  Reason: {reason}")

    return "\n".join(summaries)[:MAX_PAYLOAD_SIZE]


@tool
@_safe_wrapper
def aws_cloudwatch_get_metric_data(
    metric_name: str,
    namespace: str,
    dimensions: str = "{}",
    minutes_ago: int = 60,
    stat: str = "Average",
) -> str:
    """Fetches historical metric datapoints from CloudWatch (e.g. CPU, Error rates, DynamoDB throttling).
    
    Arguments:
    - metric_name: e.g. '5XXError', 'CPUUtilization', 'ConsumedReadCapacityUnits', 'ThrottledRequests'
    - namespace: e.g. 'AWS/ApiGateway', 'AWS/ECS', 'AWS/DynamoDB', 'AWS/Lambda'
    - dimensions: JSON string representing dimension key-values, e.g. '{"TableName": "challenge-monster-game-state"}'
    - minutes_ago: lookback period in minutes (default 60)
    - stat: 'Average', 'Sum', 'Maximum', 'Minimum', or 'SampleCount'
    """
    client = boto3.client("cloudwatch", region_name=settings.aws_region)
    end_time = int(time.time())
    start_time = end_time - (max(5, minutes_ago) * 60)

    dim_list = []
    if dimensions:
        try:
            parsed = json.loads(dimensions) if isinstance(dimensions, str) else dimensions
            dim_list = [{"Name": k, "Value": str(v)} for k, v in parsed.items()]
        except Exception:
            dim_list = []

    period = max(60, (minutes_ago * 60) // 10)
    resp = client.get_metric_data(
        MetricDataQueries=[
            {
                "Id": "m1",
                "MetricStat": {
                    "Metric": {
                        "Namespace": namespace,
                        "MetricName": metric_name,
                        "Dimensions": dim_list,
                    },
                    "Period": period,
                    "Stat": stat,
                },
                "ReturnData": True,
            }
        ],
        StartTime=start_time,
        EndTime=end_time,
    )

    results = resp.get("MetricDataResults", [])
    if not results or not results[0].get("Values"):
        return f"No datapoints returned for `{namespace}/{metric_name}` in the last {minutes_ago} minutes."

    values = results[0].get("Values", [])
    timestamps = [str(ts)[:19] for ts in results[0].get("Timestamps", [])]
    pairs = [f"{ts}: {val:.2f}" for ts, val in zip(timestamps, values)]
    return f"Metric `{namespace}/{metric_name}` ({stat}) last {minutes_ago}m:\n" + "\n".join(pairs[:15])


@tool
@_safe_wrapper
def aws_cloudwatch_get_log_events(log_group_name: str, filter_pattern: str = "", limit: int = 20) -> str:
    """Queries CloudWatch Logs for recent log events or error traces matching a filter pattern.
    
    Arguments:
    - log_group_name: Name of the CloudWatch log group (e.g. '/aws/lambda/my-func' or '/aws/ecs/my-svc')
    - filter_pattern: CloudWatch filter pattern, e.g. 'ERROR', 'Exception', '500'
    - limit: maximum number of events to return (max 50)
    """
    client = boto3.client("logs", region_name=settings.aws_region)
    clean_limit = min(50, max(5, limit))

    params: dict[str, Any] = {
        "logGroupName": log_group_name,
        "limit": clean_limit,
        "interleaved": True,
    }
    if filter_pattern:
        params["filterPattern"] = filter_pattern

    resp = client.filter_log_events(**params)
    events = resp.get("events", [])
    if not events:
        return f"No log events found in `{log_group_name}` matching pattern '{filter_pattern}'."

    lines = []
    for ev in events:
        msg = (ev.get("message") or "").strip()
        lines.append(f"[{ev.get('timestamp')}] {msg}")

    return f"Logs from `{log_group_name}`:\n" + "\n".join(lines)[:MAX_PAYLOAD_SIZE]


@tool
@_safe_wrapper
def aws_dynamodb_describe_table(table_name: str) -> str:
    """Retrieves Amazon DynamoDB table configuration, billing mode, capacity units (RCU/WCU), and status.
    
    Use this tool when investigating database latency, throttling, or capacity issues.
    """
    client = boto3.client("dynamodb", region_name=settings.aws_region)
    resp = client.describe_table(TableName=table_name)
    tbl = resp.get("Table", {})
    if not tbl:
        return f"Table `{table_name}` not found."

    status = tbl.get("TableStatus", "UNKNOWN")
    billing = tbl.get("BillingModeSummary", {}).get("BillingMode") or "PROVISIONED"
    item_count = tbl.get("ItemCount", 0)
    size_bytes = tbl.get("TableSizeBytes", 0)
    size_mb = size_bytes / (1024 * 1024)

    provisioned = tbl.get("ProvisionedThroughput", {})
    rcu = provisioned.get("ReadCapacityUnits", 0)
    wcu = provisioned.get("WriteCapacityUnits", 0)

    gsi_lines = []
    for gsi in tbl.get("GlobalSecondaryIndexes", []):
        g_name = gsi.get("IndexName")
        g_status = gsi.get("IndexStatus")
        g_tp = gsi.get("ProvisionedThroughput", {})
        gsi_lines.append(f"  • GSI `{g_name}` [{g_status}] — RCU: {g_tp.get('ReadCapacityUnits', 0)}, WCU: {g_tp.get('WriteCapacityUnits', 0)}")

    result = [
        f"**DynamoDB Table: `{table_name}`**",
        f"• Status: `{status}`",
        f"• Billing Mode: `{billing}`",
        f"• Provisioned Throughput: RCU={rcu}, WCU={wcu}",
        f"• Items: {item_count} (~{size_mb:.2f} MB)",
    ]
    if gsi_lines:
        result.append("• Global Secondary Indexes:\n" + "\n".join(gsi_lines))

    return "\n".join(result)


@tool
@_safe_wrapper
def aws_lambda_get_function(function_name: str) -> str:
    """Inspects AWS Lambda function configuration (runtime, memory, timeout, environment variable keys).
    
    Use this tool when investigating serverless backend errors or latency timeouts.
    """
    client = boto3.client("lambda", region_name=settings.aws_region)
    resp = client.get_function(FunctionName=function_name)
    cfg = resp.get("Configuration", {})
    if not cfg:
        return f"Lambda function `{function_name}` not found."

    name = cfg.get("FunctionName")
    runtime = cfg.get("Runtime", "unknown")
    memory = cfg.get("MemorySize", 0)
    timeout = cfg.get("Timeout", 0)
    last_modified = cfg.get("LastModified", "")
    env_keys = list((cfg.get("Environment", {}).get("Variables") or {}).keys())

    return (
        f"**AWS Lambda: `{name}`**\n"
        f"• Runtime: `{runtime}`\n"
        f"• Memory: {memory} MB | Timeout: {timeout}s\n"
        f"• Last Modified: {last_modified}\n"
        f"• Environment Variable Keys: {', '.join(env_keys) if env_keys else 'None'}"
    )


def load_aws_tools() -> list[Any]:
    """Returns the suite of read-only AWS inspection tools."""
    return [
        aws_cloudwatch_describe_alarms,
        aws_cloudwatch_get_metric_data,
        aws_cloudwatch_get_log_events,
        aws_dynamodb_describe_table,
        aws_lambda_get_function,
    ]
