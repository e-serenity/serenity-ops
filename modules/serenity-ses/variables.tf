variable "name_prefix" {
  type        = string
  description = "Prefix applied to all created AWS SES, SNS, SQS, Lambda, and DynamoDB resources"
}

variable "environment" {
  type        = string
  description = "Deployment environment name (e.g., prod, preprod, dev)"
  default     = "prod"
}

variable "tags" {
  type        = map(string)
  description = "Common tags applied to all created resources"
  default     = {}
}

variable "serenity_ops_table_name" {
  type        = string
  description = "Optional: Name of the central Serenity-Ops DynamoDB Hub table (e.g., serenity-ops-hub) to register this module and stream real-time bounce/complaint events"
  default     = ""
}

variable "enable_serenity_agent" {
  type        = bool
  description = "Whether to provision the scoped IAM role for serenity-agent-ses (used by the Serenity-Ops AI orchestrator after human approval)"
  default     = true
}
