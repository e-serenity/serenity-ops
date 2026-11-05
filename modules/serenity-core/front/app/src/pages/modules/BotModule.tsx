import React, { useState } from 'react';
import { ModuleContainer } from '../../components/common/ModuleContainer';
import { useDemo } from '../../context/DemoContext';
import {
  Bot,
  Send,
  ShieldCheck,
  Clock,
  Check,
  X,
  GitBranch,
  MessageSquare,
  BellRing,
  Terminal,
  ArrowRight,
  FileText,
  User,
  Cpu,
} from 'lucide-react';

export const BotModule: React.FC = () => {
  const {
    t,
    incidents,
    chatMessages,
    sendChatMessage,
    approveAction,
    rejectAction,
    retentionDays,
  } = useDemo();

  const [input, setInput] = useState('');
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'ALERT' | 'USER_REQUEST'>('ALL');

  const pendingApprovals = incidents.filter(
    (inc) => inc.proposedAction && inc.proposedAction.status === 'PENDING_APPROVAL'
  );

  const filteredIncidents = incidents.filter((inc) => {
    if (activityFilter === 'ALL') return true;
    return (inc.kind || 'ALERT') === activityFilter;
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendChatMessage(input);
    setInput('');
  };

  const quickPrompts = [
    t(
      'Analyse le pic 5XX sur prod-api et le pool Redis',
      'Analyze the 5XX spike on prod-api and Redis pool'
    ),
    t(
      'Vérifie le taux de bounce SES et le warm-up des IPs',
      'Check SES bounce rate and dedicated IP warm-up'
    ),
    t(
      'Quel est le coût FinOps MTD de la plateforme ?',
      'What is the FinOps MTD cost of the platform?'
    ),
  ];

  return (
    <ModuleContainer id="serenity-bot">
      <div className="max-w-7xl mx-auto space-y-6 pb-10">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  ACTIVE
                </span>
                <span className="text-xs font-mono text-slate-400">
                  github.com/e-serenity/serenity-ops//modules/serenity-bot v1.2.0
                </span>
                <span className="text-xs font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  Claude Sonnet 4.6 + Gemini Fallback
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <Bot className="w-7 h-7 text-sky-400" />
                {t(
                  'Serenity Bot — Orchestrateur IA & Console d’Opérations',
                  'Serenity Bot — AI Orchestrator & Operations Console'
                )}
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                {t(
                  'Déployable seul avec Slack ou couplé à Serenity-Ops : analyse vos alertes en temps réel via AWS et les intégrations activées dans vos variables Terraform, répond en direct et gère les approbations.',
                  'Deployable standalone with Slack or coupled with Serenity-Ops: analyzes alerts in real time via AWS and integrations enabled in your Terraform variables, chats live and manages approvals.'
                )}
              </p>

              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                  {t('Variables Terraform :', 'Terraform Vars:')}
                </span>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                  Slack: #ops-alerts, #prod
                </span>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                  enable_datadog=true
                </span>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                  enable_gitlab=true
                </span>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded">
                  enable_github=false
                </span>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded">
                  enable_grafana=false
                </span>
              </div>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 shrink-0 flex items-center gap-2.5 self-start lg:self-center">
              <Clock className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-medium text-slate-300">
                {t('Rétention :', 'Retention:')}{' '}
                <strong className="font-mono text-white">
                  {retentionDays} {t('jours', 'days')}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                {t(
                  'File d’Approbation Human-in-the-Loop (Actions MCP)',
                  'Human-in-the-Loop Approval Queue (MCP Write Actions)'
                )}
                {pendingApprovals.length > 0 && (
                  <span className="text-xs font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    {pendingApprovals.length} {t('en attente', 'pending')}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t(
                  'Chaque sous-agent ne peut modifier que les ressources qu’il a lui-même créées (condition IAM ManagedBy=serenity-ops), après approbation humaine.',
                  'Each sub-agent can only modify resources it created itself (IAM condition ManagedBy=serenity-ops), following explicit human approval.'
                )}
              </p>
            </div>
            <span className="text-xs font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 px-3 py-1 rounded-full self-start sm:self-auto">
              {t('Synchronisé Slack Block Kit & Web', 'Synced with Slack Block Kit & Web')}
            </span>
          </div>

          {incidents.filter((i) => i.proposedAction).length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              {t(
                'Aucune action en attente. Tout est sous contrôle.',
                'No pending actions. Everything is under control.'
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incidents
                .filter((inc) => inc.proposedAction)
                .map((inc) => {
                  const action = inc.proposedAction!;
                  return (
                    <div
                      key={`approval-${inc.id}`}
                      className={`rounded-xl p-4 border flex flex-col justify-between gap-4 ${
                        action.status === 'PENDING_APPROVAL'
                          ? 'bg-gradient-to-br from-amber-950/20 via-slate-950 to-slate-950 border-amber-500/30'
                          : 'bg-slate-950/70 border-slate-800'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {action.agent} (SCOPED WRITE)
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {inc.timestamp}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>{action.action}</span>
                        </div>

                        <div className="text-[11px] font-mono text-sky-300 flex items-center gap-1.5">
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span>{action.target}</span>
                        </div>

                        <p className="text-[11px] text-slate-400">{action.details}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400 truncate">
                          {t('Origine :', 'Origin:')} <strong className="text-slate-200">{inc.trigger}</strong>
                        </span>

                        {action.status === 'PENDING_APPROVAL' && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => approveAction(inc.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-900/30"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{t('Approuver', 'Approve')}</span>
                            </button>
                            <button
                              onClick={() => rejectAction(inc.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-slate-300 hover:text-rose-400 border border-slate-700 text-xs transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>{t('Rejeter', 'Reject')}</span>
                            </button>
                          </div>
                        )}

                        {action.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 shrink-0">
                            <Check className="w-3 h-3" />
                            {t('Approuvé & Exécuté', 'Approved & Executed')}
                          </span>
                        )}

                        {action.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-semibold bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20 shrink-0">
                            <X className="w-3 h-3" />
                            {t('Rejeté', 'Rejected')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[620px] shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Chat Serenity-Ops</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {t(
                      'Interrogez l’infrastructure, les logs et plus encore en temps réel',
                      'Query infrastructure, logs and more in real time'
                    )}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Read (Auto) + Write on Approval
              </span>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center py-10 text-xs text-slate-400">
                  {t(
                    'Aucun message récent dans serenity-ops-hub. Posez votre première question ci-dessous !',
                    'No recent messages in serenity-ops-hub. Ask your first question below!'
                  )}
                </div>
              )}
              {chatMessages.map((msg) => {
                const isBot = msg.sender === 'bot';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        isBot
                          ? 'bg-slate-950 border border-slate-800 text-slate-200'
                          : 'bg-sky-600 text-white shadow-md shadow-sky-900/20'
                      }`}
                    >
                      <p>{msg.text}</p>

                      {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                          {msg.toolsUsed.map((tool, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-mono bg-slate-900 text-sky-400 border border-slate-800 px-1.5 py-0.5 rounded"
                            >
                              ⚡ {tool}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 mt-1 px-1">
                      {msg.timestamp}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-2.5 bg-slate-950/40 border-t border-slate-800/80">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                {t('Suggestions rapides :', 'Quick prompts:')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendChatMessage(prompt)}
                    className="text-[11px] bg-slate-800/90 hover:bg-slate-800 text-slate-300 border border-slate-700/70 px-2.5 py-1 rounded-lg transition-colors text-left truncate max-w-full font-mono"
                  >
                    <Terminal className="w-3 h-3 inline mr-1.5 text-slate-400" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleSend}
              className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t(
                  'Poser une question ou lancer un diagnostic...',
                  'Ask a question or trigger a diagnostic...'
                )}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 shadow-md shadow-sky-900/30"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('Envoyer', 'Send')}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-sky-400" />
                  {t(
                    'Journal d’Activité : Alertes Traitées & Demandes Utilisateurs',
                    'Activity Log: Handled Alerts & User Requests'
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t(
                    'Historique temps réel des diagnostics automatiques et des questions posées au bot.',
                    'Real-time history of automated alarm diagnostics and manual requests asked to the bot.'
                  )}
                </p>
              </div>

              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium shrink-0">
                <button
                  onClick={() => setActivityFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activityFilter === 'ALL'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t('Tout', 'All')} ({incidents.length})
                </button>
                <button
                  onClick={() => setActivityFilter('ALERT')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activityFilter === 'ALERT'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t('Alertes', 'Alerts')} (
                  {incidents.filter((i) => (i.kind || 'ALERT') === 'ALERT').length})
                </button>
                <button
                  onClick={() => setActivityFilter('USER_REQUEST')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activityFilter === 'USER_REQUEST'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t('Demandes User', 'User Requests')} (
                  {incidents.filter((i) => i.kind === 'USER_REQUEST').length})
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
              {filteredIncidents.length === 0 && (
                <div className="text-center py-10 text-xs text-slate-400 bg-slate-950/60 rounded-xl border border-slate-800">
                  {t(
                    'Aucun événement enregistré dans serenity-ops-hub pour ce filtre.',
                    'No events recorded in serenity-ops-hub for this filter.'
                  )}
                </div>
              )}
              {filteredIncidents.map((item) => {
                const isUserReq = item.kind === 'USER_REQUEST';

                return (
                  <div
                    key={item.id}
                    className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isUserReq ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <User className="w-3 h-3" />
                            {t('DEMANDE USER', 'USER REQUEST')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <BellRing className="w-3 h-3" />
                            {t('ALERTE AUTO', 'AUTO ALERT')} • {item.severity}
                          </span>
                        )}

                        {item.source && (
                          <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {item.source}
                          </span>
                        )}

                        {item.requester && (
                          <span className="text-[11px] font-mono text-sky-400">
                            par {item.requester}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                        <span>{item.timestamp}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          TTL: {retentionDays}d
                        </span>
                      </div>
                    </div>

                    <div className="text-xs font-semibold text-white">
                      {item.trigger}
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/80 space-y-1">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <GitBranch className="w-3 h-3 text-sky-400" />
                        {t('Outils & Traces MCP :', 'MCP Tools & Traces:')}
                      </div>
                      {item.mcpTraces.map((trace, i) => (
                        <div
                          key={i}
                          className="text-[11px] font-mono text-slate-300 pl-2.5 border-l-2 border-sky-500/40"
                        >
                          {trace}
                        </div>
                      ))}
                    </div>

                    <div className="text-xs text-slate-300 leading-relaxed">
                      <span className="font-semibold text-white">
                        {isUserReq
                          ? t('Réponse du Bot : ', 'Bot Response: ')
                          : t('Diagnostic RCA : ', 'RCA Diagnostic: ')}
                      </span>
                      {item.rca}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </ModuleContainer>
  );
};
