module "secrets_manager" {
  source  = "terraform-aws-modules/secrets-manager/aws"
  version = "1.3.1"

  name                    = "${var.application}-${var.environment}-secrets"
  description             = "Environment credentials and API tokens for the ${var.application} orchestrator"
  recovery_window_in_days = 7

  secret_string = jsonencode(merge({
    CLAUDE_MODEL       = "global.anthropic.claude-sonnet-4-6"
    GEMINI_APIKEY      = "to-fill-manually"
    SLACK_BOT_TOKEN    = "to-fill-manually"
    SLACK_APP_TOKEN    = "to-fill-manually"
    DD_API_KEY         = "to-fill-manually"
    DD_APP_KEY         = "to-fill-manually"
    GITLAB_TOKEN       = "to-fill-manually"
    GITHUB_TOKEN       = "to-fill-manually"
    MCP_SERVERS_CONFIG = "{}"
  }, var.initial_secrets))
  ignore_secret_changes = true

  tags = var.tags
  replica = var.region_backup != "" ? {
    "${var.region_backup}" = {}
  } : {}
}
