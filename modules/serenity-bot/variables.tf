variable "application" {
  description = "Application and ECS service name (e.g., serenity-bot)"
  type        = string
  default     = "serenity-bot"
}

variable "environment" {
  description = "Deployment environment name (e.g., preprod, prod, dev)"
  type        = string
  default     = "preprod"
}

variable "region" {
  description = "Primary AWS region"
  type        = string
  default     = "eu-west-3"
}

variable "region_backup" {
  description = "Optional replica region for AWS Secrets Manager"
  type        = string
  default     = ""
}

variable "initial_secrets" {
  description = "Optional initial secrets map to seed into AWS Secrets Manager upon creation (merged over defaults). Note: Because ignore_secret_changes = true is enabled, changes here after initial creation will not overwrite AWS Secrets Manager."
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "tags" {
  description = "Common tags applied to all created resources"
  type        = map(string)
  default     = {}
}

# ------------------------------------------------------------------------------
# Bring-Your-Own ECS Cluster (Optional)
# When cluster_arn is empty (default), serenity-bot creates the ECS cluster,
# capacity provider, VPC, NAT Gateway, and VPC endpoints automatically.
# When cluster_arn is provided, no VPC or ECS cluster is created.
# ------------------------------------------------------------------------------

variable "cluster_arn" {
  description = "Optional ARN of an existing ECS cluster. Leave empty ('') to automatically provision a dedicated ECS cluster and VPC."
  type        = string
  default     = ""
}

variable "capacity_provider_name" {
  description = "Name of the ECS Managed Instances capacity provider (required when cluster_arn is provided; defaults to <application>-<environment>-managed-instances when created)."
  type        = string
  default     = ""

  validation {
    condition     = trimspace(var.cluster_arn) == "" || length(trimspace(var.capacity_provider_name)) > 0
    error_message = "'capacity_provider_name' is required when an existing 'cluster_arn' is provided."
  }
}

variable "subnet_ids" {
  description = "Existing private subnet IDs for ECS tasks (required when cluster_arn is provided or when create_vpc = false)."
  type        = list(string)
  default     = []

  validation {
    condition     = (trimspace(var.cluster_arn) == "" && var.create_vpc) || length(var.subnet_ids) > 0
    error_message = "At least one subnet in 'subnet_ids' is required when 'cluster_arn' is provided or 'create_vpc' is false."
  }
}

# ------------------------------------------------------------------------------
# VPC & Networking (Provisioned by default when cluster_arn == "")
# ------------------------------------------------------------------------------

variable "create_vpc" {
  description = "When true (and cluster_arn is empty), creates a dedicated VPC, subnets, NAT Gateway(s), and VPC endpoints."
  type        = bool
  default     = true
}

variable "vpc_cidr" {
  description = "CIDR block for the created VPC (used when create_vpc = true and cluster_arn is empty)"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of Availability Zones. Defaults to <region>a, <region>b, <region>c when empty."
  type        = list(string)
  default     = []
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks (used when create_vpc = true and cluster_arn is empty)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDR blocks for ECS workloads (used when create_vpc = true and cluster_arn is empty)"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
}

variable "enable_nat_gateway" {
  description = "Whether to provision NAT Gateway(s) for private subnets"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "When true, provisions a single shared NAT Gateway across all AZs. When false, provisions one NAT Gateway per public subnet."
  type        = bool
  default     = false
}

variable "existing_vpc_id" {
  description = "Existing VPC ID (required when cluster_arn is empty and create_vpc = false)"
  type        = string
  default     = ""

  validation {
    condition     = trimspace(var.cluster_arn) != "" || var.create_vpc || length(trimspace(var.existing_vpc_id)) > 0
    error_message = "'existing_vpc_id' is required when 'cluster_arn' is empty and 'create_vpc' is false."
  }
}

variable "existing_private_route_table_ids" {
  description = "Existing private route table IDs for the S3 Gateway VPC Endpoint (optional when create_vpc = false)"
  type        = list(string)
  default     = []
}

variable "enable_s3_endpoint" {
  description = "Enable S3 Gateway VPC Endpoint (free, used when cluster_arn is empty)"
  type        = bool
  default     = true
}

variable "enable_bedrock_endpoint" {
  description = "Enable AWS Bedrock Runtime Interface VPC Endpoint (used when cluster_arn is empty)"
  type        = bool
  default     = true
}

# ------------------------------------------------------------------------------
# ECS Cluster & Managed Instances (Provisioned by default when cluster_arn == "")
# ------------------------------------------------------------------------------

variable "ecs_cluster_name" {
  description = "Custom ECS cluster name when created by this module (defaults to <application>-<environment>-cluster-managed)"
  type        = string
  default     = ""
}

variable "ecs_container_insights" {
  description = "ECS Container Insights mode (enhanced, enabled, or disabled)"
  type        = string
  default     = "enhanced"
}

variable "ecs_allowed_instance_types" {
  description = "Allowed EC2 instance types or families for ECS Managed Instances"
  type        = list(string)
  default     = ["m8g.*", "m7g.*", "m6g.*", "m6a.*", "t4g.*"]
}

variable "ecs_instance_min_vcpu" {
  description = "Minimum vCPU count for ECS Managed Instances selection"
  type        = number
  default     = 1
}

variable "ecs_instance_min_memory_mib" {
  description = "Minimum memory (in MiB) for ECS Managed Instances selection"
  type        = number
  default     = 128
}

variable "ecs_burstable_performance" {
  description = "Burstable instance policy (included, required, excluded)"
  type        = string
  default     = "included"
}

# ------------------------------------------------------------------------------
# Bot Task & Integrations
# ------------------------------------------------------------------------------

variable "image" {
  description = "Container image URI used when create_ecr_repository = false. Defaults to the official pre-built GHCR image (:stable) for instant zero-build testing."
  type        = string
  default     = "ghcr.io/e-serenity/serenity-bot:stable"
}

variable "create_ecr_repository" {
  description = "When true, provisions a private AWS ECR repository in your account and configures ECS to pull '<ecr_repository_url>:<ecr_image_tag>' instead of the external 'image' (recommended for production to avoid external registry dependencies)."
  type        = bool
  default     = false
}

variable "ecr_image_tag" {
  description = "Image tag pulled from the private ECR repository when create_ecr_repository = true (defaults to var.environment when empty)"
  type        = string
  default     = ""
}

variable "cpu" {
  description = "CPU units allocated to the ECS task (e.g., 1024 = 1 vCPU)"
  type        = number
  default     = 1024
}

variable "memory" {
  description = "Memory in MiB allocated to the ECS task (e.g., 1024 = 1 GiB)"
  type        = number
  default     = 1024
}

variable "enable_datadog" {
  description = "Enable Datadog integration (Monitors, Logs, APM, Events via MCP / OTLP)"
  type        = bool
  default     = false
}

variable "enable_gitlab" {
  description = "Enable GitLab integration (Commits, Merge Requests, CI/CD Pipelines, Code Search)"
  type        = bool
  default     = false
}

variable "gitlab_allowed_namespace" {
  description = "Optional allowed GitLab group/namespace prefix (e.g., 'my-org/')"
  type        = string
  default     = ""
}

variable "enable_github" {
  description = "Enable GitHub integration (Pull Requests, Actions, Commits)"
  type        = bool
  default     = false
}

variable "enable_grafana" {
  description = "Enable Grafana / Prometheus integration"
  type        = bool
  default     = false
}

variable "history_retention_days" {
  description = "Retention period in days for incident history, chat messages, and audit records via native DynamoDB TTL"
  type        = number
  default     = 90
}

variable "dynamodb_table_name" {
  description = "Optional: Name of the central Serenity-Ops DynamoDB Hub table (e.g., 'serenity-ops-hub'). Leave empty ('') to run serenity-bot in Standalone Slack-only mode."
  type        = string
  default     = ""
}

# ------------------------------------------------------------------------------
# Serenity-Ops Platform Self-Monitoring & CloudWatch Alarms
# ------------------------------------------------------------------------------

variable "enable_platform_alarms" {
  description = "When true, provisions a predefined suite of CloudWatch alarms to monitor the Serenity-Ops platform itself (ECS CPU/Memory, Bot Error Logs, and DynamoDB Hub errors)."
  type        = bool
  default     = false
}

variable "platform_alert_slack_channel" {
  description = "Optional dedicated Slack channel name (e.g., '#cloudsecops' or '#serenity-alerts') where platform CloudWatch alarms are forwarded. Automatically added to bot monitored channels for automated RCA."
  type        = string
  default     = ""
}

variable "platform_alarms_cpu_threshold" {
  description = "CPU utilization threshold percentage triggering the Serenity-Bot ECS high CPU CloudWatch alarm"
  type        = number
  default     = 85
}

variable "platform_alarms_memory_threshold" {
  description = "Memory utilization threshold percentage triggering the Serenity-Bot ECS high Memory CloudWatch alarm"
  type        = number
  default     = 85
}

variable "platform_alarms_error_log_threshold" {
  description = "Number of ERROR/CRITICAL/Exception log events in 1 minute triggering the bot error log alarm"
  type        = number
  default     = 5
}

# ------------------------------------------------------------------------------
# Custom Application & Architecture Context
# ------------------------------------------------------------------------------

variable "application_context" {
  description = "Custom business and technical context about your workloads (services, tech stacks, repositories, log groups, criticality, runbooks). Injected into the AI prompt to ground RCA and investigations."
  type = object({
    organization_name    = optional(string, "")
    business_domain      = optional(string, "")
    architecture_summary = optional(string, "")
    services = optional(list(object({
      name        = string
      description = optional(string, "")
      tech_stack  = optional(string, "")
      repository  = optional(string, "")
      log_group   = optional(string, "")
      criticality = optional(string, "MEDIUM")
    })), [])
    runbooks    = optional(map(string), {})
    extra_notes = optional(string, "")
  })
  default = {}
}
