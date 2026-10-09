import {
  Agent,
  SecurityPolicy,
  ActionRecord,
  ApprovalRequest,
  IncidentRecord,
  AuditRecord,
  IntegrationConfig,
  ScenarioDefinition
} from '../types/firewall';

const STORAGE_KEY_PREFIX = 'ai_agent_firewall_v1_';

export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'finance-agent-01',
    name: 'Finance Agent',
    role: 'Autonomous Payment & Treasury Controller',
    status: 'ACTIVE',
    allowedTools: ['payment_gateway', 'bank_transfer_api', 'vendor_ledger'],
    department: 'Financial Security',
    avatarColor: '#0EA5E9'
  },
  {
    id: 'refund-agent-01',
    name: 'Refund Assistant',
    role: 'Autonomous Customer Billing & Order Adjuster',
    status: 'ACTIVE',
    allowedTools: ['order_lookup_api', 'refund_processor_v1', 'customer_crm'],
    department: 'Customer Finance Ops',
    avatarColor: '#2563EB'
  },
  {
    id: 'support-agent-02',
    name: 'Customer Triage Agent',
    role: 'Tier 1 Escalation & Comms Dispatcher',
    status: 'ACTIVE',
    allowedTools: ['ticket_desk_api', 'knowledge_base', 'zendesk_notifier'],
    department: 'Support & Success',
    avatarColor: '#0F9D8A'
  },
  {
    id: 'data-sync-03',
    name: 'Inventory Sync Agent',
    role: 'Warehouse & ERP Data Synchronizer',
    status: 'ACTIVE',
    allowedTools: ['warehouse_catalog', 'stock_ledger', 'shipping_tracker'],
    department: 'Supply Chain Engineering',
    avatarColor: '#D97706'
  }
];

export const INITIAL_POLICIES: SecurityPolicy[] = [
  {
    id: 'pol-01',
    code: 'THRESH_SINGLE_REFUND',
    name: 'Maximum Autonomous Single Refund',
    category: 'REFUND',
    description: 'Any individual refund exceeding this limit is halted and routed to the Human Approval Center.',
    threshold: 1000,
    unit: '₹ INR',
    enabled: true,
    severity: 'HIGH',
    hardRule: false,
    decisionOnBreach: 'REQUIRES_APPROVAL'
  },
  {
    id: 'pol-02',
    code: 'BUDGET_DAILY_REFUND',
    name: 'Daily Cumulative Refund Budget',
    category: 'REFUND',
    description: 'Hard daily cap on total successfully executed refunds across all autonomous runs today.',
    threshold: 5000,
    unit: '₹ INR / day',
    enabled: true,
    severity: 'CRITICAL',
    hardRule: true,
    decisionOnBreach: 'BLOCK'
  },
  {
    id: 'pol-03',
    code: 'RATE_EMAIL_MAX',
    name: 'Hourly Outbound Email Throttle',
    category: 'EMAIL',
    description: 'Prevents bulk phishing, accidental message storms, or email quota exhaustion.',
    threshold: 10,
    unit: 'emails / hr',
    enabled: true,
    severity: 'HIGH',
    hardRule: true,
    decisionOnBreach: 'BLOCK'
  },
  {
    id: 'pol-04',
    code: 'RATE_API_LIMIT',
    name: 'API Invocation Velocity Guard',
    category: 'API_CALL',
    description: 'Limits calls per minute to prevent runaway recursive loops or accidental DoS attacks.',
    threshold: 20,
    unit: 'req / min',
    enabled: true,
    severity: 'MEDIUM',
    hardRule: true,
    decisionOnBreach: 'BLOCK'
  },
  {
    id: 'pol-05',
    code: 'SEC_TOOL_AUTH',
    name: 'Strict Tool Authorization Whitelist',
    category: 'TOOL_ACCESS',
    description: 'Agent may only invoke tools and services explicitly listed in its granted permission manifest.',
    enabled: true,
    severity: 'CRITICAL',
    hardRule: true,
    decisionOnBreach: 'BLOCK'
  }
];

export const DEMO_SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'scenario-n8n-live',
    scenarioLetter: '★',
    title: 'n8n Live Test — send_payment to unknown.example (₹80,000)',
    agentId: 'finance-agent-01',
    actionType: 'REFUND',
    resource: 'unknown.example',
    amount: 80000,
    description: 'Autonomous payment request of ₹80,000 sent to unknown.example by finance-agent-01.',
    expectedDecision: 'BLOCK',
    summary: 'Sends { agent_id: "finance-agent-01", action: "send_payment", destination: "unknown.example", amount_inr: 80000 } to n8n webhook.',
    relevantPolicy: 'n8n Webhook & Gemini AI Security Policy'
  },
  {
    id: 'scenario-a',
    scenarioLetter: 'A',
    title: 'Scenario A — Safe Autonomous Refund',
    agentId: 'refund-agent-01',
    actionType: 'REFUND',
    resource: 'ORD-1024',
    amount: 500,
    description: 'Customer requested refund for minor shipping delay on order ORD-1024. Agent verifies receipt.',
    expectedDecision: 'ALLOW',
    summary: 'Refund of ₹500 is within the single-transaction limit of ₹1,000 and within daily budget.',
    relevantPolicy: 'THRESH_SINGLE_REFUND (Threshold: ₹1,000)'
  },
  {
    id: 'scenario-b',
    scenarioLetter: 'B',
    title: 'Scenario B — High-Value Refund (Approval Required)',
    agentId: 'refund-agent-01',
    actionType: 'REFUND',
    resource: 'ORD-1025',
    amount: 2000,
    description: 'Customer claims damaged electronics order ORD-1025. Agent calculates full reimbursement of ₹2,000.',
    expectedDecision: 'REQUIRES_APPROVAL',
    summary: 'Exceeds the ₹1,000 single-refund threshold. Halted immediately, pending human verification.',
    relevantPolicy: 'THRESH_SINGLE_REFUND (Threshold: ₹1,000)'
  },
  {
    id: 'scenario-c',
    scenarioLetter: 'C',
    title: 'Scenario C — Unauthorized Tool Access',
    agentId: 'refund-agent-01',
    actionType: 'TOOL_ACCESS',
    resource: 'infrastructure-admin',
    targetService: 'aws_s3_admin_bucket',
    description: 'Agent attempts to call aws_s3_admin_bucket to inspect raw storage logs outside its whitelist.',
    expectedDecision: 'BLOCK',
    summary: 'Hard boundary violation. The target tool is not in the agent\'s permission manifest.',
    relevantPolicy: 'SEC_TOOL_AUTH (Whitelist Enforcement)'
  },
  {
    id: 'scenario-d',
    scenarioLetter: 'D',
    title: 'Scenario D — Outbound Email Abuse / Spike',
    agentId: 'refund-agent-01',
    actionType: 'EMAIL',
    resource: 'crm_batch_mailer',
    requestCount: 50,
    description: 'Agent attempts automated broadcast email to 50 recipients regarding refund status.',
    expectedDecision: 'BLOCK',
    summary: 'Requested 50 emails exceeds configured hourly quota of 10 emails.',
    relevantPolicy: 'RATE_EMAIL_MAX (Quota: 10 / hr)'
  },
  {
    id: 'scenario-e',
    scenarioLetter: 'E',
    title: 'Scenario E — API Rate Limit Exceeded',
    agentId: 'refund-agent-01',
    actionType: 'API_CALL',
    resource: 'payment_gateway_v2',
    apiRate: 30,
    description: 'Agent initiates burst query pattern at 30 requests/minute against payment reconciliation endpoint.',
    expectedDecision: 'BLOCK',
    summary: 'Velocity of 30 req/min exceeds maximum allowed rate limit of 20 req/min.',
    relevantPolicy: 'RATE_API_LIMIT (Velocity: 20 req/min)'
  },
  {
    id: 'scenario-f',
    scenarioLetter: 'F',
    title: 'Scenario F — Daily Cumulative Budget Exceeded',
    agentId: 'refund-agent-01',
    actionType: 'REFUND',
    resource: 'ORD-1026',
    amount: 4500,
    description: 'Attempting large batch return that would push total daily executed refunds well past ₹5,000.',
    expectedDecision: 'BLOCK',
    summary: 'Would breach the ₹5,000 cumulative daily budget based on prior executed transactions.',
    relevantPolicy: 'BUDGET_DAILY_REFUND (Daily Cap: ₹5,000)'
  }
];

export const INITIAL_INTEGRATIONS: IntegrationConfig = {
  n8n: {
    enabled: true,
    webhookUrl: 'https://bhoomikorada9.app.n8n.cloud/webhook-test/pro-firewall',
    lastTested: '2026-10-09T08:30:00Z',
    lastStatus: 'SUCCESS'
  },
  supabase: {
    enabled: false,
    projectUrl: 'https://xyzcompany.supabase.co',
    lastSynced: undefined
  },
  aiModel: {
    enabled: true,
    modelName: 'gemini-2.5-flash',
    strictParsing: true
  },
  emailAlerts: {
    enabled: true,
    recipient: 'security-team@enterprise.domain'
  }
};

const now = new Date();
const minutesAgo = (mins: number) => new Date(now.getTime() - mins * 60000).toISOString();

export const INITIAL_ACTIONS: ActionRecord[] = [
  {
    id: 'act-1019',
    agentId: 'refund-agent-01',
    agentName: 'Refund Assistant',
    actionType: 'REFUND',
    resource: 'ORD-1019',
    amount: 450,
    description: 'Automatic courier delay refund for customer #8832',
    timestamp: minutesAgo(95),
    decision: 'ALLOW',
    reason: 'ALLOWED: Action complies with all active security policies and tool boundary authorizations.',
    executionStatus: 'EXECUTED',
    approvalStatus: 'NOT_REQUIRED',
    policyVersion: 'v1.4.2',
    correlationId: 'corr-001',
    evaluationSteps: [
      {
        policyId: 'AUTH_OK',
        policyName: 'Agent Identity',
        passed: true,
        expected: 'ACTIVE status',
        actual: 'ACTIVE',
        reason: 'Agent verified.',
        decision: 'ALLOW'
      },
      {
        policyId: 'pol-01',
        policyName: 'Maximum Autonomous Single Refund',
        passed: true,
        expected: '≤ ₹1,000',
        actual: '₹450',
        reason: 'Within threshold.',
        decision: 'ALLOW'
      }
    ]
  },
  {
    id: 'act-1020',
    agentId: 'refund-agent-01',
    agentName: 'Refund Assistant',
    actionType: 'REFUND',
    resource: 'ORD-1020',
    amount: 350,
    description: 'Item missing accessories reimbursement for order ORD-1020',
    timestamp: minutesAgo(72),
    decision: 'ALLOW',
    reason: 'ALLOWED: Action complies with all active security policies and tool boundary authorizations.',
    executionStatus: 'EXECUTED',
    approvalStatus: 'NOT_REQUIRED',
    policyVersion: 'v1.4.2',
    correlationId: 'corr-002',
    evaluationSteps: [
      {
        policyId: 'pol-01',
        policyName: 'Maximum Autonomous Single Refund',
        passed: true,
        expected: '≤ ₹1,000',
        actual: '₹350',
        reason: 'Within threshold.',
        decision: 'ALLOW'
      }
    ]
  },
  {
    id: 'act-1021',
    agentId: 'refund-agent-01',
    agentName: 'Refund Assistant',
    actionType: 'TOOL_ACCESS',
    resource: 'internal-cluster',
    targetService: 'prod_database_drop',
    description: 'Agent attempted unlisted database mutation command',
    timestamp: minutesAgo(54),
    decision: 'BLOCK',
    reason: 'BLOCKED: The target service \'prod_database_drop\' is not included in this agent\'s authorized tool list (order_lookup_api, refund_processor_v1, customer_crm).',
    executionStatus: 'BLOCKED',
    approvalStatus: 'NOT_REQUIRED',
    policyVersion: 'v1.4.2',
    correlationId: 'corr-003',
    evaluationSteps: [
      {
        policyId: 'pol-05',
        policyName: 'Strict Tool Authorization Whitelist',
        passed: false,
        expected: 'Whitelisted tools',
        actual: 'prod_database_drop',
        reason: 'Tool boundary authorization failed.',
        decision: 'BLOCK'
      }
    ]
  },
  {
    id: 'act-1022',
    agentId: 'support-agent-02',
    agentName: 'Customer Triage Agent',
    actionType: 'EMAIL',
    resource: 'marketing_bulk_outbox',
    requestCount: 35,
    description: 'Agent triggered batch notification loop to 35 customers',
    timestamp: minutesAgo(38),
    decision: 'BLOCK',
    reason: 'BLOCKED: Requested email batch of 35 recipients exceeds the maximum allowed policy limit of 10 per hour.',
    executionStatus: 'BLOCKED',
    approvalStatus: 'NOT_REQUIRED',
    policyVersion: 'v1.4.2',
    correlationId: 'corr-004',
    evaluationSteps: [
      {
        policyId: 'pol-03',
        policyName: 'Hourly Outbound Email Throttle',
        passed: false,
        expected: '≤ 10 emails/hr',
        actual: '35 emails requested',
        reason: 'Email quota exceeded.',
        decision: 'BLOCK'
      }
    ]
  },
  {
    id: 'act-1023',
    agentId: 'refund-agent-01',
    agentName: 'Refund Assistant',
    actionType: 'REFUND',
    resource: 'ORD-1023',
    amount: 1800,
    description: 'High value return for premium damaged merchandise',
    timestamp: minutesAgo(18),
    decision: 'REQUIRES_APPROVAL',
    reason: 'REQUIRES_APPROVAL: Requested refund of ₹1,800 exceeds the ₹1,000 single-refund threshold. Requires human authorization before execution.',
    executionStatus: 'PENDING',
    approvalStatus: 'PENDING',
    policyVersion: 'v1.4.2',
    correlationId: 'corr-005',
    evaluationSteps: [
      {
        policyId: 'pol-01',
        policyName: 'Maximum Autonomous Single Refund',
        passed: false,
        expected: '≤ ₹1,000',
        actual: '₹1,800 requested',
        reason: 'Single-refund ceiling exceeded.',
        decision: 'REQUIRES_APPROVAL'
      }
    ]
  }
];

export const INITIAL_APPROVALS: ApprovalRequest[] = [
  {
    id: 'appr-001',
    actionId: 'act-1023',
    agentId: 'refund-agent-01',
    agentName: 'Refund Assistant',
    actionType: 'REFUND',
    resource: 'ORD-1023',
    amount: 1800,
    policyViolated: 'THRESH_SINGLE_REFUND',
    riskExplanation: 'High capital outlay requested autonomously. Exceeds standard ₹1,000 allowance by ₹800.',
    requestedAt: minutesAgo(18),
    status: 'PENDING',
    expiresAt: new Date(now.getTime() + 24 * 3600000).toISOString()
  }
];

export const INITIAL_INCIDENTS: IncidentRecord[] = [
  {
    id: 'inc-001',
    actionId: 'act-1021',
    agentId: 'refund-agent-01',
    agentName: 'Refund Assistant',
    severity: 'CRITICAL',
    category: 'SECURITY_BREACH',
    policyViolated: 'SEC_TOOL_AUTH',
    explanation: 'Agent attempted unapproved execution of dangerous service \'prod_database_drop\'. Blocked immediately.',
    createdAt: minutesAgo(54),
    status: 'OPEN'
  },
  {
    id: 'inc-002',
    actionId: 'act-1022',
    agentId: 'support-agent-02',
    agentName: 'Customer Triage Agent',
    severity: 'HIGH',
    category: 'EMAIL',
    policyViolated: 'RATE_EMAIL_MAX',
    explanation: 'Outbound bulk email rate limit exceeded (35 vs 10 max). Traffic dropped by firewall.',
    createdAt: minutesAgo(38),
    status: 'INVESTIGATING',
    assignedTo: 'SecOps Tier-2'
  }
];

export const INITIAL_AUDIT_LOGS: AuditRecord[] = INITIAL_ACTIONS.map((a) => ({
  id: `audit-${a.id}`,
  actionId: a.id,
  agentId: a.agentId,
  agentName: a.agentName,
  requestedAction: `${a.actionType} on ${a.resource}${a.amount ? ` (₹${a.amount})` : ''}`,
  policyVersion: a.policyVersion,
  decision: a.decision,
  decisionReason: a.reason,
  executionStatus: a.executionStatus,
  approvalStatus: a.approvalStatus,
  reviewer: a.reviewerId,
  timestamp: a.timestamp,
  hash: `sha256-${Math.random().toString(36).substring(2, 10)}${a.id}`
}));

// Storage Helpers
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
}

export function clearStorage(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(STORAGE_KEY_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn('Storage clear failed:', e);
  }
}
