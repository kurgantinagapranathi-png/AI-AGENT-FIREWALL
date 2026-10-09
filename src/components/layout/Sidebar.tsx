import React from 'react';
import { useFirewall, ViewType } from '../../context/FirewallContext';
import {
  LayoutDashboard,
  PlayCircle,
  Activity,
  Sliders,
  CheckSquare,
  AlertTriangle,
  FileText,
  Workflow,
  Settings,
  Shield,
  Layers,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { currentView, setCurrentView, approvals, incidents } = useFirewall();

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'PENDING').length;
  const openIncidentsCount = incidents.filter((i) => i.status === 'OPEN').length;

  const navItems: { id: ViewType; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'playground', label: 'Agent Playground', icon: PlayCircle },
    { id: 'monitoring', label: 'Live Monitoring', icon: Activity },
    { id: 'policies', label: 'Policy Management', icon: Sliders },
    { id: 'approvals', label: 'Approval Center', icon: CheckSquare, badge: pendingApprovalsCount },
    { id: 'incidents', label: 'Security Incidents', icon: AlertTriangle, badge: openIncidentsCount },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    { id: 'integrations', label: 'Integrations', icon: Workflow },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const handleSelect = (view: ViewType) => {
    setCurrentView(view);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200/80 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-blue-400 flex items-center justify-center border border-slate-800 shadow-xs">
              <Shield className="w-4.5 h-4.5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs tracking-tight text-slate-900">
                  AI AGENT FIREWALL
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Agent Security Platform
              </span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Governance & Controls
          </div>
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between py-2 text-xs transition-all rounded-md ${
                  isActive
                    ? 'bg-blue-50/80 text-blue-700 font-semibold border-l-2 border-blue-600 pl-2.5 pr-2.5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium pl-3 pr-2.5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                        item.id === 'incidents'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3 h-3 text-blue-500" />}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Bottom environment badge */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/50">
          <div className="rounded-lg p-2.5 bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Mode
              </span>
              <span className="text-[10px] font-mono font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/70">
                DEMO SANDBOX
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Deterministic firewall active. Safe simulation environment.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
