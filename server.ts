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
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || process.env.VITE_N8N_WEBHOOK_URL || '',
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
  const targetUrl = req.body.webhookUrl || backendConfig.n8nWebhookUrl;

  if (!targetUrl || targetUrl.trim() === '') {
    return res.json({
      connected: false,
      n8nStatus: 'n8n not connected',
      message: 'n8n not connected: No webhook URL configured.'
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const pingPayload = {
      event: 'FIREWALL_PING_PROBE',
      app: 'AI Agent Firewall Backend',
      environment: 'DEMO',
      timestamp: new Date().toISOString()
    };

    const upstreamResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AIAgentFirewall/1.4.2'
      },
      body: JSON.stringify(pingPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (upstreamResponse.ok || upstreamResponse.status === 200) {
      backendConfig.lastTested = new Date().toISOString();
      backendConfig.lastStatus = 'CONNECTED';
      return res.json({
        connected: true,
        n8nStatus: 'Connected',
        statusCode: upstreamResponse.status,
        message: `Connected successfully to n8n webhook (HTTP ${upstreamResponse.status}).`
      });
    } else {
      backendConfig.lastTested = new Date().toISOString();
      backendConfig.lastStatus = 'FAILED';
      return res.json({
        connected: false,
        n8nStatus: 'n8n not connected',
        statusCode: upstreamResponse.status,
        message: `n8n not connected: Upstream webhook returned HTTP ${upstreamResponse.status}.`
      });
    }
  } catch (error: any) {
    backendConfig.lastTested = new Date().toISOString();
    backendConfig.lastStatus = 'FAILED';
    const isTimeout = error.name === 'AbortError';
    const msg = isTimeout
      ? 'n8n not connected: Webhook request timed out after 4.5s.'
      : `n8n not connected: ${error.message || 'Network unreachable'}`;
    return res.json({
      connected: false,
      n8nStatus: 'n8n not connected',
      message: msg
    });
  }
});

// Primary Endpoint: Evaluate Action via Backend API & n8n
app.post('/api/evaluate', async (req: Request, res: Response) => {
  const body: EvaluateRequestBody = req.body;
  const actionId = `act-${Date.now().toString().slice(-6)}`;
  const timestamp = new Date().toISOString();

  const webhookUrl = backendConfig.n8nWebhookUrl;

  // Case 1: n8n webhook is configured -> Attempt upstream connection
  if (webhookUrl && webhookUrl.trim() !== '') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const n8nPayload = {
        actionId,
        agentId: body.agentId,
        agentName: body.agent?.name || body.agentId,
        actionType: body.actionType,
        resource: body.resource,
        amount: body.amount,
        requestCount: body.requestCount,
        apiRate: body.apiRate,
        targetService: body.targetService,
        description: body.description,
        todaySuccessfulRefunds: body.todaySuccessfulRefunds || 0,
        environment: 'DEMO',
        timestamp
      };

      const n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AIAgentFirewall-Backend/1.4'
        },
        body: JSON.stringify(n8nPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (n8nResponse.ok) {
        let n8nData: any = {};
        try {
          n8nData = await n8nResponse.json();
        } catch {
          // Response body was not JSON, but status was 200
          n8nData = {};
        }

        // Validate decision returned by n8n
        const validDecisions = ['ALLOW', 'BLOCK', 'REQUIRES_APPROVAL'];
        const returnedDecision = n8nData.decision && validDecisions.includes(n8nData.decision.toUpperCase())
          ? n8nData.decision.toUpperCase()
          : null;

        if (returnedDecision) {
          backendConfig.lastStatus = 'CONNECTED';
          return res.json({
            success: true,
            n8nConnected: true,
            n8nStatus: 'Connected',
            source: 'n8n_webhook',
            actionId: n8nData.actionId || actionId,
            decision: returnedDecision,
            reason: n8nData.reason || `Decision enforced by connected n8n workflow for ${body.actionType}.`,
            evaluationSteps: n8nData.evaluationSteps || [
              {
                policyId: 'N8N_WORKFLOW_VERDICT',
                policyName: 'Upstream n8n Security Workflow',
                passed: returnedDecision === 'ALLOW',
                expected: 'n8n workflow authorization',
                actual: `n8n returned ${returnedDecision}`,
                reason: n8nData.reason || 'Decision evaluated remotely by connected n8n workflow.',
                decision: returnedDecision
              }
            ],
            timestamp,
            rawN8nResponse: n8nData
          });
        }
      }
    } catch (err: any) {
      // Downstream failure or timeout - do not claim it was successful!
      console.warn('n8n upstream connection failed:', err.message);
    }
  }

  // Case 2: n8n is NOT connected, NOT configured, or UNREACHABLE
  // Run deterministic policy check on the backend, and explicitly label as "n8n not connected"
  const localEval = runBackendDeterministicEvaluation(body);

  const n8nStatusLabel = webhookUrl && webhookUrl.trim() !== ''
    ? 'n8n not connected: Upstream webhook unreachable or returned non-200 status'
    : 'n8n not connected: No webhook endpoint configured';

  return res.json({
    success: true,
    n8nConnected: false,
    n8nStatus: 'n8n not connected',
    source: 'backend_deterministic_fallback',
    fallbackReason: n8nStatusLabel,
    actionId,
    decision: localEval.decision,
    reason: localEval.reason,
    evaluationSteps: localEval.steps,
    timestamp,
    rawN8nResponse: null
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
