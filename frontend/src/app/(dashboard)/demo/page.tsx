'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  GitCommit,
  Rocket,
  ShieldAlert,
  Server,
  Activity,
  Zap,
  Check,
  RefreshCw,
} from 'lucide-react';
import { apiRequest } from '../../../lib/api';

interface SimulationResult {
  scenarioId: string;
  scenarioTitle: string;
  project: { id: string; name: string; slug: string };
  commit: {
    commitHash: string;
    authorName: string;
    message: string;
    filesChanged: string;
    additions: number;
    deletions: number;
  };
  deployment: {
    version: string;
    status: string;
    notes: string;
  };
  incident: {
    id: string;
    incidentNumber: number;
    title: string;
    severity: string;
    status: string;
  };
  confidenceScore: number;
  correlationReason: string;
}

export default function DemoPage() {
  const [runningScenario, setRunningScenario] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<SimulationResult | null>(null);
  const [targetSiteStatus, setTargetSiteStatus] = useState<'HEALTHY' | 'OUTAGE'>('HEALTHY');
  const [mockVersion, setMockVersion] = useState('v3.28.0');
  const [errorRate, setErrorRate] = useState('0.02%');
  const [latency, setLatency] = useState('38ms');

  // Trigger scenario
  const handleRunScenario = async (scenarioKey: string) => {
    setRunningScenario(scenarioKey);
    try {
      const res = await apiRequest<SimulationResult>('/demo/run-scenario', {
        method: 'POST',
        body: JSON.stringify({ scenarioId: scenarioKey }),
      });

      setLatestResult(res);
      setTargetSiteStatus('OUTAGE');
      setMockVersion(res.deployment.version);
      setErrorRate('38.4%');
      setLatency('8,420ms');
    } catch (err: any) {
      alert(`Simulation error: ${err.message || 'Failed to trigger scenario'}`);
    } finally {
      setRunningScenario(null);
    }
  };

  // Trigger healthy deployment
  const handleDeployHealthy = async () => {
    setRunningScenario('healthy');
    try {
      const res = await apiRequest<{ version: string }>('/demo/deploy-healthy', {
        method: 'POST',
      });

      setTargetSiteStatus('HEALTHY');
      setMockVersion(res.version);
      setErrorRate('0.01%');
      setLatency('41ms');
      setLatestResult(null);
    } catch (err: any) {
      alert(`Deployment error: ${err.message || 'Failed to deploy'}`);
    } finally {
      setRunningScenario(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
            <FlaskConical className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono text-xs text-accent uppercase tracking-wider font-semibold">
            Interactive Test Lab
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Demo Site & Incident Sandbox
        </h1>
        <p className="text-sm text-primary-subtle mt-1 max-w-3xl">
          Test end-to-end incident attribution, commit correlation, and live war room investigation without external setups. Click below to deploy a healthy release or break the demo target app.
        </p>
      </div>

      {/* SECTION 1: THE DEMO TARGET APP ("ShopFast Storefront") */}
      <div className="rounded-lg border border-border bg-surface p-6 shadow-subtle">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-primary">
              <Server className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-primary">
                  Demo Target App: ShopFast Storefront
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-border bg-surface-elevated text-primary-subtle">
                  checkout-service
                </span>
              </div>
              <p className="text-xs text-primary-subtle mt-0.5">
                Simulated microservice monitored continuously by Who Broke The Build
              </p>
            </div>
          </div>

          {/* Live Status Pill */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-semibold ${
                targetSiteStatus === 'HEALTHY'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                  : 'bg-red-950/40 border-red-500/50 text-red-400 animate-pulse'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  targetSiteStatus === 'HEALTHY' ? 'bg-emerald-400' : 'bg-red-400'
                }`}
              />
              <span>
                {targetSiteStatus === 'HEALTHY'
                  ? 'HTTP 200 OK — HEALTHY'
                  : 'HTTP 504 TIMEOUT — OUTAGE'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3.5 rounded-md bg-surface-elevated border border-border">
            <div className="text-[11px] font-mono text-primary-subtle">Running Version</div>
            <div className="text-base font-mono font-bold text-primary mt-1 truncate">
              {mockVersion}
            </div>
          </div>

          <div className="p-3.5 rounded-md bg-surface-elevated border border-border">
            <div className="text-[11px] font-mono text-primary-subtle">Traffic Volume</div>
            <div className="text-base font-mono font-bold text-primary mt-1">
              1,420 req/sec
            </div>
          </div>

          <div className="p-3.5 rounded-md bg-surface-elevated border border-border">
            <div className="text-[11px] font-mono text-primary-subtle">Sentry Error Rate</div>
            <div
              className={`text-base font-mono font-bold mt-1 ${
                targetSiteStatus === 'HEALTHY' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {errorRate}
            </div>
          </div>

          <div className="p-3.5 rounded-md bg-surface-elevated border border-border">
            <div className="text-[11px] font-mono text-primary-subtle">P99 Latency</div>
            <div
              className={`text-base font-mono font-bold mt-1 ${
                targetSiteStatus === 'HEALTHY' ? 'text-primary' : 'text-red-400'
              }`}
            >
              {latency}
            </div>
          </div>
        </div>

        {/* Action Buttons for the Target App */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleRunScenario('stripe_breakage')}
            disabled={runningScenario !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-950/40 hover:bg-red-900/50 border border-red-500/50 text-red-200 text-xs font-mono font-semibold transition-all disabled:opacity-50"
          >
            <Flame className="w-4 h-4 text-red-400" />
            <span>
              {runningScenario === 'stripe_breakage'
                ? 'Simulating Outage...'
                : '💥 Deploy Breaking Commit & Crash App'}
            </span>
          </button>

          <button
            onClick={handleDeployHealthy}
            disabled={runningScenario !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-surface-elevated hover:bg-surface-hover border border-border hover:border-accent text-xs font-mono text-primary transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              {runningScenario === 'healthy'
                ? 'Deploying Clean Release...'
                : '🚀 Deploy Healthy Release (Reset Status)'}
            </span>
          </button>
        </div>
      </div>

      {/* LATEST RESULT HERO CARD */}
      {latestResult && (
        <div className="rounded-lg border-2 border-accent/40 bg-accent/5 p-6 shadow-modal animate-fade-in">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-red-500/20 text-red-300 border border-red-500/30">
                  Incident Opened #{latestResult.incident.incidentNumber}
                </span>
                <span className="text-xs font-mono text-accent font-semibold">
                  {Math.round(latestResult.confidenceScore * 100)}% Attribution Confidence
                </span>
              </div>
              <h3 className="text-lg font-bold text-primary">
                {latestResult.incident.title}
              </h3>
              <p className="text-xs text-primary-subtle">
                The Relationship Engine correlated this failure to release{' '}
                <strong className="text-primary font-mono">{latestResult.deployment.version}</strong>{' '}
                and commit{' '}
                <strong className="text-primary font-mono">{latestResult.commit.commitHash.substring(0, 7)}</strong>{' '}
                by <strong className="text-primary">{latestResult.commit.authorName}</strong>.
              </p>
            </div>

            <Link
              href={`/incidents/${latestResult.incident.id}`}
              className="flex items-center gap-2 px-4 py-2 rounded bg-accent hover:bg-accent-hover text-background font-mono text-xs font-bold transition-colors whitespace-nowrap flex-shrink-0"
            >
              <span>Investigate War Room</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-4 p-3 rounded bg-surface border border-border font-mono text-xs text-zinc-300">
            <div className="text-[10px] text-zinc-500 uppercase font-semibold mb-1">
              Deterministic Correlation Rationale:
            </div>
            {latestResult.correlationReason}
          </div>
        </div>
      )}

      {/* SECTION 2: 3 REALISTIC ENGINEERING SCENARIO CARDS */}
      <div>
        <h2 className="text-base font-semibold text-primary mb-3">
          Or Test Specific Incident Scenarios
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Scenario 1 */}
          <div className="rounded-lg border border-border bg-surface p-5 flex flex-col justify-between hover:border-zinc-700 transition-colors">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                  SEV-1 CRITICAL
                </span>
                <span className="text-[11px] font-mono text-accent">~98% Confidence</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary">
                  Stripe SDK & Schema Breakage
                </h3>
                <p className="text-xs text-primary-subtle mt-1">
                  Commit modifies Stripe SDK client and database schema. Production checkout fails with 504 timeouts.
                </p>
              </div>

              <div className="space-y-1.5 text-[11px] font-mono text-zinc-400 border-t border-border/60 pt-3">
                <div className="flex justify-between">
                  <span>Author:</span>
                  <span className="text-zinc-200">Sarah Chen</span>
                </div>
                <div className="flex justify-between">
                  <span>Target:</span>
                  <span className="text-zinc-200">checkout-service</span>
                </div>
                <div className="flex justify-between">
                  <span>Touched:</span>
                  <span className="text-amber-400 truncate max-w-[140px]">stripe.ts, schema.prisma</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleRunScenario('stripe_breakage')}
              disabled={runningScenario !== null}
              className="mt-5 w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-surface-elevated hover:bg-surface-hover border border-border hover:border-accent text-xs font-mono text-primary transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 text-accent" />
              <span>{runningScenario === 'stripe_breakage' ? 'Running...' : 'Run Scenario'}</span>
            </button>
          </div>

          {/* Scenario 2 */}
          <div className="rounded-lg border border-border bg-surface p-5 flex flex-col justify-between hover:border-zinc-700 transition-colors">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  SEV-2 HIGH
                </span>
                <span className="text-[11px] font-mono text-accent">~91% Confidence</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary">
                  Auth Session Memory Leak
                </h3>
                <p className="text-xs text-primary-subtle mt-1">
                  Global map memory leak in JWT refresh token cache causes Kubernetes pods to crash with OOM 137.
                </p>
              </div>

              <div className="space-y-1.5 text-[11px] font-mono text-zinc-400 border-t border-border/60 pt-3">
                <div className="flex justify-between">
                  <span>Author:</span>
                  <span className="text-zinc-200">Alex Rivera</span>
                </div>
                <div className="flex justify-between">
                  <span>Target:</span>
                  <span className="text-zinc-200">auth-gateway</span>
                </div>
                <div className="flex justify-between">
                  <span>Touched:</span>
                  <span className="text-amber-400 truncate max-w-[140px]">jwt.service.ts, auth.ts</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleRunScenario('auth_leak')}
              disabled={runningScenario !== null}
              className="mt-5 w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-surface-elevated hover:bg-surface-hover border border-border hover:border-accent text-xs font-mono text-primary transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 text-accent" />
              <span>{runningScenario === 'auth_leak' ? 'Running...' : 'Run Scenario'}</span>
            </button>
          </div>

          {/* Scenario 3 */}
          <div className="rounded-lg border border-border bg-surface p-5 flex flex-col justify-between hover:border-zinc-700 transition-colors">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                  SEV-1 CRITICAL
                </span>
                <span className="text-[11px] font-mono text-accent">~95% Confidence</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary">
                  Database Pool Starvation
                </h3>
                <p className="text-xs text-primary-subtle mt-1">
                  Database configuration drops pool size from 50 to 5. Backend times out waiting for connections.
                </p>
              </div>

              <div className="space-y-1.5 text-[11px] font-mono text-zinc-400 border-t border-border/60 pt-3">
                <div className="flex justify-between">
                  <span>Author:</span>
                  <span className="text-zinc-200">David Kim</span>
                </div>
                <div className="flex justify-between">
                  <span>Target:</span>
                  <span className="text-zinc-200">billing-engine</span>
                </div>
                <div className="flex justify-between">
                  <span>Touched:</span>
                  <span className="text-amber-400 truncate max-w-[140px]">database.ts, invoice.repo.ts</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleRunScenario('db_exhaustion')}
              disabled={runningScenario !== null}
              className="mt-5 w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-surface-elevated hover:bg-surface-hover border border-border hover:border-accent text-xs font-mono text-primary transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 text-accent" />
              <span>{runningScenario === 'db_exhaustion' ? 'Running...' : 'Run Scenario'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: QUICK NAVIGATION GUIDE */}
      <div className="p-4 rounded-md border border-border bg-surface-elevated/40 text-xs font-mono text-primary-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-primary font-bold">Need to see the full event stream?</span> Every scenario runs live commits, deployments, and alerts into the unified timeline.
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/timeline"
            className="hover:text-accent underline transition-colors"
          >
            Open Unified Timeline →
          </Link>
          <Link
            href="/incidents"
            className="hover:text-accent underline transition-colors"
          >
            All Incidents →
          </Link>
        </div>
      </div>
    </div>
  );
}
