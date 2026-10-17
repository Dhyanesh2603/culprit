import { z } from 'zod';
import { IncidentSeverity, IncidentStatus } from '../config/constants';

export const createIncidentSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  severity: z.nativeEnum(IncidentSeverity).default(IncidentSeverity.MEDIUM),
  status: z.nativeEnum(IncidentStatus).default(IncidentStatus.OPEN),
  occurredAt: z.union([z.string().datetime(), z.date()]).optional(),
  assigneeIds: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export const updateIncidentSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(5).optional(),
  severity: z.nativeEnum(IncidentSeverity).optional(),
  status: z.nativeEnum(IncidentStatus).optional(),
  rootCause: z.string().optional(),
  resolution: z.string().optional(),
  version: z.number().int().min(1, 'Version is required for optimistic concurrency control'),
});

export const assignIncidentSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user ID must be provided'),
});
