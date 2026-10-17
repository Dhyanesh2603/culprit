import { IncidentSeverity, IncidentStatus, DeploymentStatus, UserRole } from '../config/constants';
import { FileChange } from './index';

export interface CreateProjectDTO {
  name: string;
  slug: string;
  description?: string;
  repositoryUrl: string;
  defaultBranch?: string;
  environment?: string;
  correlationWindowMinutes?: number;
}

export interface RecordDeploymentDTO {
  projectId: string;
  version: string;
  commitHash: string;
  branch?: string;
  environment?: string;
  developerEmail: string;
  developerName: string;
  status?: DeploymentStatus;
  isRollback?: boolean;
  rollbackOfId?: string;
  rollbackReason?: string;
  notes?: string;
  occurredAt?: string | Date;
}

export interface IngestCommitDTO {
  projectId: string;
  commitHash: string;
  authorName: string;
  authorEmail: string;
  message: string;
  branch?: string;
  filesChanged?: FileChange[];
  additions?: number;
  deletions?: number;
  timestamp?: string | Date;
  deploymentId?: string;
}

export interface CreateIncidentDTO {
  projectId: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status?: IncidentStatus;
  occurredAt?: string | Date;
  assigneeIds?: string[];
  notes?: string;
}

export interface UpdateIncidentDTO {
  title?: string;
  description?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  rootCause?: string;
  resolution?: string;
  version: number; // Required for optimistic concurrency control
}

export interface AddCommentDTO {
  content: string;
  attachmentUrl?: string;
  attachmentName?: string;
  mentions?: string[];
}
