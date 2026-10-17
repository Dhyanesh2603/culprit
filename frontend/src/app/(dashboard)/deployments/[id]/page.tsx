'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Rocket,
  GitCommit,
  RotateCcw,
  FileCode,
  Calendar,
  User,
  GitBranch,
} from 'lucide-react';
import { apiRequest } from '../../../../lib/api';
import { Deployment, Commit } from '../../../../types';
import { Card } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { formatDate, formatRelativeTime } from '../../../../lib/utils';
import { Modal } from '../../../../components/ui/Modal';
import { Label, Textarea } from '../../../../components/ui/FormControls';
import { useAuth } from '../../../../context/AuthContext';

export default function DeploymentDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { role } = useAuth();

  const [rollbackModalOpen, setRollbackModalOpen] = useState(false);
  const [rollbackReason, setRollbackReason] = useState('');
  const [isRollingBack, setIsRollingBack] = useState(false);

  const { data: deployment, isLoading, refetch } = useQuery<Deployment>({
    queryKey: ['deployment', id],
    queryFn: () => apiRequest<Deployment>(`/deployments/${id}`),
    enabled: !!id,
  });

  const handleRollback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deployment) return;
    setIsRollingBack(true);
    try {
      await apiRequest(`/deployments/${deployment.id}/rollback`, {
        method: 'POST',
        body: JSON.stringify({ rollbackReason }),
      });
      setRollbackModalOpen(false);
      setRollbackReason('');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Rollback failed');
    } finally {
      setIsRollingBack(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-primary-subtle">
        Loading deployment details...
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="py-20 text-center text-xs text-red-400">
        Deployment not found.
      </div>
    );
  }

  const commits: Commit[] = deployment.commits || [];

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link
            href="/deployments"
            className="p-1 rounded hover:bg-surface-elevated text-primary-subtle hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold font-mono text-primary">
                {deployment.version}
              </h1>
              <Badge deploymentStatus={deployment.status}>
                {deployment.status}
              </Badge>
              {deployment.isRollback && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800/40">
                  ROLLBACK
                </span>
              )}
            </div>
            <p className="text-xs text-primary-subtle mt-0.5">
              Deployed {formatDate(deployment.occurredAt)} ({formatRelativeTime(deployment.occurredAt)})
            </p>
          </div>
        </div>

        {role !== 'VIEWER' && deployment.status !== 'ROLLED_BACK' && !deployment.isRollback && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setRollbackModalOpen(true)}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            <span>Rollback This Release</span>
          </Button>
        )}
      </div>

      {/* Deployment Metadata Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <span className="text-[11px] font-mono uppercase text-zinc-500 block">Commit SHA</span>
          <span className="text-xs font-mono font-bold text-primary mt-1 block">
            {deployment.commitHash}
          </span>
        </Card>
        <Card>
          <span className="text-[11px] font-mono uppercase text-zinc-500 block">Branch</span>
          <div className="flex items-center gap-1.5 mt-1">
            <GitBranch className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-mono text-primary">{deployment.branch}</span>
          </div>
        </Card>
        <Card>
          <span className="text-[11px] font-mono uppercase text-zinc-500 block">Environment</span>
          <span className="text-xs font-mono uppercase font-bold text-accent mt-1 block">
            {deployment.environment}
          </span>
        </Card>
        <Card>
          <span className="text-[11px] font-mono uppercase text-zinc-500 block">Shipped By</span>
          <span className="text-xs text-primary mt-1 block truncate">
            {deployment.developerName} ({deployment.developerEmail})
          </span>
        </Card>
      </div>

      {deployment.notes && (
        <Card>
          <span className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
            Release Notes
          </span>
          <p className="text-xs text-primary-subtle leading-relaxed">
            {deployment.notes}
          </p>
        </Card>
      )}

      {/* Commits & Changes Diff in this Deployment */}
      <Card>
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-accent" />
            <h2 className="text-xs font-semibold uppercase tracking-wider font-mono">
              Commits Included in Release ({commits.length})
            </h2>
          </div>
        </div>

        <div className="mt-3 divide-y divide-border/40">
          {commits.length === 0 ? (
            <div className="py-8 text-center text-xs text-primary-subtle">
              No commit details attached to this deployment record.
            </div>
          ) : (
            commits.map((c) => {
              let parsedFiles: { path: string; additions: number; deletions: number }[] = [];
              try {
                parsedFiles = JSON.parse(c.filesChanged);
              } catch {}

              return (
                <div key={c.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-surface-muted px-2 py-0.5 rounded border border-border">
                        {c.commitHash.substring(0, 8)}
                      </span>
                      <span className="text-xs font-medium text-primary">{c.message}</span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">
                      +{c.additions} -{c.deletions}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                    <span>Author: {c.authorName} ({c.authorEmail})</span>
                    <span>{formatRelativeTime(c.timestamp)}</span>
                  </div>

                  {parsedFiles.length > 0 && (
                    <div className="mt-2 pl-3 border-l-2 border-border space-y-1">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block">
                        Files Changed:
                      </span>
                      {parsedFiles.map((file) => (
                        <div
                          key={file.path}
                          className="flex items-center justify-between text-[11px] font-mono text-zinc-400"
                        >
                          <div className="flex items-center gap-1.5">
                            <FileCode className="w-3 h-3 text-zinc-500" />
                            <span>{file.path}</span>
                          </div>
                          <span className="text-zinc-500">
                            +{file.additions} -{file.deletions}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Rollback Modal */}
      <Modal
        isOpen={rollbackModalOpen}
        onClose={() => setRollbackModalOpen(false)}
        title={`Rollback Deployment: ${deployment.version}`}
        description="Creates a rollback deployment record and reverts active version"
      >
        <form onSubmit={handleRollback} className="space-y-4">
          <div>
            <Label>Rollback Justification</Label>
            <Textarea
              required
              value={rollbackReason}
              onChange={(e) => setRollbackReason(e.target.value)}
              placeholder="Provide context on why this build broke production..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRollbackModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              isLoading={isRollingBack}
            >
              Execute Rollback
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
