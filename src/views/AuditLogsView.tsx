import React, { useState, useMemo } from 'react';
import { useFirewall } from '../context/FirewallContext';
import { DecisionBadge, ExecutionBadge } from '../components/common/Badge';
import {
  FileText,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Shield,
  Hash,
  Eye
} from 'lucide-react';
import { DecisionType } from '../types/firewall';

export const AuditLogsView: React.FC = () => {
  const { auditLogs, actions, setInspectedAction } = useFirewall();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [decisionFilter, setDecisionFilter] = useState<'ALL' | DecisionType>('ALL');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (decisionFilter !== 'ALL' && log.decision !== decisionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = log.actionId.toLowerCase().includes(q);
        const matchesAgent = log.agentName.toLowerCase().includes(q);
        const matchesAction = log.requestedAction.toLowerCase().includes(q);
        const matchesHash = log.hash.toLowerCase().includes(q);
        if (!matchesId && !matchesAgent && !matchesAction && !matchesHash) return false;
      }
      return true;
    });
  }, [auditLogs, decisionFilter, searchQuery]);

  // Working CSV Export
  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;

    const headers = [
      'Audit_ID',
      'Action_ID',
      'Agent_ID',
      'Agent_Name',
      'Requested_Action',
      'Policy_Version',
      'Decision',
      'Decision_Reason',
      'Execution_Status',
      'Approval_Status',
      'Reviewer',
      'Timestamp',
      'Integrity_Hash'
    ];

    const rows = filteredLogs.map((log) => [
      log.id,
      log.actionId,
      log.agentId,
      `"${log.agentName}"`,
      `"${log.requestedAction}"`,
      log.policyVersion,
      log.decision,
      `"${log.decisionReason.replace(/"/g, '""')}"`,
      log.executionStatus,
      log.approvalStatus,
      `"${log.reviewer || 'N/A'}"`,
      log.timestamp,
      log.hash
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `firewall_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">
              Immutable Trace Log
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">Cryptographic Hash Verification</span>
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Governance & Compliance Audit Trail
          </h2>
          <p className="text-xs text-slate-500">
            Chronological audit records tracking every intercepted autonomous request, reviewer attribution, and execution outcome.
          </p>
        </div>

        {/* CSV Export Button */}
        <button
          onClick={handleExportCsv}
          className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4 text-slate-600" />
          <span>Export Audit Records (CSV)</span>
        </button>
      </div>

      {/* Audit Log Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search action, agent, hash..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 w-52 sm:w-64"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
              {(['ALL', 'ALLOW', 'BLOCK', 'REQUIRES_APPROVAL'] as const).map((dec) => (
                <button
                  key={dec}
                  onClick={() => setDecisionFilter(dec)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    decisionFilter === dec
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {dec === 'ALL' ? 'All' : dec === 'REQUIRES_APPROVAL' ? 'Approval' : dec}
                </button>
              ))}
            </div>
          </div>

          <span className="text-xs text-slate-500 font-mono">
            Showing {filteredLogs.length} verified records
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action ID</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Requested Operation</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3">Execution State</th>
                <th className="px-4 py-3">Reviewer Attribution</th>
                <th className="px-4 py-3">Hash Checksum</th>
                <th className="px-4 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No audit records match your search filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const linkedAction = actions.find((a) => a.id === log.actionId);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()} ({new Date(log.timestamp).toLocaleDateString()})
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {log.actionId}
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium whitespace-nowrap">
                        {log.agentName}
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-xs truncate" title={log.requestedAction}>
                        {log.requestedAction}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <DecisionBadge decision={log.decision} size="sm" />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ExecutionBadge status={log.executionStatus} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {log.reviewer ? (
                          <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {log.reviewer}
                          </span>
                        ) : (
                          <span className="text-slate-400">System Autonomous</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                        {log.hash.slice(0, 16)}...
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {linkedAction && (
                          <button
                            onClick={() => setInspectedAction(linkedAction)}
                            className="text-blue-600 hover:text-blue-800 font-semibold p-1"
                            title="Inspect complete policy engine trace"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
