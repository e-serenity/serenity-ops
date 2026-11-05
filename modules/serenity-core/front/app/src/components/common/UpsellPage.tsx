import React, { useState } from 'react';
import { ModuleInfo } from '../../types';
import { useDemo } from '../../context/DemoContext';
import {
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  ShieldCheck,
  MessageSquare,
  GitBranch,
  BellRing,
  Terminal,
  Lock,
} from 'lucide-react';

interface UpsellPageProps {
  module: ModuleInfo;
}

export const UpsellPage: React.FC<UpsellPageProps> = ({ module }) => {
  const { t } = useDemo();
  const [copied, setCopied] = useState(false);

  const isBotModule = module.id === 'serenity-bot';

  const getGithubUrl = (id: string) => {
    switch (id) {
      case 'serenity-core':
      case 'serenity-bot':
      case 'serenity-ses':
      case 'serenity-cloudwatch':
      case 'serenity-iam':
      case 'serenity-finops':
        return `https://github.com/e-serenity/serenity-ops/tree/main/modules/${id}`;
      default:
        return 'https://github.com/e-serenity/serenity-ops';
    }
  };

  const getQuickstartUrl = () =>
    'https://github.com/e-serenity/serenity-ops#60-second-quickstart';

  const getDocSummary = (id: string) => {
    switch (id) {
      case 'serenity-bot':
        return {
          resources: t(
            'Service ECS Managed Instances (ARM64), Secrets Manager, Rôle IAM ReadOnlyAccess + Bedrock Converse API + AssumeRole scopé.',
            'ECS Managed Instances Service (ARM64), Secrets Manager, IAM Role ReadOnlyAccess + Bedrock Converse API + scoped AssumeRole.'
          ),
          governance: t(
            '0 port entrant (Slack Socket Mode). Lecture globale autonome pour le diagnostic RCA ; écriture bloquée sans validation humaine.',
            '0 inbound ports (Slack Socket Mode). Autonomous global read for RCA diagnostics; write actions locked without human approval.'
          ),
        };
      case 'serenity-ses':
        return {
          resources: t(
            'Pool d’IP dédiées SES v2 (MANAGED), Configuration Set, Topic SNS + File SQS, Lambda ARM64 de traitement des Bounces/Complaints et table DynamoDB.',
            'SES v2 Dedicated IP Pool (MANAGED), Configuration Set, SNS Topic + SQS Queue, ARM64 Bounce/Complaint Lambda and DynamoDB table.'
          ),
          governance: t(
            '100% AI-Optional : fonctionne seul ou avec le sous-agent IAM serenity-agent-ses (limité à la Suppression List et aux ressources taguées ManagedBy=serenity-ops).',
            '100% AI-Optional: works standalone or with the serenity-agent-ses IAM sub-agent (scoped to Suppression List and ManagedBy=serenity-ops resources).'
          ),
        };
      case 'serenity-cloudwatch':
        return {
          resources: t(
            'Rôle IAM scopé serenity-agent-cw, règles EventBridge de synchronisation d’alarmes et enregistrement dans serenity-ops-hub.',
            'Scoped serenity-agent-cw IAM role, EventBridge alarm sync rules and registration in serenity-ops-hub.'
          ),
          governance: t(
            'Droits d’écriture strictement limités : création de nouvelles alarmes et modification uniquement sur aws:ResourceTag/ManagedBy = serenity-ops.',
            'Strictly limited write scope: alarm creation and modifications restricted to aws:ResourceTag/ManagedBy = serenity-ops.'
          ),
        };
      default:
        return {
          resources: t(
            'Module Terraform serverless déployé dans votre compte AWS avec auto-enregistrement dans la table DynamoDB serenity-ops-hub.',
            'Serverless Terraform module deployed in your AWS account with auto-registration in the serenity-ops-hub DynamoDB table.'
          ),
          governance: t(
            'Exécution 100% locale à votre compte AWS avec isolation IAM par rôle et validation Human-in-the-Loop.',
            '100% local execution inside your AWS account with per-role IAM isolation and Human-in-the-Loop approval.'
          ),
        };
    }
  };

  const docSummary = getDocSummary(module.id);

  const terraformSnippet = isBotModule
    ? `module "serenity_bot" {
  source = "${module.registrySource}"

  application            = "serenity-bot"
  environment            = "prod"
  region                 = "eu-west-3"
  cluster_arn            = module.serenity_core.ecs_cluster_arn
  capacity_provider_name = module.serenity_core.ecs_capacity_provider_name
  subnet_ids             = module.serenity_core.private_subnet_ids

  # ${t('Optionnel : raccorder à Serenity-Ops Hub (ou laisser vide en mode Standalone Slack)', 'Optional: connect to Serenity-Ops Hub (or leave empty for Standalone Slack mode)')}
  dynamodb_table_name    = module.serenity_core.dynamodb_hub_table_name
  history_retention_days = 90

  # ${t('Intégrations activables à la carte via variables Terraform', 'On-demand integrations enabled via Terraform variables')}
  enable_datadog         = true
  enable_gitlab          = true
}`
    : `module "${module.id.replace('serenity-', 'serenity_')}" {
  source = "${module.registrySource}"

  name_prefix             = "serenity-prod"
  environment             = "prod"
  serenity_ops_table_name = module.serenity_core.dynamodb_hub_table_name
  enable_serenity_agent   = true
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(terraformSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 mb-5">
          <span className="w-2 h-2 rounded-full bg-slate-500"></span>
          {isBotModule
            ? t(
                'Serenity Bot non installé — Mode Standard (Sans IA) actif',
                'Serenity Bot not installed — Standard Mode (No AI) active'
              )
            : t(
                'Module non détecté dans serenity-ops-hub',
                'Module not detected in serenity-ops-hub'
              )}
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-white mb-3">
          {module.title}
        </h1>
        <p className="text-slate-400 text-base leading-relaxed">
          {module.description}
        </p>
      </div>

      {isBotModule && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <BellRing className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {t('Analyse d’alertes temps réel', 'Real-Time Alert Analysis')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t(
                'Écoute vos channels Slack d’alertes et croise les services AWS autorisés (ECS, EC2, RDS, IAM, VPC, Logs...) avec les intégrations activées en variables Terraform (Datadog, GitLab, GitHub, Grafana...).',
                'Listens to your Slack alert channels and correlates authorized AWS services (ECS, EC2, RDS, IAM, VPC, Logs...) with integrations enabled via Terraform variables (Datadog, GitLab, GitHub, Grafana...).'
              )}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {t('Chatbot Web & Slack 24/7', '24/7 Web & Slack Chatbot')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t(
                'Déployable en mode Standalone (directement branché sur vos channels Slack sans Serenity-Ops) ou couplé à ce Dashboard Web pour interroger votre infra et vos connecteurs en langage naturel.',
                'Deployable in Standalone mode (plugged directly into your Slack channels without Serenity-Ops) or coupled with this Web Dashboard to query your infra and connectors in natural language.'
              )}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <GitBranch className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {t('Active l’IA sur tous vos Modules', 'Unlocks AI Across All Modules')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t(
                'Lorsqu’il est relié à serenity-ops, il pilote aussi les sous-agents des modules (CloudWatch, SES) avec des droits d’écriture restreints aux ressources créées par l’agent.',
                'When linked to serenity-ops, it also drives module sub-agents (CloudWatch, SES) with write permissions strictly limited to resources created by the agent.'
              )}
            </p>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              GitHub Source : {module.registrySource}
            </span>
            <span className="text-xs font-mono text-emerald-400">
              v{module.version}
            </span>
          </div>
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

        <pre className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-sky-300 overflow-x-auto border border-slate-800/80 leading-5">
          {terraformSnippet}
        </pre>

        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            {t(
              'Déploiement 100% dans votre compte AWS • Auto-Discovery via DynamoDB (serenity-ops-hub)',
              '100% deployed in your AWS account • Auto-Discovery via DynamoDB (serenity-ops-hub)'
            )}
          </span>
          <a
            href={getGithubUrl(module.id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sky-400 hover:underline"
          >
            {t(
              'Voir le module sur GitHub',
              'View module on GitHub'
            )}{' '}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 text-white font-semibold text-sm">
          <BookOpen className="w-4 h-4 text-sky-400" />
          <span>
            {t(
              'Documentation Résumée & Architecture du Module',
              'Module Summary & Architecture Documentation'
            )}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
              <span>
                {t('Ressources AWS Provisionnées', 'Provisioned AWS Resources')}
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {docSummary.resources}
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {t('Sécurité & Gouvernance IAM', 'Security & IAM Governance')}
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {docSummary.governance}
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            {t(
              'Dès le terraform apply terminé, le module apparaît automatiquement comme actif.',
              'Once terraform apply completes, the module automatically appears as active.'
            )}
          </span>

          <div className="flex items-center gap-2.5">
            <a
              href={getQuickstartUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium border border-slate-700 transition-all"
            >
              <span>{t('Guide Quickstart', 'Quickstart Guide')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href={getGithubUrl(module.id)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-all shadow-sm"
            >
              <span>{t('Code Source GitHub', 'GitHub Repository')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
