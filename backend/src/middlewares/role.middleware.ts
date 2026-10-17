import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { UserRole } from '../config/constants';
import { ApiResponse } from '../utils/apiResponse';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 3,
  [UserRole.DEVELOPER]: 2,
  [UserRole.VIEWER]: 1,
};

export function requireRole(minimumRole: UserRole) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ApiResponse.unauthorized(res, 'Authentication required');
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;

    if (userLevel < requiredLevel) {
      ApiResponse.forbidden(
        res,
        `Role '${minimumRole}' or higher required. Current role: '${req.user.role}'`
      );
      return;
    }

    next();
  };
}
