import { prisma } from '../prisma/client';
import { IncidentStatus, IncidentSeverity, DeploymentStatus } from '../config/constants';

export class DashboardService {
  static async getProjectDashboard(projectId?: string) {
    const whereProject = projectId ? { projectId } : {};

    // 1. Open incidents count
    const openIncidentsCount = await prisma.incident.count({
      where: {
        ...whereProject,
        status: { in: [IncidentStatus.OPEN, IncidentStatus.INVESTIGATING, IncidentStatus.MONITORING] },
      },
    });

    // 2. Critical incidents count
    const criticalIncidentsCount = await prisma.incident.count({
      where: {
        ...whereProject,
        severity: IncidentSeverity.CRITICAL,
        status: { in: [IncidentStatus.OPEN, IncidentStatus.INVESTIGATING, IncidentStatus.MONITORING] },
      },
    });

    // 3. Deployments today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const deploymentsTodayCount = await prisma.deployment.count({
      where: {
        ...whereProject,
        occurredAt: { gte: startOfDay },
      },
    });

    // 4. Mean Time to Resolve (MTTR) in minutes
    const resolvedIncidents = await prisma.incident.findMany({
      where: {
        ...whereProject,
        resolvedAt: { not: null },
      },
      select: {
        occurredAt: true,
        resolvedAt: true,
      },
    });

    let averageResolutionMinutes = 0;
    if (resolvedIncidents.length > 0) {
      const totalMinutes = resolvedIncidents.reduce((acc, curr) => {
        if (!curr.resolvedAt) return acc;
        const diffMs = curr.resolvedAt.getTime() - curr.occurredAt.getTime();
        return acc + Math.max(0, diffMs / (60 * 1000));
      }, 0);
      averageResolutionMinutes = Math.round(totalMinutes / resolvedIncidents.length);
    }

    // 5. 7-Day Incident & Deployment Trends
    const days: { date: string; incidents: number; deployments: number; failedDeployments: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const [incCount, depCount, failDepCount] = await Promise.all([
        prisma.incident.count({
          where: {
            ...whereProject,
            occurredAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        prisma.deployment.count({
          where: {
            ...whereProject,
            occurredAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        prisma.deployment.count({
          where: {
            ...whereProject,
            occurredAt: { gte: dayStart, lte: dayEnd },
            status: { in: [DeploymentStatus.FAILED, DeploymentStatus.ROLLED_BACK] },
          },
        }),
      ]);

      const label = dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      days.push({
        date: label,
        incidents: incCount,
        deployments: depCount,
        failedDeployments: failDepCount,
      });
    }

    // 6. Recurring incidents detection
    // Group incidents by similar title words (e.g. "payment", "timeout", "auth", "memory", "504")
    const allIncidents = await prisma.incident.findMany({
      where: whereProject,
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const recurringMap = new Map<string, typeof allIncidents>();
    const stopWords = new Set(['the', 'in', 'on', 'at', 'after', 'for', 'to', 'of', 'and', 'a', 'an', 'is', 'with']);

    for (const inc of allIncidents) {
      const words = inc.title
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .split(' ')
        .filter((w) => w.length > 3 && !stopWords.has(w));

      for (const word of words) {
        if (!recurringMap.has(word)) {
          recurringMap.set(word, []);
        }
        recurringMap.get(word)!.push(inc);
      }
    }

    const recurringPatterns = Array.from(recurringMap.entries())
      .filter(([_, list]) => list.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
      .map(([pattern, items]) => ({
        pattern,
        count: items.length,
        exampleTitle: items[0].title,
        severity: items[0].severity,
      }));

    // 7. Latest Activity
    const latestActivity = await prisma.timelineEvent.findMany({
      where: whereProject,
      orderBy: { occurredAt: 'desc' },
      take: 8,
      include: {
        incident: true,
        deployment: true,
      },
    });

    return {
      metrics: {
        openIncidents: openIncidentsCount,
        criticalIncidents: criticalIncidentsCount,
        deploymentsToday: deploymentsTodayCount,
        averageResolutionMinutes,
      },
      trend: days,
      recurringIncidents: recurringPatterns,
      latestActivity,
    };
  }
}
