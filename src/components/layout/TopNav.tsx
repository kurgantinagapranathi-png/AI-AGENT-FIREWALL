import React, { useState } from 'react';
import { useFirewall, ViewType } from '../../context/FirewallContext';
import {
  Bell,
  Menu,
  ShieldCheck,
  RotateCcw,
  User,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink
} from 'lucide-react';

interface TopNavProps {
  onToggleMobile: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onToggleMobile }) => {
  const {
    currentView,
    setCurrentView,
    unreadNotificationCount,
    notifications,
    markNotificationsAsRead,
    resetDemoData,
    setInspectedAction,
    actions,
    n8nStatus,
    backendOnline
  } = useFirewall();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const viewTitles: Record<ViewType, { title: string; subtitle: string }> = {
    overview: {
      title: 'Security Overview',
      subtitle: 'Monitor, govern, and secure autonomous AI actions in real time.'
    },
    playground: {
      title: 'Agent Playground',
      subtitle: 'Simulate autonomous AI actions against deterministic security boundaries.'
    },
    monitoring: {
      title: 'Live Monitoring',
      subtitle: 'Real-time telemetry, agent velocity metrics, and policy evaluations.'
    },
    policies: {
      title: 'Policy Management',
      subtitle: 'Configure thresholds, tool access whitelists, and decision boundaries.'
    },
    approvals: {
      title: 'Human Approval Center',
      subtitle: 'Review halted high-risk actions before autonomous execution.'
    },
    incidents: {
      title: 'Security Incidents',
      subtitle: 'Triage, investigate, and remediate blocked unauthorized actions.'
    },
    audit: {
      title: 'Audit Logs',
      subtitle: 'Cryptographically hashed immutable audit records of all decisions.'
    },
    integrations: {
      title: 'Integrations & Webhooks',
      subtitle: 'Connect n8n workflows, Supabase, AI models, and alerting tools.'
    },
    settings: {
      title: 'Settings & Environment',
      subtitle: 'Manage workspace configuration, data modes, and sandbox controls.'
    }
  };

  const handleOpenNotificationAction = (actionId?: string) => {
    if (!actionId) return;
    const target = actions.find((a) => a.id === actionId);
    if (target) {
      setInspectedAction(target);
      setNotificationsOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      {/* Top micro banner */}
      <div className="bg-slate-50 border-b border-slate-200/80 text-slate-600 px-4 py-1 text-[11px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-blue-700 bg-blue-50/80 px-1.5 py-0.2 rounded border border-blue-200/60">
            DEMO SANDBOX
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500 font-medium">No real financial transactions or live database mutations</span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Backend Gateway: {backendOnline ? 'Online' : 'Offline'}
          </span>
          <span className="text-slate-300">|</span>
          <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${n8nStatus === 'Connected' ? 'text-emerald-700' : 'text-amber-800'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${n8nStatus === 'Connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            n8n: {n8nStatus}
          </span>
          <span className="text-slate-300">|</span>
          <span className="font-mono text-slate-400 text-[10px]">v1.4.2-strict</span>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 bg-white">
        {/* Left: Mobile hamburger & breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobile}
            className="lg:hidden p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <span>Firewall</span>
              <span>/</span>
              <span className="text-slate-700 font-semibold">{viewTitles[currentView].title}</span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
              {viewTitles[currentView].title}
            </h1>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick Reset Demo button */}
          <button
            onClick={resetDemoData}
            title="Reset sandbox data to default"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-md transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Demo</span>
          </button>

          {/* Notifications button */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                if (!notificationsOpen) markNotificationsAsRead();
              }}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition-colors"
              aria-label="Security notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white" />
              )}
            </button>

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Security Alerts</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full font-mono">
                      {notifications.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleOpenNotificationAction(n.actionId)}
                      className="p-3 hover:bg-slate-50 cursor-pointer transition-colors text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900">{n.title}</span>
                        <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{n.message}</p>
                    </div>
                  ))}
                </div>

                <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                  <button
                    onClick={() => {
                      setCurrentView('incidents');
                      setNotificationsOpen(false);
                    }}
                    className="text-xs text-blue-600 font-semibold hover:text-blue-800"
                  >
                    View All Incidents →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                AM
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-800 leading-tight">Alex Mercer</div>
                <div className="text-[10px] text-slate-500 leading-tight">SecOps Lead</div>
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2 text-xs">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="font-bold text-slate-900">Alex Mercer</p>
                  <p className="text-slate-500 text-[11px]">secops@enterprise.internal</p>
                  <span className="mt-1 inline-block text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
                    Authorized Approver
                  </span>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setCurrentView('approvals');
                      setProfileOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded text-slate-700 font-medium"
                  >
                    My Approval Queue
                  </button>
                  <button
                    onClick={() => {
                      setCurrentView('settings');
                      setProfileOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded text-slate-700 font-medium"
                  >
                    Security Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
