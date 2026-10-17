import { prisma } from '../prisma/client';
import { IngestCommitDTO } from '../types/dtos';

export class CommitRepository {
  static async findById(id: string) {
    return prisma.commit.findUnique({
      where: { id },
      include: {
        deployment: true,
        project: true,
      },
    });
  }

  static async findByHash(projectId: string, commitHash: string) {
    return prisma.commit.findUnique({
      where: {
        projectId_commitHash: {
          projectId,
          commitHash,
        },
      },
    });
  }

  static async listByProject(projectId: string, limit: number = 50, skip: number = 0) {
    return prisma.commit.findMany({
      where: { projectId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip,
      include: {
        deployment: true,
      },
    });
  }

  /**
   * Upsert commit to gracefully handle duplicate commit events
   */
  static async upsert(data: IngestCommitDTO) {
    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
    const filesChangedStr = data.filesChanged ? JSON.stringify(data.filesChanged) : '[]';

    return prisma.commit.upsert({
      where: {
        projectId_commitHash: {
          projectId: data.projectId,
          commitHash: data.commitHash,
        },
      },
      update: {
        message: data.message,
        branch: data.branch || 'main',
        filesChanged: filesChangedStr,
        additions: data.additions ?? 0,
        deletions: data.deletions ?? 0,
        deploymentId: data.deploymentId,
      },
      create: {
        projectId: data.projectId,
        commitHash: data.commitHash,
        authorName: data.authorName,
        authorEmail: data.authorEmail,
        message: data.message,
        branch: data.branch || 'main',
        filesChanged: filesChangedStr,
        additions: data.additions ?? 0,
        deletions: data.deletions ?? 0,
        timestamp,
        receivedAt: new Date(),
        deploymentId: data.deploymentId,
      },
    });
  }

  static async findCommitsInWindow(projectId: string, startTime: Date, endTime: Date) {
    return prisma.commit.findMany({
      where: {
        projectId,
        timestamp: {
          gte: startTime,
          lte: endTime,
        },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  static async attachToDeployment(projectId: string, commitHashes: string[], deploymentId: string) {
    return prisma.commit.updateMany({
      where: {
        projectId,
        commitHash: { in: commitHashes },
      },
      data: {
        deploymentId,
      },
    });
  }
}
