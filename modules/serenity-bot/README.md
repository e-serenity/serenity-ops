<div align="center">

# 🤖 Serenity-Bot (`modules/serenity-bot`)

**Autonomous RCA & Human-in-the-Loop AI Orchestrator for AWS, Powered by Bedrock & Slack Socket Mode.**

[![GitHub Module](https://img.shields.io/badge/Terraform_Module-e--serenity%2Fserenity--ops%2F%2Fmodules%2Fserenity--bot-7B42BC?style=flat-square&logo=terraform&logoColor=white)](https://github.com/e-serenity/serenity-ops/tree/main/modules/serenity-bot)
[![AWS Bedrock](https://img.shields.io/badge/AI-AWS_Bedrock_(Claude_Sonnet)-FF9900?style=flat-square&logo=amazon-web-services&logoColor=white)](https://aws.amazon.com/bedrock/)
[![Zero Inbound Ports](https://img.shields.io/badge/Network-Slack_Socket_Mode_(0_Inbound_Ports)-10B981?style=flat-square)](ecs-service.tf)
[![Standalone or Hub](https://img.shields.io/badge/Mode-Self--Contained_VPC_&_ECS_%7C_BYO_ECS_Cluster-3B82F6?style=flat-square)](#deployment-modes)

[Key Capabilities](#key-capabilities) · [Security Model (2 Modes)](#security--iam-permission-model) · [Deployment Modes](#deployment-modes) · [Container Image: Default `:stable` vs Private AWS ECR](#container-image-default-stable-vs-private-aws-ecr-recommended-for-production) · [Inputs](#serenity-bot-module-inputs) · [Outputs](#serenity-bot-module-outputs)

<code>source = "github.com/e-serenity/serenity-ops//modules/serenity-bot"</code>

</div>

## Key Capabilities

**Serenity-Bot** is the AI CloudSecOps & AIOps orchestrator of the **[Serenity-Ops](../..)** suite. It runs as a private container on **AWS ECS (ARM64)** with no inbound ports exposed to the internet via **Slack Socket Mode**, and communicates privately with **AWS Bedrock**.

1. **Real-Time Alert Analysis (RCA):** Listens to your Slack alert channels (where invited) or EventBridge, correlates signals across AWS services where it holds read permissions (`CloudWatch`, `CloudTrail`, `ECS`, `RDS`, `X-Ray`, `Config`...) as well as your opt-in integrations (`GitHub`, `GitLab`, `Datadog`, `Grafana`), and posts an actionable Root Cause Analysis in-thread.
2. **Web & Slack Chatbot:** Answers infrastructure, log, and deployment questions in real time (*"Which alarms are currently firing?"*, *"Which GitLab commit caused the RDS latency spike?"*) via Slack or inside the `serenity-ops` Web Console.
3. **Human-in-the-Loop Remediation:** Proposes and executes write actions (either directly or by assuming scoped sub-agent IAM roles such as `serenity-agent-cw` or `serenity-agent-ses`) only after explicit human approval.
4. **Self-Contained by Default or Bring-Your-Own ECS Cluster:** By default (`cluster_arn = ""`), `serenity-bot` provisions its own dedicated VPC, NAT Gateway, S3 & Bedrock VPC Endpoints, and ARM64 ECS Managed Instances cluster. If you pass an existing `cluster_arn`, `serenity-bot` skips VPC and ECS cluster creation and deploys the service directly onto your existing infrastructure.

## Security & IAM Permission Model

| Operating Mode | Permission Scope | Human Approval | Primary Use Cases |
| :--- | :--- | :---: | :--- |
| **Mode 1: Global Read (`READ AUTO`)** | Cross-service AWS read access (`ReadOnlyAccess`) + opt-in Terraform connectors (`GitLab`, `Datadog`...) | ❌ Not required (autonomous) | Automated Alert RCA, log/commit correlation, and Chatbot queries. |
| **Mode 2: Controlled Write (`WRITE ON APPROVAL`)** | Direct write actions or `sts:AssumeRole` delegation to tag-scoped sub-agents (`ManagedBy=serenity-ops`) | ✅ **Mandatory** (`Approve` / `Reject` via Slack or Web) | Creating CloudWatch alarms, quarantining SES bounced addresses, service rollbacks. |

## Deployment Modes

### Option 1: Default Mode (Creates VPC, Endpoints & ECS Cluster Automatically)

By default, no networking or ECS variables are required. `serenity-bot` provisions its own VPC, NAT Gateway, VPC Endpoints (S3 Gateway + Bedrock Runtime), and ARM64 ECS Managed Instances cluster, and pulls the pre-built `ghcr.io/e-serenity/serenity-bot:stable` image so the service starts on the first `terraform apply`:

```hcl
module "serenity_bot" {
  source = "github.com/e-serenity/serenity-ops//modules/serenity-bot"

  application        = "serenity-bot"
  environment        = "prod"
  region             = "eu-west-3"
  single_nat_gateway = true

  # Optional: couple to Serenity-Ops Hub (or leave empty "" for Slack-only mode)
  dynamodb_table_name    = module.serenity_core.dynamodb_hub_table_name
  history_retention_days = 90

  enable_gitlab          = true
  enable_datadog         = true

  # Custom application & architecture context for AI RCA grounding
  application_context = {
    organization_name = "My Company"
    services = [
      {
        name        = "order-api"
        tech_stack  = "Node.js / Express / Redis"
        repository  = "github.com/my-org/order-service"
        log_group   = "/aws/ecs/prod-order-api"
        criticality = "HIGH"
      }
    ]
  }
}
```

### Option 2: Bring-Your-Own ECS Cluster (No VPC Creation)

Already have an ECS cluster? Pass `cluster_arn`, `capacity_provider_name`, and `subnet_ids`. `serenity-bot` deploys directly onto your cluster without creating a VPC, NAT Gateway, VPC Endpoints, or ECS cluster:

```hcl
module "serenity_bot" {
  source = "github.com/e-serenity/serenity-ops//modules/serenity-bot"

  application            = "serenity-bot"
  environment            = "prod"
  region                 = "eu-west-3"
  cluster_arn            = var.ecs_cluster_arn
  capacity_provider_name = var.ecs_capacity_provider_name
  subnet_ids             = var.private_subnet_ids

  dynamodb_table_name    = module.serenity_core.dynamodb_hub_table_name
}
```

## LLM Configuration & Resilient Fallback (AWS Bedrock & Gemini)

Serenity-Bot uses a resilient multi-provider LLM architecture:

### 1. Primary Engine: AWS Bedrock (Anthropic Claude)
By default, the bot communicates privately with **AWS Bedrock** via VPC Endpoints (`enable_bedrock_endpoint = true`) with zero outbound internet transit.

> [!IMPORTANT]
> **Anthropic Claude on AWS Bedrock (One-Time Use Case Form):**
> Serverless foundation models are now automatically enabled across all AWS commercial regions upon first invocation—the legacy "Model access" page has been retired by AWS. 
> However, for **Anthropic models**, first-time users must submit their company & use case details in the **Amazon Bedrock Console** before access is completed, as required for AWS Marketplace subscription validation.

### 2. Resilient Fallback: Google Gemini API
To prevent downtime when AWS Bedrock access is pending, rate-limited, or undergoing maintenance, Serenity-Bot provides an automated fallback:
* Store your Gemini API key in `GEMINI_APIKEY` inside AWS Secrets Manager (or via `bot_initial_secrets`).
* When configured, the orchestrator automatically routes RCA investigations and chat requests to **Google Gemini** (`gemini-3.5-flash` / `gemini-3.8-flash` / `gemini-3.1-flash-lite`).
* Additional fallback and alternate providers (e.g., OpenAI, Mistral) are planned for future releases.

## Container Image: Default `:stable` vs Private AWS ECR (Recommended for Production)

### 1. Default Behavior (`create_ecr_repository = false`): Quick Evaluation
To let you test `serenity-bot` in a single `terraform apply` without building an ARM64 Docker image first, `image` defaults to our pre-built image:
```hcl
image = "ghcr.io/e-serenity/serenity-bot:stable"
```
> [!NOTE]
> While convenient for evaluation and quickstarts, pulling from an external registry (`ghcr.io`) introduces an external dependency during ECS task launches or restarts.

### 2. Production Best Practice (`create_ecr_repository = true`): Self-Hosted in AWS ECR
For production environments, we recommend hosting the container image inside your own AWS account via **Amazon ECR** so your infrastructure has no external registry dependency:

1. **Enable the private ECR repository in Terraform:**
   ```hcl
   module "serenity_bot" {
     source = "github.com/e-serenity/serenity-ops//modules/serenity-bot"

     application           = "serenity-bot"
     environment           = "prod"
     region                = "eu-west-3"
     create_ecr_repository = true # Creates aws_ecr_repository.this and configures ECS to pull <ecr_url>:prod
     ecr_image_tag         = "prod"
     # ...
   }
   ```
2. **Apply Terraform (or target the ECR repository first):**
   ```bash
   terraform apply -target=module.serenity_bot.aws_ecr_repository.this
   ```
3. **Build the `linux/arm64` image from [`modules/serenity-bot/bot`](./bot) and push it to your ECR repository:**
   *(Works natively on Apple Silicon Macs, or on Linux/Windows x86_64 via `docker buildx`)*
   ```bash
   AWS_REGION="eu-west-3"
   ECR_URL=$(terraform output -raw bot_ecr_repository_url) # e.g. <account_id>.dkr.ecr.eu-west-3.amazonaws.com/serenity-bot

   # Authenticate Docker to your private AWS ECR registry
   aws ecr get-login-password --region "$AWS_REGION" | \
     docker login --username AWS --password-stdin "$ECR_URL"

   # Cross-compile for AWS Graviton (linux/arm64) and push directly to ECR
   docker buildx build \
     --platform linux/arm64 \
     --push \
     -t "${ECR_URL}:prod" \
     ./modules/serenity-bot/bot
   ```
4. **Run the full `terraform apply`** (or force a new ECS deployment if already applied):
   ```bash
   terraform apply
   ```

## `serenity-bot` Module Inputs

| Name | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| `application` | Application and ECS service name | `string` | `"serenity-bot"` |
| `environment` | Deployment environment name (`dev`, `preprod`, `prod`) | `string` | `"preprod"` |
| `region` | Primary AWS region | `string` | `"eu-west-3"` |
| `region_backup` | Optional replica region for AWS Secrets Manager | `string` | `""` |
| `initial_secrets` | Optional initial secrets map merged into AWS Secrets Manager upon creation (`ignore_secret_changes = true`) | `map(string)` | `{}` |
| `tags` | Common tags applied to all created resources | `map(string)` | `{}` |
| `cluster_arn` | Optional ARN of an existing ECS cluster. Leave empty (`""`) to provision dedicated cluster and VPC | `string` | `""` |
| `capacity_provider_name` | Name of the ECS Managed Instances capacity provider (required when `cluster_arn` is provided) | `string` | `""` |
| `subnet_ids` | Existing private subnet IDs for ECS tasks (required when `cluster_arn` is provided or `create_vpc = false`) | `list(string)` | `[]` |
| `create_vpc` | Provision dedicated VPC, subnets, NAT Gateway(s), and VPC endpoints when `cluster_arn` is empty | `bool` | `true` |
| `vpc_cidr` | CIDR block for the created VPC | `string` | `"10.0.0.0/16"` |
| `availability_zones` | List of Availability Zones (defaults to 3 AZs in target region when empty) | `list(string)` | `[]` |
| `public_subnet_cidrs` | Public subnet CIDR blocks (used when `create_vpc = true` and `cluster_arn` is empty) | `list(string)` | `["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]` |
| `private_subnet_cidrs` | Private subnet CIDR blocks for ECS workloads | `list(string)` | `["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]` |
| `enable_nat_gateway` | Whether to provision NAT Gateway(s) for private subnets | `bool` | `true` |
| `single_nat_gateway` | When `true`, provisions a single shared NAT Gateway across all AZs | `bool` | `false` |
| `existing_vpc_id` | Existing VPC ID (required when `cluster_arn` is empty and `create_vpc = false`) | `string` | `""` |
| `existing_private_route_table_ids` | Existing private route table IDs for S3 Gateway VPC Endpoint | `list(string)` | `[]` |
| `enable_s3_endpoint` | Enable free S3 Gateway VPC Endpoint when ECS cluster is managed by `serenity-bot` | `bool` | `true` |
| `enable_bedrock_endpoint` | Enable AWS Bedrock Runtime Interface VPC Endpoint when ECS cluster is managed by `serenity-bot` | `bool` | `true` |
| `ecs_cluster_name` | Custom ECS cluster name (defaults to `<application>-<environment>-cluster-managed`) | `string` | `""` |
| `ecs_container_insights` | ECS Container Insights mode (`enhanced`, `enabled`, `disabled`) | `string` | `"enhanced"` |
| `ecs_allowed_instance_types` | Allowed EC2 instance types or families for ECS Managed Instances | `list(string)` | `["m8g.*", "m7g.*", "m6g.*", "m6a.*", "t4g.*"]` |
| `ecs_instance_min_vcpu` | Minimum vCPU count for ECS Managed Instances selection | `number` | `1` |
| `ecs_instance_min_memory_mib` | Minimum memory (in MiB) for ECS Managed Instances selection | `number` | `128` |
| `ecs_burstable_performance` | Burstable instance policy (`included`, `required`, `excluded`) | `string` | `"included"` |
| `image` | Container image URI used when `create_ecr_repository = false` | `string` | `"ghcr.io/e-serenity/serenity-bot:stable"` |
| `create_ecr_repository` | Provision private AWS ECR repository in your account and configure ECS to pull from it | `bool` | `false` |
| `ecr_image_tag` | Image tag pulled from private ECR repository (defaults to `var.environment` when empty) | `string` | `""` |
| `cpu` | CPU units allocated to ECS task (1024 = 1 vCPU) | `number` | `1024` |
| `memory` | Memory in MiB allocated to ECS task (1024 = 1 GiB) | `number` | `1024` |
| `enable_datadog` | Enable Datadog integration (Monitors, Logs, APM, Events via MCP / OTLP) | `bool` | `false` |
| `enable_gitlab` | Enable GitLab integration (Commits, Merge Requests, CI/CD Pipelines, Code Search) | `bool` | `false` |
| `gitlab_allowed_namespace` | Optional allowed GitLab group/namespace prefix (e.g., `'my-org/'`) | `string` | `""` |
| `enable_github` | Enable GitHub integration (Pull Requests, Actions, Commits) | `bool` | `false` |
| `enable_grafana` | Enable Grafana / Prometheus integration | `bool` | `false` |
| `history_retention_days` | Retention period in days for incident history, chat, and audit records via DynamoDB TTL | `number` | `90` |
| `dynamodb_table_name` | Name of the central `serenity-ops-hub` DynamoDB table (empty for Standalone Slack mode) | `string` | `""` |
| `enable_platform_alarms` | Provision CloudWatch alarms monitoring the Serenity-Ops platform itself | `bool` | `false` |
| `platform_alert_slack_channel` | Slack channel where platform alarms are sent and automatically analyzed by the bot | `string` | `""` |
| `platform_alarms_cpu_threshold` | ECS CPU utilization alarm threshold percentage | `number` | `85` |
| `platform_alarms_memory_threshold` | ECS Memory utilization alarm threshold percentage | `number` | `85` |
| `platform_alarms_error_log_threshold` | Error log events count in 1 minute triggering the bot error log alarm | `number` | `5` |
| `application_context` | Custom business and technical context regarding your workloads (services, tech stacks, repositories, log groups, criticality, runbooks) injected into the AI agent prompt | `object` | `{}` |

## `serenity-bot` Module Outputs

| Name | Description |
| :--- | :--- |
| `service_name` | Name of the deployed ECS service |
| `service_id` | ID of the deployed ECS service |
| `tasks_iam_role_arn` | ARN of the ECS task IAM role |
| `secrets_manager_secret_arn` | ARN of the AWS Secrets Manager secret storing bot credentials |
| `ecr_repository_url` | URL of the AWS ECR repository for the bot container image |
| `vpc_id` | VPC ID (created or existing when ECS cluster is managed by serenity-bot) |
| `public_subnet_ids` | Created public subnet IDs (empty when using an existing VPC or external cluster) |
| `private_subnet_ids` | Private subnet IDs used by the ECS tasks |
| `ecs_cluster_id` | ECS Managed Instances cluster ID (when created by serenity-bot) |
| `ecs_cluster_arn` | Effective ECS cluster ARN (created or provided) |
| `ecs_cluster_name` | ECS Managed Instances cluster name (when created by serenity-bot) |
| `ecs_capacity_provider_name` | Effective ECS Managed Instances capacity provider name (created or provided) |
| `platform_alarms_sns_topic_arn` | ARN of the SNS topic receiving platform self-monitoring CloudWatch alarms |
| `platform_alarms_cloudwatch_alarm_arns` | List of ARNs of created CloudWatch alarms monitoring the Serenity-Ops platform |

## Requirements & Providers

| Name | Version |
| :--- | :--- |
| `terraform` | `>= 1.5.0` |
| `aws` (`hashicorp/aws`) | `>= 6.0.0` |


## Local Python Unit Tests (`bot/`)

```bash
cd bot && uv run pytest -q
```
