import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-memory backend configuration for n8n integration
let backendConfig = {
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || process.env.VITE_N8N_WEBHOOK_URL || 'https://bhoomikorada9.app.n8n.cloud/webhook-test/pro-firewall',
  mode: 'DEMO' as const,
  lastTested: null as string | null,
  lastStatus: 'DISCONNECTED' as 'CONNECTED' | 'DISCONNECTED' | 'FAILED'
};

// ---------------------------------------------------------------------------
// Backend Deterministic Policy Engine (used as verified fallback when n8n is not connected)
// ---------------------------------------------------------------------------
interface EvaluateRequestBody {
  agentId: string;
  actionType: 'REFUND' | 'EMAIL' | 'API_CALL' | 'TOOL_ACCESS' | 'DATABASE_QUERY';
  resource: string;
  amount?: number;
  requestCount?: number;
  apiRate?: number;
  targetService?: string;
  description?: string;
  agent?: {
    id: string;
    name: string;
    status: string;
    allowedTools: string[];
  };
  todaySuccessfulRefunds?: number;
}

function runBackendDeterministicEvaluation(body: EvaluateRequestBody) {
  const { agentId, actionType, resource, amount = 0, requestCount = 1, apiRate = 0, targetService = '', agent, todaySuccessfulRefunds = 0 } = body;

  const steps = [];

  // 1. Agent check
  if (!agent || agent.status !== 'ACTIVE') {
    const reason = `BLOCKED: Agent '${agent?.name || agentId}' is not active or unauthorized.`;
    return {
      decision: 'BLOCK' as const,
      reason,
      steps: [
        {
          policyId: 'AUTH_001',
          policyName: 'Agent Lifecycle Check',
          passed: false,
          expected: 'Agent status === ACTIVE',
          actual: agent ? `Status is ${agent.status}` : 'Unknown agent',
          reason,
          decision: 'BLOCK' as const
        }
      ]
    };
  }

  steps.push({
    policyId: 'AUTH_OK',
    policyName: 'Agent Identity & Verification',
    passed: true,
    expected: 'Verified active agent credentials',
    actual: `${agent.name} (${agent.id}) is ACTIVE`,
    reason: 'Agent authenticated on backend gateway.',
    decision: 'ALLOW' as const
  });

  // 2. Tool Whitelist
  if (actionType === 'TOOL_ACCESS' || targetService) {
    const target = (targetService || '').trim().toLowerCase();
    const isAllowed = agent.allowedTools.some((t) => t.toLowerCase() === target);
    if (!target || !isAllowed) {
      const reason = `BLOCKED: Target service '${targetService || 'unknown'}' is not included in this agent's authorized tool whitelist (${agent.allowedTools.join(', ')}).`;
      steps.push({
        policyId: 'SEC_TOOL_AUTH',
        policyName: 'Strict Tool Authorization Whitelist',
        passed: false,
        expected: `Whitelisted tools: [${agent.allowedTools.join(', ')}]`,
        actual: targetService || 'empty',
        reason,
        decision: 'BLOCK' as const
      });
      return { decision: 'BLOCK' as const, reason, steps };
    } else {
      steps.push({
        policyId: 'SEC_TOOL_AUTH',
        policyName: 'Strict Tool Authorization Whitelist',
        passed: true,
        expected: 'Whitelisted tool',
        actual: targetService,
        reason: 'Tool boundary authorization passed on backend.',
        decision: 'ALLOW' as const
      });
    }
  }

  // 3. Email Limit
  if (actionType === 'EMAIL') {
    const emailLimit = 10;
    if (requestCount > emailLimit) {
      const reason = `BLOCKED: Requested email batch of ${requestCount} recipients exceeds the maximum allowed policy limit of ${emailLimit} per hour.`;
      steps.push({
        policyId: 'RATE_EMAIL_MAX',
        policyName: 'Hourly Outbound Email Throttle',
        passed: false,
        expected: `≤ ${emailLimit} emails/hr`,
        actual: `${requestCount} emails requested`,
        reason,
        decision: 'BLOCK' as const
      });
      return { decision: 'BLOCK' as const, reason, steps };
    }
  }

  // 4. API Rate Limit
  if (actionType === 'API_CALL' || apiRate > 0) {
    const rateLimit = 20;
    if (apiRate > rateLimit) {
      const reason = `BLOCKED: Proposed API invocation rate of ${apiRate} req/min exceeds maximum permitted firewall limit of ${rateLimit} req/min.`;
      steps.push({
        policyId: 'RATE_API_LIMIT',
        policyName: 'API Invocation Velocity Guard',
        passed: false,
        expected: `≤ ${rateLimit} req/min`,
        actual: `${apiRate} req/min requested`,
        reason,
        decision: 'BLOCK' as const
      });
      return { decision: 'BLOCK' as const, reason, steps };
    }
  }

  // 5. Daily Refund Cap
  if (actionType === 'REFUND') {
    const dailyLimit = 5000;
    const projectedDaily = todaySuccessfulRefunds + amount;
    if (projectedDaily > dailyLimit) {
      const reason = `BLOCKED: Action would cause cumulative daily successful refunds (₹${todaySuccessfulRefunds.toLocaleString('en-IN')} prior + ₹${amount.toLocaleString('en-IN')} proposed = ₹${projectedDaily.toLocaleString('en-IN')}) to exceed the hard daily budget limit of ₹${dailyLimit.toLocaleString('en-IN')}.`;
      steps.push({
        policyId: 'BUDGET_DAILY_REFUND',
        policyName: 'Daily Cumulative Refund Budget',
        passed: false,
        expected: `Daily sum ≤ ₹${dailyLimit.toLocaleString('en-IN')}`,
        actual: `Projected sum = ₹${projectedDaily.toLocaleString('en-IN')}`,
        reason,
        decision: 'BLOCK' as const
      });
      return { decision: 'BLOCK' as const, reason, steps };
    }

    // 6. Single refund threshold
    const singleLimit = 1000;
    if (amount > singleLimit) {
      const reason = `REQUIRES_APPROVAL: Requested refund of ₹${amount.toLocaleString('en-IN')} exceeds the ₹${singleLimit.toLocaleString('en-IN')} single-refund threshold. Requires human authorization before execution.`;
      steps.push({
        policyId: 'THRESH_SINGLE_REFUND',
        policyName: 'Maximum Autonomous Single Refund',
        passed: false,
        expected: `≤ ₹${singleLimit.toLocaleString('en-IN')}`,
        actual: `Requested ₹${amount.toLocaleString('en-IN')}`,
        reason,
        decision: 'REQUIRES_APPROVAL' as const
      });
      return { decision: 'REQUIRES_APPROVAL' as const, reason, steps };
    }
  }

  // All pass
  const reason = 'ALLOWED: Action complies with all active security policies and tool boundary authorizations.';
  return { decision: 'ALLOW' as const, reason, steps };
}

// ---------------------------------------------------------------------------
// Backend API Endpoints
// ---------------------------------------------------------------------------

// Health & Config Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    service: 'AI Agent Firewall Backend API',
    mode: 'DEMO',
    n8nConfigured: Boolean(backendConfig.n8nWebhookUrl),
    n8nStatus: backendConfig.n8nWebhookUrl ? backendConfig.lastStatus : 'n8n not connected',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/config', (req: Request, res: Response) => {
  res.json({
    n8nWebhookUrl: backendConfig.n8nWebhookUrl,
    mode: backendConfig.mode,
    lastTested: backendConfig.lastTested,
    lastStatus: backendConfig.lastStatus
  });
});

app.post('/api/config', (req: Request, res: Response) => {
  const { n8nWebhookUrl } = req.body;
  if (typeof n8nWebhookUrl === 'string') {
    backendConfig.n8nWebhookUrl = n8nWebhookUrl.trim();
  }
  res.json({
    success: true,
    n8nWebhookUrl: backendConfig.n8nWebhookUrl,
    message: 'Backend n8n webhook configuration updated.'
  });
});

// Test Connection directly from backend to n8n Webhook
app.post('/api/test-n8n', async (req: Request, res: Response) => {
  const targetUrl = (req.body.webhookUrl || backendConfig.n8nWebhookUrl || '').trim();

  if (!targetUrl) {
    return res.json({
      connected: false,
      n8nStatus: 'n8n not connected',
      message: 'n8n not connected: No webhook URL configured.'
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const pingPayload = {
      event: 'FIREWALL_PING_PROBE',
      agent_id: 'finance-agent-01',
      action: 'ping_test',
      destination: 'test.example',
      amount_inr: 0,
      timestamp: new Date().toISOString()
    };

    const upstreamResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AIAgentFirewall/2.0'
      },
      body: JSON.stringify(pingPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const text = await upstreamResponse.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    if (upstreamResponse.ok || upstreamResponse.status === 200) {
      backendConfig.lastTested = new Date().toISOString();
      backendConfig.lastStatus = 'CONNECTED';
      return res.json({
        connected: true,
        n8nStatus: 'Connected',
        statusCode: upstreamResponse.status,
        message: `Connected successfully to n8n webhook (HTTP ${upstreamResponse.status}).`,
        rawResponse: data
      });
    } else {
      backendConfig.lastTested = new Date().toISOString();
      backendConfig.lastStatus = 'FAILED';
      return res.json({
        connected: false,
        n8nStatus: 'n8n not connected',
        statusCode: upstreamResponse.status,
        message: data.message || `Upstream webhook returned HTTP ${upstreamResponse.status}.`,
        hint: data.hint || (upstreamResponse.status === 404
          ? "In test mode, click the 'Execute workflow' button on the canvas in n8n, then try again."
          : undefined),
        rawResponse: data
      });
    }
  } catch (error: any) {
    backendConfig.lastTested = new Date().toISOString();
    backendConfig.lastStatus = 'FAILED';
    const isTimeout = error.name === 'AbortError';
    const msg = isTimeout
      ? 'n8n not connected: Webhook request timed out after 5s.'
      : `n8n not connected: ${error.message || 'Network unreachable'}`;
    return res.json({
      connected: false,
      n8nStatus: 'n8n not connected',
      message: msg,
      hint: 'Ensure n8n cloud instance is reachable.'
    });
  }
});

// Primary Endpoint: Evaluate Action via Backend API & n8n
app.post('/api/evaluate', async (req: Request, res: Response) => {
  const body = req.body;
  const actionId = `act-${Date.now().toString().slice(-6)}`;
  const timestamp = new Date().toISOString();

  const webhookUrl = (body.webhookUrl || backendConfig.n8nWebhookUrl || '').trim();

  // If client explicitly requests offline deterministic engine
  if (body.mode === 'local_demo') {
    const localEval = runBackendDeterministicEvaluation(body);
    return res.json({
      success: true,
      n8nConnected: false,
      n8nStatus: 'Local Sandbox Engine',
      source: 'backend_deterministic_fallback',
      actionId,
      decision: localEval.decision,
      reason: localEval.reason,
      evaluationSteps: localEval.steps,
      timestamp,
      rawN8nResponse: null
    });
  }

  // Attempt upstream connection to n8n Webhook
  if (webhookUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const agent_id = body.agent_id || body.agentId || 'finance-agent-01';
      const action = body.action || body.actionType || 'send_payment';
      const destination = body.destination || body.resource || body.targetService || 'unknown.example';
      const amount_inr = Number(body.amount_inr ?? body.amount ?? 0);

      const n8nPayload = {
        agent_id,
        action,
        destination,
        amount_inr,
        agentId: agent_id,
        actionType: action,
        resource: destination,
        amount: amount_inr,
        actionId,
        description: body.description || `Autonomous ${action} to ${destination}`,
        environment: 'TEST',
        timestamp
      };

      const n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AIAgentFirewall/2.0'
        },
        body: JSON.stringify(n8nPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await n8nResponse.text();
      let n8nData: any = {};
      try {
        n8nData = JSON.parse(responseText);
      } catch {
        n8nData = { message: responseText };
      }

      if (n8nResponse.ok) {
        const payload = Array.isArray(n8nData) ? n8nData[0] : (n8nData?.data || n8nData?.body || n8nData || {});

        // Decision parsing: ALLOW, REVIEW, or BLOCK
        let returnedDecision: 'ALLOW' | 'BLOCK' | 'REVIEW' = 'BLOCK';
        const rawDecision = String(
          payload.decision || payload.verdict || payload.status || payload.action || payload.result || ''
        ).toUpperCase();

        if (rawDecision.includes('ALLOW')) {
          returnedDecision = 'ALLOW';
        } else if (rawDecision.includes('BLOCK') || rawDecision.includes('DENY') || rawDecision.includes('REJECT')) {
          returnedDecision = 'BLOCK';
        } else if (rawDecision.includes('REVIEW') || rawDecision.includes('APPROV') || rawDecision.includes('HALT') || rawDecision.includes('PEND')) {
          returnedDecision = 'REVIEW';
        } else {
          // If no explicit decision field, check risk score
          const numericScore = typeof payload.risk_score === 'number' ? payload.risk_score : (typeof payload.riskScore === 'number' ? payload.riskScore : null);
          if (numericScore !== null) {
            returnedDecision = numericScore > 70 ? 'BLOCK' : (numericScore > 30 ? 'REVIEW' : 'ALLOW');
          } else {
            returnedDecision = 'REVIEW';
          }
        }

        // Parse risk score
        const rawScore = payload.risk_score ?? payload.riskScore ?? payload.score ?? payload.risk;
        let riskScore: number | undefined = undefined;
        if (typeof rawScore === 'number') {
          riskScore = rawScore <= 1 && rawScore > 0 ? Math.round(rawScore * 100) : Math.round(rawScore);
        } else if (typeof rawScore === 'string') {
          const parsed = parseFloat(rawScore);
          if (!isNaN(parsed)) riskScore = parsed <= 1 && parsed > 0 ? Math.round(parsed * 100) : Math.round(parsed);
        }

        // Parse security reasons
        let securityReasons: string[] = [];
        const rawReasons = payload.security_reasons || payload.securityReasons || payload.reasons || payload.reason || payload.explanation;
        if (Array.isArray(rawReasons)) {
          securityReasons = rawReasons.map((r: any) => String(r));
        } else if (typeof rawReasons === 'string' && rawReasons.trim()) {
          securityReasons = [rawReasons];
        }

        // Parse Gemini AI analysis
        let geminiAnalysis: string | undefined = undefined;
        const rawGemini = payload.gemini_analysis || payload.geminiAnalysis || payload.ai_analysis || payload.aiAnalysis || payload.analysis || payload.gemini;
        if (typeof rawGemini === 'string') {
          geminiAnalysis = rawGemini;
        } else if (rawGemini && typeof rawGemini === 'object') {
          geminiAnalysis = typeof rawGemini.text === 'string' ? rawGemini.text : JSON.stringify(rawGemini, null, 2);
        }

        const reason = payload.reason || payload.explanation || (securityReasons.length > 0 ? securityReasons.join('. ') : `n8n security workflow verdict: ${returnedDecision}`);

        const evaluationSteps = payload.evaluationSteps || [
          {
            policyId: 'N8N_WORKFLOW_POLICY',
            policyName: 'n8n Security Workflow & AI Guardrail',
            passed: returnedDecision === 'ALLOW',
            expected: 'Security validation pass',
            actual: `Returned ${returnedDecision}${riskScore !== undefined ? ` (Risk Score: ${riskScore}/100)` : ''}`,
            reason,
            decision: returnedDecision === 'REVIEW' ? 'REQUIRES_APPROVAL' : returnedDecision
          }
        ];

        backendConfig.lastStatus = 'CONNECTED';
        return res.json({
          success: true,
          n8nConnected: true,
          n8nStatus: 'Connected',
          source: 'n8n_webhook',
          actionId: payload.actionId || payload.action_id || actionId,
          decision: returnedDecision,
          reason,
          riskScore,
          securityReasons,
          geminiAnalysis,
          evaluationSteps,
          timestamp,
          rawN8nResponse: n8nData,
          agent_id,
          action,
          destination,
          amount_inr,
          webhookUrl
        });
      } else {
        // n8n returned a non-200 status code (e.g. 404, 500)
        backendConfig.lastTested = new Date().toISOString();
        backendConfig.lastStatus = 'FAILED';

        return res.json({
          success: false,
          n8nConnected: false,
          n8nStatus: 'n8n not connected',
          statusCode: n8nResponse.status,
          error: n8nData.message || `Upstream n8n webhook returned HTTP ${n8nResponse.status}`,
          hint: n8nData.hint || (n8nResponse.status === 404
            ? "In test mode, click the 'Execute workflow' button on the canvas in n8n, then try again. (In test mode, the webhook only works for one call after you click this button)"
            : 'Ensure the n8n webhook node is active and configured to respond.'),
          rawN8nResponse: n8nData,
          actionId,
          webhookUrl,
          agent_id,
          action,
          destination,
          amount_inr
        });
      }
    } catch (err: any) {
      backendConfig.lastTested = new Date().toISOString();
      backendConfig.lastStatus = 'FAILED';
      const isTimeout = err.name === 'AbortError';

      return res.json({
        success: false,
        n8nConnected: false,
        n8nStatus: 'n8n not connected',
        statusCode: 0,
        error: isTimeout ? 'Request timed out after 6 seconds while contacting n8n webhook.' : (err.message || 'Network unreachable'),
        hint: 'Ensure your n8n cloud instance is online and the webhook endpoint is reachable.',
        rawN8nResponse: null,
        actionId,
        webhookUrl
      });
    }
  }

  // Fallback if no webhook URL is configured
  return res.json({
    success: false,
    n8nConnected: false,
    n8nStatus: 'n8n not connected',
    statusCode: 0,
    error: 'No n8n webhook URL configured.',
    hint: 'Configure the n8n webhook endpoint URL in the Settings or Integrations page.',
    actionId
  });
});

// ---------------------------------------------------------------------------
// Vite Dev Server / Production Static Serving
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Agent Firewall] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
