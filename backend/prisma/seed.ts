import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding "WHO BROKE THE BUILD?" database...');

  // 1. Clean existing records
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.timelineEvent.deleteMany();
  await prisma.incidentComment.deleteMany();
  await prisma.incidentAssignment.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.commit.deleteMany();
  await prisma.deployment.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users
  const sarah = await prisma.user.create({
    data: {
      email: 'sarah.chen@company.internal',
      name: 'Sarah Chen',
      role: 'ADMIN',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      firebaseUid: 'sarah-admin-uid',
    },
  });

  const alex = await prisma.user.create({
    data: {
      email: 'alex.rivera@company.internal',
      name: 'Alex Rivera',
      role: 'DEVELOPER',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      firebaseUid: 'alex-dev-uid',
    },
  });

  const marcus = await prisma.user.create({
    data: {
      email: 'marcus.vance@company.internal',
      name: 'Marcus Vance',
      role: 'DEVELOPER',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      firebaseUid: 'marcus-dev-uid',
    },
  });

  const elena = await prisma.user.create({
    data: {
      email: 'elena.rostova@company.internal',
      name: 'Elena Rostova',
      role: 'VIEWER',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      firebaseUid: 'elena-viewer-uid',
    },
  });

  // Default demo user for instant developer testing
  const demoUser = await prisma.user.create({
    data: {
      email: 'developer@whobrokethebuild.internal',
      name: 'Staff Engineer (Demo)',
      role: 'ADMIN',
      firebaseUid: 'dev-uid-admin',
    },
  });

  // 3. Create Projects
  const checkoutProj = await prisma.project.create({
    data: {
      name: 'Checkout Core Service',
      slug: 'checkout-service',
      description: 'Mission-critical checkout transaction processor and payment gateway dispatcher',
      repositoryUrl: 'https://github.com/enterprise/checkout-service',
      defaultBranch: 'main',
      environment: 'production',
      correlationWindowMinutes: 90,
      webhookSecret: 'whsec_checkout_demo12345',
    },
  });

  const authProj = await prisma.project.create({
    data: {
      name: 'Auth Gateway',
      slug: 'auth-gateway',
      description: 'Distributed OAuth2 & JWT session validation edge service',
      repositoryUrl: 'https://github.com/enterprise/auth-gateway',
      defaultBranch: 'main',
      environment: 'production',
      correlationWindowMinutes: 60,
    },
  });

  const billingProj = await prisma.project.create({
    data: {
      name: 'Billing Engine',
      slug: 'billing-engine',
      description: 'Subscription lifecycle, invoicing, and revenue reconciliation engine',
      repositoryUrl: 'https://github.com/enterprise/billing-engine',
      defaultBranch: 'main',
      environment: 'production',
      correlationWindowMinutes: 120,
    },
  });

  // Project Members
  for (const proj of [checkoutProj, authProj, billingProj]) {
    await prisma.projectMember.createMany({
      data: [
        { projectId: proj.id, userId: sarah.id, role: 'ADMIN' },
        { projectId: proj.id, userId: alex.id, role: 'DEVELOPER' },
        { projectId: proj.id, userId: marcus.id, role: 'DEVELOPER' },
        { projectId: proj.id, userId: elena.id, role: 'VIEWER' },
        { projectId: proj.id, userId: demoUser.id, role: 'ADMIN' },
      ],
    });
  }

  // 4. Create Historical Commits & Deployments for Checkout Service
  const now = new Date();
  const timeMinusMins = (mins: number) => new Date(now.getTime() - mins * 60 * 1000);

  // Older stable deployment
  const depV311 = await prisma.deployment.create({
    data: {
      projectId: checkoutProj.id,
      version: 'v3.11.0',
      commitHash: 'a7b8c9d1e2f3',
      branch: 'main',
      environment: 'production',
      developerEmail: sarah.email,
      developerName: sarah.name,
      status: 'SUCCESS',
      notes: 'Routine weekly release with checkout latency improvements',
      occurredAt: timeMinusMins(240),
    },
  });

  await prisma.commit.create({
    data: {
      projectId: checkoutProj.id,
      commitHash: 'a7b8c9d1e2f3',
      authorName: sarah.name,
      authorEmail: sarah.email,
      message: 'perf(checkout): optimize cart cache serialization',
      branch: 'main',
      filesChanged: JSON.stringify([
        { path: 'src/services/cart.service.ts', additions: 18, deletions: 7 },
      ]),
      additions: 18,
      deletions: 7,
      timestamp: timeMinusMins(250),
      deploymentId: depV311.id,
    },
  });

  // Recent Bad Deployment v3.12.0
  const depV312 = await prisma.deployment.create({
    data: {
      projectId: checkoutProj.id,
      version: 'v3.12.0',
      commitHash: '8f921e4b3c01',
      branch: 'main',
      environment: 'production',
      developerEmail: alex.email,
      developerName: alex.name,
      status: 'FAILED',
      notes: 'Upgraded Stripe SDK and enabled new 3D Secure Webhook Verification',
      occurredAt: timeMinusMins(35),
    },
  });

  const commitCulprit = await prisma.commit.create({
    data: {
      projectId: checkoutProj.id,
      commitHash: '8f921e4b3c01',
      authorName: alex.name,
      authorEmail: alex.email,
      message: 'feat(payments): upgrade stripe client to v16.2.0 and enforce idempotent locks',
      branch: 'main',
      filesChanged: JSON.stringify([
        { path: 'src/gateways/stripe.ts', additions: 142, deletions: 38 },
        { path: 'src/config/paymentConfig.ts', additions: 24, deletions: 6 },
        { path: 'prisma/schema.prisma', additions: 12, deletions: 2 },
      ]),
      additions: 178,
      deletions: 46,
      timestamp: timeMinusMins(42),
      deploymentId: depV312.id,
    },
  });

  const commitSecondary = await prisma.commit.create({
    data: {
      projectId: checkoutProj.id,
      commitHash: '3c8e19d72a44',
      authorName: marcus.name,
      authorEmail: marcus.email,
      message: 'fix(docker): update node memory limit flag to 2048MB',
      branch: 'main',
      filesChanged: JSON.stringify([
        { path: 'Dockerfile', additions: 2, deletions: 2 },
      ]),
      additions: 2,
      deletions: 2,
      timestamp: timeMinusMins(38),
      deploymentId: depV312.id,
    },
  });

  // 5. Create Incidents
  // Active Sev 1 Incident: Correlated with Alex's commit & v3.12.0 deployment!
  const inc1 = await prisma.incident.create({
    data: {
      incidentNumber: 101,
      projectId: checkoutProj.id,
      title: 'Payment Gateway 504 Gateway Timeouts after Stripe SDK update',
      description: 'Credit card checkout transactions are failing with HTTP 504 Gateway Timeout. Sentry error rate spiked to 34% immediately following the v3.12.0 release.',
      severity: 'CRITICAL',
      status: 'INVESTIGATING',
      creatorId: sarah.id,
      occurredAt: timeMinusMins(22),
      suggestedDeploymentId: depV312.id,
      suggestedCommitId: commitCulprit.id,
      confidenceScore: 0.94,
      correlationReason: 'Deployment v3.12.0 completed 13 minutes prior to incident; Deployment v3.12.0 reported FAILED status; Commit 8f921e4 touched critical infrastructure: src/gateways/stripe.ts, src/config/paymentConfig.ts, prisma/schema.prisma',
      version: 1,
    },
  });

  // Assign responders
  await prisma.incidentAssignment.createMany({
    data: [
      { incidentId: inc1.id, userId: alex.id, assignedBy: sarah.id },
      { incidentId: inc1.id, userId: sarah.id, assignedBy: sarah.id },
      { incidentId: inc1.id, userId: marcus.id, assignedBy: sarah.id },
    ],
  });

  // Comments in Incident War Room
  await prisma.incidentComment.create({
    data: {
      incidentId: inc1.id,
      userId: sarah.id,
      content: 'Paging @alex and @marcus. Seeing 504 errors in US-East checkout cluster. Tracing shows Stripe idempotency locks hanging indefinitely.',
      createdAt: timeMinusMins(18),
    },
  });

  await prisma.incidentComment.create({
    data: {
      incidentId: inc1.id,
      userId: alex.id,
      content: 'Looking into `src/gateways/stripe.ts`. The new SDK version enabled synchronous lock pooling which exhausted PostgreSQL connection pools.',
      createdAt: timeMinusMins(14),
    },
  });

  await prisma.incidentComment.create({
    data: {
      incidentId: inc1.id,
      userId: marcus.id,
      content: 'Preparing immediate rollback of v3.12.0 back to v3.11.0 in Kubernetes cluster.',
      createdAt: timeMinusMins(8),
    },
  });

  // Historical Resolved Incident
  const inc2 = await prisma.incident.create({
    data: {
      incidentNumber: 100,
      projectId: authProj.id,
      title: 'JWT Token Verification Failure on Edge Routers',
      description: 'Public key rotation caused edge routers to reject incoming bearer tokens for 15 minutes.',
      severity: 'HIGH',
      status: 'RESOLVED',
      creatorId: marcus.id,
      rootCause: 'RS256 public key caching TTL was set to 24 hours instead of 5 minutes during key rollover.',
      resolution: 'Invalidated Redis edge key cache and configured dynamic cache invalidation webhook.',
      occurredAt: timeMinusMins(1440), // 24 hours ago
      resolvedAt: timeMinusMins(1405), // 35 min resolution
      confidenceScore: 0.88,
      correlationReason: 'Deployment v2.4.1 completed 6 minutes prior to incident; Modified edge auth configuration.',
      version: 2,
    },
  });

  // 6. Timeline Events
  const timelineData = [
    {
      projectId: checkoutProj.id,
      deploymentId: depV311.id,
      eventType: 'DEPLOYMENT',
      title: 'Deployed: v3.11.0 (main)',
      description: 'Routine weekly release with checkout latency improvements',
      actorEmail: sarah.email,
      actorName: sarah.name,
      occurredAt: timeMinusMins(240),
      metadata: JSON.stringify({ version: 'v3.11.0', status: 'SUCCESS' }),
    },
    {
      projectId: checkoutProj.id,
      commitId: commitCulprit.id,
      eventType: 'COMMIT',
      title: 'Commit 8f921e4: feat(payments): upgrade stripe client to v16.2.0',
      description: 'Author: Alex Rivera (alex.rivera@company.internal) | +178 -46',
      actorEmail: alex.email,
      actorName: alex.name,
      occurredAt: timeMinusMins(42),
      metadata: JSON.stringify({ commitHash: '8f921e4b3c01', additions: 178, deletions: 46 }),
    },
    {
      projectId: checkoutProj.id,
      commitId: commitSecondary.id,
      eventType: 'COMMIT',
      title: 'Commit 3c8e19d: fix(docker): update node memory limit flag',
      description: 'Author: Marcus Vance (marcus.vance@company.internal) | +2 -2',
      actorEmail: marcus.email,
      actorName: marcus.name,
      occurredAt: timeMinusMins(38),
      metadata: JSON.stringify({ commitHash: '3c8e19d72a44', additions: 2, deletions: 2 }),
    },
    {
      projectId: checkoutProj.id,
      deploymentId: depV312.id,
      eventType: 'DEPLOYMENT',
      title: 'Deployed: v3.12.0 (main) - FAILED',
      description: 'Upgraded Stripe SDK and enabled new 3D Secure Webhook Verification',
      actorEmail: alex.email,
      actorName: alex.name,
      occurredAt: timeMinusMins(35),
      metadata: JSON.stringify({ version: 'v3.12.0', status: 'FAILED' }),
    },
    {
      projectId: checkoutProj.id,
      incidentId: inc1.id,
      eventType: 'INCIDENT_CREATED',
      title: 'Incident #101 Opened: Payment Gateway 504 Gateway Timeouts',
      description: 'Credit card checkout transactions are failing with HTTP 504 Gateway Timeout.',
      actorEmail: sarah.email,
      actorName: sarah.name,
      occurredAt: timeMinusMins(22),
      metadata: JSON.stringify({ severity: 'CRITICAL', status: 'INVESTIGATING', confidenceScore: 0.94 }),
    },
    {
      projectId: checkoutProj.id,
      incidentId: inc1.id,
      eventType: 'ASSIGNMENT',
      title: 'Responders assigned to Incident #101',
      description: 'Alex Rivera, Sarah Chen, and Marcus Vance assigned to war room.',
      actorEmail: sarah.email,
      actorName: sarah.name,
      occurredAt: timeMinusMins(20),
    },
    {
      projectId: checkoutProj.id,
      incidentId: inc1.id,
      eventType: 'COMMENT',
      title: 'Comment from Sarah Chen',
      description: 'Paging @alex and @marcus. Seeing 504 errors in US-East checkout cluster...',
      actorEmail: sarah.email,
      actorName: sarah.name,
      occurredAt: timeMinusMins(18),
    },
  ];

  for (const item of timelineData) {
    await prisma.timelineEvent.create({ data: item });
  }

  // 7. Audit Logs
  await prisma.auditLog.create({
    data: {
      projectId: checkoutProj.id,
      userId: sarah.id,
      userEmail: sarah.email,
      action: 'CREATE_INCIDENT',
      entityType: 'INCIDENT',
      entityId: inc1.id,
      afterState: JSON.stringify(inc1),
      occurredAt: timeMinusMins(22),
    },
  });

  console.log('✓ Seeding complete!');
  console.log(`  Users: 5`);
  console.log(`  Projects: 3 (checkout-service, auth-gateway, billing-engine)`);
  console.log(`  Incidents: 2 (1 active Sev 1 with automated relationship correlation)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
