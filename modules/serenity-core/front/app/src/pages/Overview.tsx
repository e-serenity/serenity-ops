import React from 'react';
import { useDemo } from '../context/DemoContext';
import {
  ShieldCheck,
  Bot,
  Activity,
  Mail,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Key,
  DollarSign,
  Database,
  ShieldAlert,
} from 'lucide-react';

interface OverviewProps {
  setCurrentTab: (tab: string) => void;
}

export const Overview: React.FC<OverviewProps> = ({ setCurrentTab }) => {
  const {
    installedModules,
    cloudWatchAlarms,
    sesSummary,
    incidents,
    modules,
    hubTableName,
    region,
    t,
  } = useDemo();

  const isBotInstalled = installedModules.has('serenity-bot');
  const isSesInstalled = installedModules.has('serenity-ses');
  const activeModulesCount = Array.from(installedModules).length;
  const pendingIncidents = incidents.filter(
    (inc) => inc.proposedAction && inc.proposedAction.status === 'PENDING_APPROVAL'
  );
  const pendingIncidentsCount = pendingIncidents.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. Header / Console Statut Opérationnel (Quiet Chrome) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
            <span className="text-xs font-mono text-emerald-400">
              {t('Systèmes opérationnels', 'All systems operational')}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400 font-mono">
              {region} • {activeModulesCount}/{modules.length} {t('modules actifs', 'active modules')}
            </span>
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            {t('Console Opérationnelle Serenity-Ops', 'Serenity-Ops Operations Console')}
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            {t(
              'Observabilité modulaire Scale-to-Zero, auto-découverte DynamoDB et sécurité agentique avec validation humaine.',
              'Modular Scale-to-Zero observability, DynamoDB auto-discovery, and agentic security with human approval.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/70 border border-slate-700/60 text-xs text-slate-300">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-[11px] text-slate-300">{hubTableName}</span>
          </div>

          <button
            onClick={() => setCurrentTab('serenity-bot')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-200 transition-colors"
          >
            <Bot className="w-3.5 h-3.5 text-sky-400" />
            <span>
              {isBotInstalled
                ? t('Serenity Bot : Actif', 'Serenity Bot: Active')
                : t('Serenity Bot : Inactif', 'Serenity Bot: Inactive')}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Point Focal : File d'approbation Human-in-the-Loop prioritaire si incident */}
      {pendingIncidentsCount > 0 && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">
                  {pendingIncidentsCount}{' '}
                  {t(
                    'action(s) en attente d’approbation humaine (HITL)',
                    'action(s) pending human approval (HITL)'
                  )}
                </span>
                <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">
                  ACTION REQUIRED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t(
                  'Une investigation IA a proposé une modification d’infrastructure soumise à validation.',
                  'An AI investigation staged an infrastructure modification awaiting operator sign-off.'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setCurrentTab('serenity-bot')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-medium transition-colors shrink-0"
          >
            <span>{t('Examiner dans Serenity Bot', 'Review in Serenity Bot')}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Métriques Synthétiques Opérationnelles (Data-First & Chiffres Tabulaires) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 : Score de Santé */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-400">
              {t('Santé globale', 'Health score')}
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold font-mono text-white tabular-nums">
                {activeModulesCount === 1 ? '100%' : '98%'}
              </span>
              <span className="text-xs text-emerald-400 font-medium">
                {t('Nominal', 'Nominal')}
              </span>
            </div>
            <div className="mt-2.5 w-full bg-slate-800 rounded-full h-1 overflow-hidden">
              <div
                className="bg-emerald-500 h-1 rounded-full"
                style={{ width: activeModulesCount === 1 ? '100%' : '98%' }}
              />
            </div>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            {t('Aucun incident critique bloquant', 'Zero critical blocking incidents')}
          </span>
        </div>

        {/* Metric 2 : Modules Synchronisés */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-400">
              {t('Modules installés', 'Installed modules')}
            </span>
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold font-mono text-white tabular-nums">
                {activeModulesCount}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                / {modules.length}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            {t('Auto-discovery via', 'Auto-discovery via')}{' '}
            <code className="text-slate-300 font-mono">serenity-ops-hub</code>
          </span>
        </div>

        {/* Metric 3 : Délivrabilité SES */}
        <div
          onClick={() => setCurrentTab('serenity-ses')}
          className="bg-slate-900/60 hover:bg-slate-900/90 hover:border-slate-700 cursor-pointer border border-slate-800 rounded-xl p-4 flex flex-col justify-between transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-400">
              {t('Délivrabilité SES', 'SES deliverability')}
            </span>
            <Mail className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold font-mono text-white tabular-nums">
                {isSesInstalled ? `${sesSummary.bounceRate}%` : '—'}
              </span>
              <span
                className={`text-xs font-medium ${
                  isSesInstalled ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {isSesInstalled ? t('SLA < 5%', 'SLA < 5%') : t('Non installé', 'Not installed')}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block truncate">
            {isSesInstalled
              ? `${sesSummary.dedicatedIps.length} ${t('IPs dédiées', 'dedicated IPs')}`
              : t('Activer serenity-ses →', 'Enable serenity-ses →')}
          </span>
        </div>

        {/* Metric 4 : Approbations IA */}
        <div
          onClick={() => setCurrentTab('serenity-bot')}
          className="bg-slate-900/60 hover:bg-slate-900/90 hover:border-slate-700 cursor-pointer border border-slate-800 rounded-xl p-4 flex flex-col justify-between transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-400">
              {t('Approbations IA', 'AI approvals')}
            </span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold font-mono text-white tabular-nums">
                {isBotInstalled ? pendingIncidentsCount : '—'}
              </span>
              <span className={`text-xs font-medium ${pendingIncidentsCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {isBotInstalled
                  ? pendingIncidentsCount > 0
                    ? t('En attente', 'Pending')
                    : t('À jour', 'Up to date')
                  : t('Bot inactif', 'Bot inactive')}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            {isBotInstalled
              ? t('Gérer la file d’audit →', 'Manage audit queue →')
              : t('Activer serenity-bot →', 'Enable serenity-bot →')}
          </span>
        </div>
      </div>

      {/* 4. Registre des Modules DynamoDB (Single-Table Design) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">
              {t('Registre des Modules DynamoDB', 'DynamoDB Module Registry')}
            </h2>
            <p className="text-xs text-slate-400">
              {t(
                'Auto-enregistrement par Terraform dans la table serenity-ops-hub',
                'Terraform auto-registration into the serenity-ops-hub table'
              )}
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            PK: SERENITY#MODULES
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.map((mod) => {
            const isInstalled = installedModules.has(mod.id);

            return (
              <div
                key={mod.id}
                onClick={() => !mod.isCore && setCurrentTab(mod.id)}
                className={`group border rounded-xl p-4 transition-colors ${
                  mod.isCore ? 'cursor-default' : 'cursor-pointer'
                } ${
                  isInstalled
                    ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/40 border-slate-850 hover:border-slate-750 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-lg border ${
                        isInstalled
                          ? 'bg-slate-800/80 border-slate-700 text-sky-400'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {mod.id === 'serenity-bot' && <Bot className="w-4 h-4" />}
                      {mod.id === 'serenity-ses' && <Mail className="w-4 h-4" />}
                      {mod.id === 'serenity-cloudwatch' && (
                        <Activity className="w-4 h-4" />
                      )}
                      {mod.id === 'serenity-core' && (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      {mod.id === 'serenity-iam' && <Key className="w-4 h-4" />}
                      {mod.id === 'serenity-finops' && (
                        <DollarSign className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-white group-hover:text-sky-300 transition-colors">
                        {mod.title}
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400">
                        v{mod.version}
                      </span>
                    </div>
                  </div>

                  {isInstalled ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {t('Actif', 'Active')}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-850 text-slate-400 border border-slate-800">
                      {t('Catalogue', 'Catalog')}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                  {mod.description}
                </p>

                <div className="pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs gap-2">
                  <span className="text-[11px] font-mono text-slate-400 truncate">
                    {mod.registrySource}
                  </span>
                  {mod.isCore ? (
                    <span className="text-slate-400 text-[11px] font-mono shrink-0">
                      {t('Socle core', 'Core module')}
                    </span>
                  ) : (
                    <span className="text-sky-400 flex items-center gap-1 text-[11px] font-medium group-hover:translate-x-0.5 transition-transform shrink-0">
                      {isInstalled
                        ? t('Ouvrir', 'Open')
                        : t('Installer', 'Install')}{' '}
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Alarmes CloudWatch sous Surveillance (Affichage Épuré) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-white">
              {t(
                'Alarmes CloudWatch sous Surveillance',
                'Monitored CloudWatch Alarms'
              )}
            </h3>
            <p className="text-xs text-slate-400">
              {t(
                'Métriques AWS corrélées par serenity-cloudwatch et inspectées par les sous-agents MCP',
                'AWS metrics correlated by serenity-cloudwatch and inspected by MCP sub-agents'
              )}
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {cloudWatchAlarms.length}{' '}
            {t('alarme(s)', 'alarm(s)')}
          </span>
        </div>

        {cloudWatchAlarms.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
            <span>
              {t(
                'Aucune alarme CloudWatch configurée dans cette région AWS pour le moment.',
                'No CloudWatch alarms configured in this AWS region yet.'
              )}
            </span>
            <button
              onClick={() => setCurrentTab('serenity-cloudwatch')}
              className="text-sky-400 hover:underline font-medium"
            >
              {t('Voir le module CloudWatch →', 'View CloudWatch module →')}
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {cloudWatchAlarms.map((alarm) => (
              <div
                key={alarm.name}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      alarm.state === 'ALARM'
                        ? 'bg-rose-400'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <span className="font-mono text-slate-200">{alarm.name}</span>
                  <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
                    ({alarm.namespace})
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400 font-mono text-[11px]">{alarm.threshold}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                      alarm.state === 'ALARM'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {alarm.state}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
