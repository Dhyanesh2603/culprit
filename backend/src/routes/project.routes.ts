import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator';
import { UserRole } from '../config/constants';

const router = Router();

router.use(authMiddleware);

router.get('/', ProjectController.list);
router.get('/:id', ProjectController.getById);

router.post(
  '/',
  requireRole(UserRole.DEVELOPER),
  validateBody(createProjectSchema),
  ProjectController.create
);

router.patch(
  '/:id',
  requireRole(UserRole.ADMIN),
  validateBody(updateProjectSchema),
  ProjectController.update
);

router.delete(
  '/:id',
  requireRole(UserRole.ADMIN),
  ProjectController.delete
);

router.post(
  '/:id/members',
  requireRole(UserRole.ADMIN),
  ProjectController.addMember
);

router.delete(
  '/:id/members/:userId',
  requireRole(UserRole.ADMIN),
  ProjectController.removeMember
);

router.post(
  '/connect-repo',
  requireRole(UserRole.DEVELOPER),
  ProjectController.connectRepo
);

router.post(
  '/:id/sync-github',
  requireRole(UserRole.DEVELOPER),
  ProjectController.syncRepo
);

export default router;
