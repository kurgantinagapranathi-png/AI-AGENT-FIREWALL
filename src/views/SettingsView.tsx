import React, { useState } from 'react';
import { useFirewall } from '../context/FirewallContext';
import {
  Settings,
  RotateCcw,
  Shield,
  Bell,
  Database,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { resetDemoData, policies, agents, actions } = useFirewall();
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [dataMode, setDataMode] = useState<'DEMO' | 'CONNECTED'>('DEMO');
  const [notifyOnBlock, setNotifyOnBlock] = useState<boolean>(true);
  const [notifyOnApproval, setNotifyOnApproval] = useState<boolean>(true);

  const handleConfirmReset = () => {
    resetDemoData();
    setShowResetConfirm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">
            Configuration
          </span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs text-slate-500 font-medium">SecOps Governance</span>
        </div>
        <h2 className="text-base font-bold text-slate-900">
          Environment & System Settings
        </h2>
        <p className="text-xs text-slate-500">
          Control operational boundaries, notification routing, and sandbox environment persistence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Workspace Info */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600" />
            Workspace & Deployment Profile
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Organization:</span>
              <span className="font-semibold text-slate-900">Enterprise AI Trust & Safety</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Environment Target:</span>
              <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                DEMO SANDBOX
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Active Agents Guarded:</span>
              <span className="font-semibold text-slate-900">{agents.length} Autonomous Agents</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Enforced Policies:</span>
              <span className="font-semibold text-slate-900">{policies.filter((p) => p.enabled).length} Active Rules</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Total Intercepts to Date:</span>
              <span className="font-semibold text-slate-900">{actions.length} Invocations</span>
            </div>
          </div>
        </div>

        {/* Data Operating Mode */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            Data Persistence Mode
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Choose whether to run in self-contained deterministic demo mode or connect external database backends.
          </p>

          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-blue-300 bg-blue-50/50 cursor-pointer">
              <input
                type="radio"
                name="dataMode"
                checked={dataMode === 'DEMO'}
                onChange={() => setDataMode('DEMO')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">Demo Sandbox (Recommended)</span>
                <span className="text-slate-500">Local deterministic evaluation, instant state reset, zero external dependencies required.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer">
              <input
                type="radio"
                name="dataMode"
                checked={dataMode === 'CONNECTED'}
                onChange={() => setDataMode('CONNECTED')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">Connected Production Backend</span>
                <span className="text-slate-500">Requires Supabase and n8n webhook configuration in .env.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-600" />
            Security Notification Rules
          </h3>
          <p className="text-xs text-slate-600">
            Configure automated alerts triggered by firewall policy decisions.
          </p>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">Alert on BLOCKED Actions</span>
                <span className="text-slate-500">Generate high-priority notifications when hard boundaries are hit.</span>
              </div>
              <input
                type="checkbox"
                checked={notifyOnBlock}
                onChange={(e) => setNotifyOnBlock(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div>
                <span className="font-semibold text-slate-900 block">Alert on REQUIRES_APPROVAL</span>
                <span className="text-slate-500">Queue actions in reviewer inbox and sound tone.</span>
              </div>
              <input
                type="checkbox"
                checked={notifyOnApproval}
                onChange={(e) => setNotifyOnApproval(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </div>
          </div>
        </div>

        {/* Danger Zone / Reset Sandbox */}
        <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold">Sandbox State Reset</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Restore the application to the fresh seed data state. Resets all custom policies, clears action records created in this session, and reloads initial scenario data.
          </p>

          <div className="pt-2">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo Sandbox State</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showResetConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reset Demo State?</h3>
                <p className="text-xs text-slate-500">This action clears session modifications.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to restore initial demo data? Policies and actions created during this session will be reverted to baseline defaults.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Yes, Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
