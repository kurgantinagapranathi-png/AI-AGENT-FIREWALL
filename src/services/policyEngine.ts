import {
  Agent,
  SecurityPolicy,
  ActionCategory,
  DecisionType,
  PolicyEvaluationResult,
  ActionRecord
} from '../types/firewall';

export interface ProposedActionInput {
  agentId: string;
  actionType: ActionCategory;
  resource: string;
  amount?: number;
  requestCount?: number;
  apiRate?: number;
  targetService?: string;
  description?: string;
}

export interface PolicyEngineEvaluation {
  decision: DecisionType;
  primaryReason: string;
  violatingPolicyCode?: string;
  violatingPolicyName?: string;
  evaluationSteps: PolicyEvaluationResult[];
  dailyRefundsBefore: number;
  dailyRefundsAfter: number;
}

/**
 * Calculates total successfully executed refunds for the agent within today.
 * Crucial rule: Pending, rejected, or blocked requests MUST NEVER be counted.
 */
export function calculateTodaySuccessfulRefunds(
  pastActions: ActionRecord[],
  agentId?: string
): number {
  const today = new Date().toISOString().slice(0, 10);
  return pastActions
    .filter((a) => {
      const isToday = a.timestamp.slice(0, 10) === today;
      const isRefund = a.actionType === 'REFUND';
      const isExecuted = a.executionStatus === 'EXECUTED';
      const isMatchingAgent = !agentId || a.agentId === agentId;
      return isToday && isRefund && isExecuted && (a.amount ?? 0) > 0;
    })
    .reduce((sum, a) => sum + (a.amount || 0), 0);
}

export function evaluateAction(
  input: ProposedActionInput,
  agent: Agent | undefined,
  policies: SecurityPolicy[],
  pastActions: ActionRecord[]
): PolicyEngineEvaluation {
  const steps: PolicyEvaluationResult[] = [];
  const todayRefundTotal = calculateTodaySuccessfulRefunds(pastActions, input.agentId);

  // Precedence 1: Agent Identity & Request Integrity Check
  if (!agent) {
    const reason = 'BLOCKED: Unknown or unauthenticated agent identity.';
    steps.push({
      policyId: 'AUTH_001',
      policyName: 'Agent Authentication & Registration',
      passed: false,
      expected: 'Registered and active agent',
      actual: 'Unknown agent ID',
      reason,
      decision: 'BLOCK'
    });
    return {
      decision: 'BLOCK',
      primaryReason: reason,
      violatingPolicyCode: 'AUTH_001',
      violatingPolicyName: 'Agent Authentication',
      evaluationSteps: steps,
      dailyRefundsBefore: todayRefundTotal,
      dailyRefundsAfter: todayRefundTotal
    };
  }

  if (agent.status !== 'ACTIVE') {
    const reason = `BLOCKED: Agent '${agent.name}' is currently in ${agent.status} state. Action rejected.`;
    steps.push({
      policyId: 'AUTH_002',
      policyName: 'Agent Active Lifecycle Check',
      passed: false,
      expected: 'Agent status === ACTIVE',
      actual: `Agent status is ${agent.status}`,
      reason,
      decision: 'BLOCK'
    });
    return {
      decision: 'BLOCK',
      primaryReason: reason,
      violatingPolicyCode: 'AUTH_002',
      violatingPolicyName: 'Agent Lifecycle',
      evaluationSteps: steps,
      dailyRefundsBefore: todayRefundTotal,
      dailyRefundsAfter: todayRefundTotal
    };
  }

  steps.push({
    policyId: 'AUTH_OK',
    policyName: 'Agent Identity & Verification',
    passed: true,
    expected: 'Verified active agent credentials',
    actual: `${agent.name} (${agent.id}) is ACTIVE`,
    reason: 'Agent identity authenticated successfully.',
    decision: 'ALLOW'
  });

  // Map policy lookup helper
  const getPolicy = (code: string) => policies.find((p) => p.code === code && p.enabled);

  // Precedence 2: Hard Security Boundaries (Tool Authorization, Hard Limits)
  // Check Tool Access Boundary
  if (input.actionType === 'TOOL_ACCESS' || input.targetService) {
    const target = input.targetService?.trim().toLowerCase() || '';
    const toolPolicy = getPolicy('SEC_TOOL_AUTH');
    const isAllowed = agent.allowedTools.some(
      (tool) => tool.toLowerCase() === target
    );

    if (toolPolicy) {
      if (!target || !isAllowed) {
        const reason = `BLOCKED: The target service '${input.targetService || 'unknown'}' is not included in this agent's authorized tool list (${agent.allowedTools.join(', ')}).`;
        steps.push({
          policyId: toolPolicy.id,
          policyName: toolPolicy.name,
          passed: false,
          expected: `One of: [${agent.allowedTools.join(', ')}]`,
          actual: input.targetService || 'empty',
          reason,
          decision: 'BLOCK'
        });

        return {
          decision: 'BLOCK',
          primaryReason: reason,
          violatingPolicyCode: toolPolicy.code,
          violatingPolicyName: toolPolicy.name,
          evaluationSteps: steps,
          dailyRefundsBefore: todayRefundTotal,
          dailyRefundsAfter: todayRefundTotal
        };
      } else {
        steps.push({
          policyId: toolPolicy.id,
          policyName: toolPolicy.name,
          passed: true,
          expected: `Authorized tool in whitelist`,
          actual: `Tool '${input.targetService}' is approved for agent`,
          reason: 'Tool boundary authorization passed.',
          decision: 'ALLOW'
        });
      }
    }
  }

  // Email Abuse Boundary
  if (input.actionType === 'EMAIL') {
    const emailPolicy = getPolicy('RATE_EMAIL_MAX');
    const requestedCount = input.requestCount ?? 1;
    const emailLimit = emailPolicy?.threshold ?? 10;

    if (emailPolicy && requestedCount > emailLimit) {
      const reason = `BLOCKED: Requested email batch of ${requestedCount} recipients exceeds the maximum allowed policy limit of ${emailLimit} per hour.`;
      steps.push({
        policyId: emailPolicy.id,
        policyName: emailPolicy.name,
        passed: false,
        expected: `≤ ${emailLimit} emails/hour`,
        actual: `${requestedCount} emails requested`,
        reason,
        decision: emailPolicy.decisionOnBreach
      });

      return {
        decision: emailPolicy.decisionOnBreach,
        primaryReason: reason,
        violatingPolicyCode: emailPolicy.code,
        violatingPolicyName: emailPolicy.name,
        evaluationSteps: steps,
        dailyRefundsBefore: todayRefundTotal,
        dailyRefundsAfter: todayRefundTotal
      };
    } else if (emailPolicy) {
      steps.push({
        policyId: emailPolicy.id,
        policyName: emailPolicy.name,
        passed: true,
        expected: `≤ ${emailLimit} emails/hour`,
        actual: `${requestedCount} emails requested`,
        reason: 'Email dispatch rate is within policy threshold.',
        decision: 'ALLOW'
      });
    }
  }

  // API Call Rate Limit Boundary
  if (input.actionType === 'API_CALL' || (input.apiRate && input.apiRate > 0)) {
    const ratePolicy = getPolicy('RATE_API_LIMIT');
    const apiRate = input.apiRate ?? 0;
    const rateLimit = ratePolicy?.threshold ?? 20;

    if (ratePolicy && apiRate > rateLimit) {
      const reason = `BLOCKED: Proposed API invocation rate of ${apiRate} req/min exceeds maximum permitted firewall limit of ${rateLimit} req/min.`;
      steps.push({
        policyId: ratePolicy.id,
        policyName: ratePolicy.name,
        passed: false,
        expected: `≤ ${rateLimit} req/min`,
        actual: `${apiRate} req/min requested`,
        reason,
        decision: ratePolicy.decisionOnBreach
      });

      return {
        decision: ratePolicy.decisionOnBreach,
        primaryReason: reason,
        violatingPolicyCode: ratePolicy.code,
        violatingPolicyName: ratePolicy.name,
        evaluationSteps: steps,
        dailyRefundsBefore: todayRefundTotal,
        dailyRefundsAfter: todayRefundTotal
      };
    } else if (ratePolicy) {
      steps.push({
        policyId: ratePolicy.id,
        policyName: ratePolicy.name,
        passed: true,
        expected: `≤ ${rateLimit} req/min`,
        actual: `${apiRate} req/min`,
        reason: 'API invocation rate is within safe operating parameters.',
        decision: 'ALLOW'
      });
    }
  }

  // Precedence 3: Daily Refund Budget Hard Check
  if (input.actionType === 'REFUND') {
    const proposedAmount = input.amount ?? 0;
    const dailyBudgetPolicy = getPolicy('BUDGET_DAILY_REFUND');
    const dailyLimit = dailyBudgetPolicy?.threshold ?? 5000;
    const projectedDaily = todayRefundTotal + proposedAmount;

    if (dailyBudgetPolicy && projectedDaily > dailyLimit) {
      const reason = `BLOCKED: Action would cause cumulative daily successful refunds (₹${todayRefundTotal.toLocaleString('en-IN')} prior + ₹${proposedAmount.toLocaleString('en-IN')} proposed = ₹${projectedDaily.toLocaleString('en-IN')}) to exceed the hard daily budget limit of ₹${dailyLimit.toLocaleString('en-IN')}.`;
      steps.push({
        policyId: dailyBudgetPolicy.id,
        policyName: dailyBudgetPolicy.name,
        passed: false,
        expected: `Daily sum ≤ ₹${dailyLimit.toLocaleString('en-IN')}`,
        actual: `Projected daily sum = ₹${projectedDaily.toLocaleString('en-IN')}`,
        reason,
        decision: 'BLOCK'
      });

      return {
        decision: 'BLOCK',
        primaryReason: reason,
        violatingPolicyCode: dailyBudgetPolicy.code,
        violatingPolicyName: dailyBudgetPolicy.name,
        evaluationSteps: steps,
        dailyRefundsBefore: todayRefundTotal,
        dailyRefundsAfter: todayRefundTotal
      };
    } else if (dailyBudgetPolicy) {
      steps.push({
        policyId: dailyBudgetPolicy.id,
        policyName: dailyBudgetPolicy.name,
        passed: true,
        expected: `Daily sum ≤ ₹${dailyLimit.toLocaleString('en-IN')}`,
        actual: `Projected daily sum = ₹${projectedDaily.toLocaleString('en-IN')} (Prior: ₹${todayRefundTotal.toLocaleString('en-IN')})`,
        reason: 'Within daily cumulative refund budget.',
        decision: 'ALLOW'
      });
    }

    // Precedence 4: High-Value Single Refund Threshold Check (Requires Human Approval)
    const singleThresholdPolicy = getPolicy('THRESH_SINGLE_REFUND');
    const singleLimit = singleThresholdPolicy?.threshold ?? 1000;

    if (singleThresholdPolicy && proposedAmount > singleLimit) {
      const reason = `REQUIRES_APPROVAL: Requested refund of ₹${proposedAmount.toLocaleString('en-IN')} exceeds the ₹${singleLimit.toLocaleString('en-IN')} single-refund threshold. Requires human authorization before execution.`;
      steps.push({
        policyId: singleThresholdPolicy.id,
        policyName: singleThresholdPolicy.name,
        passed: false,
        expected: `Auto-allow threshold ≤ ₹${singleLimit.toLocaleString('en-IN')}`,
        actual: `Requested refund is ₹${proposedAmount.toLocaleString('en-IN')}`,
        reason,
        decision: 'REQUIRES_APPROVAL'
      });

      return {
        decision: 'REQUIRES_APPROVAL',
        primaryReason: reason,
        violatingPolicyCode: singleThresholdPolicy.code,
        violatingPolicyName: singleThresholdPolicy.name,
        evaluationSteps: steps,
        dailyRefundsBefore: todayRefundTotal,
        dailyRefundsAfter: todayRefundTotal // not executed yet!
      };
    } else if (singleThresholdPolicy) {
      steps.push({
        policyId: singleThresholdPolicy.id,
        policyName: singleThresholdPolicy.name,
        passed: true,
        expected: `Auto-allow threshold ≤ ₹${singleLimit.toLocaleString('en-IN')}`,
        actual: `Requested refund ₹${proposedAmount.toLocaleString('en-IN')}`,
        reason: 'Single refund amount is within autonomous operational allowance.',
        decision: 'ALLOW'
      });
    }
  }

  // Precedence 5: Full Compliance Approval
  const finalReason = 'ALLOWED: Action complies with all active security policies and tool boundary authorizations.';
  return {
    decision: 'ALLOW',
    primaryReason: finalReason,
    evaluationSteps: steps,
    dailyRefundsBefore: todayRefundTotal,
    dailyRefundsAfter: input.actionType === 'REFUND' ? todayRefundTotal + (input.amount || 0) : todayRefundTotal
  };
}
