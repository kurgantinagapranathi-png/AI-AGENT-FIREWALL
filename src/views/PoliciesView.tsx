import React, { useState } from 'react';
import { useFirewall } from '../context/FirewallContext';
import { SecurityPolicy } from '../types/firewall';
import {
  Sliders,
  RotateCcw,
  Save,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Info,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const PoliciesView: React.FC = () => {
  const {
    policies,
    updatePolicy,
    resetPoliciesToDefault,
    agents,
    setCurrentView
  } = useFirewall();

  // Local editable values
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [tempThreshold, setTempThreshold] = useState<number>(1000);

  const startEdit = (p: SecurityPolicy) => {
    setEditingPolicyId(p.id);
    setTempThreshold(p.threshold || 0);
  };

  const handleSaveThreshold = (policyId: string) => {
    if (tempThreshold <= 0) return;
    updatePolicy(policyId, { threshold: tempThreshold });
    setEditingPolicyId(null);
  };

  const handleTogglePolicy = (policy: SecurityPolicy) => {
    if (policy.hardRule && policy.code === 'SEC_TOOL_AUTH') {
      alert('Security Protection: Tool Authorization Whitelist is a Mandatory Zero-Trust control and cannot be disabled.');
      return;
    }
    updatePolicy(policy.id, { enabled: !policy.enabled });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
              Deterministic Rule Engine
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">Instant Hot-Reload</span>
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Firewall Policy Engine Rules & Boundaries
          </h2>
          <p className="text-xs text-slate-500">
            Policies take effect immediately in the Agent Playground. All evaluations are deterministic.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetPoliciesToDefault}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Baseline Defaults</span>
          </button>
        </div>
      </div>

      {/* Policies List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Active Security Boundary Policies ({policies.length})
          </h3>
          <span className="text-xs text-blue-600 cursor-pointer hover:underline" onClick={() => setCurrentView('playground')}>
            Test updated policies in Playground →
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {policies.map((policy) => {
            const isEditing = editingPolicyId === policy.id;

            return (
              <div
                key={policy.id}
                className={`p-5 rounded-xl border transition-all bg-white ${
                  policy.enabled ? 'border-slate-200 shadow-xs' : 'border-slate-200/60 opacity-60 bg-slate-50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {policy.code}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{policy.name}</h4>
                      {policy.hardRule && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          <Lock className="w-2.5 h-2.5" />
                          HARD BOUNDARY
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                      {policy.description}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                      <span>Category: <strong className="text-slate-700">{policy.category}</strong></span>
                      <span>·</span>
                      <span>Breach Verdict: <strong className={policy.decisionOnBreach === 'BLOCK' ? 'text-rose-700' : 'text-amber-700'}>{policy.decisionOnBreach}</strong></span>
                      <span>·</span>
                      <span>Severity: <strong className="text-slate-700">{policy.severity}</strong></span>
                    </div>
                  </div>

                  {/* Right: Controls & Threshold */}
                  <div className="flex flex-col sm:items-end gap-3 flex-shrink-0">
                    {/* Toggle button */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">
                        {policy.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        onClick={() => handleTogglePolicy(policy)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                          policy.enabled ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                        aria-label={`Toggle ${policy.name}`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                            policy.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Threshold Editor */}
                    {policy.threshold !== undefined && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium">Limit:</span>
                            <input
                              type="number"
                              min="1"
                              value={tempThreshold}
                              onChange={(e) => setTempThreshold(Number(e.target.value))}
                              className="w-24 px-2 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500"
                            />
                            <span className="text-slate-500 font-mono text-[11px]">{policy.unit}</span>
                            <button
                              onClick={() => handleSaveThreshold(policy.id)}
                              className="p-1 text-emerald-600 hover:text-emerald-800 bg-emerald-50 rounded border border-emerald-200"
                              title="Save new threshold"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Threshold:</span>
                            <span className="font-bold text-slate-900 text-sm">
                              {policy.threshold.toLocaleString('en-IN')} {policy.unit}
                            </span>
                            <button
                              onClick={() => startEdit(policy)}
                              className="text-xs text-blue-600 hover:underline font-semibold ml-1"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agent Whitelist Matrix */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Agent Authorized Service Manifests (SEC_TOOL_AUTH)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Autonomous agents attempting to access tools outside their granted manifest are halted immediately.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Agent Name</th>
                <th className="px-4 py-2.5">Agent ID</th>
                <th className="px-4 py-2.5">Department</th>
                <th className="px-4 py-2.5">Authorized Tool Whitelist</th>
                <th className="px-4 py-2.5">Enforcement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agents.map((ag) => (
                <tr key={ag.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-semibold text-slate-900">{ag.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{ag.id}</td>
                  <td className="px-4 py-3 text-slate-600">{ag.department}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {ag.allowedTools.map((tool) => (
                        <span
                          key={tool}
                          className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Hard Whitelist
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
