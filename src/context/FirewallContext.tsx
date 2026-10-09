import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Agent,
  SecurityPolicy,
  ActionRecord,
  ApprovalRequest,
  IncidentRecord,
  AuditRecord,
  IntegrationConfig,
  ExecutionStatus,
  ApprovalStatus,
  IncidentSeverity,
  DecisionType,
  PolicyEvaluationResult
} from '../types/firewall';
import {
  INITIAL_AGENTS,
  INITIAL_POLICIES,
  INITIAL_ACTIONS,
  INITIAL_APPROVALS,
  INITIAL_INCIDENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_INTEGRATIONS,
  loadFromStorage,
  saveToStorage,
  clearStorage
} from '../services/storage';
import {
  evaluateAction,
  ProposedActionInput,
  calculateTodaySuccessfulRefunds
} from '../services/policyEngine';

export type ViewType =
  | 'overview'
  | 'playground'
  | 'monitoring'
  | 'policies'
  | 'approvals'
  | 'incidents'
  | 'audit'
  | 'integrations'
  | 'settings';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
}

export interface SecurityNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  read: boolean;
  actionId?: string;
}

interface FirewallContextType {
  // Navigation
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  // Core Data
  agents: Agent[];
  policies: SecurityPolicy[];
  actions: ActionRecord[];
  approvals: ApprovalRequest[];
  incidents: IncidentRecord[];
  auditLogs: AuditRecord[];
  integrations: IntegrationConfig;

  // Backend & n8n status
  backendOnline: boolean;
  n8nStatus: 'Connected' | 'n8n not connected';
  n8nWebhookUrl: string;
  setBackendN8nUrl: (url: string) => Promise<void>;

  // Actions & Execution
  runSecurityCheck: (input: ProposedActionInput) => Promise<ActionRecord>;
  approveRequest: (approvalId: string, reviewerId?: string, notes?: string) => Promise<boolean>;
  rejectRequest: (approvalId: string, reviewerId?: string, notes?: string) => Promise<boolean>;

  // Policies & Incidents
  updatePolicy: (id: string, updates: Partial<SecurityPolicy>) => void;
  resetPoliciesToDefault: () => void;
  acknowledgeIncident: (incidentId: string) => void;
  resolveIncident: (incidentId: string, notes?: string) => void;

  // Integrations & Diagnostics
  updateIntegrations: (updates: Partial<IntegrationConfig>) => void;
  testN8nWebhook: (customUrl?: string) => Promise<{ success: boolean; message: string }>;

  // Demo Controls & Utilities
  simulateRandomAgentEvent: () => ActionRecord;
  resetDemoData: () => void;
  inspectedAction: ActionRecord | null;
  setInspectedAction: (action: ActionRecord | null) => void;

  // Alerts & Notifications
  toasts: ToastItem[];
  dismissToast: (id: string) => void;
  notifications: SecurityNotification[];
  unreadNotificationCount: number;
  markNotificationsAsRead: () => void;

  // Computed metrics
  todaySuccessfulRefunds: number;
}

const FirewallContext = createContext<FirewallContextType | undefined>(undefined);

export const FirewallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewType>('overview');
  const [agents, setAgents] = useState<Agent[]>(() => loadFromStorage('agents', INITIAL_AGENTS));
  const [policies, setPolicies] = useState<SecurityPolicy[]>(() => loadFromStorage('policies', INITIAL_POLICIES));
  const [actions, setActions] = useState<ActionRecord[]>(() => loadFromStorage('actions', INITIAL_ACTIONS));
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(() => loadFromStorage('approvals', INITIAL_APPROVALS));
  const [incidents, setIncidents] = useState<IncidentRecord[]>(() => loadFromStorage('incidents', INITIAL_INCIDENTS));
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>(() => loadFromStorage('auditLogs', INITIAL_AUDIT_LOGS));
  const [integrations, setIntegrations] = useState<IntegrationConfig>(() => loadFromStorage('integrations', INITIAL_INTEGRATIONS));

  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [n8nStatus, setN8nStatus] = useState<'Connected' | 'n8n not connected'>('n8n not connected');
  const [n8nWebhookUrl, setN8nWebhookUrlState] = useState<string>(integrations.n8n.webhookUrl || '');

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [inspectedAction, setInspectedAction] = useState<ActionRecord | null>(null);
  const [notifications, setNotifications] = useState<SecurityNotification[]>([
    {
      id: 'notif-1',
      title: 'Approval Required',
      message: 'Refund Assistant requested ₹1,800 refund for ORD-1023.',
      timestamp: '18 minutes ago',
      type: 'warning',
      read: false,
      actionId: 'act-1023'
    },
    {
      id: 'notif-2',
      title: 'Tool Access Blocked',
      message: 'Unwhitelisted service prod_database_drop intercepted.',
      timestamp: '54 minutes ago',
      type: 'danger',
      read: false,
      actionId: 'act-1021'
    }
  ]);

  // Sync to local storage
  useEffect(() => saveToStorage('agents', agents), [agents]);
  useEffect(() => saveToStorage('policies', policies), [policies]);
  useEffect(() => saveToStorage('actions', actions), [actions]);
  useEffect(() => saveToStorage('approvals', approvals), [approvals]);
  useEffect(() => saveToStorage('incidents', incidents), [incidents]);
  useEffect(() => saveToStorage('auditLogs', auditLogs), [auditLogs]);
  useEffect(() => saveToStorage('integrations', integrations), [integrations]);

  // Initial probe to backend
  useEffect(() => {
    async function checkBackend() {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          setBackendOnline(true);
          if (data.n8nWebhookUrl) {
            setN8nWebhookUrlState(data.n8nWebhookUrl);
          }
          if (data.lastStatus === 'CONNECTED') {
            setN8nStatus('Connected');
          } else {
            setN8nStatus('n8n not connected');
          }
        }
      } catch {
        setBackendOnline(false);
        setN8nStatus('n8n not connected');
      }
    }
    checkBackend();
  }, []);

  const setBackendN8nUrl = useCallback(async (url: string) => {
    setN8nWebhookUrlState(url);
    setIntegrations((prev) => ({
      ...prev,
      n8n: { ...prev.n8n, webhookUrl: url }
    }));
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ n8nWebhookUrl: url })
      });
    } catch {
      // ignore
    }
  }, []);

  const addToast = useCallback((type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, type, message, timestamp: Date.now() }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  const todaySuccessfulRefunds = calculateTodaySuccessfulRefunds(actions);

  // Core Evaluation & Execution Pipeline
  const runSecurityCheck = useCallback(
    async (input: ProposedActionInput): Promise<ActionRecord> => {
      const targetAgent = agents.find((a) => a.id === input.agentId);
      const timestamp = new Date().toISOString();
      const correlationId = `corr-${Math.random().toString(36).substr(2, 8)}`;
      const todayRefundTotal = calculateTodaySuccessfulRefunds(actions, input.agentId);

      // Send proposed action to the backend API endpoint
      let backendData: any = null;
      try {
        const response = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...input,
            agent: targetAgent,
            todaySuccessfulRefunds: todayRefundTotal
          })
        });
        if (response.ok) {
          backendData = await response.json();
        }
      } catch (err) {
        console.warn('Backend /api/evaluate request failed:', err);
      }

      let actionId = backendData?.actionId || `act-${Date.now().toString().slice(-6)}`;
      let decision: DecisionType;
      let reason: string;
      let steps: PolicyEvaluationResult[];
      let isN8nConnected: boolean;
      let n8nStatusLabel: string;
      let source: 'n8n_webhook' | 'backend_deterministic_fallback' | 'local_demo';
      const rawN8nResponse = backendData?.rawN8nResponse || null;

      if (backendData && backendData.success) {
        decision = backendData.decision;
        reason = backendData.reason;
        steps = backendData.evaluationSteps || [];
        isN8nConnected = Boolean(backendData.n8nConnected);
        n8nStatusLabel = isN8nConnected ? 'Connected' : 'n8n not connected';
        source = backendData.source;
        setBackendOnline(true);
        setN8nStatus(isN8nConnected ? 'Connected' : 'n8n not connected');
      } else {
        // Fallback when backend is unreachable
        const localEval = evaluateAction(input, targetAgent, policies, actions);
        decision = localEval.decision;
        reason = localEval.primaryReason;
        steps = localEval.evaluationSteps;
        isN8nConnected = false;
        n8nStatusLabel = 'n8n not connected';
        source = 'local_demo';
        setBackendOnline(false);
        setN8nStatus('n8n not connected');
      }

      let executionStatus: ExecutionStatus = 'PENDING';
      let approvalStatus: ApprovalStatus = 'NOT_REQUIRED';

      if (decision === 'ALLOW') {
        executionStatus = 'EXECUTED';
        approvalStatus = 'NOT_REQUIRED';
      } else if (decision === 'BLOCK') {
        executionStatus = 'BLOCKED';
        approvalStatus = 'NOT_REQUIRED';
      } else if (decision === 'REQUIRES_APPROVAL') {
        executionStatus = 'PENDING'; // HALTED! Must not execute.
        approvalStatus = 'PENDING';
      }

      const newAction: ActionRecord = {
        id: actionId,
        agentId: input.agentId,
        agentName: targetAgent ? targetAgent.name : 'Unknown Agent',
        actionType: input.actionType,
        resource: input.resource,
        amount: input.amount,
        requestCount: input.requestCount,
        apiRate: input.apiRate,
        targetService: input.targetService,
        description: input.description || `${input.actionType} requested on ${input.resource}`,
        timestamp,
        decision,
        reason,
        executionStatus,
        approvalStatus,
        policyVersion: 'v1.4.2',
        correlationId,
        evaluationSteps: steps,
        n8nConnected: isN8nConnected,
        n8nStatus: n8nStatusLabel,
        source,
        rawN8nResponse
      };

      // State updates
      setActions((prev) => [newAction, ...prev]);

      // Create Audit Record
      const auditEntry: AuditRecord = {
        id: `audit-${actionId}`,
        actionId,
        agentId: newAction.agentId,
        agentName: newAction.agentName,
        requestedAction: `${newAction.actionType} on ${newAction.resource}${newAction.amount ? ` (₹${newAction.amount.toLocaleString('en-IN')})` : ''}`,
        policyVersion: 'v1.4.2',
        decision: newAction.decision,
        decisionReason: newAction.reason,
        executionStatus,
        approvalStatus,
        timestamp,
        hash: `sha256-${Math.random().toString(36).substring(2, 10)}${actionId}`
      };
      setAuditLogs((prev) => [auditEntry, ...prev]);

      // Handle Violations: Incident Creation
      if (decision === 'BLOCK') {
        const severity: IncidentSeverity =
          input.actionType === 'TOOL_ACCESS'
            ? 'CRITICAL'
            : (input.amount && input.amount > 5000)
            ? 'HIGH'
            : 'MEDIUM';

        const newIncident: IncidentRecord = {
          id: `inc-${Date.now().toString().slice(-4)}`,
          actionId,
          agentId: newAction.agentId,
          agentName: newAction.agentName,
          severity,
          category: input.actionType === 'TOOL_ACCESS' ? 'SECURITY_BREACH' : input.actionType,
          policyViolated: isN8nConnected ? 'N8N_SECURITY_RULE' : 'SEC_BOUNDARY',
          explanation: reason,
          createdAt: timestamp,
          status: 'OPEN'
        };
        setIncidents((prev) => [newIncident, ...prev]);

        setNotifications((prev) => [
          {
            id: `notif-${Date.now()}`,
            title: `Action Blocked (${newAction.actionType})`,
            message: `${newAction.agentName}: ${reason.slice(0, 70)}...`,
            timestamp: 'Just now',
            type: 'danger',
            read: false,
            actionId
          },
          ...prev
        ]);

        const toastPrefix = isN8nConnected ? '[n8n Connected]' : '[n8n not connected]';
        addToast('error', `${toastPrefix} Firewall BLOCKED action from ${newAction.agentName}`);
      }

      // Handle Approval Requirement
      if (decision === 'REQUIRES_APPROVAL') {
        const newApproval: ApprovalRequest = {
          id: `appr-${Date.now().toString().slice(-4)}`,
          actionId,
          agentId: newAction.agentId,
          agentName: newAction.agentName,
          actionType: input.actionType,
          resource: input.resource,
          amount: input.amount,
          policyViolated: isN8nConnected ? 'N8N_APPROVAL_RULE' : 'THRESH_SINGLE_REFUND',
          riskExplanation: reason,
          requestedAt: timestamp,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 24 * 3600000).toISOString()
        };
        setApprovals((prev) => [newApproval, ...prev]);

        setNotifications((prev) => [
          {
            id: `notif-${Date.now()}`,
            title: `Approval Required`,
            message: `${newAction.agentName} requested ₹${(input.amount || 0).toLocaleString('en-IN')} for ${input.resource}.`,
            timestamp: 'Just now',
            type: 'warning',
            read: false,
            actionId
          },
          ...prev
        ]);

        const toastPrefix = isN8nConnected ? '[n8n Connected]' : '[n8n not connected]';
        addToast('warning', `${toastPrefix} Action requires Human Approval before execution.`);
      }

      if (decision === 'ALLOW') {
        const toastPrefix = isN8nConnected ? '[n8n Connected]' : '[n8n not connected]';
        addToast('success', `${toastPrefix} Action ALLOWED and executed securely.`);
      }

      return newAction;
    },
    [agents, policies, actions, addToast]
  );

  // Human Approval Execution
  const approveRequest = useCallback(
    async (approvalId: string, reviewerId = 'sec-analyst-alex', notes = 'Approved after verification.'): Promise<boolean> => {
      const approval = approvals.find((a) => a.id === approvalId);
      if (!approval || approval.status !== 'PENDING') {
        addToast('error', 'Cannot approve: request not found or already processed.');
        return false;
      }

      const action = actions.find((a) => a.id === approval.actionId);
      if (!action) {
        addToast('error', 'Cannot approve: linked action record missing.');
        return false;
      }

      if (action.executionStatus === 'EXECUTED') {
        addToast('error', 'Idempotency guard: Action has already been executed.');
        return false;
      }

      const timestamp = new Date().toISOString();

      // Update approval record
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === approvalId
            ? {
                ...a,
                status: 'APPROVED',
                reviewerId,
                decidedAt: timestamp,
                decisionReason: notes
              }
            : a
        )
      );

      // Transition action to EXECUTED now that human authorized it!
      setActions((prev) =>
        prev.map((a) =>
          a.id === action.id
            ? {
                ...a,
                executionStatus: 'EXECUTED',
                approvalStatus: 'APPROVED',
                reviewerId,
                reviewedAt: timestamp,
                reviewNotes: notes
              }
            : a
        )
      );

      // Audit trail update
      const newAudit: AuditRecord = {
        id: `audit-${Date.now()}`,
        actionId: action.id,
        agentId: action.agentId,
        agentName: action.agentName,
        requestedAction: `HUMAN_APPROVAL: ${action.actionType} on ${action.resource} authorized`,
        policyVersion: action.policyVersion,
        decision: 'ALLOW',
        decisionReason: `Manually authorized by ${reviewerId}: ${notes}`,
        executionStatus: 'EXECUTED',
        approvalStatus: 'APPROVED',
        reviewer: reviewerId,
        timestamp,
        hash: `sha256-appr-${Math.random().toString(36).substring(2, 10)}`
      };
      setAuditLogs((prev) => [newAudit, ...prev]);

      addToast('success', `Approval granted. Action executed for ${action.resource}.`);
      return true;
    },
    [approvals, actions, addToast]
  );

  // Human Reject
  const rejectRequest = useCallback(
    async (approvalId: string, reviewerId = 'sec-analyst-alex', notes = 'Rejected by reviewer.'): Promise<boolean> => {
      const approval = approvals.find((a) => a.id === approvalId);
      if (!approval || approval.status !== 'PENDING') {
        addToast('error', 'Cannot reject: request not found or already processed.');
        return false;
      }

      const action = actions.find((a) => a.id === approval.actionId);
      if (!action) return false;

      const timestamp = new Date().toISOString();

      // Update approval
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === approvalId
            ? {
                ...a,
                status: 'REJECTED',
                reviewerId,
                decidedAt: timestamp,
                decisionReason: notes
              }
            : a
        )
      );

      // Ensure action is REJECTED and execution is NEVER run!
      setActions((prev) =>
        prev.map((a) =>
          a.id === action.id
            ? {
                ...a,
                executionStatus: 'REJECTED',
                approvalStatus: 'REJECTED',
                reviewerId,
                reviewedAt: timestamp,
                reviewNotes: notes
              }
            : a
        )
      );

      // Audit trail update
      const newAudit: AuditRecord = {
        id: `audit-${Date.now()}`,
        actionId: action.id,
        agentId: action.agentId,
        agentName: action.agentName,
        requestedAction: `HUMAN_REJECTION: ${action.actionType} on ${action.resource} denied`,
        policyVersion: action.policyVersion,
        decision: 'BLOCK',
        decisionReason: `Rejected by ${reviewerId}: ${notes}`,
        executionStatus: 'REJECTED',
        approvalStatus: 'REJECTED',
        reviewer: reviewerId,
        timestamp,
        hash: `sha256-rej-${Math.random().toString(36).substring(2, 10)}`
      };
      setAuditLogs((prev) => [newAudit, ...prev]);

      addToast('info', `Action rejected. Execution canceled.`);
      return true;
    },
    [approvals, actions, addToast]
  );

  // Policy Management
  const updatePolicy = useCallback(
    (id: string, updates: Partial<SecurityPolicy>) => {
      setPolicies((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            return { ...p, ...updates };
          }
          return p;
        })
      );
      addToast('success', 'Security policy updated successfully.');
    },
    [addToast]
  );

  const resetPoliciesToDefault = useCallback(() => {
    setPolicies(INITIAL_POLICIES);
    addToast('info', 'Policies reset to default baseline configuration.');
  }, [addToast]);

  // Incident Workflows
  const acknowledgeIncident = useCallback(
    (incidentId: string) => {
      setIncidents((prev) =>
        prev.map((inc) =>
          inc.id === incidentId
            ? { ...inc, status: 'INVESTIGATING', assignedTo: 'Current Reviewer' }
            : inc
        )
      );
      addToast('info', 'Incident marked under investigation.');
    },
    [addToast]
  );

  const resolveIncident = useCallback(
    (incidentId: string, notes = 'Verified by security analyst. Remediated.') => {
      setIncidents((prev) =>
        prev.map((inc) =>
          inc.id === incidentId
            ? {
                ...inc,
                status: 'RESOLVED',
                resolvedAt: new Date().toISOString(),
                resolutionNotes: notes
              }
            : inc
        )
      );
      addToast('success', 'Security incident resolved.');
    },
    [addToast]
  );

  // Integrations
  const updateIntegrations = useCallback((updates: Partial<IntegrationConfig>) => {
    setIntegrations((prev) => ({ ...prev, ...updates }));
  }, []);

  const testN8nWebhook = useCallback(
    async (customUrl?: string): Promise<{ success: boolean; message: string }> => {
      const url = customUrl !== undefined ? customUrl : n8nWebhookUrl;
      if (!url || !url.trim()) {
        setN8nStatus('n8n not connected');
        return { success: false, message: 'n8n not connected: No webhook URL configured.' };
      }

      try {
        const response = await fetch('/api/test-n8n', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ webhookUrl: url.trim() })
        });
        const data = await response.json();

        if (data.connected) {
          setN8nStatus('Connected');
          setIntegrations((prev) => ({
            ...prev,
            n8n: {
              ...prev.n8n,
              webhookUrl: url.trim(),
              lastTested: new Date().toISOString(),
              lastStatus: 'SUCCESS'
            }
          }));
          return {
            success: true,
            message: data.message || 'Connected to n8n webhook successfully.'
          };
        } else {
          setN8nStatus('n8n not connected');
          setIntegrations((prev) => ({
            ...prev,
            n8n: {
              ...prev.n8n,
              lastTested: new Date().toISOString(),
              lastStatus: 'FAILED'
            }
          }));
          return {
            success: false,
            message: data.message || 'n8n not connected'
          };
        }
      } catch (err: any) {
        setN8nStatus('n8n not connected');
        return {
          success: false,
          message: `n8n not connected: ${err?.message || 'Backend test request failed'}`
        };
      }
    },
    [n8nWebhookUrl]
  );

  // Simulate Random Agent Event
  const simulateRandomAgentEvent = useCallback((): ActionRecord => {
    const randomChoices = [
      {
        agentId: 'refund-agent-01',
        actionType: 'REFUND' as const,
        resource: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        amount: Math.floor(100 + Math.random() * 700),
        description: 'Automated order dispute rebate'
      },
      {
        agentId: 'support-agent-02',
        actionType: 'EMAIL' as const,
        resource: 'customer_resolution_hub',
        requestCount: Math.floor(2 + Math.random() * 6),
        description: 'Customer notification batch dispatch'
      },
      {
        agentId: 'data-sync-03',
        actionType: 'API_CALL' as const,
        resource: 'warehouse_catalog',
        apiRate: Math.floor(5 + Math.random() * 12),
        description: 'Routine inventory sync pulse'
      }
    ];

    const pick = randomChoices[Math.floor(Math.random() * randomChoices.length)];
    // Evaluate synchronously
    const targetAgent = agents.find((a) => a.id === pick.agentId);
    const actionId = `act-${Date.now().toString().slice(-6)}`;
    const timestamp = new Date().toISOString();
    const evalResult = evaluateAction(pick, targetAgent, policies, actions);

    const newAction: ActionRecord = {
      id: actionId,
      agentId: pick.agentId,
      agentName: targetAgent?.name || 'Agent',
      actionType: pick.actionType,
      resource: pick.resource,
      amount: pick.amount,
      requestCount: pick.requestCount,
      apiRate: pick.apiRate,
      description: pick.description,
      timestamp,
      decision: evalResult.decision,
      reason: evalResult.primaryReason,
      executionStatus: evalResult.decision === 'ALLOW' ? 'EXECUTED' : 'BLOCKED',
      approvalStatus: 'NOT_REQUIRED',
      policyVersion: 'v1.4.2',
      correlationId: `sim-${Date.now().toString().slice(-5)}`,
      evaluationSteps: evalResult.evaluationSteps
    };

    setActions((prev) => [newAction, ...prev]);
    return newAction;
  }, [agents, policies, actions]);

  // Reset Demo Data
  const resetDemoData = useCallback(() => {
    clearStorage();
    setAgents(INITIAL_AGENTS);
    setPolicies(INITIAL_POLICIES);
    setActions(INITIAL_ACTIONS);
    setApprovals(INITIAL_APPROVALS);
    setIncidents(INITIAL_INCIDENTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setIntegrations(INITIAL_INTEGRATIONS);
    setToasts([]);
    setNotifications([
      {
        id: 'notif-1',
        title: 'Approval Required',
        message: 'Refund Assistant requested ₹1,800 refund for ORD-1023.',
        timestamp: '18 minutes ago',
        type: 'warning',
        read: false,
        actionId: 'act-1023'
      }
    ]);
    addToast('info', 'Demo environment reset to baseline initial state.');
  }, [addToast]);

  return (
    <FirewallContext.Provider
      value={{
        currentView,
        setCurrentView,
        agents,
        policies,
        actions,
        approvals,
        incidents,
        auditLogs,
        integrations,
        backendOnline,
        n8nStatus,
        n8nWebhookUrl,
        setBackendN8nUrl,
        runSecurityCheck,
        approveRequest,
        rejectRequest,
        updatePolicy,
        resetPoliciesToDefault,
        acknowledgeIncident,
        resolveIncident,
        updateIntegrations,
        testN8nWebhook,
        simulateRandomAgentEvent,
        resetDemoData,
        inspectedAction,
        setInspectedAction,
        toasts,
        dismissToast,
        notifications,
        unreadNotificationCount,
        markNotificationsAsRead,
        todaySuccessfulRefunds
      }}
    >
      {children}
    </FirewallContext.Provider>
  );
};

export const useFirewall = () => {
  const context = useContext(FirewallContext);
  if (!context) {
    throw new Error('useFirewall must be used within a FirewallProvider');
  }
  return context;
};
