import { Router } from 'express';
import { SimulationController } from '../controllers/simulation.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { UserRole } from '../config/constants';

const router = Router();

router.use(authMiddleware);

router.post(
  '/run-scenario',
  requireRole(UserRole.DEVELOPER),
  SimulationController.runScenario
);

router.post(
  '/deploy-healthy',
  requireRole(UserRole.DEVELOPER),
  SimulationController.deployHealthy
);

export default router;
