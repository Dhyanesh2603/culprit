import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { UserRepository } from '../repositories/user.repository';
import { ApiResponse } from '../utils/apiResponse';
import { AuditService } from '../services/audit.service';
import { AuditAction, UserRole } from '../config/constants';

export class UserController {
  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const users = await UserRepository.listAll();
    ApiResponse.success(res, users);
  }

  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const user = await UserRepository.findById(id);
    if (!user) {
      ApiResponse.notFound(res, 'User not found');
      return;
    }
    ApiResponse.success(res, user);
  }

  static async updateRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(UserRole).includes(role)) {
      ApiResponse.badRequest(res, 'Invalid role');
      return;
    }

    const previous = await UserRepository.findById(id);
    const updated = await UserRepository.updateRole(id, role);

    await AuditService.logAction({
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: AuditAction.CHANGE_USER_ROLE,
      entityType: 'USER',
      entityId: id,
      beforeState: previous,
      afterState: updated,
    });

    ApiResponse.success(res, updated, 'Role updated successfully');
  }
}
