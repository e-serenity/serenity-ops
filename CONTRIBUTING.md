# Contributing to Serenity-Ops

Thank you for contributing to **Serenity-Ops**. This repository is structured as a modular Terraform and full-stack monorepo so every component can be developed together while remaining independently deployable.

## Monorepo Structure

```text
serenity-ops/
├── modules/                              # Independently deployable Terraform modules
│   ├── serenity-core/                    # Serverless Core Hub (DynamoDB Hub, CloudFront Web Console & Live API)
│   │   ├── dynamodb.tf / frontend.tf / api.tf
│   │   ├── lambda/api/index.py           # Python 3.12 ARM64 Serverless Live API (/api/state & /api/chat)
│   │   └── front/                        # React 18 + TypeScript + Vite + TailwindCSS Web Console (EN / FR)
│   ├── serenity-bot/                     # AI Orchestrator (VPC/Endpoints/ECS Cluster or BYO-ECS, Bedrock, Slack, Python)
│   └── serenity-ses/                     # AWS SES v2 Reputation, Dedicated IP Pool, Bounce Lambda & Sub-Agent
├── examples/preprod/                     # Complete end-to-end deployment example (S3 native state lock)
└── docs/                                 # Setup guides, Slack manifest, and architecture assets
```

## Local Development & Verification

### 1. Web Console (`modules/serenity-core/front/app`)
Run the interactive Web Console locally with the built-in Demo Simulator (`EN / FR`):

```bash
cd modules/serenity-core/front/app
npm install
npm run dev
```

When modifying the frontend, rebuild the production bundle so `modules/serenity-core/front/output/` stays up to date for Terraform deployments:

```bash
cd modules/serenity-core/front
./build.sh
```

### 2. Python Live API & `serenity-bot` Tests
```bash
# Check Live API Lambda syntax
python3 -m py_compile modules/serenity-core/lambda/api/index.py

# Run Serenity-Bot unit tests
cd modules/serenity-bot/bot
uv run pytest -q
```

### 3. Terraform Formatting & Validation
Before submitting a Pull Request, format and validate all `.tf` files across `modules/*` and `examples/*`:

```bash
terraform fmt -recursive
terraform -chdir=modules/serenity-core init -backend=false
terraform -chdir=modules/serenity-core validate
```

## Coding Standards

- **Language:** Write all code, variable descriptions, outputs, and documentation (`README.md`) in English.
- **Comments:** Avoid comments that restate resource or variable names. Add concise English comments only when explaining non-obvious architectural trade-offs or security boundaries.
- **License:** All contributions are licensed under the [Apache License 2.0](LICENSE).
