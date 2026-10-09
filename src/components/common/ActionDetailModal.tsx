import React, { useState } from 'react';
import { useFirewall } from '../../context/FirewallContext';
import { DecisionBadge, ExecutionBadge } from './Badge';
import { X, Shield, Check, AlertCircle, Copy, Terminal, ExternalLink, AlertTriangle } from 'lucide-react';

export const ActionDetailModal: React.FC = () => {
  const { inspectedAction, setInspectedAction } = useFirewall();
  const [activeTab, setActiveTab] = useState<'trace' | 'payload'>('trace');
  const [copied, setCopied] = useState(false);

  if (!inspectedAction) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(inspectedAction, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="modal-title" className="text-sm font-bold text-slate-900">
                  Firewall Inspection: {inspectedAction.id}
                </h3>
                <span className="text-xs font-mono text-slate-500">
                  {inspectedAction.correlationId}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Logged at {new Date(inspectedAction.timestamp).toLocaleTimeString()} · {new Date(inspectedAction.timestamp).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setInspectedAction(null)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status banner */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <DecisionBadge decision={inspectedAction.decision} size="lg" />
            <ExecutionBadge status={inspectedAction.executionStatus} />
            {inspectedAction.n8nConnected ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                n8n Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                n8n not connected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Agent:</span>
            <span className="font-semibold text-slate-800">{inspectedAction.agentName}</span>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-slate-50/40">
          <button
            onClick={() => setActiveTab('trace')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'trace'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Policy Engine Trace ({inspectedAction.evaluationSteps.length} steps)
          </button>
          <button
            onClick={() => setActiveTab('payload')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'payload'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Raw Payload JSON
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'trace' ? (
            <>
              {/* Origin / Backend Source Box */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-700 block">Evaluation Origin:</span>
                  <span className="text-slate-600">
                    {inspectedAction.n8nConnected
                      ? 'Decision returned by upstream n8n workflow'
                      : 'Evaluated by backend deterministic engine (n8n not connected)'}
                  </span>
                </div>
                {inspectedAction.n8nConnected ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    n8n Webhook Source
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                    Deterministic Fallback
                  </span>
                )}
              </div>

              {/* Primary explanation box */}
              <div
                className={`p-4 rounded-lg border text-xs sm:text-sm font-medium ${
                  inspectedAction.decision === 'ALLOW'
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : inspectedAction.decision === 'BLOCK'
                    ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                    : 'bg-amber-50/70 border-amber-200 text-amber-900'
                }`}
              >
                <div className="font-bold text-xs uppercase tracking-wider mb-1 opacity-80">
                  Actual Backend Decision: {inspectedAction.decision}
                </div>
                <div>{inspectedAction.reason}</div>
              </div>

              {/* Proposed action context */}
              <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/80 text-xs space-y-2">
                <div className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                  Action Parameters
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400">Action Type: </span>
                    <span className="font-mono font-medium text-slate-800">{inspectedAction.actionType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Target Resource: </span>
                    <span className="font-mono font-medium text-slate-800">{inspectedAction.resource}</span>
                  </div>
                  {inspectedAction.amount !== undefined && (
                    <div>
                      <span className="text-slate-400">Requested Amount: </span>
                      <span className="font-semibold text-slate-900">
                        ₹{inspectedAction.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  {inspectedAction.requestCount !== undefined && (
                    <div>
                      <span className="text-slate-400">Recipient Count: </span>
                      <span className="font-semibold text-slate-900">{inspectedAction.requestCount}</span>
                    </div>
                  )}
                  {inspectedAction.apiRate !== undefined && (
                    <div>
                      <span className="text-slate-400">API Velocity: </span>
                      <span className="font-semibold text-slate-900">{inspectedAction.apiRate} req/min</span>
                    </div>
                  )}
                  {inspectedAction.targetService && (
                    <div>
                      <span className="text-slate-400">Tool / Service: </span>
                      <span className="font-mono font-semibold text-slate-900">{inspectedAction.targetService}</span>
                    </div>
                  )}
                </div>
                {inspectedAction.description && (
                  <div className="pt-1 text-slate-600 border-t border-slate-200">
                    <span className="text-slate-400">Intent Description: </span>
                    {inspectedAction.description}
                  </div>
                )}
              </div>

              {/* Step by step evaluation */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                  Sequential Policy Engine Evaluations
                </h4>
                <div className="space-y-2">
                  {inspectedAction.evaluationSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border text-xs ${
                        step.passed
                          ? 'bg-emerald-50/40 border-emerald-200/70'
                          : 'bg-rose-50/50 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 font-semibold">
                          {step.passed ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          <span className={step.passed ? 'text-emerald-900' : 'text-rose-900'}>
                            {step.policyName}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            step.passed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800 font-bold'
                          }`}
                        >
                          {step.passed ? 'PASSED' : 'VIOLATION'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 mb-1">
                        <div>
                          <span className="text-slate-400">Expected: </span>
                          <span className="font-mono">{step.expected}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Observed: </span>
                          <span className="font-mono">{step.actual}</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-700 italic border-t border-slate-200/50 pt-1">
                        {step.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviewer notes if reviewed */}
              {inspectedAction.reviewerId && (
                <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 text-xs">
                  <div className="font-bold text-slate-800 mb-1">Human Review Audit</div>
                  <div className="text-slate-600">
                    Decision by <span className="font-semibold">{inspectedAction.reviewerId}</span> on{' '}
                    {inspectedAction.reviewedAt ? new Date(inspectedAction.reviewedAt).toLocaleString() : 'N/A'}:
                  </div>
                  <div className="text-slate-800 font-medium mt-1">"{inspectedAction.reviewNotes}"</div>
                </div>
              )}
            </>
          ) : (
            <div className="relative">
              <div className="flex justify-end mb-2">
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium py-1 px-2 rounded bg-blue-50 border border-blue-200"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Copied to Clipboard!' : 'Copy JSON'}
                </button>
              </div>
              <pre className="p-4 bg-slate-900 text-emerald-400 text-xs font-mono rounded-lg overflow-x-auto max-h-96">
                {JSON.stringify(inspectedAction, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={() => setInspectedAction(null)}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
