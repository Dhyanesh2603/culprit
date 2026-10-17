import { z } from 'zod';

export const fileChangeSchema = z.object({
  path: z.string().min(1),
  additions: z.number().int().nonnegative().default(0),
  deletions: z.number().int().nonnegative().default(0),
});

export const ingestCommitSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  commitHash: z.string().min(4, 'Commit hash is required'),
  authorName: z.string().min(1, 'Author name is required'),
  authorEmail: z.string().email('Author email must be valid'),
  message: z.string().min(1, 'Commit message is required'),
  branch: z.string().default('main'),
  filesChanged: z.array(fileChangeSchema).default([]),
  additions: z.number().int().nonnegative().default(0),
  deletions: z.number().int().nonnegative().default(0),
  timestamp: z.union([z.string().datetime(), z.date()]).optional(),
  deploymentId: z.string().optional(),
});

export const batchIngestCommitsSchema = z.object({
  projectId: z.string().min(1),
  commits: z.array(ingestCommitSchema.omit({ projectId: true })).min(1),
});
