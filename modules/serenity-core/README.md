<div align="center">

# 🏛️ Serenity-Core (`modules/serenity-core`)

**Serverless Core Hub, Central DynamoDB Auto-Discovery Table & Live Web Console ($0/hr Idle Cost) for Serenity-Ops.**

[![Terraform](https://img.shields.io/badge/Terraform-%3E%3D_1.10-7B42BC?style=flat-square&logo=terraform&logoColor=white)](../../README.md)
[![AWS](https://img.shields.io/badge/AWS-DynamoDB_%7C_CloudFront_OAC_%7C_Lambda_ARM64-FF9900?style=flat-square&logo=amazon-web-services&logoColor=white)](https://aws.amazon.com/)

<code>source = "github.com/e-serenity/serenity-ops//modules/serenity-core"</code>

</div>

## Overview

`serenity-core` provisions the serverless core resources of the **[Serenity-Ops](../../README.md)** platform (no VPC, NAT Gateway, or ECS cluster required):

- **Central DynamoDB Hub (`dynamodb.tf`):** Single-Table Design (`serenity-ops-hub`) with `PAY_PER_REQUEST` billing and native **AWS DynamoDB TTL** enabled (`ttl` attribute) for automatic history expiration without cron jobs.
- **Serverless Live Web Console (`frontend.tf`, `api.tf`, `front/`, `lambda/api/`):** Private S3 bucket, CloudFront Origin Access Control (OAC), `$0/mo` Edge IPv4/IPv6 CIDR filtering (`dashboard_allowed_ips`), and ARM64 Python 3.12 Live API Lambda (`/api/state` & `/api/chat`).

## Usage

```hcl
module "serenity_core" {
  source = "github.com/e-serenity/serenity-ops//modules/serenity-core"

  project_name          = "serenity-ops"
  environment           = "prod"
  region                = "eu-west-3"
  dashboard_allowed_ips = ["203.0.113.10/32"]
}
```

## `serenity-core` Module Inputs

| Name | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| `project_name` | Project name and resource prefix | `string` | `"serenity-ops"` |
| `environment` | Deployment environment (`dev`, `preprod`, `prod`) | `string` | `"preprod"` |
| `region` | Target AWS region | `string` | `"eu-west-3"` |
| `tags` | Additional tags applied to module resources | `map(string)` | `{}` |
| `enable_dynamodb_hub` | Provision central `serenity-ops-hub` DynamoDB table | `bool` | `true` |
| `dynamodb_hub_table_name` | Custom DynamoDB Hub table name | `string` | `""` |
| `dynamodb_enable_pitr` | Enable Point-in-Time Recovery on the Hub table | `bool` | `false` |
| `enable_dashboard` | Deploy Private S3 + CloudFront OAC + Live API Lambda | `bool` | `true` |
| `dashboard_allowed_ips` | Allowed IPv4/IPv6 CIDRs at CloudFront Edge (`$0/mo`) | `list(string)` | `[]` |
| `dashboard_price_class` | CloudFront distribution price class | `string` | `"PriceClass_100"` |

## `serenity-core` Module Outputs

| Name | Description |
| :--- | :--- |
| `dashboard_url` | HTTPS URL of the live Serenity-Ops Web Console (CloudFront) |
| `dashboard_cloudfront_id` | CloudFront Distribution ID for the Web Console |
| `dashboard_s3_bucket_name` | Private S3 bucket name hosting the Web Console |
| `dynamodb_hub_table_name` | Name of the central `serenity-ops-hub` DynamoDB table |
| `dynamodb_hub_table_arn` | ARN of the central `serenity-ops-hub` DynamoDB table |

## Requirements & Providers

| Name | Version |
| :--- | :--- |
| `terraform` | `>= 1.10.0` |
| `aws` (`hashicorp/aws`) | `>= 6.50.0` |
| `archive` (`hashicorp/archive`) | `>= 2.4.0` |
| `random` (`hashicorp/random`) | `>= 3.6.0` |
