import React, { useState } from 'react';
import { useDemo } from '../../context/DemoContext';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Calendar,
  Layers,
  Cpu,
  Database,
  Bot,
  Radio,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Clock,
} from 'lucide-react';

export const FinOpsModule: React.FC = () => {
  const { t, isLiveMode, installedModules } = useDemo();
  const [copied, setCopied] = useState(false);

  const isBotInstalled = installedModules.has('serenity-bot');
  const isCoreOnlyLive = isLiveMode && !isBotInstalled;

  const last6Days = isCoreOnlyLive
    ? [
        { day: 'D-6', dayFr: 'J-6', cost: 0.0, queries: 2 },
        { day: 'D-5', dayFr: 'J-5', cost: 0.0, queries: 1 },
        { day: 'D-4', dayFr: 'J-4', cost: 0.0, queries: 3 },
        { day: 'D-3', dayFr: 'J-3', cost: 0.0, queries: 1 },
        { day: 'D-2', dayFr: 'J-2', cost: 0.0, queries: 2 },
        { day: 'D-1 (Yest.)', dayFr: 'J-1 (Hier)', cost: 0.0, queries: 4 },
      ]
    : [
        { day: 'D-6 (22 Oct)', dayFr: 'J-6 (22 Oct)', cost: 0.45, queries: 18 },
        { day: 'D-5 (23 Oct)', dayFr: 'J-5 (23 Oct)', cost: 0.49, queries: 24 },
        { day: 'D-4 (24 Oct)', dayFr: 'J-4 (24 Oct)', cost: 0.47, queries: 19 },
        { day: 'D-3 (25 Oct)', dayFr: 'J-3 (25 Oct)', cost: 0.51, queries: 27 },
        { day: 'D-2 (26 Oct)', dayFr: 'J-2 (26 Oct)', cost: 0.48, queries: 21 },
        { day: 'D-1 (Yest.)', dayFr: 'J-1 (Hier)', cost: 0.46, queries: 20 },
      ];

  const total6Days = last6Days.reduce((acc, curr) => acc + curr.cost, 0);
  const avgCostPerDay = (total6Days / last6Days.length).toFixed(2);
  const mtdCost = isCoreOnlyLive ? '0.00' : '14.82';

  const terraformSnippet = `module "serenity_finops" {
  source = "github.com/e-serenity/serenity-ops//modules/serenity-finops"

  # ${t('Raccordement direct à la table centrale Serenity-Ops', 'Direct connection to the central Serenity-Ops table')}
  serenity_ops_table_name = module.serenity_core.dynamodb_hub_table_name
  environment             = "prod"

  # ${t('Gouvernance budgétaire et auto-détection des gaspillages', 'Budget governance and automated waste detection')}
  monthly_budget_usd       = 500
  enable_automated_cleanup = false # ${t('Requiert approbation Slack / Web', 'Requires Slack / Web approval')}
  scan_orphan_resources    = true
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(terraformSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
            <DollarSign className="w-4 h-4" />
            <span>
              {t(
                'FinOps & Observabilité Budgétaire',
                'FinOps & Cost Observability'
              )}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {t('Pilotage FinOps & Dépenses AWS', 'FinOps Governance & AWS Spend')}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {t(
              'Suivi transparent des coûts de fonctionnement de Serenity-Ops et extension FinOps globale pour votre compte AWS.',
              'Transparent operating cost tracking for Serenity-Ops and global FinOps extension for your AWS account.'
            )}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-sky-400" />
          <span>
            {t('Mois en cours :', 'Current Month:')}{' '}
            <strong>{t('Octobre 2026', 'October 2026')}</strong>
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
            <h2 className="text-base font-semibold text-white tracking-tight">
              {t(
                'Coûts d’Infrastructure — Suite Serenity-Ops',
                'Infrastructure Costs — Serenity-Ops Suite'
              )}
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {t(
              'Composants Core, Bot IA Bedrock & Hub DynamoDB',
              'Core Components, Bedrock AI Bot & DynamoDB Hub'
            )}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {t(
                  'Coût Cumulé Mois en Cours (MTD)',
                  'Month-to-Date Cost (MTD)'
                )}
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                ${mtdCost}
              </span>
              <span className="text-xs font-medium text-emerald-400 flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" />{' '}
                {t('-12% vs projection', '-12% vs forecast')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {t(
                'Dépenses réelles AWS pour l’orchestrateur, le Hub et les sondes du 1er au 28 octobre.',
                'Actual AWS spend for the orchestrator, Hub and probes from Oct 1 to Oct 28.'
              )}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {t(
                  'Coût Moyen / Jour (6 derniers jours)',
                  'Average Daily Cost (Last 6 Days)'
                )}
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                ${avgCostPerDay}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {t('/ jour', '/ day')}
              </span>
              <span className="text-xs font-medium text-slate-300 ml-auto bg-slate-800 px-2 py-0.5 rounded">
                ± $0.03/d
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {t(
                'Moyenne lissée sur la période du 22 au 27 octobre (architecture Scale-to-Zero stable).',
                'Smoothed average over Oct 22–27 (stable Scale-to-Zero architecture).'
              )}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {t('Projection Fin de Mois', 'End-of-Month Forecast')}
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {isCoreOnlyLive ? '~$0.00' : '~$16.25'}
              </span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                {isCoreOnlyLive
                  ? t('Scale-to-Zero ($0/h)', 'Scale-to-Zero ($0/hr)')
                  : t('Plafond < 20 $', 'Cap < $20')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {isCoreOnlyLive
                ? t(
                    'Socle serenity-core seul actif (0 instance EC2, 0 NAT Gateway, S3 + CloudFront + DynamoDB Free Tier).',
                    'serenity-core only active (0 EC2 instances, 0 NAT Gateway, S3 + CloudFront + DynamoDB Free Tier).'
                  )
                : t(
                    'Coût total estimé pour 31 jours complets d’exploitation continue de Serenity-Ops.',
                    'Estimated total cost for 31 full days of continuous Serenity-Ops operation.'
                  )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {t(
                    'Évolution Quotidienne — 6 Derniers Jours',
                    'Daily Cost Trend — Last 6 Days'
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t(
                    'Coût journalier d’exécution de la suite Serenity-Ops en production',
                    'Daily runtime cost of the Serenity-Ops suite in production'
                  )}
                </p>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                <span>
                  {t('Moyenne :', 'Average:')}{' '}
                  <strong>
                    ${avgCostPerDay}
                    {t('/j', '/d')}
                  </strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 items-end h-44 pt-6 pb-2 border-b border-slate-800/80">
              {last6Days.map((d, idx) => {
                const heightPct = Math.round((d.cost / 0.6) * 100);
                const label = t(d.dayFr, d.day).split(' ')[0];
                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center gap-2 h-full justify-end group"
                  >
                    <span className="text-[11px] font-mono font-semibold text-slate-300 opacity-80 group-hover:opacity-100 group-hover:text-sky-300 transition-opacity">
                      ${d.cost.toFixed(2)}
                    </span>
                    <div className="w-full bg-slate-800/80 rounded-t-lg relative overflow-hidden h-28 flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-sky-600 to-indigo-500 rounded-t-lg transition-all duration-500 group-hover:from-sky-500 group-hover:to-indigo-400"
                        style={{ height: `${heightPct}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-4">
              <span>
                {t('Région AWS :', 'AWS Region:')}{' '}
                <strong className="text-slate-200">eu-west-3 (Paris)</strong>
              </span>
              <span>
                {t('Total 6 jours :', '6-Day Total:')}{' '}
                <strong className="text-sky-300 font-mono">
                  ${total6Days.toFixed(2)}
                </strong>
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                {t('Postes de Dépense Serenity-Ops', 'Serenity-Ops Cost Breakdown')}
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                {t(
                  `Ventilation du coût MTD ($${mtdCost})`,
                  `MTD cost breakdown ($${mtdCost})`
                )}
              </p>

              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      {t('ECS Managed (Bot & Tâches)', 'ECS Managed (Bot & Tasks)')}
                    </span>
                  </div>
                  <span className="font-mono font-semibold text-white">
                    $8.10 (54%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full"
                    style={{ width: '54%' }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Bot className="w-3.5 h-3.5 text-sky-400" />
                    <span>
                      {t('AWS Bedrock (Inférences LLM)', 'AWS Bedrock (LLM Inference)')}
                    </span>
                  </div>
                  <span className="font-mono font-semibold text-white">
                    $3.95 (27%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full"
                    style={{ width: '27%' }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    <span>VPC Endpoints & CloudWatch</span>
                  </div>
                  <span className="font-mono font-semibold text-white">
                    $2.25 (15%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{ width: '15%' }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>DynamoDB (serenity-ops-hub)</span>
                  </div>
                  <span className="font-mono font-semibold text-white">
                    $0.52 (4%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: '4%' }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>{t('Mode Pay-as-you-Go', 'Pay-as-you-Go Mode')}</span>
              <span className="text-emerald-400 font-medium">
                {t('Zéro gaspillage idle', 'Zero idle waste')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {t(
                'Module à venir • Monorepo',
                'Upcoming Module • Monorepo'
              )}
            </span>
            <span className="text-xs font-mono text-slate-400">
              github.com/e-serenity/serenity-ops//modules/serenity-finops
            </span>
            <span className="text-xs font-mono text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700/60 ml-auto">
              Early Access v0.8.0
            </span>
          </div>

          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold text-white tracking-tight mb-2">
              {t(
                'Passez à l’échelle supérieure avec le module ',
                'Scale up your cloud savings with the '
              )}
              <span className="text-sky-400 font-mono">
                serenity-finops
              </span>
              {t('', ' module')}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              {t(
                'Ne surveillez plus uniquement Serenity-Ops : étendez l’optimisation financière autonome à l’intégralité de vos comptes AWS. Détectez les anomalies de facturation, éliminez les ressources orphelines et appliquez les recommandations de resizing avec approbation IA Human-in-the-Loop.',
                'Go beyond tracking Serenity-Ops alone: extend autonomous financial optimization across all your AWS accounts. Detect billing anomalies, eliminate orphan resources, and apply right-sizing recommendations with Human-in-the-Loop AI approval.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                {t(
                  'Traque des Ressources Orphelines',
                  'Orphan Resource Hunting'
                )}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t(
                  'Scan automatique des volumes EBS non attachés, Elastic IPs inutilisées, NAT Gateways inactives et snapshots obsolètes.',
                  'Automated scanning for unattached EBS volumes, unused Elastic IPs, idle NAT Gateways, and obsolete snapshots.'
                )}
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center mb-3">
                <Bot className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                {t(
                  'Resizing IA & Human-in-the-Loop',
                  'AI Right-Sizing & Human-in-the-Loop'
                )}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t(
                  'Le sous-agent serenity-agent-finops prépare les actions de resizing (EC2/RDS/ECS) et soumet l’action à validation sur Slack.',
                  'The serenity-agent-finops sub-agent prepares right-sizing actions (EC2/RDS/ECS) and submits them for Slack approval.'
                )}
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                {t(
                  'Budgets Prédictifs & Alertes',
                  'Predictive Budgets & Alerts'
                )}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t(
                  'Corrélation entre pics de coûts, commits GitLab et déploiements CI/CD pour stopper les régressions financières avant la fin du mois.',
                  'Correlation between cost spikes, GitLab commits, and CI/CD deployments to stop financial regressions before month-end.'
                )}
              </p>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                {t(
                  'Aperçu de l’intégration Terraform :',
                  'Terraform Integration Preview:'
                )}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">
                      {t('Copié !', 'Copied!')}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('Copier le snippet', 'Copy snippet')}</span>
                  </>
                )}
              </button>
            </div>

            <pre className="text-xs font-mono text-sky-300 overflow-x-auto leading-5">
              {terraformSnippet}
            </pre>

            <div className="pt-3 border-t border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
              <span>
                {t(
                  'Déploiement 100% dans votre compte AWS • Zéro accès externe',
                  '100% deployed in your AWS account • Zero external access'
                )}
              </span>
              <a
                href="https://github.com/e-serenity/serenity-ops"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium"
              >
                <span>
                  {t(
                    'Suivre la sortie sur GitHub',
                    'Follow release on GitHub'
                  )}
                </span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
