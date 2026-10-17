'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Rocket,
  RotateCcw,
  PlusCircle,
  ExternalLink,
  GitBranch,
  Search,
  Filter,
} from 'lucide-react';
import { useProject } from '../../../context/ProjectContext';
import { useAuth } from '../../../context/AuthContext';
import { apiRequest } from '../../../lib/api';
import { Deployment, DeploymentStatus } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Input, Label, Textarea, Select } from '../../../components/ui/FormControls';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/Table';
import { formatDate, formatRelativeTime } from '../../../lib/utils';

export default function DeploymentsPage() {
  const { activeProject } = useProject();
  const { role } = useAuth();

  const [search, setSearch] = useState('');
  const [filterEnv, setFilterEnv] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Record Deployment Modal State
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [version, setVersion] = useState('');
  const [commitHash, setCommitHash] = useState('');
  const [branch, setBranch] = useState('main');
  const [environment, setEnvironment] = useState('production');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rollback Modal State
  const [rollbackModalOpen, setRollbackModalOpen] = useState(false);
  const [targetDeployment, setTargetDeployment] = useState<Deployment | null>(null);
  const [rollbackReason, setRollbackReason] = useState('');

  const { data: deployments = [], isLoading, refetch } = useQuery<Deployment[]>({
    queryKey: ['deployments', activeProject?.id, filterEnv, filterStatus],
    queryFn: () => {
      if (!activeProject) return [];
      let url = `/deployments/project/${activeProject.id}?`;
      if (filterEnv !== 'ALL') url += `environment=${filterEnv}&`;
      if (filterStatus !== 'ALL') url += `status=${filterStatus}&`;
      return apiRequest<Deployment[]>(url);
    },
    enabled: !!activeProject,
  });

  const handleRecordDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    setIsSubmitting(true);
    try {
      await apiRequest('/deployments', {
        method: 'POST',
        body: JSON.stringify({
          projectId: activeProject.id,
          version,
          commitHash,
          branch,
          environment,
          developerEmail: 'developer@whobrokethebuild.internal',
          developerName: 'Staff Engineer',
          status: 'SUCCESS',
          notes,
          occurredAt: new Date().toISOString(),
        }),
      });
      setRecordModalOpen(false);
      setVersion('');
      setCommitHash('');
      setNotes('');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to record deployment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriggerRollback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDeployment) return;
    setIsSubmitting(true);
    try {
      await apiRequest(`/deployments/${targetDeployment.id}/rollback`, {
        method: 'POST',
        body: JSON.stringify({
          rollbackReason,
        }),
      });
      setRollbackModalOpen(false);
      setTargetDeployment(null);
      setRollbackReason('');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to execute rollback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDeployments = deployments.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.version.toLowerCase().includes(q) ||
      d.commitHash.toLowerCase().includes(q) ||
      d.developerName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-primary font-mono uppercase">
            Deployments & Release Engineering
          </h1>
          <p className="text-xs text-primary-subtle mt-0.5">
            Immutable log of all production, staging, and preview deployments with rollback auditing.
          </p>
        </div>

        {role !== 'VIEWER' && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setRecordModalOpen(true)}
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
            <span>Record Deployment</span>
          </Button>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded border border-border bg-surface">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Environment Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-zinc-500 uppercase">Env:</span>
            <select
              value={filterEnv}
              onChange={(e) => setFilterEnv(e.target.value)}
              className="bg-surface-muted border border-border text-xs rounded px-2 py-1 text-primary focus:outline-none"
            >
              <option value="ALL">All Environments</option>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-zinc-500 uppercase">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-surface-muted border border-border text-xs rounded px-2 py-1 text-primary focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="ROLLED_BACK">Rolled Back</option>
            </select>
          </div>
        </div>

        <div className="w-full sm:w-64">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search version, commit, author..."
            className="h-7 text-xs"
          />
        </div>
      </div>

      {/* Deployments Table */}
      <Table>
        <TableHeader>
          <tr>
            <TableHead>Version / Release</TableHead>
            <TableHead>Commit</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Environment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Developer</TableHead>
            <TableHead>Occurred At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {filteredDeployments.length === 0 ? (
            <tr>
              <TableCell colSpan={8} className="text-center py-10 text-primary-subtle">
                {isLoading ? 'Loading deployments...' : 'No deployments recorded yet.'}
              </TableCell>
            </tr>
          ) : (
            filteredDeployments.map((dep) => (
              <TableRow key={dep.id}>
                <TableCell className="font-mono font-bold text-primary">
                  <div className="flex items-center gap-2">
                    <Rocket className="w-3.5 h-3.5 text-primary-subtle" />
                    <span>{dep.version}</span>
                    {dep.isRollback && (
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-amber-950/40 text-amber-400 border border-amber-800/40">
                        ROLLBACK
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-zinc-400">
                  {dep.commitHash.substring(0, 7)}
                </TableCell>
                <TableCell className="font-mono text-xs text-primary-subtle">
                  <div className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3 text-zinc-500" />
                    <span>{dep.branch}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono uppercase text-[11px]">
                  {dep.environment}
                </TableCell>
                <TableCell>
                  <Badge deploymentStatus={dep.status}>{dep.status}</Badge>
                </TableCell>
                <TableCell className="text-primary-subtle">
                  {dep.developerName}
                </TableCell>
                <TableCell className="font-mono text-[11px] text-zinc-500" title={formatDate(dep.occurredAt)}>
                  {formatRelativeTime(dep.occurredAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/deployments/${dep.id}`}
                      className="p-1 text-primary-subtle hover:text-primary transition-colors"
                      title="Inspect Deployment Diff"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>

                    {role !== 'VIEWER' && dep.status !== 'ROLLED_BACK' && !dep.isRollback && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setTargetDeployment(dep);
                          setRollbackModalOpen(true);
                        }}
                        title="Rollback this deployment"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        <span>Rollback</span>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Record Deployment Modal */}
      <Modal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        title="Record Production Deployment"
        description="Ingest deployment event into the release timeline & correlation engine"
      >
        <form onSubmit={handleRecordDeployment} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Version Tag</Label>
              <Input
                required
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. v3.13.0 or build-491"
              />
            </div>
            <div>
              <Label>Commit Hash</Label>
              <Input
                required
                value={commitHash}
                onChange={(e) => setCommitHash(e.target.value)}
                placeholder="e.g. 7c94efb"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Branch</Label>
              <Input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
              />
            </div>
            <div>
              <Label>Environment</Label>
              <Select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </Select>
            </div>
          </div>

          <div>
            <Label>Deployment Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Release notes, change summary, or ticket links..."
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRecordModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Record Deployment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rollback Trigger Modal */}
      <Modal
        isOpen={rollbackModalOpen}
        onClose={() => setRollbackModalOpen(false)}
        title={`Trigger Rollback: ${targetDeployment?.version}`}
        description="Immediately triggers a rollback deployment event and marks original release as rolled back"
      >
        <form onSubmit={handleTriggerRollback} className="space-y-4">
          <div>
            <Label>Reason for Rollback</Label>
            <Textarea
              required
              value={rollbackReason}
              onChange={(e) => setRollbackReason(e.target.value)}
              placeholder="Explain the incident, error spike, or failure that necessitated rolling back..."
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
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
              isLoading={isSubmitting}
            >
              Confirm Emergency Rollback
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
