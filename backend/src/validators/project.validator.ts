import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric and dashes only'),
  description: z.string().max(500).optional(),
  repositoryUrl: z.string().url('Must be a valid repository URL'),
  defaultBranch: z.string().default('main'),
  environment: z.enum(['production', 'staging', 'development']).default('production'),
  correlationWindowMinutes: z.number().int().min(5).max(10080).default(60), // 5 mins to 7 days
});

export const updateProjectSchema = createProjectSchema.partial();
