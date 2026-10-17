export type UserRole = 'ADMIN' | 'DEVELOPER' | 'VIEWER';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'MONITORING' | 'RESOLVED' | 'CLOSED';

export type DeploymentStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'ROLLED_BACK';

export type TimelineEventType =
  | 'DEPLOYMENT'
  | 'COMMIT'
  | 'INCIDENT_CREATED'
  | 'INCIDENT_STATUS_CHANGE'
  | 'ASSIGNMENT'
  | 'RESOLUTION'
  | 'COMMENT'
  | 'ROLLBACK';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  firebaseUid?: string | null;
  createdAt?: string;
  _count?: {
    assignments: number;
    createdIncidents: number;
  };
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  repositoryUrl: string;
  defaultBranch: string;
  environment: string;
  correlationWindowMinutes: number;
  webhookSecret?: string | null;
  createdAt: string;
  updatedAt: string;
  members?: {
    id: string;
    role: UserRole;
    user: User;
  }[];
  _count?: {
    deployments: number;
    incidents: number;
    commits: number;
  };
}

export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
}

export interface Commit {
  id: string;
  projectId: string;
  commitHash: string;
  authorName: string;
  authorEmail: string;
  message: string;
  branch: string;
  filesChanged: string; // JSON string
  additions: number;
  deletions: number;
  timestamp: string;
  receivedAt: string;
  deploymentId?: string | null;
  deployment?: Deployment | null;
}

export interface Deployment {
  id: string;
  projectId: string;
  version: string;
  commitHash: string;
  branch: string;
  environment: string;
  developerEmail: string;
  developerName: string;
  status: DeploymentStatus;
  isRollback: boolean;
  rollbackOfId?: string | null;
  rollbackReason?: string | null;
  notes?: string | null;
  occurredAt: string;
  receivedAt: string;
  createdAt: string;
  commits?: Commit[];
  project?: Project;
  _count?: {
    commits: number;
  };
}

export interface IncidentComment {
  id: string;
  incidentId: string;
  userId: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  mentions: string;
  createdAt: string;
  user: User;
}

export interface IncidentAssignment {
  id: string;
  incidentId: string;
  userId: string;
  user: User;
}

export interface Incident {
  id: string;
  incidentNumber: number;
  projectId: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  creatorId?: string | null;
  rootCause?: string | null;
  resolution?: string | null;
  resolvedAt?: string | null;
  occurredAt: string;
  receivedAt: string;
  suggestedDeploymentId?: string | null;
  suggestedCommitId?: string | null;
  confidenceScore?: number | null;
  correlationReason?: string | null;
  version: number; // Concurrency version
  createdAt: string;
  updatedAt: string;
  project: Project;
  creator?: User | null;
  suggestedDeployment?: Deployment | null;
  suggestedCommit?: Commit | null;
  assignments: IncidentAssignment[];
  comments: IncidentComment[];
  _count?: {
    comments: number;
  };
}

export interface TimelineEvent {
  id: string;
  projectId: string;
  incidentId?: string | null;
  deploymentId?: string | null;
  commitId?: string | null;
  eventType: TimelineEventType;
  title: string;
  description?: string | null;
  metadata?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  occurredAt: string;
  receivedAt: string;
  createdAt: string;
  project?: Project;
  incident?: Incident | null;
  deployment?: Deployment | null;
  commit?: Commit | null;
}

export interface RelationshipEngineResult {
  suspectedDeployment: {
    id: string;
    version: string;
    commitHash: string;
    branch: string;
    developerEmail: string;
    developerName: string;
    status: string;
    occurredAt: string;
    notes?: string | null;
  } | null;
  suspectedCommit: {
    id: string;
    commitHash: string;
    authorName: string;
    authorEmail: string;
    message: string;
    timestamp: string;
    filesChanged: FileChange[];
    additions: number;
    deletions: number;
  } | null;
  involvedDevelopers: {
    name: string;
    email: string;
    commitCount: number;
    lastCommitAt: string;
  }[];
  confidenceScore: number;
  correlationReasons: string[];
  candidateDeploymentsCount: number;
  candidateCommitsCount: number;
  timeWindowMinutes: number;
}

export interface DashboardData {
  metrics: {
    openIncidents: number;
    criticalIncidents: number;
    deploymentsToday: number;
    averageResolutionMinutes: number;
  };
  trend: {
    date: string;
    incidents: number;
    deployments: number;
    failedDeployments: number;
  }[];
  recurringIncidents: {
    pattern: string;
    count: number;
    exampleTitle: string;
    severity: IncidentSeverity;
  }[];
  latestActivity: TimelineEvent[];
}
