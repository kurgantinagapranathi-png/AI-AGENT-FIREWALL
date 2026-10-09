export type DecisionType = 'ALLOW' | 'BLOCK' | 'REQUIRES_APPROVAL';

export type ExecutionStatus = 'PENDING' | 'EXECUTED' | 'BLOCKED' | 'REJECTED' | 'FAILED';

export type ApprovalStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED';

export type ActionCategory = 'REFUND' | 'EMAIL' | 'API_CALL' | 'TOOL_ACCESS' | 'DATABASE_QUERY';

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'ACTIVE' | 'PAUSED' | 'SUSPENDED';
  allowedTools: string[];
  department: string;
  avatarColor: string;
}

export interface SecurityPolicy {
  id: string;
  code: string;
  name: string;
  category: ActionCategory | 'GLOBAL';
  description: string;
  threshold?: number;
  unit?: string;
  enabled: boolean;
  severity: IncidentSeverity;
  hardRule: boolean; // hard rules cannot be bypassed even by human approval
  decisionOnBreach: DecisionType;
}

export interface PolicyEvaluationResult {
  policyId: string;
  policyName: string;
  passed: boolean;
  expected: string;
  actual: string;
  reason: string;
  decision: DecisionType;
}

export interface ActionRecord {
  id: string;
  agentId: string;
  agentName: string;
  actionType: ActionCategory;
  resource: string;
  amount?: number;
  requestCount?: number;
  apiRate?: number;
  targetService?: string;
  description: string;
  timestamp: string;
  decision: DecisionType;
  reason: string;
  executionStatus: ExecutionStatus;
  approvalStatus: ApprovalStatus;
  policyVersion: string;
  evaluationSteps: PolicyEvaluationResult[];
  reviewerId?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  ipAddress?: string;
  correlationId: string;
  n8nConnected?: boolean;
  n8nStatus?: string;
  source?: 'n8n_webhook' | 'backend_deterministic_fallback' | 'local_demo';
  rawN8nResponse?: any;
}

export interface ApprovalRequest {
  id: string;
  actionId: string;
  agentId: string;
  agentName: string;
  actionType: ActionCategory;
  resource: string;
  amount?: number;
  policyViolated: string;
  riskExplanation: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewerId?: string;
  decidedAt?: string;
  decisionReason?: string;
  expiresAt: string;
}

export interface IncidentRecord {
  id: string;
  actionId: string;
  agentId: string;
  agentName: string;
  severity: IncidentSeverity;
  category: ActionCategory | 'SECURITY_BREACH';
  policyViolated: string;
  explanation: string;
  createdAt: string;
  status: IncidentStatus;
  assignedTo?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface AuditRecord {
  id: string;
  actionId: string;
  agentId: string;
  agentName: string;
  requestedAction: string;
  policyVersion: string;
  decision: DecisionType;
  decisionReason: string;
  executionStatus: ExecutionStatus;
  approvalStatus: ApprovalStatus;
  reviewer?: string;
  timestamp: string;
  hash: string;
}

export interface IntegrationConfig {
  n8n: {
    enabled: boolean;
    webhookUrl: string;
    lastTested?: string;
    lastStatus?: 'SUCCESS' | 'FAILED';
  };
  supabase: {
    enabled: boolean;
    projectUrl: string;
    lastSynced?: string;
  };
  aiModel: {
    enabled: boolean;
    modelName: string;
    strictParsing: boolean;
  };
  emailAlerts: {
    enabled: boolean;
    recipient: string;
  };
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  scenarioLetter: string;
  agentId: string;
  actionType: ActionCategory;
  resource: string;
  amount?: number;
  requestCount?: number;
  apiRate?: number;
  targetService?: string;
  description: string;
  expectedDecision: DecisionType;
  summary: string;
  relevantPolicy: string;
}
