output "dynamodb_hub_table_name" {
  description = "Central DynamoDB Hub table name"
  value       = module.serenity_core.dynamodb_hub_table_name
}

output "dynamodb_hub_table_arn" {
  description = "Central DynamoDB Hub table ARN"
  value       = module.serenity_core.dynamodb_hub_table_arn
}

output "dashboard_url" {
  description = "HTTPS URL of the Serenity-Ops Web Dashboard (CloudFront)"
  value       = module.serenity_core.dashboard_url
}

output "bot_ecs_cluster_arn" {
  description = "ECS Managed Instances cluster ARN (when enable_bot = true)"
  value       = local.enable_bot ? module.serenity_bot[0].ecs_cluster_arn : null
}

output "bot_vpc_id" {
  description = "Bot VPC ID (when enable_bot = true and created/managed by serenity-bot)"
  value       = local.enable_bot ? module.serenity_bot[0].vpc_id : null
}

output "bot_ecr_repository_url" {
  description = "Bot ECR Repository URL (when enable_bot = true)"
  value       = local.enable_bot ? module.serenity_bot[0].ecr_repository_url : null
}
