import React, { useState } from 'react';
import { useDemo } from '../../context/DemoContext';
import {
  SlidersHorizontal,
  Database,
  Cloud,
  CheckSquare,
  Square,
  X,
  Globe,
  RefreshCw,
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
}

export const Header: React.FC<HeaderProps> = ({ currentTab }) => {
  const {
    isLiveMode,
    accountId,
    environment,
    region,
    hubTableName,
    refreshLiveState,
    installedModules,
    toggleModule,
    language,
    setLanguage,
    modules,
    t,
  } = useDemo();
  const [showSimulator, setShowSimulator] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshLiveState();
    setTimeout(() => setRefreshing(false), 400);
  };

  const getPageTitle = (tab: string) => {
    if (tab === 'overview') return t('Vue d’ensemble', 'Overview');
    if (tab === 'topology') return t('Topologie des Agents MCP', 'MCP Agent Topology');
    const found = modules.find((m) => m.id === tab);
    return found ? found.title : tab;
  };

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-white tracking-tight">
          {getPageTitle(currentTab)}
        </h2>
        <span className="text-xs text-slate-400">•</span>
        <span className="text-xs font-mono text-slate-400">
          {t(
            `Compte : ${accountId} (${environment})`,
            `Account: ${accountId} (${environment})`
          )}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
          <Cloud className="w-3.5 h-3.5 text-sky-400" />
          <span>{region}</span>
          <span className="text-slate-400">|</span>
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono text-[11px]">{hubTableName}</span>
        </div>

        <div className="flex items-center bg-slate-800/90 border border-slate-700/70 rounded-lg p-0.5 text-xs font-medium">
          <Globe className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1 hidden sm:inline" />
          <button
            onClick={() => setLanguage('fr')}
            className={`px-2 py-1 rounded-md transition-colors ${
              language === 'fr'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            FR
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 py-1 rounded-md transition-colors ${
              language === 'en'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            EN
          </button>
        </div>

        {isLiveMode ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              title={t('Rafraîchir depuis DynamoDB Hub', 'Refresh from DynamoDB Hub')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-all shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live AWS</span>
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowSimulator(!showSimulator)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-medium transition-all shadow-sm"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{t('Simulateur Démo', 'Demo Simulator')}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </button>

            {showSimulator && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 z-50 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div>
                    <span className="font-semibold text-white block">
                      {t('Simulation Auto-Discovery', 'Auto-Discovery Simulation')}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {t(
                        'Cochez pour simuler le terraform apply',
                        'Toggle to simulate terraform apply'
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSimulator(false)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {modules
                    .filter((m) => !m.isCore)
                    .map((mod) => {
                      const active = installedModules.has(mod.id);
                      return (
                        <div
                          key={mod.id}
                          onClick={() => toggleModule(mod.id)}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 cursor-pointer border border-slate-700/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-200">{mod.name}</span>
                            {mod.id === 'serenity-bot' && (
                              <span className="text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                                AI Brain
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {active ? (
                              <div className="flex items-center gap-1 text-emerald-400">
                                <CheckSquare className="w-4 h-4" />
                                <span className="text-[10px]">
                                  {t('Installé', 'Installed')}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-slate-400">
                                <Square className="w-4 h-4" />
                                <span className="text-[10px]">
                                  {t('Catalogue', 'Catalog')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                  {t(
                    '💡 Désactiver serenity-bot permet de tester la plateforme sans IA (les modules SES et CloudWatch restent utilisables en mode standard).',
                    '💡 Disabling serenity-bot lets you test the platform without AI (SES and CloudWatch modules remain usable in standard mode).'
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
