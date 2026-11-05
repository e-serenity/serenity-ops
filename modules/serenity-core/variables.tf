variable "project_name" {
  description = "Project name and resource prefix (e.g., serenity-ops)"
  type        = string
  default     = "serenity-ops"
}

variable "environment" {
  description = "Deployment environment (e.g., dev, preprod, prod)"
  type        = string
  default     = "preprod"
}

variable "region" {
  description = "Target AWS region"
  type        = string
  default     = "eu-west-3"
}

variable "tags" {
  description = "Additional tags applied to module resources"
  type        = map(string)
  default     = {}
}

variable "enable_dynamodb_hub" {
  description = "Enable central DynamoDB Hub table (Single-Table Design for module discovery, state and audit)"
  type        = bool
  default     = true
}

variable "dynamodb_hub_table_name" {
  description = "Custom DynamoDB Hub table name (defaults to <project_name>-<environment>-hub)"
  type        = string
  default     = ""
}

variable "dynamodb_enable_pitr" {
  description = "Enable Point-in-Time Recovery (PITR) on the DynamoDB Hub table"
  type        = bool
  default     = false
}

variable "enable_dashboard" {
  description = "Enable Serenity-Ops Web Dashboard (Private S3 + CloudFront OAC + Live API Lambda)"
  type        = bool
  default     = true
}

variable "dashboard_allowed_ips" {
  description = "Allowed IPv4 or IPv6 addresses/CIDRs for the Web Dashboard via CloudFront Function (empty disables IP filtering)"
  type        = list(string)
  default     = []
}

variable "dashboard_price_class" {
  description = "CloudFront price class for the Web Dashboard (PriceClass_100, PriceClass_200, PriceClass_All)"
  type        = string
  default     = "PriceClass_100"
}
