locals {
  project_name = "serenity-ops"
  environment  = "preprod"
  region       = "eu-west-3"

  enable_dynamodb_hub     = true
  dynamodb_hub_table_name = "serenity-ops-hub"

  enable_dashboard = true
  dashboard_allowed_ips = var.dashboard_allowed_ips != null ? var.dashboard_allowed_ips : [
    "10.0.0.1/32",
    "2001:db8:1234:5678::/64",
  ]


  # Bot integrations & monitoring
  enable_bot               = true
  enable_github            = true
  enable_gitlab            = false
  gitlab_allowed_namespace = "my-org/"
  enable_datadog           = false
  enable_grafana           = false

  # Platform self-monitoring: pre-configured CloudWatch alarms for Serenity-Ops itself
  # If platform_alert_slack_channel is set, alarms are automatically delivered to Slack
  # and ingested into serenity-bot for autonomous RCA investigation.
  enable_platform_alarms       = false
  platform_alert_slack_channel = "#cloudsecops"

  # ----------------------------------------------------------------------------
  # Optional initial secrets seeded into AWS Secrets Manager upon creation.
  #
  # IMPORTANT LIFECYCLE NOTE:
  # 1. On first 'terraform apply', these values are seeded into AWS Secrets Manager
  #    under 'serenity-bot-<env>-secrets' (merged over default placeholders).
  # 2. Because 'ignore_secret_changes = true' is enabled in the Terraform module,
  #    subsequent updates CAN AND SHOULD BE DONE DIRECTLY IN AWS SECRETS MANAGER
  #    (either via the AWS Console or the AWS CLI).
  # 3. Rotating or updating a token in Secrets Manager will NOT cause any Terraform
  #    drift. Simply force a new ECS deployment ('aws ecs update-service --force-new-deployment')
  #    so the bot task pulls the latest secrets.
  # ----------------------------------------------------------------------------
  bot_initial_secrets = merge({
    # Uncomment and fill if you want to seed credentials on first deployment:
    # SLACK_BOT_TOKEN = "xoxb-..."
    # SLACK_APP_TOKEN = "xapp-..."
    # GITLAB_TOKEN    = "glpat-..."
    # GITHUB_TOKEN    = "ghp_..."
    # DD_API_KEY      = "..."
    # DD_APP_KEY      = "..."
  }, var.bot_initial_secrets)

  # (Optional) Custom application & workload context injected into the Serenity-Bot prompt
  # Grounds AI Root Cause Analysis (RCA) in your actual microservices, repositories, and runbooks.
  application_context = var.application_context != null ? var.application_context : {
    organization_name    = "My Company"
    business_domain      = "E-Commerce & Logistics"
    architecture_summary = "Microservices architecture on AWS ECS Graviton with Aurora PostgreSQL"
    services = [
      {
        name        = "order-api"
        description = "Order validation and checkout processing service"
        tech_stack  = "Node.js / Express / Redis / PostgreSQL"
        repository  = "github.com/my-org/order-service"
        log_group   = "/aws/ecs/prod-order-api"
        criticality = "HIGH"
      },
      {
        name        = "auth-service"
        description = "OAuth2 authentication provider and JWT session management"
        tech_stack  = "Python / FastAPI / DynamoDB"
        repository  = "gitlab.com/my-org/auth-api"
        log_group   = "/aws/ecs/prod-auth"
        criticality = "HIGH"
      }
    ]
    runbooks = {
      "HighLatency"      = "https://wiki.my-company.com/runbooks/high-latency"
      "PaymentFailed5XX" = "https://wiki.my-company.com/runbooks/payment-errors"
    }
    extra_notes = "order-api relies directly on auth-service to validate JWT tokens."
  }

  # Bot VPC & ECS settings (only provisioned when enable_bot = true and no existing cluster_arn is passed)
  create_vpc                 = true
  vpc_cidr                   = "10.10.0.0/16"
  availability_zones         = ["${local.region}a", "${local.region}b", "${local.region}c"]
  public_subnet_cidrs        = ["10.10.1.0/24", "10.10.2.0/24", "10.10.3.0/24"]
  private_subnet_cidrs       = ["10.10.10.0/24", "10.10.11.0/24", "10.10.12.0/24"]
  enable_nat_gateway         = true
  single_nat_gateway         = true
  enable_s3_endpoint         = true
  enable_bedrock_endpoint    = true
  ecs_allowed_instance_types = ["m8g.*", "m7g.*", "m6g.*", "m6a.*", "t4g.*"]

  # Enable SES module
  enable_ses = false

  tags = {
    Project     = local.project_name
    Environment = local.environment
    ManagedBy   = "terraform"
    Vendor      = "e-serenity"
  }
}
