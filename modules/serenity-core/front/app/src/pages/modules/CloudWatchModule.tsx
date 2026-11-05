import React, { useState } from 'react';
import { ModuleContainer } from '../../components/common/ModuleContainer';
import { useDemo } from '../../context/DemoContext';
import {
  Check,
  X,
  Bot,
  ArrowRight,
  PlusCircle,
  Lock,
  Bell,
} from 'lucide-react';

interface CloudWatchModuleProps {
  setCurrentTab?: (tab: string) => void;
}

export const CloudWatchModule: React.FC<CloudWatchModuleProps> = ({ setCurrentTab }) => {
  const {
    cloudWatchAlarms,
    incidents,
    approveAction,
    rejectAction,
    installedModules,
    t,
  } = useDemo();
  const [activeTab, setActiveTab] = useState<'alarms' | 'agent-alarms'>('alarms');

  const isBotInstalled = installedModules.has('serenity-bot');
  const cwProposals = incidents.filter(
    (inc) => inc.proposedAction && inc.proposedAction.agent === 'serenity-agent-cw'
  );

  return (
    <ModuleContainer id="serenity-cloudwatch">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ACTIVE
              </span>
              <span className="text-xs font-mono text-slate-400">
                github.com/e-serenity/serenity-ops//modules/serenity-cloudwatch v1.1.0
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {t(
                'Module Gestion d’Alarmes CloudWatch',
                'CloudWatch Alarm Management Module'
              )}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {t(
                'Supervision des alarmes existantes et ajout d’alarmes via le sous-agent scopé serenity-agent-cw.',
                'Monitoring of existing alarms and creation of new alarms via the scoped sub-agent serenity-agent-cw.'
              )}
            </p>
          </div>

          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab('alarms')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'alarms'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('Onglet 1 : Alarmes Existantes', 'Tab 1: Existing Alarms')} (
              {cloudWatchAlarms.length})
            </button>
            <button
              onClick={() => setActiveTab('agent-alarms')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'agent-alarms'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>
                {t(
                  'Onglet 2 : Ajout & Gestion IA (serenity-agent-cw)',
                  'Tab 2: AI Alarm Addition (serenity-agent-cw)'
                )}
              </span>
            </button>
          </div>
        </div>

        {activeTab === 'alarms' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">{t('Statut', 'Status')}</th>
                    <th className="py-3 px-4">{t('Nom de l’alarme', 'Alarm Name')}</th>
                    <th className="py-3 px-4">Namespace</th>
                    <th className="py-3 px-4">{t('Métrique', 'Metric')}</th>
                    <th className="py-3 px-4">
                      {t('Seuil Déclenchement', 'Trigger Threshold')}
                    </th>
                    <th className="py-3 px-4 text-right">
                      {t('Dernière Mise à Jour', 'Last Updated')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {cloudWatchAlarms.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 px-4 text-center text-slate-400 text-xs">
                        {t(
                          'Aucune alarme CloudWatch détectée dans cette région AWS.',
                          'No CloudWatch alarms detected in this AWS region.'
                        )}
                      </td>
                    </tr>
                  )}
                  {cloudWatchAlarms.map((alarm) => (
                    <tr key={alarm.name} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            alarm.state === 'ALARM'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {alarm.state}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-white">
                        {alarm.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {alarm.namespace}
                      </td>
                      <td className="py-3 px-4 font-mono text-sky-400">
                        {alarm.metric}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {alarm.threshold}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {alarm.updatedAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'agent-alarms' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>
                      {t(
                        'Périmètre restreint du sous-agent : serenity-agent-cw',
                        'Restricted Sub-Agent Scope: serenity-agent-cw'
                      )}
                    </span>
                    <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                      SCOPED WRITE
                    </span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    {t(
                      'Tandis que Serenity Bot assure l’analyse globale des alertes grâce à ses accès en lecture sur tout AWS, serenity-agent-cw ne possède que le droit de lister les alarmes existantes (DescribeAlarms), d’en ajouter de nouvelles (PutMetricAlarm) et de modifier/supprimer uniquement celles qu’il a lui-même créées (Tag ManagedBy=serenity-ops).',
                      'While Serenity Bot performs global alert analysis using its broad AWS read access, serenity-agent-cw is strictly limited to listing existing alarms (DescribeAlarms), adding new ones (PutMetricAlarm), and modifying/deleting only alarms it created itself (Tag ManagedBy=serenity-ops).'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {!isBotInstalled ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 mx-auto flex items-center justify-center">
                  <Bot className="w-6 h-6 text-sky-400" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  {t(
                    'Ajout d’alarmes assisté par IA désactivé — Serenity Bot non installé',
                    'AI-Assisted Alarm Creation Disabled — Serenity Bot Not Installed'
                  )}
                </h3>
                <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                  {t(
                    'La liste des alarmes existantes (Onglet 1) reste disponible sans IA. Installez Serenity Bot pour permettre à l’orchestrateur de piloter serenity-agent-cw et de proposer de nouvelles alarmes CloudWatch.',
                    'Existing alarms (Tab 1) remain available without AI. Install Serenity Bot to let the orchestrator drive serenity-agent-cw and propose new CloudWatch alarms.'
                  )}
                </p>
                {setCurrentTab && (
                  <button
                    onClick={() => setCurrentTab('serenity-bot')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all shadow-lg shadow-sky-900/30"
                  >
                    <Bot className="w-4 h-4" />
                    <span>
                      {t('Découvrir et activer Serenity Bot', 'Discover and enable Serenity Bot')}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : cwProposals.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                {t(
                  'Aucune proposition d’ajout d’alarme CloudWatch en attente pour le moment.',
                  'No pending CloudWatch alarm creation proposals at this time.'
                )}
              </div>
            ) : (
              cwProposals.map((inc) => (
                <div
                  key={inc.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                        <PlusCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">
                          {t(
                            'Proposition d’ajout d’alarme CloudWatch',
                            'Proposed CloudWatch Alarm Addition'
                          )}
                        </h3>
                        <span className="text-xs font-mono text-slate-400">
                          {t('Suite à l’analyse de :', 'Following analysis of:')}{' '}
                          {inc.trigger} • {inc.timestamp}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" />
                      Tag: ManagedBy=serenity-ops
                    </span>
                  </div>

                  {inc.proposedAction && (
                    <div className="bg-gradient-to-r from-amber-950/20 via-slate-950 to-slate-950 border border-amber-800/30 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
                          <span>{inc.proposedAction.agent}</span>
                          <span className="text-[10px] font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            PutMetricAlarm (SCOPED WRITE)
                          </span>
                        </div>
                        <p className="text-xs text-white font-medium">
                          {inc.proposedAction.action}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          {t('Métrique cible :', 'Target Metric:')}{' '}
                          {inc.proposedAction.target}
                        </p>
                      </div>

                      {inc.proposedAction.status === 'PENDING_APPROVAL' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => approveAction(inc.id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-900/30"
                          >
                            <Check className="w-4 h-4" />
                            <span>
                              {t('Approuver l’ajout d’alarme', 'Approve Alarm Creation')}
                            </span>
                          </button>
                          <button
                            onClick={() => rejectAction(inc.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all"
                          >
                            <X className="w-4 h-4" />
                            <span>{t('Rejeter', 'Reject')}</span>
                          </button>
                        </div>
                      )}

                      {inc.proposedAction.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                          <Check className="w-4 h-4" />{' '}
                          {t(
                            'Alarme créée par serenity-agent-cw',
                            'Alarm created by serenity-agent-cw'
                          )}
                        </span>
                      )}

                      {inc.proposedAction.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-semibold bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20">
                          <X className="w-4 h-4" />{' '}
                          {t('Action rejetée', 'Action rejected')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </ModuleContainer>
  );
};
