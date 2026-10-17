import { prisma } from '../prisma/client';
import { AuditAction } from '../config/constants';

export interface CreateAuditLogInput {
  projectId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  action: AuditAction | string;
  entityType: 'PROJECT' | 'DEPLOYMENT' | 'INCIDENT' | 'COMMIT' | 'USER' | 'COMMENT';
  entityId: string;
  beforeState?: any;
  afterState?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditRepository {
  static async log(input: CreateAuditLogInput) {
    return prisma.auditLog.create({
      data: {
        projectId: input.projectId,
        userId: input.userId,
        userEmail: input.userEmail,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        beforeState: input.beforeState ? JSON.stringify(input.beforeState) : null,
        afterState: input.afterState ? JSON.stringify(input.afterState) : null,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        occurredAt: new Date(),
      },
    });
  }

  static async listByEntity(entityType: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { occurredAt: 'desc' },
      include: {
        user: true,
      },
    });
  }

  static async listByProject(projectId: string, limit: number = 50) {
    return prisma.auditLog.findMany({
      where: { projectId },
      orderBy: { occurredAt: 'desc' },
      take: limit,
      include: {
        user: true,
      },
    });
  }
}
