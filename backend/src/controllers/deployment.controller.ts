import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { DeploymentService } from '../services/deployment.service';
import { DeploymentRepository } from '../repositories/deployment.repository';
import { ApiResponse } from '../utils/apiResponse';

export class DeploymentController {
  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { projectId } = req.params;
    const { environment, status, limit, skip } = req.query;

    const deployments = await DeploymentService.listDeployments(projectId, {
      environment: environment as string,
      status: status as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      skip: skip ? parseInt(skip as string, 10) : undefined,
    });

    ApiResponse.success(res, deployments);
  }

  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const deployment = await DeploymentService.getDeployment(id);
    if (!deployment) {
      ApiResponse.notFound(res, 'Deployment not found');
      return;
    }
    ApiResponse.success(res, deployment);
  }

  static async record(req: AuthenticatedRequest, res: Response): Promise<void> {
    const deployment = await DeploymentService.recordDeployment(req.body, {
      id: req.user?.id,
      email: req.user?.email,
    });
    ApiResponse.created(res, deployment, 'Deployment recorded successfully');
  }

  static async rollback(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { rollbackReason, notes } = req.body;

    const rollbackDeployment = await DeploymentService.rollback(id, rollbackReason, notes, {
      id: req.user?.id,
      email: req.user?.email,
      name: req.user?.name,
    });

    ApiResponse.created(res, rollbackDeployment, 'Rollback deployment triggered successfully');
  }

  /**
   * Deployment comparison bonus feature: Compare two deployments and compute commit / file differences
   */
  static async compare(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { baseId, targetId } = req.params;

    const [baseDep, targetDep] = await Promise.all([
      DeploymentRepository.findById(baseId),
      DeploymentRepository.findById(targetId),
    ]);

    if (!baseDep || !targetDep) {
      ApiResponse.notFound(res, 'One or both deployments were not found');
      return;
    }

    // Extract commits between both deployments
    const baseCommits = baseDep.commits || [];
    const targetCommits = targetDep.commits || [];

    // Find commits unique to targetDep
    const baseHashList = new Set(baseCommits.map((c) => c.commitHash));
    const uniqueCommits = targetCommits.filter((c) => !baseHashList.has(c.commitHash));

    // File change summary
    const fileStats = new Map<string, { additions: number; deletions: number; authors: Set<string> }>();
    for (const commit of uniqueCommits) {
      try {
        const files = JSON.parse(commit.filesChanged || '[]');
        for (const file of files) {
          const stat = fileStats.get(file.path) || { additions: 0, deletions: 0, authors: new Set() };
          stat.additions += file.additions || 0;
          stat.deletions += file.deletions || 0;
          stat.authors.add(commit.authorName);
          fileStats.set(file.path, stat);
        }
      } catch {}
    }

    const changedFiles = Array.from(fileStats.entries()).map(([path, stat]) => ({
      path,
      additions: stat.additions,
      deletions: stat.deletions,
      authors: Array.from(stat.authors),
    }));

    ApiResponse.success(res, {
      base: {
        id: baseDep.id,
        version: baseDep.version,
        commitHash: baseDep.commitHash,
        occurredAt: baseDep.occurredAt,
      },
      target: {
        id: targetDep.id,
        version: targetDep.version,
        commitHash: targetDep.commitHash,
        occurredAt: targetDep.occurredAt,
      },
      commitsDifference: uniqueCommits,
      changedFiles,
      summary: {
        commitsCount: uniqueCommits.length,
        filesCount: changedFiles.length,
        totalAdditions: changedFiles.reduce((acc, f) => acc + f.additions, 0),
        totalDeletions: changedFiles.reduce((acc, f) => acc + f.deletions, 0),
      },
    });
  }
}
