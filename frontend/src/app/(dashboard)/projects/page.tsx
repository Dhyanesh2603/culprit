'use client';

import React, { useState } from 'react';
import {
  FolderGit2,
  PlusCircle,
  Trash2,
  ExternalLink,
  RefreshCw,
  Edit2,
  Check,
  GitBranch,
  Github,
} from 'lucide-react';
import { useProject } from '../../../context/ProjectContext';
import { useAuth } from '../../../context/AuthContext';
import { apiRequest } from '../../../lib/api';
import { Project } from '../../../types';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Input, Label, Textarea, Select } from '../../../components/ui/FormControls';

export default function ProjectsPage() {
  const { projects, refreshProjects, setActiveProject, activeProject } = useProject();
  const { role } = useAuth();

  // Create Project Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [environment, setEnvironment] = useState('production');
  const [correlationWindowMinutes, setCorrelationWindowMinutes] = useState(60);
  const [githubToken, setGithubToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Repo Modal State
  const [editRepoModalOpen, setEditRepoModalOpen] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [isSavingRepo, setIsSavingRepo] = useState(false);

  // Sync state per project
  const [syncingProjectId, setSyncingProjectId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Auto-open connect modal if navigated with ?connect=true
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('connect=true')) {
      setCreateModalOpen(true);
    }
  }, []);

  const handleConnectProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repositoryUrl.trim()) return;
    setIsSubmitting(true);
    try {
      const res: any = await apiRequest('/projects/connect-repo', {
        method: 'POST',
        body: JSON.stringify({
          repositoryUrl: repositoryUrl.trim(),
          name: name.trim() || undefined,
          environment,
          correlationWindowMinutes,
          githubToken: githubToken.trim() || undefined,
        }),
      });

      setCreateModalOpen(false);
      setName('');
      setSlug('');
      setDescription('');
      setRepositoryUrl('');
      setGithubToken('');
      await refreshProjects();

      if (res?.project) {
        setActiveProject(res.project);
      }

      const syncMsg = res?.syncResult
        ? `Successfully connected and imported ${res.syncResult.syncedCount} commits!`
        : 'Repository connected successfully.';
      setSyncFeedback(syncMsg);
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to connect repository');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncCommits = async (projectId: string) => {
    setSyncingProjectId(projectId);
    setSyncFeedback(null);
    try {
      const res: any = await apiRequest(`/projects/${projectId}/sync-github`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await refreshProjects();
      setSyncFeedback(
        `✓ Synced ${res.syncedCount || 0} recent commits from ${res.repository || 'repository'}!`
      );
      setTimeout(() => setSyncFeedback(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Failed to sync commits from repository');
    } finally {
      setSyncingProjectId(null);
    }
  };

  const handleUpdateRepoUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProjectId || !newRepoUrl.trim()) return;
    setIsSavingRepo(true);
    try {
      await apiRequest(`/projects/${editProjectId}`, {
        method: 'PATCH',
        body: JSON.stringify({ repositoryUrl: newRepoUrl.trim() }),
      });
      setEditRepoModalOpen(false);
      setEditProjectId(null);
      setNewRepoUrl('');
      await refreshProjects();
      setSyncFeedback('Repository link updated successfully.');
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update repository URL');
    } finally {
      setIsSavingRepo(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await apiRequest(`/projects/${projectId}`, { method: 'DELETE' });
      await refreshProjects();
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-primary font-mono uppercase">
            Monitored Repositories & Services
          </h1>
          <p className="text-xs text-primary-subtle mt-0.5">
            Connect any GitHub repository to track commits, ingest telemetry, and run automated outage correlation.
          </p>
        </div>

        {role !== 'VIEWER' && (
          <Button
            variant="accent"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
          >
            <Github className="w-3.5 h-3.5 mr-1.5" />
            <span>Connect & Monitor Repository</span>
          </Button>
        )}
      </div>

      {/* Sync Status Feedback Toast Banner */}
      {syncFeedback && (
        <div className="p-3 rounded border border-emerald-900/60 bg-emerald-950/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((proj) => {
          const isActive = activeProject?.id === proj.id;
          const isSyncing = syncingProjectId === proj.id;

          return (
            <Card
              key={proj.id}
              className={`flex flex-col justify-between transition-colors ${
                isActive ? 'border-accent/60 bg-surface-elevated' : 'hover:border-border-focus'
              }`}
            >
              <div>
                <div className="flex items-start justify-between pb-2 mb-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-primary-subtle'}`} />
                    <h2 className="text-xs font-mono font-bold text-primary">
                      {proj.name}
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-surface-muted text-accent font-semibold border border-border">
                    {proj.environment}
                  </span>
                </div>

                <p className="text-xs text-primary-subtle line-clamp-2 mb-3">
                  {proj.description || 'No description provided.'}
                </p>

                <div className="space-y-1.5 text-[11px] font-mono text-zinc-400">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex-shrink-0">Monitored Repo:</span>
                    <div className="flex items-center gap-1.5 truncate">
                      <a
                        href={proj.repositoryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline truncate max-w-[150px] inline-flex items-center gap-1"
                        title={proj.repositoryUrl}
                      >
                        <span className="truncate">{proj.repositoryUrl.replace('https://github.com/', '')}</span>
                        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                      </a>
                      {role !== 'VIEWER' && (
                        <button
                          onClick={() => {
                            setEditProjectId(proj.id);
                            setNewRepoUrl(proj.repositoryUrl);
                            setEditRepoModalOpen(true);
                          }}
                          className="text-zinc-500 hover:text-primary p-0.5"
                          title="Edit repository link"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Lookback Window:</span>
                    <span className="text-primary">{proj.correlationWindowMinutes}m</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Recorded Deployments:</span>
                    <span className="text-primary">{proj._count?.deployments || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tracked Commits:</span>
                    <span className="text-primary">{proj._count?.commits || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Active Incidents:</span>
                    <span className="text-primary">{proj._count?.incidents || 0}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 mt-4 border-t border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant={isActive ? 'outline' : 'secondary'}
                    size="sm"
                    onClick={() => setActiveProject(proj)}
                  >
                    {isActive ? 'Active' : 'Switch'}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSyncCommits(proj.id)}
                    isLoading={isSyncing}
                    title="Fetch recent commits from GitHub repo"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    <span>Sync</span>
                  </Button>
                </div>

                {role === 'ADMIN' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteProject(proj.id, proj.name)}
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-zinc-500 hover:text-red-400" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Connect & Monitor Repository Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Connect & Monitor Repository"
        description="Enter any GitHub link or repository name to monitor and import recent commits"
      >
        <form onSubmit={handleConnectProject} className="space-y-4">
          <div>
            <Label>GitHub Repository Link or Owner/Repo</Label>
            <Input
              required
              value={repositoryUrl}
              onChange={(e) => {
                const val = e.target.value;
                setRepositoryUrl(val);
                if (!name) {
                  const cleaned = val.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
                  const parts = cleaned.split('/');
                  if (parts.length === 2 && parts[1]) {
                    setName(`${parts[1]} (${parts[0]})`);
                  }
                }
              }}
              placeholder="e.g. https://github.com/facebook/react or vercel/next.js"
            />
            <p className="text-[10px] text-zinc-500 font-mono mt-1">
              Supports full links (https://github.com/...) or short notation (owner/repo).
            </p>
          </div>

          <div>
            <Label>Service / Project Name (Optional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Auto-derived from repository name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Target Environment</Label>
              <Select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </Select>
            </div>
            <div>
              <Label>Lookback Window (Minutes)</Label>
              <Input
                type="number"
                min={5}
                max={1440}
                value={correlationWindowMinutes}
                onChange={(e) => setCorrelationWindowMinutes(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <Label>GitHub Personal Access Token (Optional)</Label>
            <Input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_... (Required only for private repositories)"
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
              Connect & Sync Commits
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Repository Link Modal */}
      <Modal
        isOpen={editRepoModalOpen}
        onClose={() => setEditRepoModalOpen(false)}
        title="Update Monitored Repository Link"
        description="Change the GitHub repository tracked by this service"
      >
        <form onSubmit={handleUpdateRepoUrl} className="space-y-4">
          <div>
            <Label>New Repository URL</Label>
            <Input
              required
              value={newRepoUrl}
              onChange={(e) => setNewRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/new-repo"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditRepoModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSavingRepo}
            >
              Save Repository Link
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
