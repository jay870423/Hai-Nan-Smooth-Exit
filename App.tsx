import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { CheckpointList } from './components/CheckpointList';
import { Scanner } from './components/Scanner';
import { QuotaView } from './components/QuotaView';
import { BlacklistView } from './components/BlacklistView';
import { Tab } from './types';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<Tab>('home');

  const renderContent = () => {
    switch (currentTab) {
      case 'home':
        return <CheckpointList />;
      case 'scanner':
        return <Scanner />;
      case 'quota':
        return <QuotaView />;
      case 'blacklist':
        return <BlacklistView />;
      default:
        return <CheckpointList />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased max-w-md mx-auto shadow-2xl overflow-hidden relative">
      {/* Top decorative bar */}
      <div className="h-1 bg-gradient-to-r from-teal-400 to-blue-500 w-full fixed top-0 left-0 right-0 z-50"></div>
      
      <main className="pt-4 h-full">
        {renderContent()}
      </main>

      <Navbar currentTab={currentTab} onTabChange={setCurrentTab} />
    </div>
  );
};

export default App;