import { IncidentRepository } from '../repositories/incident.repository';
import { RelationshipEngineService } from './relationshipEngine.service';
import { TimelineService } from './timeline.service';
import { AuditService } from './audit.service';
import { CreateIncidentDTO, UpdateIncidentDTO } from '../types/dtos';
import { TimelineEventType, AuditAction, IncidentStatus } from '../config/constants';
import { broadcastEvent } from '../sockets/socketServer';
import { SOCKET_EVENTS } from '../sockets/events';

export class IncidentService {
  /**
   * Create an incident and automatically correlate with recent deployments & commits using the Relationship Engine.
   */
  static async createIncident(
    data: CreateIncidentDTO,
    creator?: { id?: string; email?: string; name?: string }
  ) {
    const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();

    // 1. Run Relationship Engine to correlate potential culprits
    const correlation = await RelationshipEngineService.correlateIncident(
      data.projectId,
      occurredAt
    );

    // 2. Persist incident with suggested deployment, commit & confidence
    const incident = await IncidentRepository.create(data, creator?.id, {
      suggestedDeploymentId: correlation.suspectedDeployment?.id,
      suggestedCommitId: correlation.suspectedCommit?.id,
      confidenceScore: correlation.confidenceScore,
      correlationReason: correlation.correlationReasons.join('; '),
    });

    // 3. Emit timeline event
    await TimelineService.recordEvent({
      projectId: incident.projectId,
      incidentId: incident.id,
      eventType: TimelineEventType.INCIDENT_CREATED,
      title: `Incident #${incident.incidentNumber} Opened: ${incident.title}`,
      description: incident.description,
      actorEmail: creator?.email,
      actorName: creator?.name || 'Engineer',
      occurredAt,
      metadata: {
        severity: incident.severity,
        status: incident.status,
        confidenceScore: correlation.confidenceScore,
        suspectedDeployment: correlation.suspectedDeployment?.version,
      },
    });

    // 4. Audit log
    await AuditService.logAction({
      projectId: incident.projectId,
      userId: creator?.id,
      userEmail: creator?.email,
      action: AuditAction.CREATE_INCIDENT,
      entityType: 'INCIDENT',
      entityId: incident.id,
      afterState: incident,
    });

    // 5. Broadcast to Socket.IO
    broadcastEvent(SOCKET_EVENTS.INCIDENT_CREATED, incident, `project:${incident.projectId}`);

    return {
      incident,
      correlation,
    };
  }

  /**
   * Update incident with optimistic concurrency control
   */
  static async updateIncident(
    id: string,
    data: UpdateIncidentDTO,
    actor?: { id?: string; email?: string; name?: string }
  ) {
    const result = await IncidentRepository.updateWithVersion(id, data);

    if (result.notFound) {
      throw { status: 404, message: 'Incident not found' };
    }

    if (result.conflict) {
      throw {
        status: 409,
        message: 'Conflict: This incident has been modified by another teammate. Please refresh.',
        currentVersion: result.incident?.version,
      };
    }

    const updated = result.incident!;
    const previous = result.previousState!;

    // If status changed, record timeline event
    if (data.status && data.status !== previous.status) {
      const isResolution =
        data.status === IncidentStatus.RESOLVED || data.status === IncidentStatus.CLOSED;

      await TimelineService.recordEvent({
        projectId: updated.projectId,
        incidentId: updated.id,
        eventType: isResolution
          ? TimelineEventType.RESOLUTION
          : TimelineEventType.INCIDENT_STATUS_CHANGE,
        title: `Incident #${updated.incidentNumber} ${
          isResolution ? 'Resolved' : `Status changed to ${data.status}`
        }`,
        description: data.resolution || data.rootCause || `Status updated from ${previous.status} to ${data.status}`,
        actorEmail: actor?.email,
        actorName: actor?.name || 'Engineer',
        occurredAt: new Date(),
        metadata: {
          previousStatus: previous.status,
          newStatus: data.status,
          rootCause: data.rootCause,
          resolution: data.resolution,
        },
      });
    }

    // Audit log
    await AuditService.logAction({
      projectId: updated.projectId,
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.UPDATE_INCIDENT,
      entityType: 'INCIDENT',
      entityId: updated.id,
      beforeState: previous,
      afterState: updated,
    });

    // Broadcast to room
    broadcastEvent(SOCKET_EVENTS.INCIDENT_UPDATED, updated, `incident:${updated.id}`);
    broadcastEvent(SOCKET_EVENTS.INCIDENT_UPDATED, updated, `project:${updated.projectId}`);

    return updated;
  }

  static async getIncident(id: string) {
    return IncidentRepository.findById(id);
  }

  static async listIncidents(
    projectId: string,
    filters?: { status?: string; severity?: string; limit?: number; skip?: number }
  ) {
    return IncidentRepository.listByProject(projectId, filters);
  }

  static async assignUsers(
    incidentId: string,
    userIds: string[],
    actor?: { id?: string; email?: string; name?: string }
  ) {
    const incident = await IncidentRepository.findById(incidentId);
    if (!incident) throw { status: 404, message: 'Incident not found' };

    await IncidentRepository.assignUsers(incidentId, userIds, actor?.id);

    await TimelineService.recordEvent({
      projectId: incident.projectId,
      incidentId: incident.id,
      eventType: TimelineEventType.ASSIGNMENT,
      title: `Engineers assigned to Incident #${incident.incidentNumber}`,
      description: `Assigned by ${actor?.name || 'Lead'}`,
      actorEmail: actor?.email,
      actorName: actor?.name,
      occurredAt: new Date(),
    });

    const refreshed = await IncidentRepository.findById(incidentId);
    broadcastEvent(SOCKET_EVENTS.INCIDENT_ASSIGNED, refreshed, `incident:${incidentId}`);

    return refreshed;
  }

  static async reanalyzeCorrelation(incidentId: string, customWindowMinutes?: number) {
    const incident = await IncidentRepository.findById(incidentId);
    if (!incident) throw { status: 404, message: 'Incident not found' };

    const correlation = await RelationshipEngineService.correlateIncident(
      incident.projectId,
      incident.occurredAt,
      customWindowMinutes
    );

    const updated = await IncidentRepository.updateSuggestions(incidentId, {
      suggestedDeploymentId: correlation.suspectedDeployment?.id,
      suggestedCommitId: correlation.suspectedCommit?.id,
      confidenceScore: correlation.confidenceScore,
      correlationReason: correlation.correlationReasons.join('; '),
    });

    return {
      incident: updated,
      correlation,
    };
  }
}
