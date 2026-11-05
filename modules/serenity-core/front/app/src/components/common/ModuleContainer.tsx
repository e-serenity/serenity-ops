import React from 'react';
import { useDemo } from '../../context/DemoContext';
import { UpsellPage } from './UpsellPage';

interface ModuleContainerProps {
  id: string;
  children: React.ReactNode;
}

export const ModuleContainer: React.FC<ModuleContainerProps> = ({ id, children }) => {
  const { installedModules, modules } = useDemo();
  const isInstalled = installedModules.has(id);
  const moduleInfo = modules.find((m) => m.id === id);

  if (!isInstalled && moduleInfo) {
    return <UpsellPage module={moduleInfo} />;
  }

  return <>{children}</>;
};
