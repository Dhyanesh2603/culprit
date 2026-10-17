import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();

// Webhook endpoint does not require authMiddleware (verified via GitHub HMAC signature)
router.post('/github', WebhookController.handleGitHub);

export default router;
