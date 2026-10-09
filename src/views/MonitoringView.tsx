import React, { useState, useEffect } from 'react';
import { useFirewall } from '../context/FirewallContext';
import { DecisionBadge, ExecutionBadge } from '../components/common/Badge';
import {
  Activity,
  Play,
  Pause,
  Zap,
  Radio,
  Search,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Sliders,
  Eye,
  RefreshCw
} from 'lucide-react';

export const MonitoringView: React.FC = () => {
  const {
    actions,
    agents,
    simulateRandomAgentEvent,
    setInspectedAction,
    approvals,
    incidents
  } = useFirewall();

  const [isAutoSimulating, setIsAutoSimulating] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(3000); // ms
  const [filterAgent, setFilterAgent] = useState<string>('ALL');

  // Auto simulation ticker
  useEffect(() => {
    if (!isAutoSimulating) return;

    const interval = setInterval(() => {
      simulateRandomAgentEvent();
    }, simulationSpeed);

    return () => clearInterval(interval);
  }, [isAutoSimulating, simulationSpeed, simulateRandomAgentEvent]);

  const filteredActions = actions.filter((a) => {
    if (filterAgent !== 'ALL' && a.agentId !== filterAgent) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Controller Bar */}
      <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Live Agent Telemetry & Boundary Stream
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Real-time feed of autonomous invocations intercepted by the firewall policy engine.
          </p>
        </div>

        {/* Stream Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Manual Pulse */}
          <button
            onClick={() => simulateRandomAgentEvent()}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <span>Simulate Single Agent Pulse</span>
          </button>

          {/* Auto Loop Toggle */}
          <button
            onClick={() => setIsAutoSimulating(!isAutoSimulating)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              isAutoSimulating
                ? 'bg-amber-50 text-amber-900 border border-amber-300'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-2xs'
            }`}
          >
            {isAutoSimulating ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Stream</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Start Live Pulse Stream</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Agents Status Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {agents.map((agent) => {
          const agentActions = actions.filter((a) => a.agentId === agent.id);
          const agentAllowed = agentActions.filter((a) => a.decision === 'ALLOW').length;
          const agentBlocked = agentActions.filter((a) => a.decision === 'BLOCK').length;
          const agentApprovals = agentActions.filter((a) => a.decision === 'REQUIRES_APPROVAL').length;

          return (
            <div
              key={agent.id}
              className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-900">{agent.name}</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {agent.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">{agent.role}</p>

                {/* Whitelist tools chips */}
                <div className="mb-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Authorized Tools
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {agent.allowedTools.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats for agent */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="text-slate-400 text-[10px]">Allowed</div>
                  <div className="font-bold text-emerald-700">{agentAllowed}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Blocked</div>
                  <div className="font-bold text-rose-700">{agentBlocked}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Approvals</div>
                  <div className="font-bold text-amber-700">{agentApprovals}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Event Stream Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-900">
              Chronological Telemetry Feed ({filteredActions.length} actions)
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="text-slate-500 font-medium">Filter by Agent:</label>
            <select
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Agents</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
          {filteredActions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No actions recorded yet. Use the "Simulate Single Agent Pulse" button to generate live telemetry.
            </div>
          ) : (
            filteredActions.map((action) => (
              <div
                key={action.id}
                className="p-3.5 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4 text-xs"
              >
                {/* Left metadata */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-2 h-10 rounded-full flex-shrink-0 ${
                      action.decision === 'ALLOW'
                        ? 'bg-emerald-500'
                        : action.decision === 'BLOCK'
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 truncate">
                        {action.agentName}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {action.id}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(action.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] truncate mt-0.5">
                      {action.reason}
                    </p>
                  </div>
                </div>

                {/* Right badges & inspect */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {action.actionType}
                  </span>
                  <DecisionBadge decision={action.decision} size="sm" />
                  <ExecutionBadge status={action.executionStatus} />
                  <button
                    onClick={() => setInspectedAction(action)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                    title="Inspect policy trace"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
