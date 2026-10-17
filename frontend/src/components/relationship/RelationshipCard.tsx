'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Flame,
  GitCommit,
  Rocket,
  User,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatRelativeTime } from '../../lib/utils';
import { Deployment, Commit } from '../../types';

interface RelationshipCardProps {
  incidentId: string;
  confidenceScore?: number | null | undefined;
  correlationReason?: string | null;
  suggestedDeployment?: Deployment | null;
  suggestedCommit?: Commit | null;
  onReanalyze: (windowMinutes?: number) => Promise<void>;
  onAssignUser?: (userId: string) => Promise<void>;
  isReanalyzing?: boolean;
}

export function RelationshipCard({
  incidentId,
  confidenceScore,
  correlationReason,
  suggestedDeployment,
  suggestedCommit,
  onReanalyze,
  onAssignUser,
  isReanalyzing,
}: RelationshipCardProps) {
  const [selectedWindow, setSelectedWindow] = useState<number>(60);

  const reasons = correlationReason
    ? correlationReason.split(';').map((r) => r.trim()).filter(Boolean)
    : [];

  const confidencePct = Math.round((confidenceScore || 0) * 100);

  // Parse files changed in suspected commit
  let files: { path: string; additions: number; deletions: number }[] = [];
  if (suggestedCommit?.filesChanged) {
    try {
      files = JSON.parse(suggestedCommit.filesChanged);
    } catch {
      files = [];
    }
  }

  return (
    <Card className="border-accent/40 bg-gradient-to-b from-surface-elevated to-surface p-6 relative overflow-hidden">
      {/* Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-border gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-mono tracking-tight uppercase text-primary">
                Who Broke The Build?
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent/15 text-accent font-semibold border border-accent/30">
                CORRELATION ENGINE
              </span>
            </div>
            <p className="text-xs text-primary-subtle mt-0.5">
              Automated timestamp, git change graph & deployment failure attribution
            </p>
          </div>
        </div>

        {/* Confidence Gauge & Re-analyze Controls */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase text-zinc-500 font-semibold">
              Attribution Confidence
            </div>
            <div className="text-sm font-mono font-bold text-accent">
              {confidencePct}%
            </div>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Time window selector */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedWindow}
              onChange={(e) => setSelectedWindow(Number(e.target.value))}
              className="bg-surface-muted border border-border text-xs rounded px-2 py-1 text-primary focus:outline-none"
            >
              <option value={15}>Window: 15m</option>
              <option value={30}>Window: 30m</option>
              <option value={60}>Window: 1h</option>
              <option value={120}>Window: 2h</option>
              <option value={360}>Window: 6h</option>
              <option value={1440}>Window: 24h</option>
            </select>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onReanalyze(selectedWindow)}
              isLoading={isReanalyzing}
              title="Re-run correlation engine"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content: Suspected Deployment & Commit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-5 border-b border-border">
        {/* Suspected Deployment Box */}
        <div className="p-4 rounded border border-border bg-surface-muted/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Rocket className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-mono font-semibold uppercase text-primary">
                  Suspected Deployment
                </span>
              </div>
              {suggestedDeployment && (
                <Badge deploymentStatus={suggestedDeployment.status}>
                  {suggestedDeployment.status}
                </Badge>
              )}
            </div>

            {suggestedDeployment ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-primary-subtle">Release Version:</span>
                  <span className="font-mono font-bold text-primary">
                    {suggestedDeployment.version}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-primary-subtle">Environment:</span>
                  <span className="font-mono text-primary uppercase">
                    {suggestedDeployment.environment}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-primary-subtle">Deployed:</span>
                  <span className="font-mono text-primary">
                    {formatRelativeTime(suggestedDeployment.occurredAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-primary-subtle">Deployed By:</span>
                  <span className="text-primary font-medium">
                    {suggestedDeployment.developerName} ({suggestedDeployment.developerEmail})
                  </span>
                </div>
                {suggestedDeployment.notes && (
                  <div className="pt-1 text-[11px] text-zinc-400 italic">
                    "{suggestedDeployment.notes}"
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-primary-subtle">
                No deployment correlated in the specified time window.
              </div>
            )}
          </div>

          {suggestedDeployment && (
            <div className="pt-3 mt-3 border-t border-border/50 flex justify-end">
              <Link
                href={`/deployments/${suggestedDeployment.id}`}
                className="text-[11px] font-mono text-accent hover:underline flex items-center gap-1"
              >
                <span>Inspect Deployment Diff</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Suspected Commit Box */}
        <div className="p-4 rounded border border-border bg-surface-muted/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <GitCommit className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-mono font-semibold uppercase text-primary">
                  Suspected Culprit Commit
                </span>
              </div>
              {suggestedCommit && (
                <span className="text-[10px] font-mono text-zinc-400">
                  +{suggestedCommit.additions} -{suggestedCommit.deletions}
                </span>
              )}
            </div>

            {suggestedCommit ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-primary-subtle">Commit Hash:</span>
                  <span className="font-mono text-primary bg-surface px-1.5 py-0.5 rounded border border-border">
                    {suggestedCommit.commitHash.substring(0, 10)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-primary-subtle">Author:</span>
                  <span className="text-primary font-medium">
                    {suggestedCommit.authorName} ({suggestedCommit.authorEmail})
                  </span>
                </div>
                <div>
                  <span className="text-primary-subtle block mb-0.5">Message:</span>
                  <p className="font-mono text-[11px] text-zinc-300 bg-surface/70 p-1.5 rounded border border-border">
                    {suggestedCommit.message}
                  </p>
                </div>

                {/* Changed files */}
                {files.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
                      Critical Files Touched ({files.length}):
                    </span>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {files.map((f) => (
                        <div
                          key={f.path}
                          className="flex items-center justify-between text-[11px] font-mono text-zinc-400"
                        >
                          <span className="truncate max-w-[220px]">{f.path}</span>
                          <span className="text-zinc-500">
                            +{f.additions} -{f.deletions}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-primary-subtle">
                No commit correlated in the specified time window.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rationale & Attribution Explanations */}
      {reasons.length > 0 && (
        <div className="pt-4">
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-semibold mb-2">
            Deterministic Correlation Rationale:
          </div>
          <ul className="space-y-1.5">
            {reasons.map((r, i) => (
              <li
                key={i}
                className="text-xs text-primary-subtle flex items-start gap-2 font-mono"
              >
                <span className="text-accent mt-0.5">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
