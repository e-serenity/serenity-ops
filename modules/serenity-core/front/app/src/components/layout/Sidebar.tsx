import React from 'react';
import { useDemo } from '../../context/DemoContext';
import {
  Shield,
  Bot,
  Activity,
  Mail,
  Key,
  DollarSign,
  GitBranch,
  LayoutDashboard,
  ExternalLink,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

type ModuleHealthStatus = 'active' | 'inactive' | 'warning' | 'error';

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { installedModules, modules, t } = useDemo();

  const getModuleIcon = (id: string) => {
    switch (id) {
      case 'serenity-bot':
        return <Bot className="w-4 h-4" />;
      case 'serenity-ses':
        return <Mail className="w-4 h-4" />;
      case 'serenity-cloudwatch':
        return <Activity className="w-4 h-4" />;
      case 'serenity-iam':
        return <Key className="w-4 h-4" />;
      case 'serenity-finops':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getModuleStatus = (id: string): ModuleHealthStatus => {
    if (!installedModules.has(id)) return 'inactive';
    return 'active';
  };

  const renderStatusIndicator = (id: string) => {
    const status = getModuleStatus(id);

    if (status === 'active') {
      return (
        <span
          title={t('Module actif', 'Module active')}
          className="inline-flex rounded-full h-2 w-2 bg-emerald-400 shrink-0"
        />
      );
    }

    if (status === 'warning') {
      return (
        <span
          title={t('Avertissement détecté', 'Warning detected')}
          className="inline-flex rounded-full h-2 w-2 bg-amber-400 shrink-0"
        />
      );
    }

    if (status === 'error') {
      return (
        <span
          title={t('Alerte critique', 'Critical alert')}
          className="inline-flex rounded-full h-2 w-2 bg-rose-400 shrink-0"
        />
      );
    }

    return (
      <span
        title={t('Non installé (Inactif)', 'Not installed (Inactive)')}
        className="inline-flex rounded-full h-2 w-2 bg-slate-700 border border-slate-600/50 shrink-0"
      />
    );
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 select-none">
      <div className="h-16 flex items-center px-5 border-b border-slate-800 gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-sky-400" />
        </div>
        <div>
          <span className="font-semibold text-sm tracking-tight text-white block">
            Serenity-Ops
          </span>
          <span className="text-[11px] text-slate-400 block">
            CloudSecOps & AIOps
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        <div>
          <span className="text-xs font-medium text-slate-400 px-3 block mb-2">
            {t('Plateforme', 'Platform')}
          </span>
          <div className="space-y-1">
            <button
              onClick={() => setCurrentTab('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'overview'
                  ? 'bg-slate-800 text-white border border-slate-700/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${currentTab === 'overview' ? 'text-sky-400' : 'text-slate-400'}`} />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setCurrentTab('serenity-bot')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'serenity-bot'
                  ? 'bg-slate-800 text-white border border-slate-700/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Bot className={`w-4 h-4 ${currentTab === 'serenity-bot' ? 'text-sky-400' : 'text-slate-400'}`} />
                <span className="truncate">Serenity Bot</span>
              </div>

              {renderStatusIndicator('serenity-bot')}
            </button>

            <button
              onClick={() => setCurrentTab('topology')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'topology'
                  ? 'bg-slate-800 text-white border border-slate-700/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <GitBranch className={`w-4 h-4 ${currentTab === 'topology' ? 'text-sky-400' : 'text-slate-400'}`} />
              <span>Agent Topology</span>
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-medium text-slate-400">
              {t('Modules détectés', 'Detected modules')}
            </span>
            <span className="text-[10px] bg-slate-800 border border-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded font-mono">
              DynamoDB
            </span>
          </div>

          <div className="space-y-1">
            {modules
              .filter((m) => !m.isCore && m.id !== 'serenity-bot')
              .map((mod) => {
                const isSelected = currentTab === mod.id;

                return (
                  <button
                    key={mod.id}
                    onClick={() => setCurrentTab(mod.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-slate-800 text-white border border-slate-700/80 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className={isSelected ? 'text-sky-400' : 'text-slate-400'}>
                        {getModuleIcon(mod.id)}
                      </span>
                      <span className="truncate">{mod.title}</span>
                    </div>

                    {renderStatusIndicator(mod.id)}
                  </button>
                );
              })}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-slate-300">e-serenity</span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            Scale-to-Zero
          </span>
        </div>
        <p className="text-[11px] text-slate-400 flex items-center justify-between">
          <span>Crafted by e-serenity</span>
          <a
            href="https://github.com/e-serenity"
            target="_blank"
            rel="noreferrer"
            className="text-sky-400 hover:text-sky-300 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>
    </aside>
  );
};
