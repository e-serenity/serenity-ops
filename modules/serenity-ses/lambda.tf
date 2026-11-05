data "archive_file" "sending_reports_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/store-reports"
  output_path = "${path.module}/.terraform/tmp-${var.name_prefix}-ses-sending-reports.zip"
}

data "aws_iam_policy_document" "sending_reports_lambda_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "sending_reports_lambda" {
  name               = "${var.name_prefix}-ses-sending-reports"
  assume_role_policy = data.aws_iam_policy_document.sending_reports_lambda_assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "sending_reports_lambda_logs" {
  role       = aws_iam_role.sending_reports_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "sending_reports_lambda" {
  name              = "/aws/lambda/${var.name_prefix}-ses-sending-reports"
  retention_in_days = 7
  tags              = var.tags
}

resource "aws_lambda_function" "sending_reports" {
  function_name    = "${var.name_prefix}-ses-sending-reports"
  role             = aws_iam_role.sending_reports_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  architectures    = ["arm64"]
  filename         = data.archive_file.sending_reports_lambda.output_path
  source_code_hash = data.archive_file.sending_reports_lambda.output_base64sha256
  memory_size      = 128
  timeout          = 60

  environment {
    variables = {
      DYNAMODB_BOUNCE_TABLE_NAME = aws_dynamodb_table.bounce.name
      SERENITY_OPS_TABLE_NAME    = var.serenity_ops_table_name
    }
  }

  depends_on = [aws_cloudwatch_log_group.sending_reports_lambda]
  tags       = var.tags
}

resource "aws_lambda_event_source_mapping" "event_source_mapping" {
  event_source_arn                   = aws_sqs_queue.sending_reports.arn
  enabled                            = true
  function_name                      = aws_lambda_function.sending_reports.arn
  batch_size                         = 50
  maximum_batching_window_in_seconds = 15
}

resource "aws_iam_policy" "run_application_events_logging_policy" {
  name        = "${var.name_prefix}-lambda_access_policy"
  description = "Allows SES sending reports processor Lambda to read from SQS and write to DynamoDB"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = [aws_sqs_queue.sending_reports.arn]
      },
      {
        Effect = "Allow"
        Action = ["dynamodb:PutItem", "dynamodb:UpdateItem"]
        Resource = compact([
          aws_dynamodb_table.bounce.arn,
          var.serenity_ops_table_name != "" ? "arn:aws:dynamodb:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:table/${var.serenity_ops_table_name}" : ""
        ])
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "run_events_logging_attachment" {
  policy_arn = aws_iam_policy.run_application_events_logging_policy.arn
  role       = aws_iam_role.sending_reports_lambda.name
}
