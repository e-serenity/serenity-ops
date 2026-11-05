import React, { useState } from 'react';
import { ModuleContainer } from '../../components/common/ModuleContainer';
import { useDemo } from '../../context/DemoContext';
import {
  ShieldCheck,
  CheckCircle,
  Search,
  Server,
  Flame,
  Check,
  Bot,
} from 'lucide-react';

interface SESModuleProps {
  setCurrentTab?: (tab: string) => void;
}

export const SESModule: React.FC<SESModuleProps> = ({ setCurrentTab }) => {
  const { sesSummary, emailEvents, applyEmailAction, installedModules, t } = useDemo();
  const [activeTab, setActiveTab] = useState<'health' | 'events'>('health');
  const [search, setSearch] = useState('');

  const isBotInstalled = installedModules.has('serenity-bot');

  const filteredEvents = emailEvents.filter(
    (e) =>
      e.recipient.toLowerCase().includes(search.toLowerCase()) ||
      e.smtpCode.toLowerCase().includes(search.toLowerCase()) ||
      e.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ModuleContainer id="serenity-ses">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ACTIVE
              </span>
              <span className="text-xs font-mono text-slate-400">
                github.com/e-serenity/serenity-ops//modules/serenity-ses v2.0.0
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {t(
                'Module Délivrabilité & IP Dédiées (SES)',
                'SES Deliverability & Dedicated IPs Module'
              )}
            </h1>
          </div>

          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab('health')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'health'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t(
                'Onglet 1 : Santé & Délivrabilité',
                'Tab 1: Health & Deliverability'
              )}
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'events'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('Onglet 2 : Retours d’emails', 'Tab 2: Email Feedback')} (
              {emailEvents.length})
            </button>
          </div>
        </div>

        {activeTab === 'health' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
                {t(
                  'Conformité & Authentification Domaines',
                  'Domain Authentication & Compliance'
                )}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-semibold text-white">
                      DMARC Policy
                    </span>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-lg font-bold text-emerald-400">
                    {t('p=reject (Validé)', 'p=reject (Verified)')}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {t(
                      'Protection maximale anti-usurpation active sur tous les sous-domaines.',
                      'Maximum anti-spoofing protection active across all subdomains.'
                    )}
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-semibold text-white">
                      SPF Record
                    </span>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-lg font-bold text-emerald-400">
                    Pass (v=spf1)
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {t(
                      'Serveurs d’envoi SES correctement autorisés dans les enregistrements TXT.',
                      'SES sending servers properly authorized in DNS TXT records.'
                    )}
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-semibold text-white">
                      DKIM (2048-bit)
                    </span>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-lg font-bold text-emerald-400">
                    {t('Actif (3 CNAMEs)', 'Active (3 CNAMEs)')}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {t(
                      'Signature cryptographique validée par les messageries (Gmail, Outlook).',
                      'Cryptographic signature verified by major mailbox providers (Gmail, Outlook).'
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <Flame className="w-5 h-5 text-amber-500" />
                    {t(
                      'Pool d’IP Dédiées Managées (SES Dedicated IPs)',
                      'Managed Dedicated IP Pool (SES Dedicated IPs)'
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t(
                      'Montée en charge progressive orchestrée automatiquement par AWS SES v2.',
                      'Progressive warm-up automatically orchestrated by AWS SES v2.'
                    )}
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Pool : serenity-dedicated-pool
                </span>
              </div>

              <div className="space-y-4">
                {sesSummary.dedicatedIps.length === 0 && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-400 text-center">
                    {t(
                      'Pool MANAGED actif — aucune IP dédiée en cours de warm-up signalée.',
                      'MANAGED pool active — no dedicated IP warm-up in progress.'
                    )}
                  </div>
                )}
                {sesSummary.dedicatedIps.map((ip) => (
                  <div
                    key={ip.ip}
                    className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Server className="w-4 h-4 text-sky-400" />
                        <span className="font-mono text-sm font-semibold text-white">
                          {ip.ip}
                        </span>
                        <span className="text-xs text-slate-400">({ip.status})</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {ip.warmup}% {t('complété', 'completed')}
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-emerald-500 h-2 rounded-full transition-all"
                        style={{ width: `${ip.warmup}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400 block mb-2">
                  {t(
                    'Taux de Bounce (Seuil AWS : 5%)',
                    'Bounce Rate (AWS Threshold: 5%)'
                  )}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">
                    {sesSummary.bounceRate}%
                  </span>
                  <span className="text-xs text-emerald-400 font-medium">
                    {t('Zone Verte', 'Healthy Zone')}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {t(
                    'Aucun risque de suspension de compte par AWS SES.',
                    'No risk of AWS SES account suspension.'
                  )}
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400 block mb-2">
                  {t(
                    'Taux de Plainte / Complaint (Seuil AWS : 0.1%)',
                    'Complaint Rate (AWS Threshold: 0.1%)'
                  )}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">
                    {sesSummary.complaintRate}%
                  </span>
                  <span className="text-xs text-emerald-400 font-medium">
                    {t('Optimal', 'Optimal')}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {t(
                    'Feedback Loops opérationnelles sur tous les fournisseurs.',
                    'ISP Feedback Loops operational across all providers.'
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder={t(
                    'Filtrer par email, code SMTP (ex: 550) ou type...',
                    'Filter by email, SMTP code (e.g. 550) or type...'
                  )}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              <span className="text-xs text-slate-400 font-mono">
                {t(
                  'Source : SNS → Lambda → DynamoDB (TTL 90j)',
                  'Source: SNS → Lambda → DynamoDB (90d TTL)'
                )}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">{t('Date / Heure', 'Date / Time')}</th>
                      <th className="py-3 px-4">{t('Type', 'Type')}</th>
                      <th className="py-3 px-4">{t('Destinataire', 'Recipient')}</th>
                      <th className="py-3 px-4">
                        {t('Code SMTP & Diagnostic', 'SMTP Code & Diagnostic')}
                      </th>
                      <th className="py-3 px-4 text-right">
                        {t('Action Automatique IA', 'AI Automated Action')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredEvents.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 px-4 text-center text-slate-400 text-xs">
                          {t(
                            'Aucun retour d’email (Bounce / Complaint) enregistré dans serenity-ops-hub.',
                            'No email feedback (Bounce / Complaint) recorded in serenity-ops-hub.'
                          )}
                        </td>
                      </tr>
                    )}
                    {filteredEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                          {evt.timestamp}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              evt.type === 'HardBounce'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : evt.type === 'Complaint'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {evt.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-white">
                          {evt.recipient}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          <div className="font-mono text-sky-400 text-[11px]">
                            {evt.smtpCode}
                          </div>
                          <div className="text-slate-400 text-[11px]">{evt.reason}</div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isBotInstalled ? (
                            <button
                              onClick={() => setCurrentTab && setCurrentTab('serenity-bot')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/20 text-[11px] font-medium transition-colors"
                            >
                              <Bot className="w-3 h-3" />
                              <span>
                                {t('Requiert Serenity Bot', 'Requires Serenity Bot')}
                              </span>
                            </button>
                          ) : evt.actionStatus === 'PENDING' ? (
                            <button
                              onClick={() => applyEmailAction(evt.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-[11px] transition-all"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{evt.suggestedAction}</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                              <Check className="w-3.5 h-3.5" />{' '}
                              {t(
                                'Traité par serenity-agent-ses',
                                'Handled by serenity-agent-ses'
                              )}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModuleContainer>
  );
};
