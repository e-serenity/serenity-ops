# Security Policy & Threat Model

**Serenity-Ops** runs inside the customer's AWS account with network isolation, least-privilege IAM boundaries, and human validation for all infrastructure mutations.

## Defense-in-Depth Architecture

### 1. Data Sovereignty & Zero External Ingestion
- All logs, metrics, traces, and incident states stay inside your AWS account (`CloudWatch`, `DynamoDB serenity-ops-hub`, `S3`).
- AI inference uses **AWS Bedrock** (`Converse API`) inside your AWS region (optionally routed through a Private VPC Interface Endpoint so prompts do not traverse the public internet).

### 2. Zero Inbound Ports (`serenity-bot`)
- The `serenity-bot` ECS service runs in private subnets with no public IP and no Application Load Balancer (ALB).
- Communication with Slack uses **Slack Socket Mode** (outbound-only TLS WebSocket connection). No inbound webhook ports are exposed to the internet.

### 3. Web Console Edge Protection (`serenity-ops`)
- **Private S3 + CloudFront OAC:** Static frontend assets are stored in a private S3 bucket (`block_public_acls = true`, `block_public_policy = true`) accessible only by CloudFront via Origin Access Control (OAC).
- **Edge IPv4 & IPv6 Allowlisting (`dashboard_allowed_ips`):** When configured, a CloudFront Function (`viewer-request`) enforces your CIDR allowlist at the AWS Edge before requests reach S3 or the Live API Lambda. If only IPv4 CIDRs are provided, IPv6 (`AAAA`) is disabled on the distribution to prevent dual-stack bypasses or blocks.
- **Origin Secret Header Verification:** CloudFront injects a random 32-character `x-serenity-origin-secret` header into requests forwarded to `/api/*`. The Live API Lambda rejects direct invocations missing this header with `HTTP 403 Forbidden`.

### 4. 3-Layer AI IAM Governance & Human-in-the-Loop
1. **Mode 1: Autonomous Read (`READ AUTO`):** The base `serenity-bot` orchestrator only holds read-only permissions to investigate alerts, correlate logs/commits, and answer operator questions.
2. **Mode 2: Mandatory Human Approval (`WRITE ON APPROVAL`):** Any write operation proposed by the AI generates a `PENDING` approval card in both Slack and the Web Console. No mutation runs until an operator clicks **Approve**.
3. **Mode 3: Tag-Scoped Domain Sub-Agents (`sts:AssumeRole`):** Write permissions are isolated in dedicated per-module IAM roles (`serenity-agent-cw`, `serenity-agent-ses`). Destructive or mutating actions on existing resources are restricted by AWS IAM policy conditions requiring the tag `ManagedBy = serenity-ops`:
   ```json
   "Condition": {
     "StringEquals": {
       "aws:ResourceTag/ManagedBy": "serenity-ops"
     }
   }
   ```

## Reporting a Vulnerability

If you discover a security vulnerability in **Serenity-Ops** or any of its modules:

1. **Do not open a public GitHub issue.**
2. Report the issue privately via **[https://e-serenity.fr](https://e-serenity.fr)** or by emailing `contact@e-serenity.fr`.
3. Include a description of the issue, reproduction steps, and the affected module (`serenity-core`, `serenity-bot`, or `serenity-ses`).

We acknowledge security reports within 48 hours and provide a remediation plan or patch within 7 days.
