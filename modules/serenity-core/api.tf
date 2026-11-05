resource "random_password" "api_origin_secret" {
  count   = var.enable_dashboard ? 1 : 0
  length  = 32
  special = false
}

data "archive_file" "dashboard_api" {
  count       = var.enable_dashboard ? 1 : 0
  type        = "zip"
  source_file = "${path.module}/lambda/api/index.py"
  output_path = "${path.module}/.terraform/tmp-${local.name_prefix}-dashboard-api.zip"
}

data "aws_iam_policy_document" "dashboard_api_assume" {
  count = var.enable_dashboard ? 1 : 0

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "dashboard_api" {
  count              = var.enable_dashboard ? 1 : 0
  name_prefix        = "${local.name_prefix}-dash-api-"
  assume_role_policy = data.aws_iam_policy_document.dashboard_api_assume[0].json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "dashboard_api_logs" {
  count      = var.enable_dashboard ? 1 : 0
  role       = aws_iam_role.dashboard_api[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "dashboard_api_permissions" {
  count = var.enable_dashboard ? 1 : 0

  statement {
    sid    = "DynamoDBHubAccess"
    effect = "Allow"
    actions = [
      "dynamodb:Query",
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
    ]
    resources = var.enable_dynamodb_hub ? [
      aws_dynamodb_table.hub[0].arn,
      "${aws_dynamodb_table.hub[0].arn}/index/*"
    ] : ["*"]
  }

  statement {
    sid    = "CloudWatchAlarmsRead"
    effect = "Allow"
    actions = [
      "cloudwatch:DescribeAlarms"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "dashboard_api" {
  count  = var.enable_dashboard ? 1 : 0
  name   = "serenity-ops-dashboard-api"
  role   = aws_iam_role.dashboard_api[0].id
  policy = data.aws_iam_policy_document.dashboard_api_permissions[0].json
}

resource "aws_lambda_function" "dashboard_api" {
  count            = var.enable_dashboard ? 1 : 0
  function_name    = "${local.name_prefix}-dashboard-api"
  role             = aws_iam_role.dashboard_api[0].arn
  handler          = "index.handler"
  runtime          = "python3.12"
  architectures    = ["arm64"]
  filename         = data.archive_file.dashboard_api[0].output_path
  source_code_hash = data.archive_file.dashboard_api[0].output_base64sha256
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      HUB_TABLE_NAME = local.dynamodb_hub_table_name
      AWS_ACCOUNT_ID = data.aws_caller_identity.current.account_id
      ENVIRONMENT    = var.environment
      ORIGIN_SECRET  = random_password.api_origin_secret[0].result
      RETENTION_DAYS = "90"
    }
  }

  tags = var.tags
}

resource "aws_lambda_function_url" "dashboard_api" {
  count              = var.enable_dashboard ? 1 : 0
  function_name      = aws_lambda_function.dashboard_api[0].function_name
  authorization_type = "NONE"
}

resource "aws_lambda_permission" "dashboard_api_url" {
  count                  = var.enable_dashboard ? 1 : 0
  statement_id           = "AllowPublicFunctionUrlWithSecretHeader"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.dashboard_api[0].function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_lambda_permission" "dashboard_api_invoke" {
  count                    = var.enable_dashboard ? 1 : 0
  statement_id             = "AllowInvokeViaFunctionUrl"
  action                   = "lambda:InvokeFunction"
  function_name            = aws_lambda_function.dashboard_api[0].function_name
  principal                = "*"
  invoked_via_function_url = true
}
