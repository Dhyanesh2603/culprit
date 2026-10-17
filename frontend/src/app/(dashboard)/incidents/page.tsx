'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Flame,
  PlusCircle,
  Clock,
  ArrowRight,
  UserCheck,
  Search,
} from 'lucide-react';
import { useProject } from '../../../context/ProjectContext';
import { useAuth } from '../../../context/AuthContext';
import { apiRequest } from '../../../lib/api';
import { Incident, IncidentSeverity, IncidentStatus } from '../../../types';
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

export default function IncidentsPage() {
  const { activeProject } = useProject();
  const { role } = useAuth();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  // Create Incident Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>('CRITICAL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: incidents = [], isLoading, refetch } = useQuery<Incident[]>({
    queryKey: ['incidents', activeProject?.id, filterStatus, filterSeverity],
    queryFn: () => {
      if (!activeProject) return [];
      let url = `/incidents/project/${activeProject.id}?`;
      if (filterStatus !== 'ALL') url += `status=${filterStatus}&`;
      if (filterSeverity !== 'ALL') url += `severity=${filterSeverity}&`;
      return apiRequest<Incident[]>(url);
    },
    enabled: !!activeProject,
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
          title,
          description,
          severity,
          occurredAt: new Date().toISOString(),
        }),
      });
      setCreateModalOpen(false);
      setTitle('');
      setDescription('');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to create incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inc.title.toLowerCase().includes(q) ||
      inc.description.toLowerCase().includes(q) ||
      `#${inc.incidentNumber}`.includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-primary font-mono uppercase">
            Incidents & War Rooms
          </h1>
          <p className="text-xs text-primary-subtle mt-0.5">
            Active outages, postmortems, and automated root cause attribution for {activeProject?.name}.
          </p>
        </div>

        {role !== 'VIEWER' && (
          <Button
            variant="accent"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
            <span>Report Incident</span>
          </Button>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded border border-border bg-surface">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-zinc-500 uppercase">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-surface-muted border border-border text-xs rounded px-2 py-1 text-primary focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="MONITORING">Monitoring</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-zinc-500 uppercase">Severity:</span>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-surface-muted border border-border text-xs rounded px-2 py-1 text-primary focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical (Sev 1)</option>
              <option value="HIGH">High (Sev 2)</option>
              <option value="MEDIUM">Medium (Sev 3)</option>
              <option value="LOW">Low (Sev 4)</option>
            </select>
          </div>
        </div>

        <div className="w-full sm:w-64">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search incident # or title..."
            className="h-7 text-xs"
          />
        </div>
      </div>

      {/* Incidents Table */}
      <Table>
        <TableHeader>
          <tr>
            <TableHead>Incident</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Suspected Deployment</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Assigned Responders</TableHead>
            <TableHead>Occurred At</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {filteredIncidents.length === 0 ? (
            <tr>
              <TableCell colSpan={8} className="text-center py-10 text-primary-subtle">
                {isLoading ? 'Loading incidents...' : 'No incidents matching filters.'}
              </TableCell>
            </tr>
          ) : (
            filteredIncidents.map((inc) => (
              <TableRow key={inc.id}>
                <TableCell>
                  <Link
                    href={`/incidents/${inc.id}`}
                    className="font-semibold text-primary hover:text-accent transition-colors flex items-center gap-2"
                  >
                    <span className="font-mono text-xs text-primary-subtle">
                      #{inc.incidentNumber}
                    </span>
                    <span className="line-clamp-1">{inc.title}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge severity={inc.severity}>{inc.severity}</Badge>
                </TableCell>
                <TableCell>
                  <Badge status={inc.status}>{inc.status}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {inc.suggestedDeployment ? (
                    <span className="text-accent font-bold">
                      {inc.suggestedDeployment.version}
                    </span>
                  ) : (
                    <span className="text-zinc-500 italic">None</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {inc.confidenceScore ? (
                    <span className="text-accent font-semibold">
                      {Math.round(inc.confidenceScore * 100)}%
                    </span>
                  ) : (
                    <span className="text-zinc-600">-</span>
                  )}
                </TableCell>
                <TableCell className="text-primary-subtle text-xs">
                  {inc.assignments.length > 0 ? (
                    <span className="truncate max-w-[150px] inline-block">
                      {inc.assignments.map((a) => a.user.name).join(', ')}
                    </span>
                  ) : (
                    <span className="text-zinc-500 italic">Unassigned</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-[11px] text-zinc-500" title={formatDate(inc.occurredAt)}>
                  {formatRelativeTime(inc.occurredAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/incidents/${inc.id}`}
                    className="inline-flex items-center gap-1 text-xs font-mono text-accent hover:underline"
                  >
                    <span>War Room</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Create Incident Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Open Engineering Incident"
        description="Creates incident war room and immediately queries the Relationship Engine"
      >
        <form onSubmit={handleCreateIncident} className="space-y-4">
          <div>
            <Label>Incident Title</Label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Memory leak in token cache after v2.4.1"
            />
          </div>

          <div>
            <Label>Severity Level</Label>
            <Select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
            >
              <option value="CRITICAL">CRITICAL (Sev 1 - Outage)</option>
              <option value="HIGH">HIGH (Sev 2 - Degraded)</option>
              <option value="MEDIUM">MEDIUM (Sev 3 - Partial)</option>
              <option value="LOW">LOW (Sev 4 - Minor)</option>
            </Select>
          </div>

          <div>
            <Label>Incident Symptoms & Observed Behavior</Label>
            <Textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail error codes, logs, spike timing, customer impact..."
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="sm"
              isLoading={isSubmitting}
            >
              Open Incident & Run Engine
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
