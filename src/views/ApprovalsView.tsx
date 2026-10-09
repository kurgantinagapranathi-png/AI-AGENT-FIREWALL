import React, { useState } from 'react';
import { useFirewall } from '../context/FirewallContext';
import { ApprovalRequest } from '../types/firewall';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Shield,
  Eye,
  Calendar,
  FileText
} from 'lucide-react';

export const ApprovalsView: React.FC = () => {
  const {
    approvals,
    actions,
    approveRequest,
    rejectRequest,
    setInspectedAction
  } = useFirewall();

  const [activeTab, setActiveTab] = useState<'PENDING' | 'DECIDED'>('PENDING');
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'APPROVE' | 'REJECT';
    approval: ApprovalRequest;
  } | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');
  const decidedApprovals = approvals.filter((a) => a.status !== 'PENDING');

  const displayedList = activeTab === 'PENDING' ? pendingApprovals : decidedApprovals;

  const handleOpenConfirm = (approval: ApprovalRequest, type: 'APPROVE' | 'REJECT') => {
    setReviewerNotes(
      type === 'APPROVE'
        ? 'Verified with customer ticket #8841. Legitimate high-value replacement.'
        : 'Disallowed due to lack of verified return tracking proof.'
    );
    setConfirmDialog({ type, approval });
  };

  const handleExecuteDecision = async () => {
    if (!confirmDialog) return;
    setIsProcessing(true);

    try {
      if (confirmDialog.type === 'APPROVE') {
        await approveRequest(
          confirmDialog.approval.id,
          'Alex Mercer (SecOps Lead)',
          reviewerNotes
        );
      } else {
        await rejectRequest(
          confirmDialog.approval.id,
          'Alex Mercer (SecOps Lead)',
          reviewerNotes
        );
      }
      setConfirmDialog(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
              Human-in-the-Loop Gateway
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">Zero Autonomous Bypass</span>
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Pending Human Authorization Queue
          </h2>
          <p className="text-xs text-slate-500">
            High-risk or over-limit autonomous actions are halted by the firewall until explicitly authorized by a certified reviewer.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'PENDING'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Pending Authorization</span>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
              {pendingApprovals.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('DECIDED')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'DECIDED'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Resolved History ({decidedApprovals.length})
          </button>
        </div>
      </div>

      {/* Approvals List */}
      <div className="space-y-4">
        {displayedList.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">
              {activeTab === 'PENDING'
                ? 'Approval Queue Clean'
                : 'No Historical Decisions Yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {activeTab === 'PENDING'
                ? 'No actions currently waiting for human intervention. Test Scenario B in the Playground to trigger a high-risk request.'
                : 'Resolved approval decisions will appear here.'}
            </p>
          </div>
        ) : (
          displayedList.map((approval) => {
            const linkedAction = actions.find((a) => a.id === approval.actionId);

            return (
              <div
                key={approval.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {approval.id}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-bold text-slate-900">
                      {approval.agentName}
                    </span>
                    <span className="text-xs text-slate-500">
                      requested execution on {approval.resource}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {approval.status === 'PENDING' ? (
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Awaiting Human Decision
                      </span>
                    ) : approval.status === 'APPROVED' ? (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approved & Executed
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded border border-slate-300 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" />
                        Rejected (Halted)
                      </span>
                    )}
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70">
                    <span className="text-slate-400 font-medium block mb-1">
                      Proposed Transaction
                    </span>
                    <div className="font-bold text-slate-900 text-sm">
                      {approval.actionType}: {approval.resource}
                    </div>
                    {approval.amount && (
                      <div className="text-sm font-bold text-blue-700 mt-0.5">
                        ₹{approval.amount.toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70">
                    <span className="text-slate-400 font-medium block mb-1">
                      Triggered Security Policy
                    </span>
                    <div className="font-mono font-bold text-slate-800">
                      {approval.policyViolated}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      Exceeds auto-execution threshold limit.
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70">
                    <span className="text-slate-400 font-medium block mb-1">
                      Risk Assessment
                    </span>
                    <div className="text-slate-800 text-[11px] font-medium leading-relaxed">
                      {approval.riskExplanation}
                    </div>
                  </div>
                </div>

                {/* Decision Info or Action Controls */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    Requested on: {new Date(approval.requestedAt).toLocaleString()}
                    {linkedAction && (
                      <button
                        onClick={() => setInspectedAction(linkedAction)}
                        className="ml-3 text-blue-600 hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect Action Trace
                      </button>
                    )}
                  </div>

                  {approval.status === 'PENDING' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenConfirm(approval, 'REJECT')}
                        className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                      >
                        Reject Action
                      </button>
                      <button
                        onClick={() => handleOpenConfirm(approval, 'APPROVE')}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Authorize & Execute
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600">
                      Decided by <strong className="text-slate-800">{approval.reviewerId}</strong> on{' '}
                      {approval.decidedAt ? new Date(approval.decidedAt).toLocaleString() : 'N/A'}:{' '}
                      <em className="text-slate-700">"{approval.decisionReason}"</em>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Dialog Modal */}
      {confirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  confirmDialog.type === 'APPROVE'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {confirmDialog.type === 'APPROVE' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {confirmDialog.type === 'APPROVE'
                    ? 'Confirm Action Authorization'
                    : 'Confirm Action Rejection'}
                </h3>
                <p className="text-xs text-slate-500">
                  Audit binding: reviewer identity will be logged.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
              <div>
                <strong>Agent:</strong> {confirmDialog.approval.agentName}
              </div>
              <div>
                <strong>Action:</strong> {confirmDialog.approval.actionType} on {confirmDialog.approval.resource}
              </div>
              {confirmDialog.approval.amount && (
                <div>
                  <strong>Amount:</strong> ₹{confirmDialog.approval.amount.toLocaleString('en-IN')}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Audit Review Notes & Justification:
              </label>
              <textarea
                rows={3}
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={isProcessing}
                onClick={() => setConfirmDialog(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={isProcessing}
                onClick={handleExecuteDecision}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors ${
                  confirmDialog.type === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isProcessing
                  ? 'Recording Decision...'
                  : confirmDialog.type === 'APPROVE'
                  ? 'Confirm & Execute'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
