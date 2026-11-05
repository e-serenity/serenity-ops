# Slack App Configuration & Integration Guide

This guide details how to configure the Slack Application for **Serenity-Ops**, how alert channels operate, and how to connect incident notification streams.

---

## 1. How Serenity-Ops Works with Slack

Serenity-Ops runs in **Slack Socket Mode** using an outbound WebSocket connection from the ECS container to Slack. No public inbound webhooks or exposed HTTPS endpoints are required.

The bot operates in two distinct ways within your workspace:
1. **Automated Root Cause Analysis (RCA) on Inbound Alerts:** The bot listens for incident notifications posted by monitoring tools (`CloudWatch`, `Datadog`, `Grafana`, `PagerDuty`...) in designated alert channels. When an alert is detected, it automatically initiates an investigation and posts the findings directly **in-thread** with root-cause insights and remediation options.
2. **Interactive Queries & Human-in-the-Loop Remediations:** In any channel where the bot is invited, users can mention `@SerenityOps <query>`. When remediation actions require infrastructure changes (e.g., service restart, rollback, DNS change), the bot posts interactive **Approve / Reject** buttons guarded by approval controls.

> [!IMPORTANT]
> **Fundamental Slack API Rule:**
> Slack will only deliver channel messages to the bot **if the bot has been invited into that channel** using `/invite @SerenityOps`. If the bot is not present in a channel, it cannot see or react to incoming alerts.

---

## 2. Terraform Variables Reference

In your Terraform configuration ([`examples/preprod/locals.tf`](file:///home/serenity/serenity-ops/examples/preprod/locals.tf) or module [`serenity-bot`](file:///home/serenity/serenity-ops/modules/serenity-bot/variables.tf)):

| Variable | Description | Example |
| :--- | :--- | :--- |
| `enable_platform_alarms` | Enables CloudWatch alarms monitoring the Serenity-Ops bot container itself | `true` or `false` |
| `platform_alert_slack_channel` | Channel where the Serenity-Ops SNS Lambda posts its own platform alarms | `"#cloudsecops"` or `"C01234ABCD"` |

### Where Do Alerts Come From?

1. **Application & Infrastructure Workload Alerts:**
   - **AWS CloudWatch:** Sent to your alert channel (e.g. `#alerts-prod`) via **AWS Chatbot** or an SNS/Lambda integration.
   - **Datadog:** Forwarded through the official Datadog Slack integration (e.g. `@slack-alerts-prod` in Monitor notifications).
   - **Grafana / Alertmanager:** Delivered via a Slack *Contact Point*.
   *As soon as the alert appears in a channel where `@SerenityOps` is present, the bot intercepts it and initiates an automated thread investigation.*

2. **Serenity-Ops Platform Self-Monitoring (`enable_platform_alarms`):**
   - When enabled, Terraform provisions an SNS topic and a dedicated `slack-notifier` Lambda function.
   - If ECS CPU/memory spikes or container restarts occur, the Lambda formats the CloudWatch alarm and posts it directly to `platform_alert_slack_channel`.
   - Serenity-Ops intercepts its own platform alert to perform an autonomous self-diagnosis.

---

## 3. App Manifest

Create your Slack App in **[api.slack.com/apps](https://api.slack.com/apps) -> Create New App -> From an app manifest** (choose your target workspace and paste the YAML below):

```yaml
display_information:
  name: SerenityOps
  description: Autonomous CloudSecOps & SRE agent that investigates monitoring alerts and posts Root Cause Analysis in-thread.
  background_color: "#1f2933"
features:
  app_home:
    home_tab_enabled: false
    messages_tab_enabled: true
    messages_tab_read_only_enabled: false
  bot_user:
    display_name: SerenityOps
    always_online: true
oauth_config:
  scopes:
    bot:
      - app_mentions:read
      - channels:history
      - groups:history
      - im:history
      - chat:write
      - chat:write.public
settings:
  event_subscriptions:
    bot_events:
      - app_mention
      - message.channels
      - message.groups
      - message.im
  interactivity:
    is_enabled: true # Required for Human-in-the-Loop Approve/Reject interactive buttons over Socket Mode
  socket_mode_enabled: true
  org_deploy_enabled: false
  token_rotation_enabled: false
```

### OAuth Scopes Breakdown

| Scope | Purpose |
| :--- | :--- |
| `app_mentions:read` | Receive direct `@SerenityOps` mentions from operators |
| `channels:history` | Read alert messages posted in public channels where the bot is a member |
| `groups:history` | Read alert messages posted in private channels where the bot is a member |
| `im:history` | Read direct message history in 1-on-1 conversations with the bot |
| `chat:write` | Post RCA diagnostics and update interactive approval cards (`chat_update`) |
| `chat:write.public` | Post into public channels without requiring prior manual invitation |

---

## 4. Setup & Onboarding Steps

### Step 1: Enable Socket Mode & Generate App Token
1. In the Slack App management console, navigate to **Socket Mode** and enable it (*Enable Socket Mode*).
2. Go to **Basic Information** -> **App-Level Tokens**:
   - Click **Generate Token and Scopes**.
   - Set a name (e.g. `serenity-socket`) and add the **`connections:write`** scope.
   - Copy the token starting with **`xapp-...`** : this is your `SLACK_APP_TOKEN`.

### Step 2: Install App to Workspace & Get Bot Token
1. Navigate to **OAuth & Permissions**.
2. Click **Install to Workspace** (or *Reinstall*) and authorize the permissions.
3. Copy the **Bot User OAuth Token** starting with **`xoxb-...`** : this is your `SLACK_BOT_TOKEN`.

### Step 3: Create Alert Channels & Invite the Bot
1. Create or select your alert channels in Slack (e.g. `#alerts-prod` and `#cloudsecops`).
2. **In each designated channel**, run the invitation command:
   ```text
   /invite @SerenityOps
   ```
   *(alternatively: click channel name at top -> Integrations tab -> Add an App -> SerenityOps).*

> [!TIP]
> **Channel Names vs Channel IDs:**
> You can provide either channel names prefixed with `#` (e.g. `"#alerts-prod"`) or Slack Channel IDs (e.g. `"C0123456789"`). To copy a Channel ID: right-click the channel in Slack -> *Copy link* (the ID is the final alphanumeric segment in the URL).

### Step 4: Verify Integration
- **Direct Mention:** In any channel where the bot is present:
  ```text
  @SerenityOps what is the health status of our services?
  ```
- **Alert Ingestion:** When an alert is posted (via AWS Chatbot, Datadog, or manual test), the bot responds in-thread with:
  ```text
  :mag: *Serenity-Ops* is investigating this alert…
  ```
