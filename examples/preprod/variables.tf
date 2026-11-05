variable "dashboard_allowed_ips" {
  description = "Allowed IPv4 or IPv6 CIDRs for the CloudFront Web Dashboard (can be set in gitignored terraform.auto.tfvars)"
  type        = list(string)
  default     = []
}

variable "bot_initial_secrets" {
  description = "Optional initial secrets map to seed into AWS Secrets Manager upon creation (can be set in gitignored terraform.auto.tfvars)"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "application_context" {
  description = "Custom application and workload context injected into the Serenity-Bot AI prompt (can be set in gitignored terraform.auto.tfvars)"
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
  default = null
}
