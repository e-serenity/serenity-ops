import React from 'react';
import { useDemo } from '../context/DemoContext';
import {
  Bot,
  ShieldCheck,
  Lock,
  KeyRound,
  ArrowRight,
  Database,
  AlertTriangle,
  Eye,
  CheckCircle2,
  GitBranch,
  Layers,
} from 'lucide-react';

interface TopologyProps {
  setCurrentTab?: (tab: string) => void;
}

export const Topology: React.FC<TopologyProps> = ({ setCurrentTab }) => {
  const { agents, installedModules, incidents, t } = useDemo();

  const isBotInstalled = installedModules.has('serenity-bot');
  const pendingCount = incidents.filter(
    (inc) => inc.proposedAction && inc.proposedAction.status === 'PENDING_APPROVAL'
  ).length;

  const workflowSteps = [
    {
      step: '01',
      title: t('1. Alerte ou Question User', '1. Alert or User Prompt'),
      desc: t(
        'Réception d’une alerte monitoring (Datadog, CloudWatch, EventBridge) ou d’une question sur Slack (@Serenity-Ops) / Web.',
        'Receives a monitoring alert (Datadog, CloudWatch, EventBridge) or a user question on Slack (@Serenity-Ops) / Web.'
      ),
    },
    {
      step: '02',
      title: t(
        '2. Enquête Globale (Lecture Autonome)',
        '2. Global Investigation (Autonomous Read)'
      ),
      desc: t(
        'Serenity Bot interroge tous les services AWS autorisés (ECS, RDS, EC2, ElastiCache, IAM, VPC, Logs...) et les intégrations activées en variables Terraform (GitLab, GitHub, Datadog, Grafana...).',
        'Serenity Bot queries all authorized AWS services (ECS, RDS, EC2, ElastiCache, IAM, VPC, Logs...) and integrations enabled via Terraform variables (GitLab, GitHub, Datadog, Grafana...).'
      ),
    },
    {
      step: '03',
      title: t(
        '3. Verrouillage Human-in-the-Loop',
        '3. Human-in-the-Loop Lock'
      ),
      desc: t(
        'Si une écriture est pertinente (restart, ajout d’alarme, blocage SES), le bot prépare l’action dans _PENDING et demande confirmation humaine.',
        'If a write action is needed (restart, add alarm, SES block), the bot stages it in _PENDING and requests human approval.'
      ),
    },
    {
      step: '04',
      title: t(
        '4. Exécution Scopée & Audit',
        '4. Scoped Execution & Audit'
      ),
      desc: t(
        'Après validation sur Slack ou Web, l’action est exécutée avec des droits limités (uniquement sur les ressources créées par l’agent) et tracée dans DynamoDB.',
        'Once approved on Slack or Web, the action runs with narrowly scoped permissions (only on agent-created resources) and is logged in DynamoDB.'
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {t(
              'Topologie des Agents IA, Accès & Garde-Fous IAM',
              'AI Agent Topology, Access Scope & IAM Guardrails'
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            {t(
              'Séparation claire entre l’investigation autonome à large spectre (Read-Only global du Bot de base) et les actions d’écriture ciblées soumises à validation humaine.',
              'Clear separation between broad autonomous investigation (Global Read-Only of the Base Bot) and targeted write actions subject to human approval.'
            )}
          </p>
        </div>

        {setCurrentTab && (
          <button
            onClick={() => setCurrentTab('serenity-bot')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-sky-400 transition-all shrink-0 self-start md:self-auto"
          >
            <Bot className="w-4 h-4" />
            <span>
              {pendingCount > 0
                ? t(
                    `Gérer les approbations (${pendingCount} en attente) dans Serenity Bot`,
                    `Manage approvals (${pendingCount} pending) in Serenity Bot`
                  )
                : t('Ouvrir la console Serenity Bot', 'Open Serenity Bot Console')}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {!isBotInstalled && (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-white block">
                {t(
                  'Module serenity-bot non installé (Mode Sans IA)',
                  'serenity-bot module not installed (No-AI Mode)'
                )}
              </span>
              <span className="text-slate-300">
                {t(
                  'Les agents IA sont en veille car le bot central n’est pas déployé dans ce compte.',
                  'AI agents are on standby because the central bot is not deployed in this account.'
                )}
              </span>
            </div>
          </div>
          {setCurrentTab && (
            <button
              onClick={() => setCurrentTab('serenity-bot')}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold shrink-0"
            >
              {t('Installer Serenity Bot', 'Install Serenity Bot')}
            </button>
          )}
        </div>
      )}

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-8">
        <div
          className={`max-w-4xl mx-auto rounded-xl p-6 border transition-all ${
            isBotInstalled
              ? 'bg-slate-900/90 border-slate-700/80 shadow-sm'
              : 'bg-slate-950 border-slate-800 opacity-75'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border ${
                  isBotInstalled
                    ? 'bg-slate-800 border-slate-700 text-sky-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">
                    {t(
                      'Serenity Bot — Orchestrateur & Agent Central',
                      'Serenity Bot — Central Orchestrator & Base Agent'
                    )}
                  </h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
                    READ (AUTO) + WRITE ON APPROVAL
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono block mt-0.5">
                  Python + LangGraph ReAct + AWS Bedrock (Claude Sonnet 4.6) + Slack Socket Mode
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5">
            <div className="bg-slate-900/90 border border-emerald-500/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  {t(
                    '1. Mode Autonome : Lecture Globale (Sans Attente)',
                    '1. Autonomous Mode: Global Read (Zero Wait)'
                  )}
                </span>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                  AUTO
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t(
                  'Pour l’analyse d’alertes temps réel (RCA) et le Chatbot 24/7, le bot de base interroge librement tous les services AWS où il a des droits de lecture ainsi que les intégrations activées dans ses variables Terraform (GitLab, GitHub, Datadog, Grafana, serveurs MCP...).',
                  'For real-time alert analysis (RCA) and the 24/7 Chatbot, the base bot freely queries any AWS service where it holds read permissions along with integrations enabled in its Terraform variables (GitLab, GitHub, Datadog, Grafana, MCP servers...).'
                )}
              </p>
            </div>

            <div className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {t(
                    '2. Mode Écriture : Sous Validation Humaine',
                    '2. Write Mode: Subject to Human Approval'
                  )}
                </span>
                <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                  ON APPROVAL
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t(
                  'Les actions modifiantes (actions transverses du bot ou délégation sts:AssumeRole vers un sous-agent de module) sont préparées par l’IA mais bloquées jusqu’au clic d’approbation d’un opérateur sur Slack ou sur la page Serenity Bot.',
                  'Mutating actions (cross-service bot actions or sts:AssumeRole delegation to a module sub-agent) are staged by the AI but held until an operator clicks Approve on Slack or in the Serenity Bot page.'
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 text-xs font-mono text-slate-400">
          <span className="h-px w-16 bg-slate-800"></span>
          <GitBranch className="w-4 h-4 text-sky-400" />
          <span>
            {t(
              'Périmètres d’Exécution & Sous-Agents de Modules (sts:AssumeRole)',
              'Execution Scopes & Module Sub-Agents (sts:AssumeRole)'
            )}
          </span>
          <span className="h-px w-16 bg-slate-800"></span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {agents.map((agent) => {
            const isBaseBot = agent.targetModule === 'serenity-bot';
            const isModuleActive =
              isBotInstalled && installedModules.has(agent.targetModule);

            return (
              <div
                key={agent.name}
                className={`bg-slate-950/90 border rounded-xl p-5 flex flex-col justify-between shadow-sm relative transition-all ${
                  isModuleActive
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-slate-800/50 opacity-60'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-white">
                      {agent.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        isBaseBot
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {agent.privilege}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {agent.role}
                  </p>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      {t(
                        'Accès & Outils exposés :',
                        'Exposed Access & Tools:'
                      )}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.tools.map((tool) => (
                        <span
                          key={tool}
                          className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>

                  {agent.writeScope && (
                    <div className="bg-slate-900/70 border border-slate-800/90 rounded-lg p-2.5 text-[11px] text-slate-400 leading-relaxed">
                      <span className="font-semibold text-amber-400 block mb-0.5">
                        {t('Limite d’écriture IAM :', 'IAM Write Boundary:')}
                      </span>
                      {agent.writeScope}
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    {isBaseBot ? (
                      <Lock className="w-3 h-3 text-sky-400" />
                    ) : (
                      <KeyRound className="w-3 h-3 text-amber-400" />
                    )}
                    {agent.targetModule}
                  </span>
                  {isModuleActive ? (
                    <span className="text-emerald-400 font-medium">
                      {t('Actif', 'Active')}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">
                      {t('Inactif', 'Standby')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
          <Layers className="w-4 h-4" />
          <span>
            {t(
              'Cycle de Vie d’une Intervention IA (De la Détection à l’Écriture Validée)',
              'AI Intervention Lifecycle (From Detection to Approved Write)'
            )}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {workflowSteps.map((s) => (
            <div
              key={s.step}
              className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{s.title}</span>
                <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  {s.step}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
            <Database className="w-4 h-4" />
            <span>
              {t(
                'Indépendance Terraform : Mode Standalone Slack ou Couplé Hub',
                'Terraform Independence: Standalone Slack or Hub-Coupled Mode'
              )}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {t(
              'Les intégrations (GitLab, Datadog, GitHub...) et les channels Slack sont configurés via les variables Terraform de serenity-bot : le bot peut donc être installé tout seul (sans serenity-ops) pour gérer vos alertes sur Slack, ou raccordé à serenity-ops-hub pour activer ce Dashboard et les sous-agents.',
              'Integrations (GitLab, Datadog, GitHub...) and Slack channels are configured via serenity-bot Terraform variables: the bot can be installed standalone (without serenity-ops) to handle alerts in Slack, or connected to serenity-ops-hub to power this Dashboard and sub-agents.'
            )}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>
              {t(
                'Protection de l’Existant Client (Condition IAM ManagedBy=serenity-ops)',
                'Customer Infrastructure Protection (IAM Condition ManagedBy=serenity-ops)'
              )}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {t(
              'Même après approbation humaine, les sous-agents de modules (comme serenity-agent-cw pour les alarmes) ne peuvent modifier ou supprimer que les ressources qu’ils ont eux-mêmes créées (tag ManagedBy=serenity-ops).',
              'Even after human approval, module sub-agents (such as serenity-agent-cw for alarms) can only modify or delete resources they created themselves (tagged ManagedBy=serenity-ops).'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
