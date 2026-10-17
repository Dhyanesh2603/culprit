import { prisma } from '../prisma/client';
import { TimelineEventType } from '../config/constants';

export interface CreateTimelineEventInput {
  projectId: string;
  incidentId?: string | null;
  deploymentId?: string | null;
  commitId?: string | null;
  eventType: TimelineEventType;
  title: string;
  description?: string | null;
  metadata?: Record<string, any>;
  actorEmail?: string | null;
  actorName?: string | null;
  occurredAt: Date;
  receivedAt?: Date;
}

export class TimelineRepository {
  static async create(input: CreateTimelineEventInput) {
    return prisma.timelineEvent.create({
      data: {
        projectId: input.projectId,
        incidentId: input.incidentId,
        deploymentId: input.deploymentId,
        commitId: input.commitId,
        eventType: input.eventType,
        title: input.title,
        description: input.description,
        metadata: input.metadata ? JSON.stringify(input.metadata) : '{}',
        actorEmail: input.actorEmail,
        actorName: input.actorName,
        occurredAt: input.occurredAt,
        receivedAt: input.receivedAt || new Date(),
      },
      include: {
        incident: true,
        deployment: true,
        commit: true,
      },
    });
  }

  /**
   * Always sorts chronologically by occurredAt (descending by default for feeds, or ascending for incident timelines)
   */
  static async listByProject(
    projectId: string,
    options?: {
      limit?: number;
      skip?: number;
      eventType?: string;
      order?: 'asc' | 'desc';
      incidentId?: string;
    }
  ) {
    const order = options?.order || 'desc';
    return prisma.timelineEvent.findMany({
      where: {
        projectId,
        ...(options?.eventType ? { eventType: options.eventType } : {}),
        ...(options?.incidentId ? { incidentId: options.incidentId } : {}),
      },
      orderBy: { occurredAt: order },
      take: options?.limit || 50,
      skip: options?.skip || 0,
      include: {
        incident: true,
        deployment: true,
        commit: true,
      },
    });
  }

  static async listUnified(options?: {
    limit?: number;
    skip?: number;
    eventType?: string;
    order?: 'asc' | 'desc';
  }) {
    const order = options?.order || 'desc';
    return prisma.timelineEvent.findMany({
      where: {
        ...(options?.eventType ? { eventType: options.eventType } : {}),
      },
      orderBy: { occurredAt: order },
      take: options?.limit || 100,
      skip: options?.skip || 0,
      include: {
        project: true,
        incident: true,
        deployment: true,
        commit: true,
      },
    });
  }
}
