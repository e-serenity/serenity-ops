output "configuration_set" {
  description = "The ID of the configuration set to set on SES identities for using features of this module"
  value       = aws_sesv2_configuration_set.configuration_set.configuration_set_name
}

output "dedicated_pool_name" {
  description = "Name of the managed dedicated IP pool"
  value       = aws_sesv2_dedicated_ip_pool.dedicated_pool.pool_name
}

output "agent_role_arn" {
  description = "ARN of the scoped IAM role serenity-agent-ses for AI orchestrator delegation"
  value       = try(aws_iam_role.serenity_agent_ses[0].arn, null)
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic receiving SES sending reports"
  value       = aws_sns_topic.sending_reports_topic.arn
}

output "sqs_queue_arn" {
  description = "ARN of the SQS queue buffering sending reports"
  value       = aws_sqs_queue.sending_reports.arn
}
