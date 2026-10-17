import { prisma } from '../prisma/client';
import { CreateIncidentDTO, UpdateIncidentDTO } from '../types/dtos';
import { IncidentStatus } from '../config/constants';

export class IncidentRepository {
  static async findById(id: string) {
    return prisma.incident.findUnique({
      where: { id },
      include: {
        project: true,
        creator: true,
        suggestedDeployment: {
          include: {
            commits: true,
          },
        },
        suggestedCommit: true,
        assignments: {
          include: {
            user: true,
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: true,
          },
        },
      },
    });
  }

  static async listByProject(
    projectId: string,
    filters?: { status?: string; severity?: string; limit?: number; skip?: number }
  ) {
    return prisma.incident.findMany({
      where: {
        projectId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.severity ? { severity: filters.severity } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.skip || 0,
      include: {
        suggestedDeployment: true,
        suggestedCommit: true,
        assignments: {
          include: { user: true },
        },
        _count: {
          select: { comments: true },
        },
      },
    });
  }

  static async listAllOpen() {
    return prisma.incident.findMany({
      where: {
        status: { in: [IncidentStatus.OPEN, IncidentStatus.INVESTIGATING, IncidentStatus.MONITORING] },
      },
      orderBy: { occurredAt: 'desc' },
      include: {
        project: true,
        assignments: {
          include: { user: true },
        },
      },
    });
  }

  static async create(
    data: CreateIncidentDTO,
    creatorId?: string,
    suggestions?: {
      suggestedDeploymentId?: string | null;
      suggestedCommitId?: string | null;
      confidenceScore?: number;
      correlationReason?: string;
    }
  ) {
    const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();

    return prisma.$transaction(async (tx) => {
      // Get the next incident number for this project
      const count = await tx.incident.count({ where: { projectId: data.projectId } });
      const incidentNumber = count + 1;

      const incident = await tx.incident.create({
        data: {
          incidentNumber,
          projectId: data.projectId,
          title: data.title,
          description: data.description,
          severity: data.severity,
          status: data.status || IncidentStatus.OPEN,
          creatorId,
          occurredAt,
          receivedAt: new Date(),
          suggestedDeploymentId: suggestions?.suggestedDeploymentId,
          suggestedCommitId: suggestions?.suggestedCommitId,
          confidenceScore: suggestions?.confidenceScore || 0,
          correlationReason: suggestions?.correlationReason,
          version: 1,
        },
        include: {
          project: true,
          suggestedDeployment: true,
          suggestedCommit: true,
        },
      });

      // Assign developers if provided
      if (data.assigneeIds && data.assigneeIds.length > 0) {
        await tx.incidentAssignment.createMany({
          data: data.assigneeIds.map((userId) => ({
            incidentId: incident.id,
            userId,
            assignedBy: creatorId,
          })),
        });
      }

      return incident;
    });
  }

  /**
   * Optimistic Concurrency Control Update:
   * Only updates if the database version matches the version sent by the client.
   * Increments version on success. Returns null if version mismatch (concurrent edit).
   */
  static async updateWithVersion(id: string, data: UpdateIncidentDTO) {
    const existing = await prisma.incident.findUnique({
      where: { id },
    });

    if (!existing) {
      return { conflict: false, notFound: true, incident: null };
    }

    if (existing.version !== data.version) {
      return { conflict: true, notFound: false, incident: existing };
    }

    const isResolved =
      data.status === IncidentStatus.RESOLVED || data.status === IncidentStatus.CLOSED;

    const updated = await prisma.incident.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title } : {}),
        ...(data.description ? { description: data.description } : {}),
        ...(data.severity ? { severity: data.severity } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.rootCause !== undefined ? { rootCause: data.rootCause } : {}),
        ...(data.resolution !== undefined ? { resolution: data.resolution } : {}),
        ...(isResolved && !existing.resolvedAt ? { resolvedAt: new Date() } : {}),
        version: { increment: 1 },
      },
      include: {
        project: true,
        assignments: { include: { user: true } },
        suggestedDeployment: true,
        suggestedCommit: true,
      },
    });

    return { conflict: false, notFound: false, incident: updated, previousState: existing };
  }

  static async updateSuggestions(
    id: string,
    suggestions: {
      suggestedDeploymentId?: string | null;
      suggestedCommitId?: string | null;
      confidenceScore?: number;
      correlationReason?: string;
    }
  ) {
    return prisma.incident.update({
      where: { id },
      data: {
        suggestedDeploymentId: suggestions.suggestedDeploymentId,
        suggestedCommitId: suggestions.suggestedCommitId,
        confidenceScore: suggestions.confidenceScore,
        correlationReason: suggestions.correlationReason,
      },
      include: {
        suggestedDeployment: true,
        suggestedCommit: true,
      },
    });
  }

  static async assignUsers(incidentId: string, userIds: string[], assignedBy?: string) {
    const operations = userIds.map((userId) =>
      prisma.incidentAssignment.upsert({
        where: { incidentId_userId: { incidentId, userId } },
        update: { assignedBy },
        create: { incidentId, userId, assignedBy },
      })
    );
    return prisma.$transaction(operations);
  }

  static async unassignUser(incidentId: string, userId: string) {
    return prisma.incidentAssignment.delete({
      where: { incidentId_userId: { incidentId, userId } },
    });
  }
}
