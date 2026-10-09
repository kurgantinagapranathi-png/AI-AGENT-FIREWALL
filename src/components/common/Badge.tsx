import React from 'react';
import { DecisionType, ExecutionStatus, ApprovalStatus, IncidentSeverity, IncidentStatus } from '../../types/firewall';
import { ShieldCheck, ShieldAlert, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface DecisionBadgeProps {
  decision: DecisionType;
  size?: 'sm' | 'md' | 'lg';
}

export const DecisionBadge: React.FC<DecisionBadgeProps> = ({ decision, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-[10px] font-mono font-bold px-2 py-0.5 gap-1 tracking-tight',
    md: 'text-xs font-mono font-bold px-2.5 py-0.5 gap-1.5 tracking-tight',
    lg: 'text-xs font-mono font-bold px-3 py-1 gap-1.5 tracking-tight'
  };

  switch (decision) {
    case 'ALLOW':
      return (
        <span
          className={`inline-flex items-center rounded border border-emerald-300 bg-emerald-50 text-emerald-900 shadow-2xs ${sizeClasses[size]}`}
        >
          <ShieldCheck className={size === 'sm' ? 'w-3 h-3 text-emerald-600' : 'w-3.5 h-3.5 text-emerald-600'} />
          <span>ALLOW</span>
        </span>
      );
    case 'BLOCK':
      return (
        <span
          className={`inline-flex items-center rounded border border-rose-300 bg-rose-50 text-rose-900 shadow-2xs ${sizeClasses[size]}`}
        >
          <ShieldAlert className={size === 'sm' ? 'w-3 h-3 text-rose-600' : 'w-3.5 h-3.5 text-rose-600'} />
          <span>BLOCK</span>
        </span>
      );
    case 'REQUIRES_APPROVAL':
      return (
        <span
          className={`inline-flex items-center rounded border border-amber-300 bg-amber-50 text-amber-950 shadow-2xs ${sizeClasses[size]}`}
        >
          <Clock className={size === 'sm' ? 'w-3 h-3 text-amber-600' : 'w-3.5 h-3.5 text-amber-600'} />
          <span>REQUIRES_APPROVAL</span>
        </span>
      );
    default:
      return null;
  }
};

interface ExecutionBadgeProps {
  status: ExecutionStatus;
}

export const ExecutionBadge: React.FC<ExecutionBadgeProps> = ({ status }) => {
  switch (status) {
    case 'EXECUTED':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Executed
        </span>
      );
    case 'BLOCKED':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
          <XCircle className="w-3 h-3 text-rose-600" />
          Blocked
        </span>
      );
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          Halted (Pending)
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
          <XCircle className="w-3 h-3 text-slate-500" />
          Rejected
        </span>
      );
    default:
      return <span className="text-[11px] text-slate-500">{status}</span>;
  }
};

interface SeverityBadgeProps {
  severity: IncidentSeverity;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  switch (severity) {
    case 'CRITICAL':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
          <AlertTriangle className="w-3 h-3" />
          CRITICAL
        </span>
      );
    case 'HIGH':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-300">
          HIGH
        </span>
      );
    case 'MEDIUM':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
          MEDIUM
        </span>
      );
    case 'LOW':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
          LOW
        </span>
      );
  }
};
