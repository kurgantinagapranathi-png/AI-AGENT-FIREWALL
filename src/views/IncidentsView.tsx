import React, { useState } from 'react';
import { useFirewall } from '../context/FirewallContext';
import { SeverityBadge } from '../components/common/Badge';
import { IncidentRecord, IncidentStatus } from '../types/firewall';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Search,
  Check,
  UserCheck
} from 'lucide-react';

export const IncidentsView: React.FC = () => {
  const {
    incidents,
    actions,
    acknowledgeIncident,
    resolveIncident,
    setInspectedAction
  } = useFirewall();

  const [statusFilter, setStatusFilter] = useState<'ALL' | IncidentStatus>('ALL');
  const [resolveModalIncident, setResolveModalIncident] = useState<IncidentRecord | null>(null);
  const [resolveNotes, setResolveNotes] = useState<string>('Root cause analyzed. Permissions reviewed and verified safe.');

  const filteredIncidents = incidents.filter((inc) => {
    if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
    return true;
  });

  const handleConfirmResolve = () => {
    if (!resolveModalIncident) return;
    resolveIncident(resolveModalIncident.id, resolveNotes);
    setResolveModalIncident(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase tracking-wider">
              Threat Intercept Triage
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">Deterministic SecOps Log</span>
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Security Incidents & Policy Violations
          </h2>
          <p className="text-xs text-slate-500">
            Hard boundary infractions, unauthorized service attempts, and rate abuses blocked by the firewall.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
          {(['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st} ({incidents.filter((i) => st === 'ALL' || i.status === st).length})
            </button>
          ))}
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-4">
        {filteredIncidents.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No Incidents Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              No security breaches match your selected filter. Simulate Scenario C (Unauthorized Tool) to trigger a critical incident.
            </p>
          </div>
        ) : (
          filteredIncidents.map((incident) => {
            const linkedAction = actions.find((a) => a.id === incident.actionId);

            return (
              <div
                key={incident.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {incident.id}
                    </span>
                    <SeverityBadge severity={incident.severity} />
                    <span className="text-xs font-bold text-slate-900">
                      {incident.agentName}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-mono text-slate-500">
                      Policy: {incident.policyViolated}
                    </span>
                  </div>

                  {/* Status badge */}
                  <div>
                    {incident.status === 'OPEN' ? (
                      <span className="text-xs font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
                        OPEN
                      </span>
                    ) : incident.status === 'INVESTIGATING' ? (
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                        INVESTIGATING
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                        RESOLVED
                      </span>
                    )}
                  </div>
                </div>

                {/* Explanation */}
                <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200/60 leading-relaxed">
                  <strong className="text-slate-900">Violation Details: </strong>
                  {incident.explanation}
                </div>

                {/* Resolution metadata if present */}
                {incident.resolutionNotes && (
                  <div className="text-xs text-emerald-900 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
                    <strong>Resolution Audit: </strong>
                    {incident.resolutionNotes} (Resolved on {new Date(incident.resolvedAt || '').toLocaleString()})
                  </div>
                )}

                {/* Actions bottom bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span>Detected: {new Date(incident.createdAt).toLocaleTimeString()} ({new Date(incident.createdAt).toLocaleDateString()})</span>
                    {linkedAction && (
                      <button
                        onClick={() => setInspectedAction(linkedAction)}
                        className="text-blue-600 hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect Linked Action
                      </button>
                    )}
                  </div>

                  {incident.status !== 'RESOLVED' && (
                    <div className="flex items-center gap-2">
                      {incident.status === 'OPEN' && (
                        <button
                          onClick={() => acknowledgeIncident(incident.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Acknowledge & Investigate
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setResolveModalIncident(incident);
                          setResolveNotes('Boundary violation verified. Threat contained and access blocked.');
                        }}
                        className="px-3.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Mark Resolved
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Resolve Incident Dialog */}
      {resolveModalIncident && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Resolve Security Incident {resolveModalIncident.id}
            </h3>
            <p className="text-xs text-slate-500">
              Note: Incidents must only be resolved after verifying that the agent's unauthorized behavior is safe or remediated.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Remediation Notes:
              </label>
              <textarea
                rows={3}
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setResolveModalIncident(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResolve}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                Confirm Incident Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
