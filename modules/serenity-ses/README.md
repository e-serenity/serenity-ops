<div align="center">

# 📧 Serenity-SES (`modules/serenity-ses`)

**Automated AWS SES v2 Reputation Protection, Managed Dedicated IPs & AI-Optional Governance.**

[![GitHub Module](https://img.shields.io/badge/Terraform_Module-e--serenity%2Fserenity--ops%2F%2Fmodules%2Fserenity--ses-7B42BC?style=flat-square&logo=terraform&logoColor=white)](https://github.com/e-serenity/serenity-ops/tree/main/modules/serenity-ses)
[![AWS SES v2](https://img.shields.io/badge/AWS-SES_v2_%7C_Lambda_ARM64_%7C_DynamoDB-FF9900?style=flat-square&logo=amazon-web-services&logoColor=white)](https://aws.amazon.com/ses/)
[![AI-Optional](https://img.shields.io/badge/Architecture-Standalone_or_AI--Assisted-10B981?style=flat-square)](#deployment-modes)

<code>source = "github.com/e-serenity/serenity-ops//modules/serenity-ses"</code>

</div>

## Why `serenity-ses`?

A hard **Bounce rate > 5%** or **Complaint rate > 0.1%** can cause AWS to place your SES account under probation and block your transactional emails.

**`serenity-ses`** deploys a serverless AWS SES v2 reputation protection pipeline that runs either standalone or connected to the **[Serenity-Ops](../..)** platform:

- **Managed Dedicated IP Pool (`MANAGED`):** Provisions and warms up your dedicated AWS SES v2 IPs with a pre-wired Configuration Set.
- **Real-Time Feedback Pipeline (`SNS -> SQS -> ARM64 Lambda`):** Captures `Bounce`, `Complaint`, and `DeliveryDelay` events, archives them in DynamoDB with native TTL, and tracks your sender reputation.
- **AI-Optional:** Works out of the box without AI. When connected to `serenity-ops` and `serenity-bot`, it streams live telemetry to the Web Console and enables the scoped **`serenity-agent-ses`** sub-agent (Suppression List quarantine & SPF/DKIM/DMARC auditing under human approval).

## Deployment Modes

### Option 1: Standalone Mode (Pure SES Reputation Protection, without `serenity-ops`)

```hcl
module "ses" {
  source = "github.com/e-serenity/serenity-ops//modules/serenity-ses"

  name_prefix = "my-company"
  environment = "prod"
}
```

### Option 2: Hub-Coupled Mode (`serenity-ops` Web Console + `serenity-agent-ses` AI Sub-Agent)

```hcl
module "ses" {
  source = "github.com/e-serenity/serenity-ops//modules/serenity-ses"

  name_prefix             = "serenity-prod"
  environment             = "prod"
  serenity_ops_table_name = module.serenity_core.dynamodb_hub_table_name
  enable_serenity_agent   = true
}
```

## Scoped Sub-Agent IAM Boundary (`serenity-agent-ses`)

When `enable_serenity_agent = true`, the module provisions the `serenity-agent-ses` IAM role, which `serenity-bot` can assume only after explicit human approval (`Approve`):
- **Read Scope:** SES v2 account reputation metrics, sending quotas, verified identities, and DNS verification (`SPF`, `DKIM`, `DMARC`).
- **Scoped Write Boundary:** Adding/removing hard-bounced addresses in the *Account Suppression List* (`sesv2:PutSuppressedDestination`) and modifying only resources tagged with `aws:ResourceTag/ManagedBy = serenity-ops`.

## `serenity-ses` Module Inputs

| Name | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| `name_prefix` | Prefix applied to all created AWS SES, SNS, SQS, Lambda, and DynamoDB resources | `string` | n/a *(required)* |
| `environment` | Deployment environment name (`dev`, `preprod`, `prod`) | `string` | `"prod"` |
| `tags` | Common tags applied to all created resources | `map(string)` | `{}` |
| `serenity_ops_table_name` | Name of the central Serenity-Ops DynamoDB Hub table (`serenity-ops-hub`) to register this module and stream real-time events | `string` | `""` |
| `enable_serenity_agent` | Whether to provision the scoped IAM role for `serenity-agent-ses` (used by the Serenity-Ops AI orchestrator after human approval) | `bool` | `true` |

## `serenity-ses` Module Outputs

| Name | Description |
| :--- | :--- |
| `configuration_set` | The ID of the configuration set to set on SES identities for using features of this module |
| `dedicated_pool_name` | Name of the managed dedicated IP pool |
| `agent_role_arn` | ARN of the scoped IAM role `serenity-agent-ses` for AI orchestrator delegation |
| `sns_topic_arn` | ARN of the SNS topic receiving SES sending reports |
| `sqs_queue_arn` | ARN of the SQS queue buffering sending reports |

## Requirements & Providers

| Name | Version |
| :--- | :--- |
| `terraform` | `>= 1.10.0` |
| `aws` (`hashicorp/aws`) | `>= 6.0.0` |
| `archive` (`hashicorp/archive`) | `>= 2.4.0` |

