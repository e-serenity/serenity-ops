import React from 'react';
import { ModuleContainer } from '../../components/common/ModuleContainer';
import { useDemo } from '../../context/DemoContext';
import { Key, Shield } from 'lucide-react';

interface TeaserModuleProps {
  moduleId: string;
}

export const TeaserModule: React.FC<TeaserModuleProps> = ({ moduleId }) => {
  const { modules, t } = useDemo();
  const mod = modules.find((m) => m.id === moduleId);

  if (!mod) return null;

  return (
    <ModuleContainer id={moduleId}>
      <div className="max-w-4xl mx-auto py-10 px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-sky-400 mx-auto flex items-center justify-center">
            {moduleId === 'serenity-iam' ? <Key className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
          </div>

          <h1 className="text-2xl font-bold text-white tracking-tight">
            {mod.title}
          </h1>

          <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            {mod.description}
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {t('Module activé en mode Preview', 'Module enabled in Preview Mode')}
          </div>

          <div className="pt-6 border-t border-slate-800 text-xs text-slate-400">
            {t(
              'Les règles d’audit et sondes sont enregistrées dans ',
              'Audit rules and probes are registered in '
            )}
            <code className="text-sky-300">serenity-ops-hub</code>.
          </div>
        </div>
      </div>
    </ModuleContainer>
  );
};
