export type Language = 'fr' | 'en';

export type RetentionDays = 7 | 30 | 90 | 365;

export interface ModuleInfo {
  id: string;
  name: string;
  title: string;
  description: string;
  registrySource: string;
  version: string;
  isCore?: boolean;
  category: 'core' | 'secops' | 'aiops' | 'finops';
  icon: string;
}

export interface SESStateSummary {
  dmarc: 'valid' | 'invalid' | 'warning';
  spf: 'valid' | 'invalid' | 'warning';
  dkim: 'valid' | 'invalid' | 'warning';
  bounceRate: number;
  complaintRate: number;
  dedicatedIps: {
    ip: string;
    warmup: number;
    status: string;
  }[];
}

export interface EmailEvent {
  id: string;
  timestamp: string;
  type: 'HardBounce' | 'SoftBounce' | 'Complaint';
  recipient: string;
  smtpCode: string;
  reason: string;
  suggestedAction?: string;
  actionStatus?: 'PENDING' | 'APPLIED' | 'REJECTED';
}

export interface CloudWatchAlarm {
  name: string;
  state: 'ALARM' | 'OK' | 'INSUFFICIENT_DATA';
  metric: string;
  namespace: string;
  threshold: string;
  updatedAt: string;
}

export interface IncidentReport {
  id: string;
  timestamp: string;
  kind?: 'ALERT' | 'USER_REQUEST';
  source?: 'Slack (@Serenity-Ops)' | 'Web Console' | 'CloudWatch EventBridge';
  requester?: string;
  trigger: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  mcpTraces: string[];
  rca: string;
  proposedAction?: {
    agent: string;
    action: string;
    target: string;
    status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    details: string;
  };
}

export interface BotChatMessage {
  id: string;
  sender: 'user' | 'bot';
  author: string;
  channel: 'Web Console' | 'Slack #ops-alerts';
  timestamp: string;
  text: string;
  toolsUsed?: string[];
}

export interface AgentInfo {
  name: string;
  role: string;
  privilege: string;
  targetModule: string;
  tools: string[];
  writeScope?: string;
  status: 'ACTIVE' | 'STANDBY';
}
