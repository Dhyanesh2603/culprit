import React from 'react';
import { cn } from '../../lib/utils';
import { IncidentSeverity, IncidentStatus, DeploymentStatus, UserRole } from '../../types';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'subtle';
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  deploymentStatus?: DeploymentStatus;
  role?: UserRole;
}

export function Badge({
  className,
  variant = 'default',
  severity,
  status,
  deploymentStatus,
  role,
  children,
  ...props
}: BadgeProps) {
  let colorStyles = 'bg-surface-elevated text-primary-muted border-border';

  if (severity) {
    switch (severity) {
      case 'CRITICAL':
        colorStyles = 'bg-red-950/30 text-red-400 border-red-800/40';
        break;
      case 'HIGH':
        colorStyles = 'bg-orange-950/30 text-orange-400 border-orange-800/40';
        break;
      case 'MEDIUM':
        colorStyles = 'bg-amber-950/30 text-amber-400 border-amber-800/40';
        break;
      case 'LOW':
        colorStyles = 'bg-zinc-900 text-zinc-400 border-zinc-800';
        break;
    }
  } else if (status) {
    switch (status) {
      case 'OPEN':
        colorStyles = 'bg-red-950/30 text-red-400 border-red-800/40';
        break;
      case 'INVESTIGATING':
        colorStyles = 'bg-amber-950/30 text-amber-300 border-amber-800/40';
        break;
      case 'MONITORING':
        colorStyles = 'bg-blue-950/30 text-blue-300 border-blue-800/40';
        break;
      case 'RESOLVED':
        colorStyles = 'bg-emerald-950/30 text-emerald-400 border-emerald-800/40';
        break;
      case 'CLOSED':
        colorStyles = 'bg-zinc-900 text-zinc-400 border-zinc-800';
        break;
    }
  } else if (deploymentStatus) {
    switch (deploymentStatus) {
      case 'SUCCESS':
        colorStyles = 'bg-emerald-950/30 text-emerald-400 border-emerald-800/40';
        break;
      case 'FAILED':
        colorStyles = 'bg-red-950/30 text-red-400 border-red-800/40';
        break;
      case 'ROLLED_BACK':
        colorStyles = 'bg-amber-950/30 text-amber-400 border-amber-800/40';
        break;
      case 'IN_PROGRESS':
        colorStyles = 'bg-blue-950/30 text-blue-300 border-blue-800/40';
        break;
      default:
        colorStyles = 'bg-zinc-900 text-zinc-400 border-zinc-800';
    }
  } else if (role) {
    switch (role) {
      case 'ADMIN':
        colorStyles = 'bg-amber-950/30 text-amber-400 border-amber-800/40';
        break;
      case 'DEVELOPER':
        colorStyles = 'bg-zinc-800 text-zinc-300 border-zinc-700';
        break;
      case 'VIEWER':
        colorStyles = 'bg-zinc-900 text-zinc-400 border-zinc-800';
        break;
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono tracking-tight font-medium border select-none',
        colorStyles,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
