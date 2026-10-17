import { Router } from 'express';
import { DeploymentController } from '../controllers/deployment.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  recordDeploymentSchema,
  rollbackDeploymentSchema,
} from '../validators/deployment.validator';
import { UserRole } from '../config/constants';

const router = Router();

router.use(authMiddleware);

router.get('/project/:projectId', DeploymentController.list);
router.get('/:id', DeploymentController.getById);
router.get('/compare/:baseId/:targetId', DeploymentController.compare);

router.post(
  '/',
  requireRole(UserRole.DEVELOPER),
  validateBody(recordDeploymentSchema),
  DeploymentController.record
);

router.post(
  '/:id/rollback',
  requireRole(UserRole.DEVELOPER),
  validateBody(rollbackDeploymentSchema),
  DeploymentController.rollback
);

export default router;
