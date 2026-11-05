# ==============================================================================
# Serenity-Ops Platform Self-Monitoring & CloudWatch Alarms
# ==============================================================================

locals {
  enable_slack_notifier = var.enable_platform_alarms && trimspace(var.platform_alert_slack_channel) != ""
}

# ------------------------------------------------------------------------------
# SNS Topic for Platform CloudWatch Alarms
# ------------------------------------------------------------------------------

resource "aws_sns_topic" "platform_alarms" {
  count = var.enable_platform_alarms ? 1 : 0

  name = "${local.name_prefix}-platform-alarms"
  tags = merge(var.tags, { ManagedBy = "serenity-ops" })
}

# ------------------------------------------------------------------------------
# 1. ECS Workload Alarms (CPU & Memory)
# ------------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "ecs_high_cpu" {
  count = var.enable_platform_alarms ? 1 : 0

  alarm_name          = "${local.name_prefix}-ecs-high-cpu"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = var.platform_alarms_cpu_threshold
  alarm_description   = "Serenity-Bot ECS task CPU utilization is above threshold (${var.platform_alarms_cpu_threshold}%)"

  dimensions = {
    ClusterName = local.effective_cluster_name
    ServiceName = module.ecs_service.name
  }

  alarm_actions = [aws_sns_topic.platform_alarms[0].arn]
  ok_actions    = [aws_sns_topic.platform_alarms[0].arn]
  tags          = merge(var.tags, { ManagedBy = "serenity-ops" })
}

resource "aws_cloudwatch_metric_alarm" "ecs_high_memory" {
  count = var.enable_platform_alarms ? 1 : 0

  alarm_name          = "${local.name_prefix}-ecs-high-memory"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = var.platform_alarms_memory_threshold
  alarm_description   = "Serenity-Bot ECS task Memory utilization is above threshold (${var.platform_alarms_memory_threshold}%)"

  dimensions = {
    ClusterName = local.effective_cluster_name
    ServiceName = module.ecs_service.name
  }

  alarm_actions = [aws_sns_topic.platform_alarms[0].arn]
  ok_actions    = [aws_sns_topic.platform_alarms[0].arn]
  tags          = merge(var.tags, { ManagedBy = "serenity-ops" })
}

# ------------------------------------------------------------------------------
# 2. CloudWatch Log Group Error Rate Alarm
# ------------------------------------------------------------------------------

resource "aws_cloudwatch_log_metric_filter" "bot_error_logs" {
  count = var.enable_platform_alarms ? 1 : 0

  name           = "${local.name_prefix}-error-logs-filter"
  log_group_name = local.container_log_group_name
  pattern        = "?ERROR ?CRITICAL ?Exception ?Traceback"

  metric_transformation {
    name          = "${local.name_prefix}-error-log-count"
    namespace     = "SerenityOps/Platform"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_metric_alarm" "bot_error_logs" {
  count = var.enable_platform_alarms ? 1 : 0

  alarm_name          = "${local.name_prefix}-bot-error-logs"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "${local.name_prefix}-error-log-count"
  namespace           = "SerenityOps/Platform"
  period              = 60
  statistic           = "Sum"
  threshold           = var.platform_alarms_error_log_threshold
  alarm_description   = "Serenity-Bot logged multiple ERROR or Exception occurrences in CloudWatch Logs"

  alarm_actions = [aws_sns_topic.platform_alarms[0].arn]
  tags          = merge(var.tags, { ManagedBy = "serenity-ops" })

  depends_on = [aws_cloudwatch_log_metric_filter.bot_error_logs]
}

# ------------------------------------------------------------------------------
# 3. DynamoDB Hub Table Alarms (Optional, active when Hub is coupled)
# ------------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "dynamodb_system_errors" {
  count = var.enable_platform_alarms && local.enable_hub ? 1 : 0

  alarm_name          = "${local.name_prefix}-dynamodb-hub-system-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "SystemErrors"
  namespace           = "AWS/DynamoDB"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Serenity-Ops Hub DynamoDB table encountered SystemErrors"

  dimensions = {
    TableName = var.dynamodb_table_name
  }

  alarm_actions = [aws_sns_topic.platform_alarms[0].arn]
  tags          = merge(var.tags, { ManagedBy = "serenity-ops" })
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_throttled_requests" {
  count = var.enable_platform_alarms && local.enable_hub ? 1 : 0

  alarm_name          = "${local.name_prefix}-dynamodb-hub-throttled-requests"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Serenity-Ops Hub DynamoDB table requests are being throttled"

  dimensions = {
    TableName = var.dynamodb_table_name
  }

  alarm_actions = [aws_sns_topic.platform_alarms[0].arn]
  tags          = merge(var.tags, { ManagedBy = "serenity-ops" })
}

# ------------------------------------------------------------------------------
# 4. Slack Notifier Lambda (Forwards alarms to Slack channel for bot RCA)
# ------------------------------------------------------------------------------

data "archive_file" "slack_notifier" {
  count = local.enable_slack_notifier ? 1 : 0

  type        = "zip"
  source_file = "${path.module}/lambda/slack-notifier/index.py"
  output_path = "${path.module}/lambda/slack-notifier/slack-notifier.zip"
}

resource "aws_iam_role" "slack_notifier" {
  count = local.enable_slack_notifier ? 1 : 0

  name = "${local.name_prefix}-slack-alarm-notifier-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, { ManagedBy = "serenity-ops" })
}

resource "aws_iam_policy" "slack_notifier" {
  count = local.enable_slack_notifier ? 1 : 0

  name        = "${local.name_prefix}-slack-alarm-notifier-policy"
  description = "Allows Slack alarm notifier Lambda to write logs and fetch Slack bot token from Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.region}:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = module.secrets_manager.secret_arn
      }
    ]
  })

  tags = merge(var.tags, { ManagedBy = "serenity-ops" })
}

resource "aws_iam_role_policy_attachment" "slack_notifier" {
  count = local.enable_slack_notifier ? 1 : 0

  role       = aws_iam_role.slack_notifier[0].name
  policy_arn = aws_iam_policy.slack_notifier[0].arn
}

resource "aws_lambda_function" "slack_notifier" {
  count = local.enable_slack_notifier ? 1 : 0

  function_name = "${local.name_prefix}-slack-alarm-notifier"
  description   = "Forwards Serenity-Ops platform CloudWatch alarms to Slack channel ${var.platform_alert_slack_channel}"
  role          = aws_iam_role.slack_notifier[0].arn
  handler       = "index.handler"
  runtime       = "python3.12"
  architectures = ["arm64"]
  timeout       = 30
  memory_size   = 128

  filename         = data.archive_file.slack_notifier[0].output_path
  source_code_hash = data.archive_file.slack_notifier[0].output_base64sha256

  environment {
    variables = {
      SECRETS_ARN   = module.secrets_manager.secret_arn
      SLACK_CHANNEL = var.platform_alert_slack_channel
      AWS_REGION    = var.region
    }
  }

  tags = merge(var.tags, { ManagedBy = "serenity-ops" })
}

resource "aws_sns_topic_subscription" "slack_notifier" {
  count = local.enable_slack_notifier ? 1 : 0

  topic_arn = aws_sns_topic.platform_alarms[0].arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.slack_notifier[0].arn
}

resource "aws_lambda_permission" "sns_notifier" {
  count = local.enable_slack_notifier ? 1 : 0

  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.slack_notifier[0].function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.platform_alarms[0].arn
}
