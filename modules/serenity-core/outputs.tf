output "dynamodb_hub_table_name" {
  description = "Central DynamoDB Hub table name (serenity-ops-hub)"
  value       = var.enable_dynamodb_hub ? aws_dynamodb_table.hub[0].name : null
}

output "dynamodb_hub_table_arn" {
  description = "Central DynamoDB Hub table ARN"
  value       = var.enable_dynamodb_hub ? aws_dynamodb_table.hub[0].arn : null
}

output "dashboard_url" {
  description = "HTTPS URL of the Serenity-Ops Web Dashboard (CloudFront)"
  value       = var.enable_dashboard ? "https://${aws_cloudfront_distribution.dashboard[0].domain_name}" : null
}

output "dashboard_cloudfront_id" {
  description = "CloudFront Distribution ID for the Web Dashboard"
  value       = var.enable_dashboard ? aws_cloudfront_distribution.dashboard[0].id : null
}

output "dashboard_s3_bucket_name" {
  description = "Private S3 bucket name hosting the Web Dashboard"
  value       = var.enable_dashboard ? aws_s3_bucket.dashboard[0].id : null
}
