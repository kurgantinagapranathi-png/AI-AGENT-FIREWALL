import React, { useState } from 'react';
import { useFirewall } from '../context/FirewallContext';
import { DEMO_SCENARIOS } from '../services/storage';
import { ActionCategory, ScenarioDefinition, ActionRecord } from '../types/firewall';
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
  ExternalLink,
  Sliders,
  AlertTriangle,
  RefreshCw,
  Terminal,
  RotateCcw,
  Radio,
  FileCode
} from 'lucide-react';

export const PlaygroundView: React.FC = () => {
  const {
    agents,
    runSecurityCheck,
    setCurrentView,
    setInspectedAction,
    todaySuccessfulRefunds,
    n8nStatus,
    setBackendN8nUrl
  } = useFirewall();

  // Webhook URL configuration state
  const [webhookMode, setWebhookMode] = useState<'test' | 'prod'>('test');
  const testWebhookUrl = 'https://bhoomikorada9.app.n8n.cloud/webhook-test/pro-firewall';
  const prodWebhookUrl = 'https://bhoomikorada9.app.n8n.cloud/webhook/pro-firewall';
  const activeWebhookUrl = webhookMode === 'test' ? testWebhookUrl : prodWebhookUrl;

  // Active form state (mapped to n8n request fields: agent_id, action, destination, amount_inr)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('finance-agent-01');
  const [actionName, setActionName] = useState<string>('send_payment');
  const [destination, setDestination] = useState<string>('unknown.example');
  const [amountInr, setAmountInr] = useState<number>(80000);
  const [description, setDescription] = useState<string>('Autonomous payment of ₹80,000 sent to unknown.example by finance-agent-01');

  // Active scenario metadata
  const [activeScenario, setActiveScenario] = useState<ScenarioDefinition | null>(DEMO_SCENARIOS[0]);

  // Execution result state
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [lastEvaluatedAction, setLastEvaluatedAction] = useState<ActionRecord | null>(null);
  const [evalTimer, setEvalTimer] = useState<number>(0);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  // Quick preset: user example request
  const handleLoadExample = () => {
    setSelectedAgentId('finance-agent-01');
    setActionName('send_payment');
    setDestination('unknown.example');
    setAmountInr(80000);
    setDescription('Autonomous payment of ₹80,000 sent to unknown.example by finance-agent-01');
    setActiveScenario(DEMO_SCENARIOS[0]);
  };

  const handleSelectScenario = (scenario: ScenarioDefinition) => {
    setActiveScenario(scenario);
    setSelectedAgentId(scenario.agentId);
    if (scenario.id === 'scenario-n8n-live') {
      setActionName('send_payment');
      setDestination('unknown.example');
      setAmountInr(80000);
    } else {
      setActionName(scenario.actionType === 'REFUND' ? 'send_payment' : scenario.actionType.toLowerCase());
      setDestination(scenario.resource);
      if (scenario.amount !== undefined) setAmountInr(scenario.amount);
    }
    if (scenario.description) setDescription(scenario.description);
  };

  const handleSwitchWebhookMode = async (mode: 'test' | 'prod') => {
    setWebhookMode(mode);
    const target = mode === 'test' ? testWebhookUrl : prodWebhookUrl;
    await setBackendN8nUrl(target);
  };

  const handleExecuteSecurityCheck = async (forceLocal = false) => {
    if (isEvaluating) return;

    setIsEvaluating(true);
    setLastEvaluatedAction(null);
    setEvalTimer(0);

    const timer = setInterval(() => {
      setEvalTimer((prev) => prev + 100);
    }, 100);

    try {
      // Map to category
      let category: ActionCategory = 'REFUND';
      if (actionName.includes('tool') || actionName.includes('access')) category = 'TOOL_ACCESS';
      else if (actionName.includes('email') || actionName.includes('mail')) category = 'EMAIL';
      else if (actionName.includes('api')) category = 'API_CALL';

      const input = {
        agentId: selectedAgentId,
        actionType: category,
        resource: destination,
        amount: amountInr,
        description,
        // Exact n8n integration fields
        agent_id: selectedAgentId,
        action: actionName,
        destination,
        amount_inr: amountInr,
        mode: forceLocal ? ('local_demo' as const) : undefined,
        webhookUrl: activeWebhookUrl
      };

      const result = await runSecurityCheck(input);
      setLastEvaluatedAction(result);
    } finally {
      clearInterval(timer);
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
              Autonomous Governance
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">n8n Security Gateway</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            AI Agent Request Dispatcher & Policy Firewall
          </h2>
          <p className="text-xs text-slate-500">
            Evaluates proposed autonomous agent actions against security boundaries and dispatches payload to your n8n workflow.
          </p>

          {/* Active Webhook Status Strip */}
          <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Target Webhook:</span>
            <code className="font-mono text-[11px] font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 max-w-xs truncate">
              {activeWebhookUrl}
            </code>
            <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded border text-[11px] ${
              webhookMode === 'test'
                ? 'text-amber-800 bg-amber-50 border-amber-200'
                : 'text-emerald-800 bg-emerald-50 border-emerald-200'
            }`}>
              <Radio className="w-3 h-3" />
              {webhookMode === 'test' ? 'TEST Webhook (Canvas Listen)' : 'PRODUCTION Webhook'}
            </span>
            <button
              onClick={() => handleSwitchWebhookMode(webhookMode === 'test' ? 'prod' : 'test')}
              className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] underline ml-1 cursor-pointer"
            >
              Switch to {webhookMode === 'test' ? 'Production URL' : 'Test URL'}
            </button>
          </div>
        </div>

        {/* Selected Agent Overview Card */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg font-bold flex items-center justify-center flex-shrink-0 text-white"
            style={{ backgroundColor: selectedAgent.avatarColor || '#2563EB' }}
          >
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

      {/* Test Webhook Notice Banner */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <div>
            <span className="font-bold">n8n Test Webhook Integration Notice:</span>{' '}
            <span className="text-amber-800">
              When using <code className="bg-amber-100 px-1 rounded font-mono text-[11px]">/webhook-test/pro-firewall</code>,
              click <strong>"Execute workflow"</strong> in your n8n canvas before triggering the request.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleLoadExample}
            className="px-2.5 py-1 text-[11px] font-bold bg-white text-slate-800 border border-amber-300 rounded hover:bg-amber-100/50 transition-colors shadow-2xs"
          >
            Load Example (finance-agent-01)
          </button>
        </div>
      </div>

      {/* Scenario Selection Grid */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Quick Scenarios & Pre-Configured Test Requests
          </h3>
          <span className="text-xs text-blue-600 font-medium">
            Click to auto-populate request payload
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {DEMO_SCENARIOS.slice(0, 4).map((sc) => {
            const isSelected = activeScenario?.id === sc.id;
            let badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            if (sc.expectedDecision === 'BLOCK') {
              badgeBg = 'bg-rose-50 text-rose-800 border-rose-200';
            } else if (sc.expectedDecision === 'REQUIRES_APPROVAL' || sc.expectedDecision === 'REVIEW') {
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
                    <span className="w-5 h-5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                      {sc.scenarioLetter}
                    </span>
                    <span className="text-xs font-bold text-slate-900 leading-tight">
                      {sc.title.split('—')[1] || sc.title}
                    </span>
                  </div>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${badgeBg}`}>
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
              Agent Action Request Form
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              HTTP POST JSON Payload
            </span>
          </div>

          {/* Quick Example Load Button */}
          <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-200/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>User Test Spec Example:</span>
            </div>
            <button
              onClick={handleLoadExample}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline"
            >
              Fill: finance-agent-01 (₹80,000) →
            </button>
          </div>

          {/* Field 1: agent_id */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-800">
                Agent ID (<code className="text-blue-600 font-mono font-bold">agent_id</code>)
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Required string</span>
            </div>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono font-semibold focus:outline-none focus:border-blue-500"
            >
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.id} ({ag.name})
                </option>
              ))}
            </select>
          </div>

          {/* Field 2: action */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-800">
                Action Name (<code className="text-blue-600 font-mono font-bold">action</code>)
              </label>
              <span className="text-[10px] text-slate-400 font-mono">e.g. send_payment</span>
            </div>
            <input
              type="text"
              value={actionName}
              onChange={(e) => setActionName(e.target.value)}
              placeholder="send_payment"
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Field 3: destination */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-800">
                Destination (<code className="text-blue-600 font-mono font-bold">destination</code>)
              </label>
              <span className="text-[10px] text-slate-400 font-mono">e.g. unknown.example</span>
            </div>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="unknown.example"
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Field 4: amount_inr */}
          <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800">
                Amount in INR (<code className="text-blue-600 font-mono font-bold">amount_inr</code>)
              </label>
              <span className="text-[11px] text-slate-500">
                Threshold ceiling: ₹1,000
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                ₹
              </span>
              <input
                type="number"
                min="0"
                value={amountInr}
                onChange={(e) => setAmountInr(Number(e.target.value))}
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-bold font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="text-[11px] text-slate-500">
              Formatted: <strong className="text-slate-900">₹{amountInr.toLocaleString('en-IN')}</strong> · Today's executed: ₹{todaySuccessfulRefunds.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Natural Language Intent Description */}
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

          {/* Preview JSON Payload */}
          <div className="p-3 bg-slate-900 rounded-lg text-emerald-400 font-mono text-[11px] space-y-1 overflow-x-auto">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>POST JSON Body:</span>
              <span className="text-slate-500 font-mono">{activeWebhookUrl.split('/').slice(-2).join('/')}</span>
            </div>
            <pre>
{JSON.stringify({
  agent_id: selectedAgentId,
  action: actionName,
  destination: destination,
  amount_inr: amountInr
}, null, 2)}
            </pre>
          </div>

          {/* Action Trigger Buttons */}
          <div className="pt-2 space-y-2">
            <button
              onClick={() => handleExecuteSecurityCheck(false)}
              disabled={isEvaluating}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isEvaluating
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-blue-500/20'
              }`}
            >
              {isEvaluating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connecting to n8n Webhook ({Math.floor(evalTimer / 1000)}s)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Send Request to n8n Webhook</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleExecuteSecurityCheck(true)}
              disabled={isEvaluating}
              className="w-full py-2 px-3 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
              <span>Run Local Offline Policy Engine (Fallback Simulation)</span>
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
                {lastEvaluatedAction?.n8nConnected ? 'n8n Cloud Workflow' : 'Engine v1.4.2'}
              </span>
            </div>

            {/* Empty state before running check */}
            {!lastEvaluatedAction && !isEvaluating && (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                  <Shield className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Awaiting Security Evaluation
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Click <strong>"Send Request to n8n Webhook"</strong> to dispatch the payload and inspect the decision returned by n8n.
                </p>
                <div className="mt-4 inline-block text-left bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs max-w-md">
                  <span className="font-bold text-slate-700">Payload to Send: </span>
                  <div className="font-mono text-[11px] text-slate-600 mt-1">
                    {`{ agent_id: "${selectedAgentId}", action: "${actionName}", destination: "${destination}", amount_inr: ${amountInr} }`}
                  </div>
                </div>
              </div>
            )}

            {/* Loading state indicator */}
            {isEvaluating && (
              <div className="py-16 px-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center animate-spin">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Transmitting to n8n Webhook...
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Awaiting response from <code className="font-mono text-slate-700">{activeWebhookUrl}</code>. Analyzing risk boundaries and running Gemini AI policies.
                </p>
              </div>
            )}

            {/* Active Result Card */}
            {lastEvaluatedAction && !isEvaluating && (
              <div className="space-y-4 pt-3">
                {/* Error Banner when n8n is offline or returned 404/non-200 */}
                {lastEvaluatedAction.error && (
                  <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/80 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                          n8n Webhook Not Active or Returned Error
                        </h4>
                        <p className="text-xs text-rose-800 mt-0.5">
                          {lastEvaluatedAction.error}
                        </p>
                        {lastEvaluatedAction.errorHint && (
                          <div className="mt-2 p-2.5 bg-white/90 border border-rose-200 rounded-lg text-xs text-slate-800 font-mono">
                            <span className="font-bold text-rose-900 block mb-0.5">n8n Test Execution Step:</span>
                            {lastEvaluatedAction.errorHint}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-200/60">
                      <button
                        onClick={() => handleExecuteSecurityCheck(false)}
                        className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Webhook</span>
                      </button>
                      <button
                        onClick={() => handleSwitchWebhookMode('prod')}
                        className="px-3 py-1.5 text-xs font-semibold bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                      >
                        Switch to Production Webhook
                      </button>
                      <button
                        onClick={() => setInspectedAction(lastEvaluatedAction)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-700 hover:underline cursor-pointer ml-auto"
                      >
                        View Raw Response Details →
                      </button>
                    </div>
                  </div>
                )}

                {/* Decision Banner (ALLOW / REVIEW / BLOCK) */}
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
                          n8n not connected ({lastEvaluatedAction.source === 'local_demo' ? 'Local Sandbox' : 'Failed Call'})
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      ID: {lastEvaluatedAction.id}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DecisionBadge decision={lastEvaluatedAction.decision} size="lg" />
                      <ExecutionBadge status={lastEvaluatedAction.executionStatus} />
                    </div>
                    {lastEvaluatedAction.riskScore !== undefined && (
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                        lastEvaluatedAction.riskScore >= 70
                          ? 'bg-rose-100 text-rose-900 border-rose-300'
                          : lastEvaluatedAction.riskScore >= 30
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      }`}>
                        Risk: {lastEvaluatedAction.riskScore} / 100
                      </span>
                    )}
                  </div>

                  {/* Decision Explanation */}
                  <div className="text-xs font-semibold text-slate-900 mt-2 leading-relaxed">
                    {lastEvaluatedAction.reason}
                  </div>

                  {/* Execution Simulation Note */}
                  <div className="mt-2 text-[11px] text-slate-600 border-t border-slate-200/60 pt-2">
                    {lastEvaluatedAction.decision === 'ALLOW' && (
                      <span className="text-emerald-800 font-medium">
                        ✓ Execution Permitted: Passed all security policies. Safe sandbox simulation completed.
                      </span>
                    )}
                    {lastEvaluatedAction.decision === 'BLOCK' && (
                      <span className="text-rose-800 font-medium">
                        ✕ Execution Blocked: High security risk detected. No payment or external action executed.
                      </span>
                    )}
                    {(lastEvaluatedAction.decision === 'REVIEW' || lastEvaluatedAction.decision === 'REQUIRES_APPROVAL') && (
                      <span className="text-amber-900 font-medium">
                        ⏸ Action Halted: Requires human authorization. Dispatched to the Approval Center.
                      </span>
                    )}
                  </div>
                </div>

                {/* Risk Score Progress Meter if available */}
                {lastEvaluatedAction.riskScore !== undefined && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-semibold">Security Threat Score:</span>
                      <span className="font-mono font-bold text-slate-900">{lastEvaluatedAction.riskScore} / 100</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          lastEvaluatedAction.riskScore >= 70
                            ? 'bg-rose-600'
                            : lastEvaluatedAction.riskScore >= 30
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.min(100, lastEvaluatedAction.riskScore)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Security Reasons list if provided by n8n */}
                {lastEvaluatedAction.securityReasons && lastEvaluatedAction.securityReasons.length > 0 && (
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                      Security Policy Violations & Guardrails
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700">
                      {lastEvaluatedAction.securityReasons.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Gemini AI Analysis if provided */}
                {lastEvaluatedAction.geminiAnalysis && (
                  <div className="p-3.5 bg-blue-50/60 rounded-lg border border-blue-200/80 text-xs space-y-1.5">
                    <div className="font-bold text-blue-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Gemini AI Security Analysis
                    </div>
                    <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {lastEvaluatedAction.geminiAnalysis}
                    </p>
                  </div>
                )}

                {/* Policy Trace Steps */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Policy Evaluation Trace ({lastEvaluatedAction.evaluationSteps.length} Checks)
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

                {/* Quick Next-Step Action buttons */}
                <div className="pt-2 flex flex-wrap gap-2">
                  {(lastEvaluatedAction.decision === 'REQUIRES_APPROVAL' || lastEvaluatedAction.decision === 'REVIEW') && (
                    <button
                      onClick={() => setCurrentView('approvals')}
                      className="px-3 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>Open Approval Center</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {lastEvaluatedAction.decision === 'BLOCK' && (
                    <button
                      onClick={() => setCurrentView('incidents')}
                      className="px-3 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>Inspect Security Incidents</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setInspectedAction(lastEvaluatedAction)}
                    className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
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
