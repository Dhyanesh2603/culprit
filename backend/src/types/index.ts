import { Request } from 'express';
import { UserRole } from '../config/constants';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  firebaseUid?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
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
    occurredAt: Date;
    notes?: string | null;
  } | null;
  suspectedCommit: {
    id: string;
    commitHash: string;
    authorName: string;
    authorEmail: string;
    message: string;
    timestamp: Date;
    filesChanged: FileChange[];
    additions: number;
    deletions: number;
  } | null;
  involvedDevelopers: {
    name: string;
    email: string;
    commitCount: number;
    lastCommitAt: Date;
  }[];
  confidenceScore: number;
  correlationReasons: string[];
  candidateDeploymentsCount: number;
  candidateCommitsCount: number;
  timeWindowMinutes: number;
}
