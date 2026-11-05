data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

data "aws_iam_policy_document" "agent_assume_role" {
  count = var.enable_serenity_agent ? 1 : 0

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
  }
}

resource "aws_iam_role" "serenity_agent_ses" {
  count              = var.enable_serenity_agent ? 1 : 0
  name               = "${var.name_prefix}-serenity-agent-ses"
  assume_role_policy = data.aws_iam_policy_document.agent_assume_role[0].json

  tags = merge(var.tags, {
    Role      = "serenity-agent-ses"
    Scope     = "SCOPED_WRITE"
    Module    = "serenity-ses"
    ManagedBy = "serenity-ops"
  })
}

data "aws_iam_policy_document" "agent_scoped_ses_policy" {
  count = var.enable_serenity_agent ? 1 : 0

  statement {
    sid    = "SESScopedWriteAndReads"
    effect = "Allow"
    actions = [
      "ses:PutAccountSuppressionAttributes",
      "ses:PutSuppressedDestination",
      "ses:DeleteSuppressedDestination",
      "ses:GetSuppressedDestination",
      "ses:ListSuppressedDestinations",
      "ses:GetDedicatedIp",
      "ses:GetDedicatedIps",
      "ses:PutDedicatedIpWarmupAttributes",
      "ses:GetConfigurationSet",
      "ses:GetConfigurationSetEventDestinations",
      "ses:GetEmailIdentity",
      "ses:GetEmailIdentityDkimAttributes",
      "ses:GetEmailIdentityMailFromAttributes"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "serenity_agent_ses" {
  count  = var.enable_serenity_agent ? 1 : 0
  name   = "${var.name_prefix}-scoped-ses-write"
  role   = aws_iam_role.serenity_agent_ses[0].id
  policy = data.aws_iam_policy_document.agent_scoped_ses_policy[0].json
}
