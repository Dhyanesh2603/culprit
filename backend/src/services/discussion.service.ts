import { prisma } from '../prisma/client';
import { TimelineService } from './timeline.service';
import { AuditService } from './audit.service';
import { AddCommentDTO } from '../types/dtos';
import { TimelineEventType, AuditAction } from '../config/constants';
import { broadcastEvent } from '../sockets/socketServer';
import { SOCKET_EVENTS } from '../sockets/events';

export class DiscussionService {
  static async addComment(
    incidentId: string,
    data: AddCommentDTO,
    author: { id: string; email: string; name: string }
  ) {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) throw { status: 404, message: 'Incident not found' };

    const mentionsStr = data.mentions ? JSON.stringify(data.mentions) : '[]';

    const comment = await prisma.incidentComment.create({
      data: {
        incidentId,
        userId: author.id,
        content: data.content,
        attachmentUrl: data.attachmentUrl,
        attachmentName: data.attachmentName,
        mentions: mentionsStr,
      },
      include: {
        user: true,
      },
    });

    // Record on timeline
    await TimelineService.recordEvent({
      projectId: incident.projectId,
      incidentId,
      eventType: TimelineEventType.COMMENT,
      title: `Comment from ${author.name}`,
      description: data.content.slice(0, 150) + (data.content.length > 150 ? '...' : ''),
      actorEmail: author.email,
      actorName: author.name,
      occurredAt: new Date(),
    });

    // Audit log
    await AuditService.logAction({
      projectId: incident.projectId,
      userId: author.id,
      userEmail: author.email,
      action: AuditAction.ADD_COMMENT,
      entityType: 'COMMENT',
      entityId: comment.id,
      afterState: comment,
    });

    // Broadcast to incident room
    broadcastEvent(SOCKET_EVENTS.INCIDENT_COMMENT_ADDED, comment, `incident:${incidentId}`);

    return comment;
  }

  static async getComments(incidentId: string) {
    return prisma.incidentComment.findMany({
      where: { incidentId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: true,
      },
    });
  }
}
