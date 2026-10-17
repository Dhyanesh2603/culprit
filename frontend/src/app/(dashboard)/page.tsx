'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Flame,
  Rocket,
  Clock,
  ArrowRight,
  PlusCircle,
  Repeat,
  Radio,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { DashboardData } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { MetricsCharts } from '../../components/charts/MetricsCharts';
import { formatRelativeTime } from '../../lib/utils';
import { Modal } from '../../components/ui/Modal';
import { Input, Label, Textarea, Select } from '../../components/ui/FormControls';

export default function DashboardPage() {
  const { activeProject } = useProject();
  const { role } = useAuth();
  const [createIncidentModalOpen, setCreateIncidentModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSeverity, setNewSeverity] = useState('CRITICAL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: dashboard, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard', activeProject?.id],
    queryFn: () =>
      apiRequest<DashboardData>(
        `/dashboard/overview${activeProject ? `?projectId=${activeProject.id}` : ''}`
      ),
    refetchInterval: 10000, // Background poll every 10s as safety fallback alongside Socket.IO
  });

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    setIsSubmitting(true);
    try {
      await apiRequest('/incidents', {
        method: 'POST',
        body: JSON.stringify({
          projectId: activeProject.id,
          title: newTitle,
          description: newDescription,
          severity: newSeverity,
          occurredAt: new Date().toISOString(),
        }),
      });
      setCreateIncidentModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to create incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  const metrics = dashboard?.metrics || {
    openIncidents: 0,
    criticalIncidents: 0,
    deploymentsToday: 0,
    averageResolutionMinutes: 0,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-primary font-mono uppercase">
              {activeProject ? activeProject.name : 'Engineering Dashboard'}
            </h1>
            {activeProject && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-border bg-surface-muted text-primary-subtle uppercase">
                {activeProject.environment}
              </span>
            )}
          </div>
          <p className="text-xs text-primary-subtle mt-1">
            Production health, active incidents, and automated deployment attribution.
          </p>
        </div>

        {role !== 'VIEWER' && (
          <Button
            variant="accent"
            size="sm"
            onClick={() => setCreateIncidentModalOpen(true)}
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
            <span>Report Incident</span>
          </Button>
        )}
      </div>

      {/* 4 Primary Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Incidents */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-primary-subtle">
              Open Incidents
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-mono font-bold text-primary">
              {isLoading ? '...' : metrics.openIncidents}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Active engineering investigations
            </p>
          </div>
        </Card>

        {/* Critical Incidents */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-primary-subtle">
              Critical (Sev 1)
            </span>
            <Flame className="w-4 h-4 text-red-500" />
          </div>
          <div className="mt-3">
            <div
              className={`text-3xl font-mono font-bold ${
                metrics.criticalIncidents > 0 ? 'text-red-400' : 'text-primary'
              }`}
            >
              {isLoading ? '...' : metrics.criticalIncidents}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Requiring immediate engineering pager response
            </p>
          </div>
        </Card>

        {/* Deployments Today */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-primary-subtle">
              Deployments Today
            </span>
            <Rocket className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-mono font-bold text-primary">
              {isLoading ? '...' : metrics.deploymentsToday}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Releases shipped in last 24h
            </p>
          </div>
        </Card>

        {/* Mean Time to Resolve (MTTR) */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-primary-subtle">
              Mean Time to Resolve
            </span>
            <Clock className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-mono font-bold text-primary">
              {isLoading
                ? '...'
                : metrics.averageResolutionMinutes > 60
                ? `${Math.round(metrics.averageResolutionMinutes / 60)}h ${metrics.averageResolutionMinutes % 60}m`
                : `${metrics.averageResolutionMinutes}m`}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Average turnaround to postmortem resolution
            </p>
          </div>
        </Card>
      </div>

      {/* 7-Day Trend Charts */}
      {dashboard?.trend && <MetricsCharts trendData={dashboard.trend} />}

      {/* Bottom Grid: Recurring Incidents Radar & Latest Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recurring Incidents Radar */}
        <Card>
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-accent" />
              <h3 className="text-xs font-semibold uppercase tracking-wider font-mono">
                Recurring Incident Patterns
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">
              Heuristic Clustering
            </span>
          </div>

          <div className="mt-3 divide-y divide-border/40">
            {!dashboard?.recurringIncidents || dashboard.recurringIncidents.length === 0 ? (
              <div className="py-8 text-center text-xs text-primary-subtle">
                No repeated failure signatures detected.
              </div>
            ) : (
              dashboard.recurringIncidents.map((rec) => (
                <div
                  key={rec.pattern}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5 max-w-[280px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold uppercase text-accent">
                        "{rec.pattern}"
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        ({rec.count} occurrences)
                      </span>
                    </div>
                    <p className="text-[11px] text-primary-subtle truncate">
                      {rec.exampleTitle}
                    </p>
                  </div>
                  <Badge severity={rec.severity}>{rec.severity}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Latest Activity Stream */}
        <Card>
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <h3 className="text-xs font-semibold uppercase tracking-wider font-mono">
                Latest Engineering Activity
              </h3>
            </div>
            <Link
              href="/timeline"
              className="text-[11px] font-mono text-accent hover:underline flex items-center gap-1"
            >
              <span>Full Timeline</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="mt-3 divide-y divide-border/40">
            {!dashboard?.latestActivity || dashboard.latestActivity.length === 0 ? (
              <div className="py-8 text-center text-xs text-primary-subtle">
                No recent activity recorded.
              </div>
            ) : (
              dashboard.latestActivity.map((act) => (
                <div
                  key={act.id}
                  className="py-2.5 flex items-start justify-between text-xs gap-3"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-primary block">
                      {act.title}
                    </span>
                    <span className="text-[11px] text-primary-subtle line-clamp-1">
                      {act.description}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">
                    {formatRelativeTime(act.occurredAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Quick Report Incident Modal */}
      <Modal
        isOpen={createIncidentModalOpen}
        onClose={() => setCreateIncidentModalOpen(false)}
        title="Report New Incident"
        description="Trigger investigation and run automated timestamp correlation"
      >
        <form onSubmit={handleCreateIncident} className="space-y-4">
          <div>
            <Label>Incident Title / Summary</Label>
            <Input
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. 504 Gateway Timeouts in payment checkout cluster"
            />
          </div>

          <div>
            <Label>Severity</Label>
            <Select
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value)}
            >
              <option value="CRITICAL">CRITICAL (Sev 1 - Production Outage)</option>
              <option value="HIGH">HIGH (Sev 2 - Degraded Core Functionality)</option>
              <option value="MEDIUM">MEDIUM (Sev 3 - Partial / Minor Disruption)</option>
              <option value="LOW">LOW (Sev 4 - Cosmetic / Non-urgent)</option>
            </Select>
          </div>

          <div>
            <Label>Failure Symptoms & Details</Label>
            <Textarea
              required
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Describe what failed, affected endpoints, customer impact, or error signatures..."
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateIncidentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="sm"
              isLoading={isSubmitting}
            >
              Create Incident & Run Correlation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
