import { z } from 'zod';
import { DeploymentStatus } from '../config/constants';

export const recordDeploymentSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  version: z.string().min(1, 'Deployment version/tag is required'),
  commitHash: z.string().min(4, 'Commit hash is required'),
  branch: z.string().default('main'),
  environment: z.enum(['production', 'staging', 'development']).default('production'),
  developerEmail: z.string().email('Valid developer email is required'),
  developerName: z.string().min(1, 'Developer name is required'),
  status: z.nativeEnum(DeploymentStatus).default(DeploymentStatus.SUCCESS),
  isRollback: z.boolean().default(false),
  rollbackOfId: z.string().optional(),
  rollbackReason: z.string().optional(),
  notes: z.string().max(2000).optional(),
  occurredAt: z.union([z.string().datetime(), z.date()]).optional(),
});

export const rollbackDeploymentSchema = z.object({
  rollbackReason: z.string().min(5, 'Reason for rollback is required'),
  notes: z.string().optional(),
});
