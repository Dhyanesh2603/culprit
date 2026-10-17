import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { UserRole } from '../config/constants';

const router = Router();

router.use(authMiddleware);

router.get('/', UserController.list);
router.get('/:id', UserController.getById);
router.patch('/:id/role', requireRole(UserRole.ADMIN), UserController.updateRole);

export default router;
