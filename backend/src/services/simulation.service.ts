import { ProjectRepository } from '../repositories/project.repository';
import { CommitService } from './commit.service';
import { DeploymentService } from './deployment.service';
import { IncidentService } from './incident.service';
import { DeploymentStatus, IncidentSeverity, IncidentStatus } from '../config/constants';
import { logger } from '../utils/logger';

export interface SimulationResult {
  scenarioId: string;
  scenarioTitle: string;
  project: { id: string; name: string; slug: string };
  commit: any;
  deployment: any;
  incident: any;
  confidenceScore: number;
  correlationReason: string;
}

export class SimulationService {
  /**
   * Run an interactive incident attribution scenario
   */
  static async runScenario(scenarioKey: string = 'stripe_breakage', creatorUser?: { id?: string; email?: string; name?: string }): Promise<SimulationResult> {
    // 1. Get or create target demo project
    const projects: any[] = await ProjectRepository.listAll();
    let project: any = projects.find((p: any) => p.slug === 'checkout-service') || projects[0];

    if (!project) {
      project = await ProjectRepository.create({
        name: 'Checkout Core Service',
        slug: 'checkout-service',
        description: 'Mission-critical checkout transaction processor and payment gateway dispatcher',
        repositoryUrl: 'https://github.com/enterprise/checkout-service',
        defaultBranch: 'main',
        environment: 'production',
        correlationWindowMinutes: 90,
      });
    }

    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const now = Date.now();

    if (scenarioKey === 'auth_leak') {
      return this.runAuthLeakScenario(project, randomSuffix, now, creatorUser);
    } else if (scenarioKey === 'db_exhaustion') {
      return this.runDbExhaustionScenario(project, randomSuffix, now, creatorUser);
    } else {
      return this.runStripeBreakageScenario(project, randomSuffix, now, creatorUser);
    }
  }

  /**
   * Scenario 1: Stripe SDK Upgrade & Schema Migration Breakage (High Confidence)
   */
  private static async runStripeBreakageScenario(
    project: any,
    suffix: string,
    now: number,
    creatorUser?: { id?: string; email?: string; name?: string }
  ): Promise<SimulationResult> {
    const commitHash = `c7f912a${suffix}`;
    const version = `v3.${Math.floor(Math.random() * 80) + 20}.0-${suffix}`;
    const commitTime = new Date(now - 14 * 60 * 1000); // 14 mins ago
    const deploymentTime = new Date(now - 10 * 60 * 1000); // 10 mins ago
    const incidentTime = new Date(now - 2 * 60 * 1000); // 2 mins ago

    // 1. Ingest suspect commit touching critical payment & schema files
    const commit = await CommitService.ingestCommit({
      projectId: project.id,
      commitHash,
      authorName: 'Sarah Chen',
      authorEmail: 'sarah.chen@company.internal',
      message: 'feat(billing): upgrade stripe-node from 12.0 to 14.1 & rename customerId to customer_token',
      branch: 'main',
      timestamp: commitTime,
      filesChanged: [
        { path: 'src/gateways/stripe.ts', additions: 48, deletions: 19 },
        { path: 'prisma/schema.prisma', additions: 12, deletions: 4 },
        { path: 'src/config/paymentConfig.ts', additions: 8, deletions: 2 },
      ],
      additions: 68,
      deletions: 25,
    });

    // 2. Record failing deployment
    const deployment = await DeploymentService.recordDeployment(
      {
        projectId: project.id,
        version,
        branch: 'main',
        environment: 'production',
        commitHash,
        status: DeploymentStatus.FAILED,
        developerName: 'Sarah Chen',
        developerEmail: 'sarah.chen@company.internal',
        notes: `Automated canary deployment for ${version}. Sentry healthcheck failed after 3 minutes with 38% error rate spike.`,
        occurredAt: deploymentTime,
      },
      creatorUser
    );

    // 3. Declare production incident
    const { incident, correlation } = await IncidentService.createIncident(
      {
        projectId: project.id,
        title: `Payment Gateway 504 Gateway Timeouts after ${version}`,
        description: `Credit card checkout transactions are failing with HTTP 504 Gateway Timeout. Sentry error rate spiked to 38.4% immediately following the ${version} release.`,
        severity: IncidentSeverity.CRITICAL,
        status: IncidentStatus.INVESTIGATING,
        occurredAt: incidentTime,
      },
      creatorUser || { name: 'Sarah Chen', email: 'sarah.chen@company.internal' }
    );

    logger.info(`[Simulation] Ran Stripe breakage scenario. Incident #${incident.incidentNumber} created with confidence ${correlation.confidenceScore}`);

    return {
      scenarioId: 'stripe_breakage',
      scenarioTitle: 'Stripe SDK Upgrade & Schema Breakage',
      project: { id: project.id, name: project.name, slug: project.slug },
      commit,
      deployment,
      incident,
      confidenceScore: correlation.confidenceScore || 0.94,
      correlationReason: correlation.correlationReasons.join('; ') || 'Proximity to failed release touching critical payment and database files',
    };
  }

  /**
   * Scenario 2: Auth Session Memory Leak (Kubernetes OOM)
   */
  private static async runAuthLeakScenario(
    project: any,
    suffix: string,
    now: number,
    creatorUser?: { id?: string; email?: string; name?: string }
  ): Promise<SimulationResult> {
    const commitHash = `e41b99a${suffix}`;
    const version = `v2.${Math.floor(Math.random() * 50) + 10}.0-${suffix}`;
    const commitTime = new Date(now - 25 * 60 * 1000);
    const deploymentTime = new Date(now - 18 * 60 * 1000);
    const incidentTime = new Date(now - 3 * 60 * 1000);

    const commit = await CommitService.ingestCommit({
      projectId: project.id,
      commitHash,
      authorName: 'Alex Rivera',
      authorEmail: 'alex.rivera@company.internal',
      message: 'fix(auth): cache refresh tokens in global memory map to reduce Redis roundtrips',
      branch: 'main',
      timestamp: commitTime,
      filesChanged: [
        { path: 'src/auth/jwt.service.ts', additions: 145, deletions: 12 },
        { path: 'src/middleware/auth.middleware.ts', additions: 35, deletions: 8 },
        { path: 'src/config/security.ts', additions: 18, deletions: 4 },
      ],
      additions: 198,
      deletions: 24,
    });

    const deployment = await DeploymentService.recordDeployment(
      {
        projectId: project.id,
        version,
        branch: 'main',
        environment: 'production',
        commitHash,
        status: DeploymentStatus.FAILED,
        developerName: 'Alex Rivera',
        developerEmail: 'alex.rivera@company.internal',
        notes: `Production rollout ${version}. Pods crash-looping with OOMKilled code 137.`,
        occurredAt: deploymentTime,
      },
      creatorUser
    );

    const { incident, correlation } = await IncidentService.createIncident(
      {
        projectId: project.id,
        title: `Auth Gateway Pod CrashLoopBackOff: Node Memory Saturation`,
        description: `Authentication gateway instances are restarting continuously. User logins are failing with HTTP 502 Bad Gateway across all web and mobile sessions.`,
        severity: IncidentSeverity.CRITICAL,
        status: IncidentStatus.INVESTIGATING,
        occurredAt: incidentTime,
      },
      creatorUser || { name: 'Alex Rivera', email: 'alex.rivera@company.internal' }
    );

    return {
      scenarioId: 'auth_leak',
      scenarioTitle: 'Auth Token Memory Leak & Pod Restarts',
      project: { id: project.id, name: project.name, slug: project.slug },
      commit,
      deployment,
      incident,
      confidenceScore: correlation.confidenceScore || 0.91,
      correlationReason: correlation.correlationReasons.join('; ') || 'Failed release touching authentication core modules',
    };
  }

  /**
   * Scenario 3: Database Connection Pool Exhaustion
   */
  private static async runDbExhaustionScenario(
    project: any,
    suffix: string,
    now: number,
    creatorUser?: { id?: string; email?: string; name?: string }
  ): Promise<SimulationResult> {
    const commitHash = `f93012b${suffix}`;
    const version = `v1.${Math.floor(Math.random() * 30) + 10}.0-${suffix}`;
    const commitTime = new Date(now - 12 * 60 * 1000);
    const deploymentTime = new Date(now - 8 * 60 * 1000);
    const incidentTime = new Date(now - 1 * 60 * 1000);

    const commit = await CommitService.ingestCommit({
      projectId: project.id,
      commitHash,
      authorName: 'David Kim',
      authorEmail: 'david.kim@company.internal',
      message: 'perf(db): decrease maxPoolSize from 50 to 5 to reduce postgres thread overhead',
      branch: 'main',
      timestamp: commitTime,
      filesChanged: [
        { path: 'src/config/database.ts', additions: 4, deletions: 4 },
        { path: 'src/repositories/invoice.repo.ts', additions: 85, deletions: 20 },
      ],
      additions: 89,
      deletions: 24,
    });

    const deployment = await DeploymentService.recordDeployment(
      {
        projectId: project.id,
        version,
        branch: 'main',
        environment: 'production',
        commitHash,
        status: DeploymentStatus.FAILED,
        developerName: 'David Kim',
        developerEmail: 'david.kim@company.internal',
        notes: `Production release ${version}. Database connection pool timed out under peak traffic.`,
        occurredAt: deploymentTime,
      },
      creatorUser
    );

    const { incident, correlation } = await IncidentService.createIncident(
      {
        projectId: project.id,
        title: `PrismaClientKnownRequestError: Timed out fetching a new connection from the pool`,
        description: `API requests timing out after 10000ms waiting for available PostgreSQL database connections. Queue depth exceeds 500 requests.`,
        severity: IncidentSeverity.HIGH,
        status: IncidentStatus.INVESTIGATING,
        occurredAt: incidentTime,
      },
      creatorUser || { name: 'David Kim', email: 'david.kim@company.internal' }
    );

    return {
      scenarioId: 'db_exhaustion',
      scenarioTitle: 'Database Connection Pool Starvation',
      project: { id: project.id, name: project.name, slug: project.slug },
      commit,
      deployment,
      incident,
      confidenceScore: correlation.confidenceScore || 0.95,
      correlationReason: correlation.correlationReasons.join('; ') || 'Immediate outage following database configuration change',
    };
  }

  /**
   * Deploy a healthy release for the mock target app
   */
  static async deployHealthyRelease(creatorUser?: { id?: string; email?: string; name?: string }) {
    const projects: any[] = await ProjectRepository.listAll();
    let project: any = projects.find((p: any) => p.slug === 'checkout-service') || projects[0];

    const suffix = Math.random().toString(36).substring(2, 6);
    const commitHash = `a1b2c3d${suffix}`;
    const version = `v3.${Math.floor(Math.random() * 50) + 30}.0-${suffix}`;

    const commit = await CommitService.ingestCommit({
      projectId: project.id,
      commitHash,
      authorName: 'Sarah Chen',
      authorEmail: 'sarah.chen@company.internal',
      message: 'chore(ui): refine checkout button styles & telemetry metrics',
      branch: 'main',
      timestamp: new Date(),
      filesChanged: [
        { path: 'src/components/CheckoutButton.tsx', additions: 15, deletions: 4 },
      ],
      additions: 15,
      deletions: 4,
    });

    const deployment = await DeploymentService.recordDeployment(
      {
        projectId: project.id,
        version,
        branch: 'main',
        environment: 'production',
        commitHash,
        status: DeploymentStatus.SUCCESS,
        developerName: 'Sarah Chen',
        developerEmail: 'sarah.chen@company.internal',
        notes: `Healthy production deployment ${version}. All unit tests and canary health checks passed.`,
        occurredAt: new Date(),
      },
      creatorUser
    );

    return { commit, deployment, version };
  }
}
