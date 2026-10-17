import { prisma } from '../prisma/client';
import { RecordDeploymentDTO } from '../types/dtos';
import { DeploymentStatus } from '../config/constants';

export class DeploymentRepository {
  static async findById(id: string) {
    return prisma.deployment.findUnique({
      where: { id },
      include: {
        project: true,
        commits: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });
  }

  static async findByVersion(projectId: string, version: string, environment: string) {
    return prisma.deployment.findUnique({
      where: {
        projectId_version_environment: {
          projectId,
          version,
          environment,
        },
      },
    });
  }

  static async listByProject(
    projectId: string,
    filters?: { environment?: string; status?: string; limit?: number; skip?: number }
  ) {
    return prisma.deployment.findMany({
      where: {
        projectId,
        ...(filters?.environment ? { environment: filters.environment } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.skip || 0,
      include: {
        _count: {
          select: { commits: true },
        },
      },
    });
  }

  /**
   * Upsert deployment to gracefully handle duplicate deployment events
   */
  static async upsert(data: RecordDeploymentDTO) {
    const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();
    const env = data.environment || 'production';

    return prisma.deployment.upsert({
      where: {
        projectId_version_environment: {
          projectId: data.projectId,
          version: data.version,
          environment: env,
        },
      },
      update: {
        status: data.status || DeploymentStatus.SUCCESS,
        notes: data.notes,
        isRollback: data.isRollback ?? false,
        rollbackOfId: data.rollbackOfId,
        rollbackReason: data.rollbackReason,
        commitHash: data.commitHash,
      },
      create: {
        projectId: data.projectId,
        version: data.version,
        commitHash: data.commitHash,
        branch: data.branch || 'main',
        environment: env,
        developerEmail: data.developerEmail,
        developerName: data.developerName,
        status: data.status || DeploymentStatus.SUCCESS,
        isRollback: data.isRollback ?? false,
        rollbackOfId: data.rollbackOfId,
        rollbackReason: data.rollbackReason,
        notes: data.notes,
        occurredAt,
        receivedAt: new Date(),
      },
      include: {
        project: true,
      },
    });
  }

  static async markAsRollback(
    deploymentId: string,
    rollbackReason: string,
    newRollbackDeploymentId: string
  ) {
    return prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: DeploymentStatus.ROLLED_BACK,
        rollbackReason,
      },
    });
  }

  static async findDeploymentsInWindow(projectId: string, startTime: Date, endTime: Date) {
    return prisma.deployment.findMany({
      where: {
        projectId,
        occurredAt: {
          gte: startTime,
          lte: endTime,
        },
      },
      orderBy: { occurredAt: 'desc' },
      include: {
        commits: true,
      },
    });
  }

  static async countToday(projectId?: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return prisma.deployment.count({
      where: {
        ...(projectId ? { projectId } : {}),
        occurredAt: {
          gte: startOfDay,
        },
      },
    });
  }
}
