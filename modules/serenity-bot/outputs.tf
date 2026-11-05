output "service_name" {
  description = "Name of the deployed ECS service"
  value       = module.ecs_service.name
}

output "service_id" {
  description = "ID of the deployed ECS service"
  value       = module.ecs_service.id
}

output "tasks_iam_role_arn" {
  description = "ARN of the ECS task IAM role"
  value       = module.ecs_service.tasks_iam_role_arn
}

output "secrets_manager_secret_arn" {
  description = "ARN of the AWS Secrets Manager secret storing bot credentials"
  value       = module.secrets_manager.secret_arn
}

output "ecr_repository_url" {
  description = "URL of the AWS ECR repository for the bot container image (null when a custom image URI is provided)"
  value       = local.ecr_repository_url
}

output "vpc_id" {
  description = "VPC ID (created or existing when ECS cluster is managed by serenity-bot; null when using an external cluster_arn)"
  value       = local.vpc_id
}

output "public_subnet_ids" {
  description = "Created public subnet IDs (empty when using an existing VPC or external cluster_arn)"
  value       = local.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs used by the ECS tasks"
  value       = local.private_subnet_ids
}

output "ecs_cluster_id" {
  description = "ECS Managed Instances cluster ID (when created by serenity-bot)"
  value       = local.create_ecs_cluster ? aws_ecs_cluster.this[0].id : null
}

output "ecs_cluster_arn" {
  description = "Effective ECS cluster ARN (created or provided)"
  value       = local.effective_cluster_arn
}

output "ecs_cluster_name" {
  description = "ECS Managed Instances cluster name (when created by serenity-bot)"
  value       = local.create_ecs_cluster ? aws_ecs_cluster.this[0].name : null
}

output "ecs_capacity_provider_name" {
  description = "Effective ECS Managed Instances capacity provider name (created or provided)"
  value       = local.effective_capacity_provider_name
}

output "platform_alarms_sns_topic_arn" {
  description = "ARN of the SNS topic receiving platform self-monitoring CloudWatch alarms (null when enable_platform_alarms = false)"
  value       = var.enable_platform_alarms ? aws_sns_topic.platform_alarms[0].arn : null
}

output "platform_alarms_cloudwatch_alarm_arns" {
  description = "List of ARNs of created CloudWatch alarms monitoring the Serenity-Ops platform"
  value = var.enable_platform_alarms ? compact([
    aws_cloudwatch_metric_alarm.ecs_high_cpu[0].arn,
    aws_cloudwatch_metric_alarm.ecs_high_memory[0].arn,
    aws_cloudwatch_metric_alarm.bot_error_logs[0].arn,
    local.enable_hub ? aws_cloudwatch_metric_alarm.dynamodb_system_errors[0].arn : "",
    local.enable_hub ? aws_cloudwatch_metric_alarm.dynamodb_throttled_requests[0].arn : "",
  ]) : []
}
