import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/me', authMiddleware, AuthController.getMe);
router.post('/switch-role', authMiddleware, AuthController.switchDevRole);

export default router;
