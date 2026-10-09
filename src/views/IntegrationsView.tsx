import React, { useState } from 'react';
import { useFirewall } from '../context/FirewallContext';
import {
  Workflow,
  Database,
  Bot,
  Mail,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Code,
  Copy,
  Send,
  RefreshCw,
  Lock
} from 'lucide-react';

export const IntegrationsView: React.FC = () => {
  const { integrations, updateIntegrations, testN8nWebhook, n8nStatus, setBackendN8nUrl } = useFirewall();

  const [n8nUrlInput, setN8nUrlInput] = useState<string>(integrations.n8n.webhookUrl);
  const [testingN8n, setTestingN8n] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const handleTestN8n = async () => {
    setTestingN8n(true);
    setTestResult(null);
    try {
      await setBackendN8nUrl(n8nUrlInput);
      const res = await testN8nWebhook(n8nUrlInput);
      setTestResult(res);
    } finally {
      setTestingN8n(false);
    }
  };

  const samplePayload = {
    actionId: "act-1025",
    eventType: "FIREWALL_BLOCK",
    policyDecision: "BLOCK",
    agentId: "refund-agent-01",
    agentName: "Refund Assistant",
    actionType: "TOOL_ACCESS",
    resource: "infrastructure-admin",
    violationReason: "Target service 'aws_s3_admin_bucket' is unwhitelisted.",
    timestamp: new Date().toISOString()
  };

  const sampleSql = `-- Supabase Table Schema for AI Agent Firewall
CREATE TABLE IF NOT EXISTS firewall_actions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  resource TEXT NOT NULL,
  amount NUMERIC,
  decision TEXT NOT NULL CHECK (decision IN ('ALLOW', 'BLOCK', 'REQUIRES_APPROVAL')),
  reason TEXT NOT NULL,
  execution_status TEXT NOT NULL,
  approval_status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE firewall_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read" ON firewall_actions FOR SELECT TO authenticated USING (true);`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wider">
            Ecosystem Integrations
          </span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs text-slate-500 font-medium">Decoupled Architecture</span>
        </div>
        <h2 className="text-base font-bold text-slate-900">
          External Services, Webhooks & Storage Integrations
        </h2>
        <p className="text-xs text-slate-500">
          The firewall operates as an independent security layer. External tool failures or webhook timeouts never bypass the firewall boundaries.
        </p>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: n8n Workflow Automation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">n8n Workflow Automation</h3>
                  <p className="text-[11px] text-slate-500">Security Alert & Incident Orchestration</p>
                </div>
              </div>

              {n8nStatus === 'Connected' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  n8n not connected
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Connects to your n8n workflow webhook to evaluate agent requests against live enterprise rules and Gemini AI analysis.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700">Webhook Target Endpoint:</label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const url = 'https://bhoomikorada9.app.n8n.cloud/webhook-test/pro-firewall';
                      setN8nUrlInput(url);
                      setBackendN8nUrl(url);
                    }}
                    className="text-[10px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-300 cursor-pointer"
                  >
                    Test URL
                  </button>
                  <button
                    onClick={() => {
                      const url = 'https://bhoomikorada9.app.n8n.cloud/webhook/pro-firewall';
                      setN8nUrlInput(url);
                      setBackendN8nUrl(url);
                    }}
                    className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 cursor-pointer"
                  >
                    Prod URL
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={n8nUrlInput}
                onChange={(e) => setN8nUrlInput(e.target.value)}
                placeholder="https://your-n8n-instance/webhook/..."
                className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
              />
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
                <span className="font-semibold text-slate-800 block">Workflow Readiness Tips:</span>
                <div>• <strong>Test URL:</strong> Click <em>"Execute workflow"</em> on your n8n canvas before sending.</div>
                <div>• <strong>Production URL:</strong> Click <em>"Activate"</em> (toggle on) in n8n for 24/7 background listening.</div>
              </div>
            </div>

            {testResult && (
              <div
                className={`mt-3 p-2.5 rounded-lg text-xs font-medium border ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {testResult.message}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono">
              Fail-Safe: Webhook timeouts never grant access
            </span>
            <button
              onClick={handleTestN8n}
              disabled={testingN8n}
              className="px-3.5 py-1.5 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {testingN8n ? (
                <span>Dispatching...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Test Webhook Ping</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 2: Supabase Relational Database */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Supabase Storage</h3>
                  <p className="text-[11px] text-slate-500">Persistent Action & Policy Ledger</p>
                </div>
              </div>

              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Local Sandbox Mode
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Currently running on high-speed browser-isolated storage for the demo. Connect Supabase by setting your project URL and service role key in <code className="text-slate-800 font-mono">.env</code>.
            </p>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-700">Schema Ready for Migration</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sampleSql);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2000);
                  }}
                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  <Copy className="w-3 h-3" />
                  {copiedSql ? 'Copied SQL!' : 'Copy SQL'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Database migrations include RLS policies to restrict agent role execution.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono">
              Client: @supabase/supabase-js ready
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Deterministic In-Memory Fallback Active
            </span>
          </div>
        </div>

        {/* Card 3: AI Model Provider (Gemini / Claude / OpenAI) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">AI Model Provider</h3>
                  <p className="text-[11px] text-slate-500">Structured Tool-Calling LLM</p>
                </div>
              </div>

              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Connected: @google/genai
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              AI models only propose intent. The firewall's deterministic engine validates every parameter before execution. The model is <strong>never</strong> trusted to self-authorize.
            </p>

            <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Zero Autonomous Self-Authorization Guarantee
              </div>
              <div className="text-[11px] text-amber-800">
                Even if an AI model provides a high risk confidence score or attempts prompt injection, the firewall checks hard limits unconditionally.
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Model: gemini-2.5-flash / gemini-3-flash</span>
            <span className="font-semibold text-emerald-700">Strict JSON Mode</span>
          </div>
        </div>

        {/* Card 4: Protected Action Gateway API */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Protected Action Gateway API</h3>
                  <p className="text-[11px] text-slate-500">Payment & Infrastructure Proxy</p>
                </div>
              </div>

              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Proxy Intercept Active
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              All tools (Refund API, Mailer, Database mutations) sit behind this gateway proxy. Agents possess zero direct API keys; all traffic is mediated by the firewall.
            </p>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div><strong>Gateway Mode:</strong> Out-of-Band & In-Line Intercept</div>
              <div><strong>Latency Overhead:</strong> &lt; 2ms per evaluation</div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Architecture: Zero-Trust Gateway</span>
            <span className="font-semibold text-blue-700">Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
};
