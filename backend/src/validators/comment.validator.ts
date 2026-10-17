import { z } from 'zod';

export const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment text cannot be empty').max(5000),
  attachmentUrl: z.string().url().optional(),
  attachmentName: z.string().optional(),
  mentions: z.array(z.string()).default([]),
});
