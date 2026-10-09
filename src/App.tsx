/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FirewallProvider, useFirewall } from './context/FirewallContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { ToastContainer } from './components/common/ToastContainer';
import { ActionDetailModal } from './components/common/ActionDetailModal';

// Views
import { OverviewView } from './views/OverviewView';
import { PlaygroundView } from './views/PlaygroundView';
import { MonitoringView } from './views/MonitoringView';
import { PoliciesView } from './views/PoliciesView';
import { ApprovalsView } from './views/ApprovalsView';
import { IncidentsView } from './views/IncidentsView';
import { AuditLogsView } from './views/AuditLogsView';
import { IntegrationsView } from './views/IntegrationsView';
import { SettingsView } from './views/SettingsView';

const MainContent: React.FC = () => {
  const { currentView } = useFirewall();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <OverviewView />;
      case 'playground':
        return <PlaygroundView />;
      case 'monitoring':
        return <MonitoringView />;
      case 'policies':
        return <PoliciesView />;
      case 'approvals':
        return <ApprovalsView />;
      case 'incidents':
        return <IncidentsView />;
      case 'audit':
        return <AuditLogsView />;
      case 'integrations':
        return <IntegrationsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <TopNav onToggleMobile={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderView()}
        </main>

        {/* Global Footer */}
        <footer className="px-6 py-4 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 bg-white">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">AI AGENT FIREWALL</span>
            <span>·</span>
            <span>Secure Autonomy. Enforce Every Boundary.</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Enterprise Cybersecurity & AI Action Governance Platform
          </div>
        </footer>
      </div>

      {/* Modals & Overlays */}
      <ActionDetailModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <FirewallProvider>
      <MainContent />
    </FirewallProvider>
  );
}
