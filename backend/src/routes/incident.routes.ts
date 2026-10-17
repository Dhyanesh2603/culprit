import { Router } from 'express';
import { IncidentController } from '../controllers/incident.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  createIncidentSchema,
  updateIncidentSchema,
  assignIncidentSchema,
} from '../validators/incident.validator';
import { addCommentSchema } from '../validators/comment.validator';
import { UserRole } from '../config/constants';

const router = Router();

router.use(authMiddleware);

router.get('/project/:projectId', IncidentController.list);
router.get('/:id', IncidentController.getById);
router.get('/:id/comments', IncidentController.getComments);
router.get('/:id/audit', IncidentController.getAudit);
router.get('/:id/postmortem', IncidentController.exportPostmortem);

router.post(
  '/',
  requireRole(UserRole.DEVELOPER),
  validateBody(createIncidentSchema),
  IncidentController.create
);

router.patch(
  '/:id',
  requireRole(UserRole.DEVELOPER),
  validateBody(updateIncidentSchema),
  IncidentController.update
);

router.post(
  '/:id/assign',
  requireRole(UserRole.DEVELOPER),
  validateBody(assignIncidentSchema),
  IncidentController.assign
);

router.post(
  '/:id/reanalyze',
  requireRole(UserRole.DEVELOPER),
  IncidentController.reanalyze
);

router.post(
  '/:id/comments',
  requireRole(UserRole.DEVELOPER),
  validateBody(addCommentSchema),
  IncidentController.addComment
);

export default router;
