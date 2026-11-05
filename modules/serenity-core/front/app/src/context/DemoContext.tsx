import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Language,
  RetentionDays,
  ModuleInfo,
  SESStateSummary,
  EmailEvent,
  CloudWatchAlarm,
  IncidentReport,
  BotChatMessage,
  AgentInfo,
} from '../types';

export const getModuleCatalog = (lang: Language): ModuleInfo[] => [
  {
    id: 'serenity-core',
    name: 'serenity-core',
    title: 'Serenity Core',
    description:
      lang === 'fr'
        ? 'Socle central Terraform, registre DynamoDB Hub (serenity-ops-hub), cluster ECS Managed Instances et VPC hybride.'
        : 'Core Terraform foundation, DynamoDB Hub registry (serenity-ops-hub), ECS Managed Instances cluster and hybrid VPC.',
    registrySource: 'github.com/e-serenity/serenity-ops//modules/serenity-core',
    version: '1.0.0',
    isCore: true,
    category: 'core',
    icon: 'Shield',
  },
  {
    id: 'serenity-bot',
    name: 'serenity-bot',
    title: 'Serenity Bot',
    description:
      lang === 'fr'
        ? 'Bot IA autonome (Bedrock Claude & Gemini + Slack Socket Mode) déployable seul avec Slack ou couplé à Serenity-Ops. Analyse les alertes en temps réel via ses accès AWS et ses intégrations activables en variables Terraform (GitLab, GitHub, Datadog, Grafana, MCP...).'
        : 'Autonomous AI Bot (Bedrock Claude & Gemini + Slack Socket Mode) deployable standalone with Slack or coupled with Serenity-Ops. Analyzes alerts in real time via its AWS access and integrations enabled through Terraform variables (GitLab, GitHub, Datadog, Grafana, MCP...).',
    registrySource: 'github.com/e-serenity/serenity-ops//modules/serenity-bot',
    version: '1.2.0',
    category: 'aiops',
    icon: 'Bot',
  },
  {
    id: 'serenity-cloudwatch',
    name: 'serenity-cloudwatch',
    title:
      lang === 'fr'
        ? 'Gestion d’Alarmes CloudWatch'
        : 'CloudWatch Alarm Management',
    description:
      lang === 'fr'
        ? 'Permet de lister et superviser les alarmes CloudWatch existantes et d’en ajouter de nouvelles via son sous-agent aux droits d’écriture strictement limités.'
        : 'Lists and monitors existing CloudWatch alarms and allows adding new alarms via its sub-agent with strictly limited write permissions.',
    registrySource: 'github.com/e-serenity/serenity-ops//modules/serenity-cloudwatch',
    version: '1.1.0',
    category: 'aiops',
    icon: 'Activity',
  },
  {
    id: 'serenity-ses',
    name: 'serenity-ses',
    title:
      lang === 'fr'
        ? 'Délivrabilité & IP Dédiées SES'
        : 'SES Deliverability & Dedicated IPs',
    description:
      lang === 'fr'
        ? 'Pool d’IP dédiées gérées, warming automatique, monitoring DMARC/SPF/DKIM et traitement IA des retours d’emails.'
        : 'Managed dedicated IP pool, automated IP warm-up, DMARC/SPF/DKIM monitoring and AI-driven bounce & complaint handling.',
    registrySource: 'github.com/e-serenity/serenity-ops//modules/serenity-ses',
    version: '2.0.0',
    category: 'secops',
    icon: 'Mail',
  },
  {
    id: 'serenity-iam',
    name: 'serenity-iam',
    title: 'Zero-Trust IAM Auditor',
    description:
      lang === 'fr'
        ? 'Audit en continu des privilèges IAM, détection des clés dormantes et nettoyage assisté par IA.'
        : 'Continuous IAM privilege auditing, dormant access key detection and AI-assisted least-privilege cleanup.',
    registrySource: 'github.com/e-serenity/serenity-ops//modules/serenity-iam',
    version: '0.9.0',
    category: 'secops',
    icon: 'Key',
  },
  {
    id: 'serenity-finops',
    name: 'serenity-finops',
    title: 'FinOps & Cost Optimization',
    description:
      lang === 'fr'
        ? 'Analyse fine des coûts AWS, détection des ressources orphelines et recommandations de resizing.'
        : 'Granular AWS cost analysis, orphan resource detection and Human-in-the-Loop right-sizing recommendations.',
    registrySource: 'github.com/e-serenity/serenity-ops//modules/serenity-finops',
    version: '0.8.0',
    category: 'finops',
    icon: 'DollarSign',
  },
];

export const MODULE_CATALOG: ModuleInfo[] = getModuleCatalog('fr');

export const getAgentsList = (lang: Language): AgentInfo[] => [
  {
    name: 'serenity-bot (Agent Central)',
    role:
      lang === 'fr'
        ? 'Bot de base (Standalone Slack ou couplé à Serenity-Ops) : Analyse d’alertes temps réel & Chatbot via ses accès AWS et ses intégrations activées en variables Terraform'
        : 'Base Bot (Standalone Slack or coupled with Serenity-Ops): Real-Time Alert Analysis & Chatbot via its AWS access and integrations enabled through Terraform variables',
    privilege: 'READ (AUTO) + WRITE ON APPROVAL',
    targetModule: 'serenity-bot',
    tools: [
      'AWS ReadOnlyAccess (ECS, EC2, RDS, ElastiCache, IAM, VPC, Logs...)',
      'Intégrations Terraform (GitLab, GitHub, Datadog, Grafana, MCP...)',
      'Slack Socket Mode (#ops-alerts, #prod-incidents)',
      'Actions sous validation : ECS Force Redeploy, CI/CD Retry, Incident Wiki',
    ],
    writeScope:
      lang === 'fr'
        ? 'Écriture déverrouillée uniquement après clic [Approuver] sur Slack ou Web (confirmations.py)'
        : 'Write actions unlocked only after clicking [Approve] on Slack or Web (confirmations.py)',
    status: 'ACTIVE',
  },
  {
    name: 'serenity-agent-cw',
    role:
      lang === 'fr'
        ? 'Sous-Agent CloudWatch : Permet de lister les alarmes existantes et d’en ajouter de nouvelles (modification/suppression limitée aux alarmes créées par l’agent)'
        : 'CloudWatch Sub-Agent: Lists existing alarms and adds new ones (modifications/deletions strictly limited to agent-created alarms)',
    privilege: 'SCOPED WRITE (ON APPROVAL)',
    targetModule: 'serenity-cloudwatch',
    tools: [
      'cloudwatch:DescribeAlarms (List existing)',
      'cloudwatch:PutMetricAlarm (Add w/ Tag: ManagedBy=serenity-ops)',
      'cloudwatch:DeleteAlarms (Condition: ManagedBy=serenity-ops)',
    ],
    writeScope:
      lang === 'fr'
        ? 'Droit d’écriture très limité : uniquement les alarmes CloudWatch tagguées ManagedBy=serenity-ops'
        : 'Strictly limited write scope: only CloudWatch alarms tagged ManagedBy=serenity-ops',
    status: 'ACTIVE',
  },
  {
    name: 'serenity-agent-ses',
    role:
      lang === 'fr'
        ? 'Sous-Agent SES : Gouvernance de délivrabilité, warm-up d’IP dédiées et gestion de la Suppression List SES sous validation humaine'
        : 'SES Sub-Agent: Deliverability governance, dedicated IP warm-up and SES Suppression List management under human approval',
    privilege: 'SCOPED WRITE (ON APPROVAL)',
    targetModule: 'serenity-ses',
    tools: [
      'sesv2:PutSuppressedDestination (ManagedBy=serenity-ops)',
      'sesv2:PutDedicatedIpWarmupAttributes',
      'DNS & Reputation Diagnostics (Read-Only)',
    ],
    writeScope:
      lang === 'fr'
        ? 'Droit d’écriture limité au périmètre SES (Suppression List & Pool d’IP dédiées gérées)'
        : 'Write scope strictly limited to SES (Suppression List & managed dedicated IP pool)',
    status: 'ACTIVE',
  },
];

export const AGENTS_LIST: AgentInfo[] = getAgentsList('fr');

interface DemoContextType {
  isLiveMode: boolean;
  hasLiveBackend: boolean;
  setMode: (mode: 'live' | 'demo') => void;
  accountId: string;
  environment: string;
  region: string;
  hubTableName: string;
  refreshLiveState: () => Promise<void>;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (fr: string, en: string) => string;
  modules: ModuleInfo[];
  agents: AgentInfo[];
  installedModules: Set<string>;
  toggleModule: (moduleId: string) => void;
  retentionDays: RetentionDays;
  setRetentionDays: (days: RetentionDays) => void;
  sesSummary: SESStateSummary;
  emailEvents: EmailEvent[];
  cloudWatchAlarms: CloudWatchAlarm[];
  incidents: IncidentReport[];
  chatMessages: BotChatMessage[];
  sendChatMessage: (text: string) => void;
  approveAction: (incidentId: string) => void;
  rejectAction: (incidentId: string) => void;
  applyEmailAction: (eventId: string) => void;
}

const DemoContext = createContext<DemoContextType | null>(null);

const DEFAULT_DEMO_MODULES = ['serenity-core', 'serenity-bot', 'serenity-ses', 'serenity-cloudwatch'];

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('serenity_lang') : null;
    return saved === 'en' || saved === 'fr' ? saved : 'fr';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('serenity_lang', lang);
    }
  };

  const t = (fr: string, en: string) => (language === 'fr' ? fr : en);

  const [hasLiveBackend, setHasLiveBackend] = useState<boolean>(false);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [accountId, setAccountId] = useState<string>('123456789012');
  const [environment, setEnvironment] = useState<string>('prod');
  const [region, setRegion] = useState<string>('eu-west-3');
  const [hubTableName, setHubTableName] = useState<string>('serenity-ops-hub');
  const [liveInstalledModules, setLiveInstalledModules] = useState<string[]>(['serenity-core']);
  const [liveSesSummary, setLiveSesSummary] = useState<SESStateSummary | null>(null);
  const [liveEmailEvents, setLiveEmailEvents] = useState<EmailEvent[]>([]);
  const [liveCwAlarms, setLiveCwAlarms] = useState<CloudWatchAlarm[]>([]);
  const [liveIncidents, setLiveIncidents] = useState<IncidentReport[]>([]);
  const [liveChatMessages, setLiveChatMessages] = useState<BotChatMessage[]>([]);

  const [demoInstalledModules, setDemoInstalledModules] = useState<Set<string>>(
    new Set(DEFAULT_DEMO_MODULES)
  );

  const [retentionDays, setRetentionDays] = useState<RetentionDays>(90);

  const refreshLiveState = useCallback(async () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === 'true' || window.location.hostname.includes('e-serenity.fr')) {
        return;
      }
    }
    try {
      const res = await fetch('/api/state', { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const data = await res.json();
      if (data && data.mode === 'live') {
        setHasLiveBackend(true);
        setIsLiveMode(true);
        if (data.accountId) setAccountId(data.accountId);
        if (data.environment) setEnvironment(data.environment);
        if (data.region) setRegion(data.region);
        if (data.hubTableName) setHubTableName(data.hubTableName);
        if (data.retentionDays) setRetentionDays(data.retentionDays as RetentionDays);
        if (Array.isArray(data.installedModules)) {
          setLiveInstalledModules(data.installedModules);
        }
        if (data.sesSummary) setLiveSesSummary(data.sesSummary);
        if (Array.isArray(data.emailEvents)) setLiveEmailEvents(data.emailEvents);
        if (Array.isArray(data.cloudWatchAlarms)) setLiveCwAlarms(data.cloudWatchAlarms);
        if (Array.isArray(data.incidents)) setLiveIncidents(data.incidents);
        if (Array.isArray(data.chatMessages)) setLiveChatMessages(data.chatMessages);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    refreshLiveState();
  }, [refreshLiveState]);

  const setMode = (mode: 'live' | 'demo') => {
    if (mode === 'live' && hasLiveBackend) {
      setIsLiveMode(true);
    } else {
      setIsLiveMode(false);
    }
  };

  const installedModules = isLiveMode
    ? new Set(liveInstalledModules)
    : demoInstalledModules;

  const [emailActionStatuses, setEmailActionStatuses] = useState<Record<string, 'PENDING' | 'APPLIED' | 'REJECTED'>>({
    'evt-01': 'PENDING',
    'evt-02': 'APPLIED',
    'evt-03': 'APPLIED',
  });

  const [incidentStatuses, setIncidentStatuses] = useState<Record<string, 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'>>({
    'inc-2026-10-27-01': 'PENDING_APPROVAL',
    'inc-2026-10-27-02': 'APPROVED',
  });

  const [customIncidents, setCustomIncidents] = useState<IncidentReport[]>([]);

  const sesSummary: SESStateSummary = {
    dmarc: 'valid',
    spf: 'valid',
    dkim: 'valid',
    bounceRate: 0.35,
    complaintRate: 0.01,
    dedicatedIps: [
      {
        ip: '51.254.10.42',
        warmup: 92,
        status: t('Actif (Warm-up Palier 3)', 'Active (Tier 3 Warm-up)'),
      },
      {
        ip: '51.254.10.43',
        warmup: 88,
        status: t('Actif (Warm-up Palier 2)', 'Active (Tier 2 Warm-up)'),
      },
    ],
  };

  const emailEvents: EmailEvent[] = [
    {
      id: 'evt-01',
      timestamp: '2026-10-27 10:42:15',
      type: 'HardBounce',
      recipient: 'bad-syntax@invalid-domain-demo.org',
      smtpCode: '550 5.1.1 User unknown',
      reason: t(
        'Boîte aux lettres inexistante sur le serveur de destination.',
        'Recipient mailbox does not exist on the destination server.'
      ),
      suggestedAction: t(
        'Ajouter à la SES Account Suppression List',
        'Add to SES Account Suppression List'
      ),
      actionStatus: emailActionStatuses['evt-01'] || 'PENDING',
    },
    {
      id: 'evt-02',
      timestamp: '2026-10-27 09:18:02',
      type: 'Complaint',
      recipient: 'user.spam@external-corp.fr',
      smtpCode: 'Feedback Loop (Spam report)',
      reason: t(
        'Signalement spam reçu via la Feedback Loop du FAI.',
        'Spam complaint received via ISP Feedback Loop.'
      ),
      suggestedAction: t(
        'Désinscrire et bloquer les futures expéditions',
        'Unsubscribe and block future deliveries'
      ),
      actionStatus: emailActionStatuses['evt-02'] || 'APPLIED',
    },
    {
      id: 'evt-03',
      timestamp: '2026-10-27 08:05:44',
      type: 'SoftBounce',
      recipient: 'admin@busy-company.com',
      smtpCode: '452 4.2.2 Mailbox full',
      reason: t(
        'Boîte pleine temporaire — réessai automatique sous 2h.',
        'Temporary full mailbox — automatic retry scheduled in 2h.'
      ),
      suggestedAction: t(
        'Aucune action requise (re-tentative)',
        'No action required (auto-retry)'
      ),
      actionStatus: emailActionStatuses['evt-03'] || 'APPLIED',
    },
  ];

  const cloudWatchAlarms: CloudWatchAlarm[] = [
    {
      name: 'prod-api-5xx-errors-spike',
      state: 'ALARM',
      metric: 'HTTPCode_Target_5XX_Count',
      namespace: 'AWS/ApplicationELB',
      threshold: t('> 10 requêtes / min', '> 10 requests / min'),
      updatedAt: t('Il y a 14 min', '14 min ago'),
    },
    {
      name: 'ecs-auth-service-cpu-high',
      state: 'OK',
      metric: 'CPUUtilization',
      namespace: 'AWS/ECS',
      threshold: '> 85%',
      updatedAt: t('Il y a 1h', '1h ago'),
    },
    {
      name: 'ses-daily-bounce-rate-exceeded',
      state: 'OK',
      metric: 'Reputation.BounceRate',
      namespace: 'AWS/SES',
      threshold: '> 5.0%',
      updatedAt: t('Il y a 3h', '3h ago'),
    },
  ];

  const baseIncidents: IncidentReport[] = [
    {
      id: 'inc-2026-10-27-01',
      timestamp: t('Aujourd’hui à 11:25:30', 'Today at 11:25:30'),
      kind: 'ALERT',
      source: 'CloudWatch EventBridge',
      trigger: 'prod-api-5xx-errors-spike',
      severity: 'HIGH',
      mcpTraces: [
        'CloudWatch Logs : "Connection timed out to auth-redis-cluster:6379"',
        t(
          'GitLab MR #108 "Bump redis connection pool timeout" fusionnée 12 min avant l’alarme',
          'GitLab MR #108 "Bump redis connection pool timeout" merged 12 min before alarm'
        ),
        t(
          'CloudTrail : UpdateService sur ecs-prod-auth-service par CI/CD',
          'CloudTrail : UpdateService on ecs-prod-auth-service by CI/CD'
        ),
      ],
      rca: t(
        'Augmentation soudaine des 504 Gateway Timeouts provoquée par un épuisement des sockets du pool Redis suite au commit 8f9b1.',
        'Sudden spike in 504 Gateway Timeouts caused by Redis connection pool socket exhaustion following commit 8f9b1.'
      ),
      proposedAction: {
        agent: 'serenity-agent-cw',
        action: t(
          'Créer une alarme CloudWatch préventive sur les connexions Redis + tag de suivi',
          'Create preventive CloudWatch alarm on Redis connections + tracking tag'
        ),
        target: 'AWS/ElastiCache :: CurrConnections > 800',
        status: incidentStatuses['inc-2026-10-27-01'] || 'PENDING_APPROVAL',
        details: t(
          'serenity-agent-cw propose d’invoquer PutMetricAlarm pour anticiper la saturation future.',
          'serenity-agent-cw proposes invoking PutMetricAlarm to anticipate future saturation.'
        ),
      },
    },
    {
      id: 'req-2026-10-27-02',
      timestamp: t('Aujourd’hui à 10:48:12', 'Today at 10:48:12'),
      kind: 'USER_REQUEST',
      source: 'Slack (@Serenity-Ops)',
      requester: '@alex.devops',
      trigger: t(
        'Demande : "Vérifie pourquoi le domaine invalid-domain-demo.org génère des HardBounces ce matin"',
        'Request: "Check why invalid-domain-demo.org is generating HardBounces this morning"'
      ),
      severity: 'MEDIUM',
      mcpTraces: [
        'DynamoDB Hub : Query PK=MOD#serenity-ses SK=EVENT#2026-10-27*',
        'SES v2 API : GetSuppressedDestination (not yet suppressed)',
      ],
      rca: t(
        '1 HardBounce détecté (550 5.1.1 User unknown) à 10:42. Le domaine possède un enregistrement MX valide mais l’utilisateur cible est inexistant.',
        '1 HardBounce detected (550 5.1.1 User unknown) at 10:42. Domain has valid MX record but target mailbox does not exist.'
      ),
      proposedAction: {
        agent: 'serenity-agent-ses',
        action: t(
          'Inscrire bad-syntax@invalid-domain-demo.org dans la SES Suppression List',
          'Add bad-syntax@invalid-domain-demo.org to SES Suppression List'
        ),
        target: 'SES Account Suppression List (BOUNCE)',
        status: incidentStatuses['inc-2026-10-27-02'] || 'APPROVED',
        details: t(
          'Exécuté après validation Slack de @alex.devops.',
          'Executed following Slack approval by @alex.devops.'
        ),
      },
    },
    {
      id: 'req-2026-10-27-03',
      timestamp: t('Aujourd’hui à 09:30:05', 'Today at 09:30:05'),
      kind: 'USER_REQUEST',
      source: 'Web Console',
      requester: 'admin@e-serenity.fr',
      trigger: t(
        'Demande : "Quel est l’état des déploiements GitLab et de la consommation CPU sur ecs-auth-service ?"',
        'Request: "What is the status of recent GitLab deployments and CPU usage on ecs-auth-service?"'
      ),
      severity: 'INFO',
      mcpTraces: [
        'GitLab Tool : gitlab_list_merge_requests (state=merged, last 24h)',
        'CloudWatch Metrics : GetMetricData AWS/ECS CPUUtilization (avg 41%)',
      ],
      rca: t(
        'Aucune anomalie CPU sur ecs-auth-service (moyenne 41%, pic 58%). 2 Merge Requests fusionnées ce matin sans alerte associée.',
        'No CPU anomaly on ecs-auth-service (avg 41%, peak 58%). 2 Merge Requests merged this morning with no associated alarm.'
      ),
    },
  ];

  const incidents: IncidentReport[] = [...customIncidents, ...baseIncidents];

  const [customChatMessages, setCustomChatMessages] = useState<BotChatMessage[]>([]);

  const defaultChatMessages: BotChatMessage[] = [
    {
      id: 'msg-1',
      sender: 'user',
      author: 'You',
      channel: 'Web Console',
      timestamp: '10:48',
      text: t(
        'Peux-tu analyser l’alerte 5XX sur prod-api et vérifier le dernier déploiement ?',
        'Can you analyze the 5XX alert on prod-api and check the latest deployment?'
      ),
    },
    {
      id: 'msg-2',
      sender: 'bot',
      author: 'Serenity-Ops',
      channel: 'Web Console',
      timestamp: '10:49',
      text: t(
        'J’ai corrélé les logs CloudWatch et l’historique GitLab : l’alarme `prod-api-5xx-errors-spike` coïncide avec la MR #108 (`commit 8f9b1`) qui a modifié le timeout Redis. Une action préventive CloudWatch est prête dans votre file d’approbation.',
        'I correlated CloudWatch Logs with GitLab history: alarm `prod-api-5xx-errors-spike` matches MR #108 (`commit 8f9b1`) which modified the Redis timeout. A preventive CloudWatch action is ready in your approval queue.'
      ),
      toolsUsed: ['AWS ReadOnly', 'CloudWatch Logs', 'GitLab MR #108'],
    },
  ];

  const chatMessages: BotChatMessage[] = [...defaultChatMessages, ...customChatMessages];

  const sendChatMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (isLiveMode) {
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      }).catch(() => {});
    }

    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);
    const userMsg: BotChatMessage = {
      id: `msg-u-${Date.now()}`,
      sender: 'user',
      author: 'You (Web Console)',
      channel: 'Web Console',
      timestamp: timeStr,
      text: trimmed,
    };

    const lower = trimmed.toLowerCase();
    let replyText = '';
    let tools: string[] = ['serenity-bot (ReadOnly)', 'DynamoDB Hub'];

    if (lower.includes('ses') || lower.includes('bounce') || lower.includes('mail') || lower.includes('ip')) {
      tools = ['serenity-bot (ReadOnly)', 'serenity-agent-ses', 'SES v2 Metrics'];
      replyText = t(
        `Analyse SES terminée : taux de bounce actuel à ${sesSummary.bounceRate}% (< 5% seuil AWS). Les 2 IPs dédiées sont en warm-up actif (92% et 88%). 1 HardBounce est en attente de mise en liste de suppression.`,
        `SES analysis complete: current bounce rate is ${sesSummary.bounceRate}% (< 5% AWS threshold). Both dedicated IPs are actively warming up (92% and 88%). 1 HardBounce is awaiting suppression list approval.`
      );
    } else if (lower.includes('5xx') || lower.includes('alarm') || lower.includes('cloudwatch') || lower.includes('redis')) {
      tools = ['serenity-bot (ReadOnly)', 'CloudWatch Logs', 'GitLab Commits'];
      replyText = t(
        `Enquête CloudWatch + GitLab : l'alarme \`prod-api-5xx-errors-spike\` provient d'une saturation du pool Redis (MR #108). Vous pouvez approuver la création de l'alarme ElastiCache directement dans la file Human-in-the-Loop ci-contre.`,
        `CloudWatch + GitLab investigation: alarm \`prod-api-5xx-errors-spike\` stems from Redis pool saturation (MR #108). You can approve the ElastiCache alarm creation directly in the Human-in-the-Loop queue next to this chat.`
      );
    } else if (lower.includes('cost') || lower.includes('finops') || lower.includes('coût') || lower.includes('budget')) {
      tools = ['Cost Explorer ReadOnly', 'DynamoDB Hub'];
      replyText = t(
        `Le coût MTD de la suite Serenity-Ops est de $14.82 (moyenne de $0.48/jour sur les 6 derniers jours). Aucune dérive budgétaire détectée.`,
        `Serenity-Ops suite MTD cost is $14.82 ($0.48/day average over the last 6 days). No budget drift detected.`
      );
    } else {
      replyText = t(
        `Requête exécutée en lecture seule via \`serenity-bot\` (${Array.from(installedModules).length} modules actifs dans \`serenity-ops-hub\`). Votre demande a été enregistrée dans le journal d'audit avec une rétention TTL de ${retentionDays} jours.`,
        `Read-only query executed via \`serenity-bot\` (${Array.from(installedModules).length} active modules in \`serenity-ops-hub\`). Your request has been logged in the audit trail with a ${retentionDays}-day TTL retention.`
      );
    }

    const botMsg: BotChatMessage = {
      id: `msg-b-${Date.now() + 1}`,
      sender: 'bot',
      author: 'Serenity-Ops',
      channel: 'Web Console',
      timestamp: timeStr,
      text: replyText,
      toolsUsed: tools,
    };

    setCustomChatMessages((prev) => [...prev, userMsg, botMsg]);

    const newRequestReport: IncidentReport = {
      id: `req-${Date.now().toString().slice(-6)}`,
      timestamp: t(`À l'instant (${timeStr})`, `Just now (${timeStr})`),
      kind: 'USER_REQUEST',
      source: 'Web Console',
      requester: 'You (Web Console)',
      trigger: trimmed,
      severity: 'INFO',
      mcpTraces: tools.map((tool) => `MCP Tool Invoke : ${tool}`),
      rca: replyText,
    };

    setCustomIncidents((prev) => [newRequestReport, ...prev]);
  };

  const toggleModule = (moduleId: string) => {
    if (isLiveMode) {
      setIsLiveMode(false);
    }
    setDemoInstalledModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const approveAction = (incidentId: string) => {
    setIncidentStatuses((prev) => ({
      ...prev,
      [incidentId]: 'APPROVED',
    }));
    setCustomIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId && inc.proposedAction
          ? {
              ...inc,
              proposedAction: {
                ...inc.proposedAction,
                status: 'APPROVED',
              },
            }
          : inc
      )
    );
  };

  const rejectAction = (incidentId: string) => {
    setIncidentStatuses((prev) => ({
      ...prev,
      [incidentId]: 'REJECTED',
    }));
    setCustomIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId && inc.proposedAction
          ? {
              ...inc,
              proposedAction: {
                ...inc.proposedAction,
                status: 'REJECTED',
              },
            }
          : inc
      )
    );
  };

  const applyEmailAction = (eventId: string) => {
    setEmailActionStatuses((prev) => ({
      ...prev,
      [eventId]: 'APPLIED',
    }));
  };

  return (
    <DemoContext.Provider
      value={{
        isLiveMode,
        hasLiveBackend,
        setMode,
        accountId: isLiveMode ? accountId : '123456789012',
        environment: isLiveMode ? environment : 'demo',
        region,
        hubTableName,
        refreshLiveState,
        language,
        setLanguage,
        t,
        modules: getModuleCatalog(language),
        agents: getAgentsList(language),
        installedModules,
        toggleModule,
        retentionDays,
        setRetentionDays,
        sesSummary: isLiveMode && liveSesSummary ? liveSesSummary : sesSummary,
        emailEvents: isLiveMode ? liveEmailEvents : emailEvents,
        cloudWatchAlarms: isLiveMode ? liveCwAlarms : cloudWatchAlarms,
        incidents: isLiveMode ? [...customIncidents, ...liveIncidents] : incidents,
        chatMessages: isLiveMode ? [...liveChatMessages, ...customChatMessages] : chatMessages,
        sendChatMessage,
        approveAction,
        rejectAction,
        applyEmailAction,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
};
