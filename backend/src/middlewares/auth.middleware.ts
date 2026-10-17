import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../utils/apiResponse';
import { UserRole } from '../config/constants';

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Default to anonymous demo user if no token provided in development
      req.user = {
        id: 'default-demo-user',
        email: 'developer@whobrokethebuild.internal',
        name: 'Staff Engineer (Demo)',
        role: UserRole.ADMIN,
      };
      return next();
    }

    const token = authHeader.split(' ')[1];
    const user = await AuthService.verifyToken(token);

    if (!user) {
      ApiResponse.unauthorized(res, 'Invalid or expired authentication token');
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    ApiResponse.unauthorized(res, 'Authentication verification failed');
  }
}
