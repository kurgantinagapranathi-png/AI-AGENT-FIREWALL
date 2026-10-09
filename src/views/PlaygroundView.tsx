import React, { useState } from 'react';
import { useFirewall } from '../context/FirewallContext';
import { DEMO_SCENARIOS } from '../services/storage';
import { ActionCategory, DecisionType, ScenarioDefinition, ActionRecord } from '../types/firewall';
import { DecisionBadge, ExecutionBadge } from '../components/common/Badge';
import {
  Play,
  Shield,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Info,
  Layers,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Sliders,
  AlertTriangle
} from 'lucide-react';

export const PlaygroundView: React.FC = () => {
  const {
    agents,
    policies,
    runSecurityCheck,
    setCurrentView,
    setInspectedAction,
    todaySuccessfulRefunds,
    n8nStatus,
    backendOnline
  } = useFirewall();

  // Active form state
  const [selectedAgentId, setSelectedAgentId] = useState<string>('refund-agent-01');
  const [actionType, setActionType] = useState<ActionCategory>('REFUND');
  const [resource, setResource] = useState<string>('ORD-1024');
  const [amount, setAmount] = useState<number>(500);
  const [requestCount, setRequestCount] = useState<number>(50);
  const [apiRate, setApiRate] = useState<number>(30);
  const [targetService, setTargetService] = useState<string>('order_lookup_api');
  const [description, setDescription] = useState<string>('Customer refund for order ORD-1024');

  // Active scenario metadata
  const [activeScenario, setActiveScenario] = useState<ScenarioDefinition | null>(DEMO_SCENARIOS[0]);

  // Execution result state
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [lastEvaluatedAction, setLastEvaluatedAction] = useState<ActionRecord | null>(null);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  const handleSelectScenario = (scenario: ScenarioDefinition) => {
    setActiveScenario(scenario);
    setSelectedAgentId(scenario.agentId);
    setActionType(scenario.actionType);
    setResource(scenario.resource);
    if (scenario.amount !== undefined) setAmount(scenario.amount);
    if (scenario.requestCount !== undefined) setRequestCount(scenario.requestCount);
    if (scenario.apiRate !== undefined) setApiRate(scenario.apiRate);
    if (scenario.targetService) setTargetService(scenario.targetService);
    if (scenario.description) setDescription(scenario.description);
  };

  const handleExecuteSecurityCheck = async () => {
    if (isEvaluating) return;

    setIsEvaluating(true);
    setLastEvaluatedAction(null);

    try {
      // Simulate micro evaluation delay for realism
      await new Promise((resolve) => setTimeout(resolve, 250));

      const input = {
        agentId: selectedAgentId,
        actionType,
        resource,
        amount: actionType === 'REFUND' ? amount : undefined,
        requestCount: actionType === 'EMAIL' ? requestCount : undefined,
        apiRate: actionType === 'API_CALL' ? apiRate : undefined,
        targetService: actionType === 'TOOL_ACCESS' ? targetService : undefined,
        description
      };

      const result = await runSecurityCheck(input);
      setLastEvaluatedAction(result);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wider">
              Interactive Sandbox
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">Deterministic Rule Evaluation</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Simulate Autonomous AI Agent Request
          </h2>
          <p className="text-xs text-slate-500">
            Sends proposed action to configurable backend API endpoint (<code className="text-slate-800 font-mono">POST /api/evaluate</code>) connected to n8n webhook.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Backend API:</span>
            <span className="font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Online (Express)
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500 font-medium">n8n Gateway:</span>
            {n8nStatus === 'Connected' ? (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                n8n not connected
              </span>
            )}
            <button
              onClick={() => setCurrentView('integrations')}
              className="text-blue-600 hover:underline text-[11px] font-medium ml-1"
            >
              Configure n8n Webhook →
            </button>
          </div>
        </div>

        {/* Selected Agent Overview Card */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center flex-shrink-0">
            {selectedAgent.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">{selectedAgent.name}</span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded font-bold">
                {selectedAgent.status}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              ID: {selectedAgent.id} · Allowed: [{selectedAgent.allowedTools.slice(0, 2).join(', ')}...]
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Selection Grid (6 Quick Scenario Buttons A-F) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pre-Configured Test Scenarios (Judges' Quick-Test Suite)
          </h3>
          <span className="text-xs text-blue-600 font-medium">
            Click any scenario to auto-populate
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {DEMO_SCENARIOS.map((sc) => {
            const isSelected = activeScenario?.id === sc.id;
            let badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            if (sc.expectedDecision === 'BLOCK') {
              badgeBg = 'bg-rose-50 text-rose-800 border-rose-200';
            } else if (sc.expectedDecision === 'REQUIRES_APPROVAL') {
              badgeBg = 'bg-amber-50 text-amber-900 border-amber-200';
            }

            return (
              <button
                key={sc.id}
                onClick={() => handleSelectScenario(sc)}
                className={`text-left p-3.5 rounded-xl border transition-all relative ${
                  isSelected
                    ? 'bg-blue-50/40 border-blue-600 ring-1 ring-blue-600/30 shadow-xs'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center">
                      {sc.scenarioLetter}
                    </span>
                    <span className="text-xs font-bold text-slate-900 leading-tight">
                      {sc.title.split('—')[1] || sc.title}
                    </span>
                  </div>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${badgeBg}`}>
                    {sc.expectedDecision}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-normal line-clamp-2 mb-2">
                  {sc.summary}
                </p>

                <div className="text-[10px] text-slate-500 font-mono bg-slate-50 p-1.5 rounded border border-slate-200/70 flex items-center justify-between">
                  <span>Policy: {sc.relevantPolicy}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Grid: Left Form, Right Evaluation Result */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: 6 Cols */}
        <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              Proposed Action Parameters
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Live Inspector
            </span>
          </div>

          {/* Agent Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Autonomous Agent
            </label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
            >
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.role})
                </option>
              ))}
            </select>
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Action Category
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as ActionCategory)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="REFUND">Financial Refund (REFUND)</option>
              <option value="TOOL_ACCESS">Tool / Service Invocation (TOOL_ACCESS)</option>
              <option value="EMAIL">Email Dispatch (EMAIL)</option>
              <option value="API_CALL">External API Call (API_CALL)</option>
            </select>
          </div>

          {/* Target Resource */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Resource Identifier
            </label>
            <input
              type="text"
              value={resource}
              onChange={(e) => setResource(e.target.value)}
              placeholder="e.g. ORD-1024 or customer_ticket"
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Conditional Inputs based on Action Category */}
          {actionType === 'REFUND' && (
            <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Refund Amount (₹ INR)
                </label>
                <span className="text-[11px] text-blue-700 font-medium">
                  Autonomous threshold: ₹1,000
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="text-[11px] text-slate-500">
                Today's prior executed refunds: <strong className="text-slate-800">₹{todaySuccessfulRefunds.toLocaleString('en-IN')}</strong> / ₹5,000 daily budget.
              </div>
            </div>
          )}

          {actionType === 'EMAIL' && (
            <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Recipient Batch Count
                </label>
                <span className="text-[11px] text-amber-800 font-medium">
                  Hourly limit: 10 emails
                </span>
              </div>
              <input
                type="number"
                min="1"
                value={requestCount}
                onChange={(e) => setRequestCount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {actionType === 'API_CALL' && (
            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-200/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Invocation Velocity (req / min)
                </label>
                <span className="text-[11px] text-indigo-800 font-medium">
                  Max rate limit: 20 req/min
                </span>
              </div>
              <input
                type="number"
                min="1"
                value={apiRate}
                onChange={(e) => setApiRate(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {actionType === 'TOOL_ACCESS' && (
            <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-200/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Target Service / Tool Identifier
                </label>
                <span className="text-[11px] text-rose-800 font-medium">
                  Whitelist enforced
                </span>
              </div>
              <input
                type="text"
                value={targetService}
                onChange={(e) => setTargetService(e.target.value)}
                placeholder="e.g. order_lookup_api or aws_s3_admin_bucket"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
              />
              <div className="text-[10px] text-slate-500">
                Agent whitelist: [{selectedAgent.allowedTools.join(', ')}]
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Natural Language Intent Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Action Trigger Button */}
          <div className="pt-2">
            <button
              onClick={handleExecuteSecurityCheck}
              disabled={isEvaluating}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                isEvaluating
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-blue-500/20'
              }`}
            >
              {isEvaluating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Evaluating Deterministic Security Policies...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Run Security Check</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Panel: Evaluation Results & Verification Pipeline: 6 Cols */}
        <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                Firewall Policy Evaluation Result
              </h3>
              <span className="text-xs font-mono text-slate-500">
                Policy Engine v1.4.2
              </span>
            </div>

            {/* Empty state before running check */}
            {!lastEvaluatedAction && (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                  <Shield className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Awaiting Security Evaluation
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Select a test scenario above or adjust the action parameters on the left, then click <strong>"Run Security Check"</strong>.
                </p>
                {activeScenario && (
                  <div className="mt-4 inline-block text-left bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs max-w-md">
                    <span className="font-bold text-slate-700">Currently Staged: </span>
                    <span className="text-slate-600">{activeScenario.title}</span>
                    <div className="text-[11px] text-blue-700 font-medium mt-1">
                      Expected Decision: {activeScenario.expectedDecision}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Active Result Card */}
            {lastEvaluatedAction && (
              <div className="space-y-4 pt-3">
                {/* Decision Banner */}
                <div
                  className={`p-4 rounded-xl border ${
                    lastEvaluatedAction.decision === 'ALLOW'
                      ? 'bg-emerald-50 border-emerald-200'
                      : lastEvaluatedAction.decision === 'BLOCK'
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  {/* Verdict Source Bar */}
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200/60 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Verdict Source:
                      </span>
                      {lastEvaluatedAction.n8nConnected ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          n8n Connected (Webhook Response)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                          n8n not connected (Backend Engine Fallback)
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {lastEvaluatedAction.n8nConnected ? 'Remote n8n Verdict' : 'Local Deterministic Ruling'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DecisionBadge decision={lastEvaluatedAction.decision} size="lg" />
                      <ExecutionBadge status={lastEvaluatedAction.executionStatus} />
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      ID: {lastEvaluatedAction.id}
                    </span>
                  </div>

                  {/* Decision Explanation */}
                  <div className="text-xs font-semibold text-slate-900 mt-2 leading-relaxed">
                    {lastEvaluatedAction.reason}
                  </div>

                  {/* Context note regarding execution status */}
                  <div className="mt-2 text-[11px] text-slate-600 border-t border-slate-200/60 pt-2">
                    {lastEvaluatedAction.decision === 'ALLOW' && (
                      <span className="text-emerald-800 font-medium">
                        ✓ Execution Permitted: Action executed automatically in demo environment.
                      </span>
                    )}
                    {lastEvaluatedAction.decision === 'BLOCK' && (
                      <span className="text-rose-800 font-medium">
                        ✕ Execution Denied: Action blocked. Hard security incident logged.
                      </span>
                    )}
                    {lastEvaluatedAction.decision === 'REQUIRES_APPROVAL' && (
                      <span className="text-amber-900 font-medium">
                        ⏸ Action Halted: Dispatched to Approval Queue. Action will NOT execute until authorized.
                      </span>
                    )}
                  </div>
                </div>

                {/* Step-by-step Policy Trace */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Policy Evaluation Trace ({lastEvaluatedAction.evaluationSteps.length} Rules Checked)
                  </h4>
                  <div className="space-y-2">
                    {lastEvaluatedAction.evaluationSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg border text-xs ${
                          step.passed
                            ? 'bg-emerald-50/40 border-emerald-200/60'
                            : 'bg-rose-50/60 border-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-900">
                            {idx + 1}. {step.policyName}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              step.passed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {step.passed ? 'PASS' : 'BREACH'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {step.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Next-Step Action button */}
                <div className="pt-2 flex flex-wrap gap-2">
                  {lastEvaluatedAction.decision === 'REQUIRES_APPROVAL' && (
                    <button
                      onClick={() => setCurrentView('approvals')}
                      className="px-3 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <span>Open Approval Center</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {lastEvaluatedAction.decision === 'BLOCK' && (
                    <button
                      onClick={() => setCurrentView('incidents')}
                      className="px-3 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <span>Inspect Security Incidents</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setInspectedAction(lastEvaluatedAction)}
                    className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                  >
                    View Full JSON Audit
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Deterministic precedence: Auth → Hard Limits → Approval → Allow</span>
            <span className="font-semibold text-emerald-700">Idempotency Guaranteed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
