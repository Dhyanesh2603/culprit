'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Copy,
  Check,
  Webhook,
  Sliders,
  Terminal,
  Shield,
  FolderGit2,
  RefreshCw,
  ExternalLink,
  Github,
} from 'lucide-react';
import { useProject } from '../../../context/ProjectContext';
import { useAuth } from '../../../context/AuthContext';
import { apiRequest } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Label, Textarea } from '../../../components/ui/FormControls';

export default function SettingsPage() {
  const { activeProject, refreshProjects } = useProject();
  const { role } = useAuth();

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Repository Link State
  const [repoUrl, setRepoUrl] = useState(activeProject?.repositoryUrl || '');
  const [githubToken, setGithubToken] = useState('');
  const [isSavingRepo, setIsSavingRepo] = useState(false);
  const [isSyncingCommits, setIsSyncingCommits] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Correlation Window
  const [windowMinutes, setWindowMinutes] = useState(
    activeProject?.correlationWindowMinutes || 60
  );
  const [isSavingWindow, setIsSavingWindow] = useState(false);

  useEffect(() => {
    if (activeProject) {
      setRepoUrl(activeProject.repositoryUrl || '');
      setWindowMinutes(activeProject.correlationWindowMinutes || 60);
    }
  }, [activeProject]);

  const webhookUrl = activeProject
    ? `http://localhost:5000/api/v1/webhooks/github?projectId=${activeProject.id}`
    : 'Select a project';

  const webhookSecret = activeProject?.webhookSecret || 'whsec_demo_secret_key_12345';

  const curlSnippet = `curl -X POST http://localhost:5000/api/v1/deployments \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer dev-token:admin" \\
  -d '{
    "projectId": "${activeProject?.id || 'PROJECT_ID'}",
    "version": "v3.13.0",
    "commitHash": "8f921e4",
    "branch": "main",
    "environment": "production",
    "developerEmail": "sarah.chen@company.internal",
    "developerName": "Sarah Chen",
    "status": "SUCCESS",
    "notes": "Automated deployment via GitHub Actions"
  }'`;

  const handleSaveRepoUrl = async () => {
    if (!activeProject || !repoUrl.trim()) return;
    setIsSavingRepo(true);
    setSyncMessage(null);
    try {
      await apiRequest(`/projects/${activeProject.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ repositoryUrl: repoUrl.trim() }),
      });
      await refreshProjects();
      setSyncMessage('✓ Repository link saved successfully.');
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update repository URL');
    } finally {
      setIsSavingRepo(false);
    }
  };

  const handleSyncCommitsNow = async () => {
    if (!activeProject) return;
    setIsSyncingCommits(true);
    setSyncMessage(null);
    try {
      const res: any = await apiRequest(`/projects/${activeProject.id}/sync-github`, {
        method: 'POST',
        body: JSON.stringify({
          githubToken: githubToken.trim() || undefined,
        }),
      });
      await refreshProjects();
      setSyncMessage(`✓ Synced ${res.syncedCount || 0} commits from ${res.repository || 'repository'}!`);
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to sync commits from repository');
    } finally {
      setIsSyncingCommits(false);
    }
  };

  const handleSaveWindow = async () => {
    if (!activeProject) return;
    setIsSavingWindow(true);
    try {
      await apiRequest(`/projects/${activeProject.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ correlationWindowMinutes: windowMinutes }),
      });
      alert('Correlation window updated successfully.');
      await refreshProjects();
    } catch (err: any) {
      alert(err.message || 'Failed to update correlation window');
    } finally {
      setIsSavingWindow(false);
    }
  };

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-lg font-bold tracking-tight text-primary font-mono uppercase">
          Project & Engine Settings
        </h1>
        <p className="text-xs text-primary-subtle mt-0.5">
          Configure monitored repository link, GitHub commit synchronization, webhooks, and Relationship Engine parameters for {activeProject?.name}.
        </p>
      </div>

      {/* Repository Link & Live Commit Sync Card */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-accent" />
            <h2 className="text-xs font-mono font-semibold uppercase text-primary">
              Monitored Git Repository Link & Sync
            </h2>
          </div>
          {activeProject?.repositoryUrl && (
            <a
              href={activeProject.repositoryUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono text-accent hover:underline flex items-center gap-1"
            >
              <span>View On GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <p className="text-xs text-primary-subtle leading-relaxed">
          Specify the repository link or GitHub path you want Who Broke The Build to monitor. You can sync recent commits on demand to populate the telemetry stream and enable root cause attribution.
        </p>

        {syncMessage && (
          <div className="p-2.5 rounded border border-emerald-900/60 bg-emerald-950/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{syncMessage}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label>Monitored Repository Link / Path</Label>
            <div className="flex items-center gap-2">
              <Input
                disabled={role === 'VIEWER'}
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/facebook/react or owner/repo"
                className="font-mono text-xs"
              />
              {role !== 'VIEWER' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveRepoUrl}
                  isLoading={isSavingRepo}
                >
                  Save Link
                </Button>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 font-mono mt-1">
              Supports full links (e.g. https://github.com/owner/repo) or owner/repo shorthand.
            </p>
          </div>

          <div>
            <Label>GitHub Personal Access Token (Optional for Private Repos)</Label>
            <Input
              disabled={role === 'VIEWER'}
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_... (Only required if your repository is private)"
              className="font-mono text-xs"
            />
          </div>

          {role !== 'VIEWER' && (
            <div className="pt-2">
              <Button
                variant="accent"
                size="sm"
                onClick={handleSyncCommitsNow}
                isLoading={isSyncingCommits}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                <span>Fetch & Sync Recent Commits from Repository</span>
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* GitHub Webhook Configuration Card */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Webhook className="w-4 h-4 text-accent" />
          <h2 className="text-xs font-mono font-semibold uppercase text-primary">
            GitHub Webhook Integration (Automatic Telemetry)
          </h2>
        </div>

        <p className="text-xs text-primary-subtle leading-relaxed">
          Configure a webhook in your GitHub repository (<span className="font-mono text-primary">Settings &gt; Webhooks</span>) to automatically stream push events (commits) and deployment status events into Who Broke The Build.
        </p>

        <div className="space-y-3">
          <div>
            <Label>Payload URL</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={webhookUrl} className="font-mono text-xs" />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(webhookUrl, setCopiedUrl)}
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          <div>
            <Label>Webhook Secret</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={webhookSecret} className="font-mono text-xs" />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(webhookSecret, setCopiedSecret)}
              >
                {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Relationship Engine Configuration Card */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Sliders className="w-4 h-4 text-accent" />
          <h2 className="text-xs font-mono font-semibold uppercase text-primary">
            Relationship Engine Time Window
          </h2>
        </div>

        <p className="text-xs text-primary-subtle leading-relaxed">
          When an outage or incident occurs, the Relationship Engine inspects all deployments and commits within this lookback window prior to the incident failure timestamp.
        </p>

        <div className="flex items-center gap-4 max-w-sm">
          <div className="flex-1">
            <Label>Lookback Window (Minutes)</Label>
            <Input
              disabled={role === 'VIEWER'}
              type="number"
              min={5}
              max={1440}
              value={windowMinutes}
              onChange={(e) => setWindowMinutes(Number(e.target.value))}
            />
          </div>
          {role !== 'VIEWER' && (
            <div className="pt-5">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveWindow}
                isLoading={isSavingWindow}
              >
                Save Window
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* CI/CD cURL Snippet Card */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-accent" />
            <h2 className="text-xs font-mono font-semibold uppercase text-primary">
              CI/CD Pipeline Telemetry Example (cURL)
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(curlSnippet, setCopiedCurl)}
          >
            {copiedCurl ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>

        <div className="rounded border border-border bg-background p-3 font-mono text-[11px] text-zinc-300 overflow-x-auto whitespace-pre">
          {curlSnippet}
        </div>
      </Card>
    </div>
  );
}
