import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { CommitService } from '../services/commit.service';
import { ApiResponse } from '../utils/apiResponse';

export class CommitController {
  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { projectId } = req.params;
    const { limit, skip } = req.query;

    const commits = await CommitService.listCommits(
      projectId,
      limit ? parseInt(limit as string, 10) : undefined,
      skip ? parseInt(skip as string, 10) : undefined
    );
    ApiResponse.success(res, commits);
  }

  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const commit = await CommitService.getCommit(id);
    if (!commit) {
      ApiResponse.notFound(res, 'Commit not found');
      return;
    }
    ApiResponse.success(res, commit);
  }

  static async ingest(req: AuthenticatedRequest, res: Response): Promise<void> {
    const commit = await CommitService.ingestCommit(req.body);
    ApiResponse.created(res, commit, 'Commit ingested successfully');
  }

  static async batchIngest(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { projectId, commits } = req.body;
    const results = await CommitService.batchIngest(projectId, commits);
    ApiResponse.created(res, results, `${results.length} commits ingested successfully`);
  }
}
