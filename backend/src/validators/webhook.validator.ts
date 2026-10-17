import { z } from 'zod';

export const githubWebhookQuerySchema = z.object({
  projectId: z.string().min(1, 'Project ID is required in query or path'),
});
