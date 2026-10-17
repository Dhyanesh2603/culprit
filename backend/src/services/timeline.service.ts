import { TimelineRepository, CreateTimelineEventInput } from '../repositories/timeline.repository';
import { broadcastEvent } from '../sockets/socketServer';
import { SOCKET_EVENTS } from '../sockets/events';
import { logger } from '../utils/logger';

export class TimelineService {
  /**
   * Record a timeline event with both occurredAt and receivedAt timestamps.
   * Immediately broadcasts the new event via Socket.IO.
   */
  static async recordEvent(input: CreateTimelineEventInput) {
    const receivedAt = new Date();
    const occurredAt = new Date(input.occurredAt);

    // Flag late-arriving events (ingested > 2 minutes after occurrence)
    const isLate = Math.abs(receivedAt.getTime() - occurredAt.getTime()) > 2 * 60 * 1000;

    const event = await TimelineRepository.create({
      ...input,
      occurredAt,
      receivedAt,
      metadata: {
        ...(input.metadata || {}),
        isLateArriving: isLate,
      },
    });

    logger.info(`Timeline event recorded: [${event.eventType}] "${event.title}" for project ${event.projectId}`);

    // Real-time broadcast to project room and global feed
    broadcastEvent(SOCKET_EVENTS.TIMELINE_EVENT, event, `project:${event.projectId}`);
    broadcastEvent(SOCKET_EVENTS.TIMELINE_EVENT, event); // global stream

    return event;
  }

  static async getProjectTimeline(
    projectId: string,
    options?: {
      limit?: number;
      skip?: number;
      eventType?: string;
      order?: 'asc' | 'desc';
      incidentId?: string;
    }
  ) {
    return TimelineRepository.listByProject(projectId, options);
  }

  static async getUnifiedTimeline(options?: {
    limit?: number;
    skip?: number;
    eventType?: string;
    order?: 'asc' | 'desc';
  }) {
    return TimelineRepository.listUnified(options);
  }
}
