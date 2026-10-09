import React, { useState, useMemo } from 'react';
import { useFirewall } from '../context/FirewallContext';
import { DecisionBadge, ExecutionBadge } from '../components/common/Badge';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertTriangle,
  Activity,
  Layers,
  Search,
  Filter,
  Eye,
  ArrowUpRight,
  ChevronRight,
  TrendingUp,
  Sliders
} from 'lucide-react';
import { ActionRecord, DecisionType, ActionCategory } from '../types/firewall';

export const OverviewView: React.FC = () => {
  const { actions, approvals, incidents, setInspectedAction, setCurrentView, todaySuccessfulRefunds, n8nStatus, backendOnline } = useFirewall();

  const [decisionFilter, setDecisionFilter] = useState<'ALL' | DecisionType>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ActionCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Real calculated metrics
  const totalActions = actions.length;
  const allowedActions = actions.filter((a) => a.decision === 'ALLOW').length;
  const blockedActions = actions.filter((a) => a.decision === 'BLOCK').length;
  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING').length;
  const totalViolations = blockedActions + actions.filter((a) => a.decision === 'REQUIRES_APPROVAL').length;

  const allowedPct = totalActions > 0 ? Math.round((allowedActions / totalActions) * 100) : 0;
  const blockedPct = totalActions > 0 ? Math.round((blockedActions / totalActions) * 100) : 0;
  const approvalPct = totalActions > 0 ? Math.round(((totalActions - allowedActions - blockedActions) / totalActions) * 100) : 0;

  // Breakdown by Category
  const violationsByCategory = useMemo(() => {
    const counts: Record<string, number> = {
      TOOL_ACCESS: 0,
      REFUND: 0,
      EMAIL: 0,
      API_CALL: 0
    };
    actions
      .filter((a) => a.decision === 'BLOCK' || a.decision === 'REQUIRES_APPROVAL')
      .forEach((a) => {
        counts[a.actionType] = (counts[a.actionType] || 0) + 1;
      });
    return counts;
  }, [actions]);

  // Filtered recent actions
  const filteredActions = useMemo(() => {
    return actions.filter((a) => {
      if (decisionFilter !== 'ALL' && a.decision !== decisionFilter) return false;
      if (categoryFilter !== 'ALL' && a.actionType !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = a.id.toLowerCase().includes(q);
        const matchesResource = a.resource.toLowerCase().includes(q);
        const matchesAgent = a.agentName.toLowerCase().includes(q);
        if (!matchesId && !matchesResource && !matchesAgent) return false;
      }
      return true;
    });
  }, [actions, decisionFilter, categoryFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white border border-slate-800/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
              Autonomous Defense Layer
            </span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-slate-300 font-medium">Gateway: {backendOnline ? 'Online' : 'Offline'}</span>
            <span className="text-xs text-slate-500">·</span>
            <span className={`text-xs font-semibold ${n8nStatus === 'Connected' ? 'text-emerald-400' : 'text-amber-300'}`}>
              n8n: {n8nStatus}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold mt-1 text-white tracking-tight">
            Enterprise AI Firewall Active
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-0.5">
            Intercepting tool invocations, API rates, email quotas, and financial transactions prior to execution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('playground')}
            className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            Open Playground
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Actions */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium text-slate-500">Total Actions</span>
            <div className="p-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200/60">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight tabular-nums">{totalActions}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
            <span>Evaluated by firewall</span>
          </div>
        </div>

        {/* Card 2: Allowed Actions */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-medium text-slate-500">Allowed Actions</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-800 font-mono tracking-tight tabular-nums">{allowedActions}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            <span className="font-bold text-emerald-700 font-mono">{allowedPct}%</span> compliance rate
          </div>
        </div>

        {/* Card 3: Blocked Actions */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-medium text-slate-500">Blocked Actions</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/70">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-800 font-mono tracking-tight tabular-nums">{blockedActions}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            <span className="font-bold text-rose-700 font-mono">{blockedPct}%</span> violation rate
          </div>
        </div>

        {/* Card 4: Pending Approvals */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs cursor-pointer hover:border-amber-300 transition-colors"
          onClick={() => setCurrentView('approvals')}
        >
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-medium text-slate-500">Pending Approvals</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/70">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-900 font-mono tracking-tight tabular-nums">{pendingApprovals}</div>
          <div className="text-[11px] text-amber-800 mt-1 font-semibold flex items-center justify-between">
            <span>Awaiting decision</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 5: Policy Violations */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-medium text-slate-500">Total Violations</span>
            <div className="p-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200/60">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight tabular-nums">{totalViolations}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            <span>{incidents.filter((i) => i.status === 'OPEN').length} active open incidents</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart 1: Decision Distribution */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Decision Distribution</h3>
            <p className="text-xs text-slate-500 mb-4">
              Breakdown of deterministic firewall policy rulings
            </p>

            {/* Visual SVG Donut Chart */}
            <div className="flex items-center justify-center py-4">
              <div className="relative w-40 h-40">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  {/* Background Track */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke="#F1F5F9"
                    strokeWidth="3.8"
                  />
                  {/* Allowed Arc (Green) */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke="#15803D"
                    strokeWidth="3.8"
                    strokeDasharray={`${allowedPct} ${100 - allowedPct}`}
                    strokeDashoffset="0"
                  />
                  {/* Blocked Arc (Red) */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke="#B91C1C"
                    strokeWidth="3.8"
                    strokeDasharray={`${blockedPct} ${100 - blockedPct}`}
                    strokeDashoffset={`-${allowedPct}`}
                  />
                  {/* Requires Approval Arc (Amber) */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke="#B45309"
                    strokeWidth="3.8"
                    strokeDasharray={`${approvalPct} ${100 - approvalPct}`}
                    strokeDashoffset={`-${allowedPct + blockedPct}`}
                  />
                </svg>
                {/* Center metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-slate-900">{totalActions}</span>
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                    Total
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span className="text-slate-700 font-medium">ALLOWED</span>
              </div>
              <span className="font-bold text-slate-900">{allowedActions} ({allowedPct}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                <span className="text-slate-700 font-medium">BLOCKED</span>
              </div>
              <span className="font-bold text-slate-900">{blockedActions} ({blockedPct}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                <span className="text-slate-700 font-medium">REQUIRES_APPROVAL</span>
              </div>
              <span className="font-bold text-slate-900">
                {totalActions - allowedActions - blockedActions} ({approvalPct}%)
              </span>
            </div>
          </div>
        </div>

        {/* Chart 2: Violation Categories */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Violation Categories</h3>
            <p className="text-xs text-slate-500 mb-4">
              Distribution of policy triggers and security boundary alarms
            </p>

            <div className="space-y-3.5 pt-2">
              {[
                { label: 'Tool Authorization Boundary', count: violationsByCategory.TOOL_ACCESS, color: 'bg-rose-500', code: 'TOOL_ACCESS' },
                { label: 'Refund Ceiling & Budget', count: violationsByCategory.REFUND, color: 'bg-amber-500', code: 'REFUND' },
                { label: 'Outbound Email Quota', count: violationsByCategory.EMAIL, color: 'bg-orange-500', code: 'EMAIL' },
                { label: 'API Velocity & Rate Limits', count: violationsByCategory.API_CALL, color: 'bg-indigo-500', code: 'API_CALL' }
              ].map((item) => {
                const max = Math.max(1, ...Object.values(violationsByCategory));
                const barWidth = Math.min(100, Math.round((item.count / max) * 100));

                return (
                  <div key={item.code} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-medium">{item.label}</span>
                      <span className="font-bold text-slate-900">{item.count} events</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-300`}
                        style={{ width: `${item.count > 0 ? Math.max(12, barWidth) : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 mt-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>Daily Budget Expended:</span>
            <span className="font-bold text-slate-900">₹{todaySuccessfulRefunds.toLocaleString('en-IN')} / ₹5,000</span>
          </div>
        </div>

        {/* Chart 3: Security Posture & Velocity */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Firewall Activity Stream</h3>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Live Intercept
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Recent sequential verdicts recorded by policy engine
            </p>

            {/* Micro timeline bars */}
            <div className="flex items-end gap-1.5 h-32 pt-4 px-2 pb-2 bg-slate-50/70 rounded-lg border border-slate-200/60">
              {actions.slice(0, 14).reverse().map((a, idx) => {
                let barColor = 'bg-emerald-500';
                let height = '60%';
                if (a.decision === 'BLOCK') {
                  barColor = 'bg-rose-500';
                  height = '90%';
                } else if (a.decision === 'REQUIRES_APPROVAL') {
                  barColor = 'bg-amber-500';
                  height = '75%';
                }

                return (
                  <div
                    key={a.id || idx}
                    className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer"
                    onClick={() => setInspectedAction(a)}
                  >
                    <div
                      className={`w-full rounded-xs transition-all ${barColor} group-hover:opacity-80`}
                      style={{ height }}
                    />
                    <span className="text-[9px] text-slate-400 font-mono">
                      {idx + 1}
                    </span>

                    {/* Tooltip */}
                    <div className="hidden group-hover:block absolute bottom-full mb-1 z-20 whitespace-nowrap bg-slate-900 text-white text-[10px] p-1.5 rounded shadow-lg pointer-events-none">
                      {a.agentName}: {a.decision}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Average Decision Latency:</span>
            <span className="font-mono font-bold text-slate-900">1.2ms (Zero AI Overhead)</span>
          </div>
        </div>
      </div>

      {/* Recent Security Events Table */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header & Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/40">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Security Events</h3>
            <p className="text-xs text-slate-500">
              Deterministic rulings on autonomous agent requests (Showing {filteredActions.length} of {actions.length})
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resource, ID..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 w-36 sm:w-44"
              />
            </div>

            {/* Decision Filter Tabs */}
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

            {/* Category Select */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Categories</option>
              <option value="REFUND">Refunds</option>
              <option value="TOOL_ACCESS">Tool Access</option>
              <option value="EMAIL">Emails</option>
              <option value="API_CALL">API Calls</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Resource / Target</th>
                <th className="px-4 py-3">Quantity / Value</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredActions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No security events match your current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredActions.map((action) => (
                  <tr key={action.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Timestamp */}
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {new Date(action.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>

                    {/* Agent */}
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {action.agentName}
                    </td>

                    {/* Action Type */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                        {action.actionType}
                      </span>
                    </td>

                    {/* Resource */}
                    <td className="px-4 py-3 font-mono text-slate-800">
                      {action.resource}
                      {action.targetService && (
                        <span className="block text-[10px] text-slate-500 font-sans">
                          via {action.targetService}
                        </span>
                      )}
                    </td>

                    {/* Value */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {action.amount !== undefined ? (
                        <span className="font-semibold text-slate-900">
                          ₹{action.amount.toLocaleString('en-IN')}
                        </span>
                      ) : action.requestCount !== undefined ? (
                        <span className="text-slate-700">{action.requestCount} emails</span>
                      ) : action.apiRate !== undefined ? (
                        <span className="text-slate-700">{action.apiRate} req/min</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Decision */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <DecisionBadge decision={action.decision} size="sm" />
                        {action.n8nConnected ? (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            n8n Webhook
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            n8n not connected
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ExecutionBadge status={action.executionStatus} />
                    </td>

                    {/* Action inspect button */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setInspectedAction(action)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50/60 hover:bg-blue-100/70 px-2.5 py-1 rounded-md transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
