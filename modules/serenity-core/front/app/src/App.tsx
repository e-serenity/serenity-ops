import React, { useState } from 'react';
import { DemoProvider } from './context/DemoContext';
import { Layout } from './components/layout/Layout';
import { Overview } from './pages/Overview';
import { Topology } from './pages/Topology';
import { BotModule } from './pages/modules/BotModule';
import { SESModule } from './pages/modules/SESModule';
import { CloudWatchModule } from './pages/modules/CloudWatchModule';
import { FinOpsModule } from './pages/modules/FinOpsModule';
import { TeaserModule } from './pages/modules/TeaserModule';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('overview');

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return <Overview setCurrentTab={setCurrentTab} />;
      case 'serenity-bot':
        return <BotModule />;
      case 'topology':
        return <Topology setCurrentTab={setCurrentTab} />;
      case 'serenity-ses':
        return <SESModule setCurrentTab={setCurrentTab} />;
      case 'serenity-cloudwatch':
        return <CloudWatchModule setCurrentTab={setCurrentTab} />;
      case 'serenity-iam':
        return <TeaserModule moduleId="serenity-iam" />;
      case 'serenity-finops':
        return <FinOpsModule />;
      default:
        return <Overview setCurrentTab={setCurrentTab} />;
    }
  };

  return (
    <DemoProvider>
      <Layout currentTab={currentTab} setCurrentTab={setCurrentTab}>
        {renderContent()}
      </Layout>
    </DemoProvider>
  );
};

export default App;
