import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { ApiResponse } from '../utils/apiResponse';
import { UserRepository } from '../repositories/user.repository';
import { UserRole } from '../config/constants';

export class AuthController {
  static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.unauthorized(res);
      return;
    }
    const profile = await UserRepository.findById(req.user.id);
    ApiResponse.success(res, profile || req.user);
  }

  static async switchDevRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { role } = req.body;
    if (!role || !Object.values(UserRole).includes(role)) {
      ApiResponse.badRequest(res, 'Valid role (ADMIN, DEVELOPER, VIEWER) is required');
      return;
    }

    if (!req.user) {
      ApiResponse.unauthorized(res);
      return;
    }

    const updated = await UserRepository.updateRole(req.user.id, role);
    ApiResponse.success(res, updated, `Role switched to ${role}`);
  }
}
