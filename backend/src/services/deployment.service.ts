import { DeploymentRepository } from '../repositories/deployment.repository';
import { TimelineService } from './timeline.service';
import { AuditService } from './audit.service';
import { RecordDeploymentDTO } from '../types/dtos';
import { TimelineEventType, AuditAction, DeploymentStatus } from '../config/constants';
import { broadcastEvent } from '../sockets/socketServer';
import { SOCKET_EVENTS } from '../sockets/events';

export class DeploymentService {
  static async recordDeployment(
    data: RecordDeploymentDTO,
    actor?: { id?: string; email?: string }
  ) {
    const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();

    // 1. Upsert deployment (handles duplicate events gracefully)
    const deployment = await DeploymentRepository.upsert(data);

    // 2. Record timeline event
    await TimelineService.recordEvent({
      projectId: deployment.projectId,
      deploymentId: deployment.id,
      eventType: deployment.isRollback ? TimelineEventType.ROLLBACK : TimelineEventType.DEPLOYMENT,
      title: deployment.isRollback
        ? `Rollback: ${deployment.version} on ${deployment.environment}`
        : `Deployed: ${deployment.version} (${deployment.branch})`,
      description: deployment.notes || `Commit: ${deployment.commitHash.substring(0, 7)} by ${deployment.developerName}`,
      actorEmail: deployment.developerEmail,
      actorName: deployment.developerName,
      occurredAt,
      metadata: {
        status: deployment.status,
        version: deployment.version,
        environment: deployment.environment,
        commitHash: deployment.commitHash,
        isRollback: deployment.isRollback,
        rollbackReason: deployment.rollbackReason,
      },
    });

    // 3. Write immutable audit log
    await AuditService.logAction({
      projectId: deployment.projectId,
      userId: actor?.id,
      userEmail: actor?.email || deployment.developerEmail,
      action: deployment.isRollback ? AuditAction.ROLLBACK_DEPLOYMENT : AuditAction.RECORD_DEPLOYMENT,
      entityType: 'DEPLOYMENT',
      entityId: deployment.id,
      afterState: deployment,
    });

    // 4. Broadcast via Socket.IO
    broadcastEvent(SOCKET_EVENTS.DEPLOYMENT_RECORDED, deployment, `project:${deployment.projectId}`);

    return deployment;
  }

  static async rollback(
    deploymentId: string,
    reason: string,
    notes?: string,
    actor?: { id?: string; email?: string; name?: string }
  ) {
    const original = await DeploymentRepository.findById(deploymentId);
    if (!original) {
      throw new Error('Deployment not found');
    }

    const rollbackVersion = `${original.version}-rollback-${Date.now().toString().slice(-4)}`;

    // Create a new rollback deployment event
    const rollbackDeployment = await this.recordDeployment(
      {
        projectId: original.projectId,
        version: rollbackVersion,
        commitHash: original.commitHash,
        branch: original.branch,
        environment: original.environment,
        developerEmail: actor?.email || original.developerEmail,
        developerName: actor?.name || 'System Operator',
        status: DeploymentStatus.SUCCESS,
        isRollback: true,
        rollbackOfId: original.id,
        rollbackReason: reason,
        notes: notes || `Rolled back from ${original.version}: ${reason}`,
        occurredAt: new Date(),
      },
      actor
    );

    // Mark original deployment as rolled back
    await DeploymentRepository.markAsRollback(original.id, reason, rollbackDeployment.id);

    broadcastEvent(SOCKET_EVENTS.DEPLOYMENT_ROLLBACK, rollbackDeployment, `project:${original.projectId}`);

    return rollbackDeployment;
  }

  static async getDeployment(id: string) {
    return DeploymentRepository.findById(id);
  }

  static async listDeployments(
    projectId: string,
    filters?: { environment?: string; status?: string; limit?: number; skip?: number }
  ) {
    return DeploymentRepository.listByProject(projectId, filters);
  }
}
