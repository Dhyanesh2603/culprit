'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Flame,
  AlertTriangle,
  Send,
  Download,
  CheckCircle2,
  Clock,
  User,
  Shield,
  FileText,
  UserPlus,
} from 'lucide-react';
import { apiRequest } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { useSocket } from '../../../../context/SocketContext';
import { Incident, IncidentComment, IncidentSeverity, IncidentStatus } from '../../../../types';
import { Card } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Input, Label, Textarea, Select } from '../../../../components/ui/FormControls';
import { RelationshipCard } from '../../../../components/relationship/RelationshipCard';
import { PostmortemModal } from '../../../../components/postmortem/PostmortemModal';
import { formatDate, formatRelativeTime } from '../../../../lib/utils';

export default function IncidentWarRoomPage() {
  const params = useParams();
  const id = params?.id as string;
  const { user, role } = useAuth();
  const { socket } = useSocket();

  // Investigation State
  const [commentText, setCommentText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [resolution, setResolution] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  // Postmortem Modal
  const [postmortemModalOpen, setPostmortemModalOpen] = useState(false);
  const [postmortemMarkdown, setPostmortemMarkdown] = useState('');

  // Fetch Incident Data
  const { data: incident, isLoading, refetch } = useQuery<Incident>({
    queryKey: ['incident', id],
    queryFn: () => apiRequest<Incident>(`/incidents/${id}`),
    enabled: !!id,
  });

  // Socket.IO Incident War Room Subscription
  useEffect(() => {
    if (socket && id) {
      socket.emit('incident:join', id);

      const handleComment = () => refetch();
      const handleUpdate = () => refetch();

      socket.on('incident:comment_added', handleComment);
      socket.on('incident:updated', handleUpdate);

      return () => {
        socket.emit('incident:leave', id);
        socket.off('incident:comment_added', handleComment);
        socket.off('incident:updated', handleUpdate);
      };
    }
  }, [socket, id, refetch]);

  // Synchronize local form inputs when incident loads
  useEffect(() => {
    if (incident) {
      setRootCause(incident.rootCause || '');
      setResolution(incident.resolution || '');
    }
  }, [incident]);

  // Optimistic Concurrency Control Status Update
  const handleUpdateStatus = async (newStatus: IncidentStatus) => {
    if (!incident) return;
    setIsUpdatingStatus(true);
    try {
      await apiRequest(`/incidents/${incident.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          rootCause,
          resolution,
          version: incident.version, // Concurrency lock check
        }),
      });
      refetch();
    } catch (err: any) {
      if (err.status === 409) {
        alert('Conflict Detected: Another teammate updated this incident concurrently. Refreshing state...');
      } else {
        alert(err.message || 'Failed to update status');
      }
      refetch();
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdateSeverity = async (newSeverity: IncidentSeverity) => {
    if (!incident) return;
    try {
      await apiRequest(`/incidents/${incident.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          severity: newSeverity,
          version: incident.version,
        }),
      });
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to update severity');
      refetch();
    }
  };

  const handleSaveRootCauseAndResolution = async () => {
    if (!incident) return;
    setIsUpdatingStatus(true);
    try {
      await apiRequest(`/incidents/${incident.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          rootCause,
          resolution,
          version: incident.version,
        }),
      });
      alert('Root cause and resolution saved.');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to save');
      refetch();
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident || !commentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      await apiRequest(`/incidents/${incident.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          content: commentText,
          attachmentUrl: attachmentUrl.trim() || undefined,
        }),
      });
      setCommentText('');
      setAttachmentUrl('');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleReanalyzeCorrelation = async (windowMinutes?: number) => {
    if (!incident) return;
    setIsReanalyzing(true);
    try {
      await apiRequest(`/incidents/${incident.id}/reanalyze`, {
        method: 'POST',
        body: JSON.stringify({ windowMinutes }),
      });
      refetch();
    } catch (err: any) {
      alert(err.message || 'Correlation re-analysis failed');
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleExportPostmortem = async () => {
    if (!incident) return;
    try {
      const data: any = await apiRequest(`/incidents/${incident.id}/postmortem`);
      setPostmortemMarkdown(data.markdown || '');
      setPostmortemModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to export report');
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-primary-subtle">
        Loading incident war room...
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="py-20 text-center text-xs text-red-400">
        Incident not found.
      </div>
    );
  }

  const durationMins = incident.resolvedAt
    ? Math.round(
        (new Date(incident.resolvedAt).getTime() - new Date(incident.occurredAt).getTime()) /
          (60 * 1000)
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-border gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/incidents"
            className="p-1 rounded hover:bg-surface-elevated text-primary-subtle hover:text-primary transition-colors mt-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-accent">
                #{incident.incidentNumber}
              </span>
              <h1 className="text-base font-bold text-primary tracking-tight">
                {incident.title}
              </h1>
              <Badge severity={incident.severity}>{incident.severity}</Badge>
              <Badge status={incident.status}>{incident.status}</Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-primary-subtle font-mono mt-1">
              <span>Project: {incident.project.name}</span>
              <span>•</span>
              <span title={`Ingested: ${formatDate(incident.receivedAt)}`}>
                Occurred: {formatDate(incident.occurredAt)} ({formatRelativeTime(incident.occurredAt)})
              </span>
              {durationMins !== null && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">
                    Resolved in {durationMins}m
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportPostmortem}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Export Postmortem</span>
          </Button>
        </div>
      </div>

      {/* Flagship: WHO BROKE THE BUILD? Relationship Engine Card */}
      <RelationshipCard
        incidentId={incident.id}
        confidenceScore={incident.confidenceScore}
        correlationReason={incident.correlationReason}
        suggestedDeployment={incident.suggestedDeployment}
        suggestedCommit={incident.suggestedCommit}
        onReanalyze={handleReanalyzeCorrelation}
        isReanalyzing={isReanalyzing}
      />

      {/* Main Grid: Investigation Workflow & Incident Discussion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Discussion & Timeline Comments */}
        <div className="lg:col-span-2 space-y-5">
          {/* Incident Description */}
          <Card>
            <div className="text-[11px] font-mono uppercase text-zinc-500 font-semibold mb-1">
              Incident Symptoms & Initial Report
            </div>
            <p className="text-xs text-primary-subtle leading-relaxed whitespace-pre-wrap">
              {incident.description}
            </p>
          </Card>

          {/* Root Cause & Resolution Form */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-mono font-semibold uppercase text-primary">
                Postmortem: Root Cause & Resolution
              </span>
              {role !== 'VIEWER' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveRootCauseAndResolution}
                  isLoading={isUpdatingStatus}
                >
                  Save Postmortem Notes
                </Button>
              )}
            </div>

            <div>
              <Label>Root Cause Analysis</Label>
              <Textarea
                disabled={role === 'VIEWER'}
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                placeholder="Explain the technical defect, race condition, missing migration, or external failure..."
                className="min-h-[70px]"
              />
            </div>

            <div>
              <Label>Permanent Resolution & Corrective Actions</Label>
              <Textarea
                disabled={role === 'VIEWER'}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe hotfix, configuration changes, or preventive automated tests implemented..."
                className="min-h-[70px]"
              />
            </div>
          </Card>

          {/* Chronological Discussion Stream */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-mono font-semibold uppercase text-primary">
                War Room Discussion & Activity Log ({incident.comments?.length || 0})
              </span>
            </div>

            {/* Comment List */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {!incident.comments || incident.comments.length === 0 ? (
                <div className="py-8 text-center text-xs text-primary-subtle">
                  No comments yet in this war room.
                </div>
              ) : (
                incident.comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded border border-border bg-surface-muted/30 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary">
                          {c.user?.name || 'Engineer'}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          ({c.user?.email})
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {formatRelativeTime(c.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-primary-subtle leading-relaxed whitespace-pre-wrap">
                      {c.content}
                    </p>

                    {c.attachmentUrl && (
                      <div className="pt-1">
                        <a
                          href={c.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-mono text-accent hover:underline inline-flex items-center gap-1"
                        >
                          <span>Attachment: {c.attachmentName || c.attachmentUrl}</span>
                        </a>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Comment Input Box */}
            {role !== 'VIEWER' && (
              <form onSubmit={handlePostComment} className="pt-3 border-t border-border space-y-2">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Post war room update, paste stack trace, or mention teammates (@alex)..."
                  className="min-h-[60px]"
                />

                <div className="flex items-center justify-between gap-2">
                  <Input
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="Attachment URL (optional: Datadog trace, Sentry link, Runbook)..."
                    className="h-7 text-xs flex-1"
                  />
                  <Button
                    type="submit"
                    variant="accent"
                    size="sm"
                    isLoading={isSubmittingComment}
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    <span>Send</span>
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>

        {/* Right Column (1 Col): Incident State & Responders Panel */}
        <div className="space-y-5">
          {/* Status & Severity Controls */}
          <Card className="space-y-4">
            <span className="text-xs font-mono font-semibold uppercase text-primary block pb-2 border-b border-border">
              Incident State Controls
            </span>

            {/* Status Transition Buttons */}
            <div>
              <Label>Lifecycle Status</Label>
              <div className="space-y-1.5 pt-1">
                {(['OPEN', 'INVESTIGATING', 'MONITORING', 'RESOLVED', 'CLOSED'] as IncidentStatus[]).map((st) => (
                  <button
                    key={st}
                    disabled={role === 'VIEWER' || isUpdatingStatus}
                    onClick={() => handleUpdateStatus(st)}
                    className={`w-full text-left px-3 py-2 rounded text-xs font-mono flex items-center justify-between border transition-colors ${
                      incident.status === st
                        ? 'border-accent bg-accent/10 text-accent font-bold'
                        : 'border-border bg-surface-muted/40 text-primary-subtle hover:text-primary hover:bg-surface-muted'
                    }`}
                  >
                    <span>{st}</span>
                    {incident.status === st && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Controls */}
            <div>
              <Label>Severity</Label>
              <Select
                disabled={role === 'VIEWER'}
                value={incident.severity}
                onChange={(e) => handleUpdateSeverity(e.target.value as IncidentSeverity)}
              >
                <option value="CRITICAL">CRITICAL (Sev 1)</option>
                <option value="HIGH">HIGH (Sev 2)</option>
                <option value="MEDIUM">MEDIUM (Sev 3)</option>
                <option value="LOW">LOW (Sev 4)</option>
              </Select>
            </div>

            {/* Concurrency Version Tag */}
            <div className="pt-2 border-t border-border text-[10px] font-mono text-zinc-500 flex justify-between">
              <span>Optimistic Version:</span>
              <span>v{incident.version}</span>
            </div>
          </Card>

          {/* Assigned Responders */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-mono font-semibold uppercase text-primary">
                Assigned Responders ({incident.assignments?.length || 0})
              </span>
            </div>

            <div className="space-y-2">
              {!incident.assignments || incident.assignments.length === 0 ? (
                <div className="py-4 text-center text-xs text-primary-subtle">
                  No engineers currently assigned.
                </div>
              ) : (
                incident.assignments.map((a) => (
                  <div
                    key={a.id}
                    className="p-2 rounded border border-border bg-surface-muted/30 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-surface-muted border border-border flex items-center justify-center font-mono text-[10px] font-bold">
                        {a.user.name[0]}
                      </div>
                      <div>
                        <span className="font-medium text-primary block">{a.user.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{a.user.email}</span>
                      </div>
                    </div>
                    <Badge role={a.user.role}>{a.user.role}</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Export Postmortem Modal */}
      <PostmortemModal
        isOpen={postmortemModalOpen}
        onClose={() => setPostmortemModalOpen(false)}
        markdownContent={postmortemMarkdown}
        incidentNumber={incident.incidentNumber}
      />
    </div>
  );
}
