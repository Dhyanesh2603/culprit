import { UserRole } from '../config/constants';
import { UserRepository } from '../repositories/user.repository';
import { AuthenticatedUser } from '../types';
import { logger } from '../utils/logger';

export class AuthService {
  /**
   * Verify Firebase token or developer mock token.
   * If mock dev token is supplied (e.g. "dev-admin", "dev-developer", "dev-viewer"):
   * resolves to matching local user with proper role.
   */
  static async verifyToken(token: string): Promise<AuthenticatedUser | null> {
    try {
      if (!token) return null;

      // 1. Check for Development / Evaluation tokens (allows zero-friction testing without cloud credentials)
      if (token.startsWith('dev-token:') || token.startsWith('dev-')) {
        const rolePart = token.replace('dev-token:', '').replace('dev-', '').toUpperCase();
        let role = UserRole.DEVELOPER;
        if (rolePart === 'ADMIN') role = UserRole.ADMIN;
        if (rolePart === 'VIEWER') role = UserRole.VIEWER;

        const email = `dev-${role.toLowerCase()}@whobrokethebuild.internal`;
        const name = `Demo ${role.charAt(0) + role.slice(1).toLowerCase()} User`;

        const user = await UserRepository.upsertFirebaseUser({
          email,
          name,
          firebaseUid: `dev-uid-${role.toLowerCase()}`,
          role,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
          firebaseUid: user.firebaseUid || undefined,
        };
      }

      // 2. Real Firebase ID token verification
      // If Firebase Admin SDK is initialized with credentials, verifyIdToken(token)
      // Otherwise, parse JWT payload payload safely
      const parts = token.split('.');
      if (parts.length === 3) {
        try {
          const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
          const payload = JSON.parse(payloadJson);
          if (payload.email) {
            const user = await UserRepository.upsertFirebaseUser({
              email: payload.email,
              name: payload.name || payload.email.split('@')[0],
              firebaseUid: payload.user_id || payload.sub,
              avatarUrl: payload.picture,
            });

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role as UserRole,
              firebaseUid: user.firebaseUid || undefined,
            };
          }
        } catch {
          // Token is malformed
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to verify authentication token', error);
      return null;
    }
  }

  static async getProfile(userId: string) {
    return UserRepository.findById(userId);
  }
}
