import { Router } from 'express';
import { CommitController } from '../controllers/commit.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { ingestCommitSchema, batchIngestCommitsSchema } from '../validators/commit.validator';
import { UserRole } from '../config/constants';

const router = Router();

router.use(authMiddleware);

router.get('/project/:projectId', CommitController.list);
router.get('/:id', CommitController.getById);

router.post(
  '/',
  requireRole(UserRole.DEVELOPER),
  validateBody(ingestCommitSchema),
  CommitController.ingest
);

router.post(
  '/batch',
  requireRole(UserRole.DEVELOPER),
  validateBody(batchIngestCommitsSchema),
  CommitController.batchIngest
);

export default router;
