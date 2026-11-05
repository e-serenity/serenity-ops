module "serenity_core" {
  source = "../../modules/serenity-core"

  project_name = local.project_name
  environment  = local.environment
  region       = local.region
  tags         = local.tags

  enable_dynamodb_hub     = local.enable_dynamodb_hub
  dynamodb_hub_table_name = local.dynamodb_hub_table_name

  enable_dashboard      = local.enable_dashboard
  dashboard_allowed_ips = local.dashboard_allowed_ips
}

module "serenity_bot" {
  count  = local.enable_bot ? 1 : 0
  source = "../../modules/serenity-bot"

  application         = "serenity-bot"
  environment         = local.environment
  region              = local.region
  dynamodb_table_name = module.serenity_core.dynamodb_hub_table_name
  tags                = local.tags

  initial_secrets          = local.bot_initial_secrets
  enable_gitlab            = local.enable_gitlab
  gitlab_allowed_namespace = local.gitlab_allowed_namespace
  enable_datadog           = local.enable_datadog
  enable_github            = local.enable_github
  enable_grafana           = local.enable_grafana

  # Platform self-monitoring alarms & Slack routing
  enable_platform_alarms       = local.enable_platform_alarms
  platform_alert_slack_channel = local.platform_alert_slack_channel

  # Custom application & workload context for AI prompt grounding
  application_context = local.application_context

  create_vpc                 = local.create_vpc
  vpc_cidr                   = local.vpc_cidr
  availability_zones         = local.availability_zones
  public_subnet_cidrs        = local.public_subnet_cidrs
  private_subnet_cidrs       = local.private_subnet_cidrs
  enable_nat_gateway         = local.enable_nat_gateway
  single_nat_gateway         = local.single_nat_gateway
  enable_s3_endpoint         = local.enable_s3_endpoint
  enable_bedrock_endpoint    = local.enable_bedrock_endpoint
  ecs_allowed_instance_types = local.ecs_allowed_instance_types
}

module "serenity_ses" {
  count  = local.enable_ses ? 1 : 0
  source = "../../modules/serenity-ses"

  name_prefix             = "${local.project_name}-${local.environment}"
  environment             = local.environment
  serenity_ops_table_name = module.serenity_core.dynamodb_hub_table_name
  enable_serenity_agent   = true
  tags                    = local.tags
}
