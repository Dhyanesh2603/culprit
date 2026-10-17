import { AuditRepository, CreateAuditLogInput } from '../repositories/audit.repository';
import { logger } from '../utils/logger';

export class AuditService {
  static async logAction(input: CreateAuditLogInput) {
    try {
      const log = await AuditRepository.log(input);
      logger.debug(`Audit logged: ${input.action} on ${input.entityType}:${input.entityId}`);
      return log;
    } catch (err) {
      logger.error('Failed to write audit log', err);
      // Non-blocking for primary request flow, but logged
      return null;
    }
  }

  static async getEntityAudit(entityType: string, entityId: string) {
    return AuditRepository.listByEntity(entityType, entityId);
  }

  static async getProjectAudit(projectId: string, limit?: number) {
    return AuditRepository.listByProject(projectId, limit);
  }
}
