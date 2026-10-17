import { Router } from 'express';
import { TimelineController } from '../controllers/timeline.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/unified', TimelineController.listUnified);
router.get('/project/:projectId', TimelineController.listByProject);

export default router;
