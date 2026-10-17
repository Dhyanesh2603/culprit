import { Request, Response } from 'express';
import { CommitService } from '../services/commit.service';
import { DeploymentService } from '../services/deployment.service';
import { ProjectRepository } from '../repositories/project.repository';
import { verifyGitHubWebhookSignature } from '../utils/githubWebhook';
import { ApiResponse } from '../utils/apiResponse';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';
import { DeploymentStatus } from '../config/constants';

export class WebhookController {
  static async handleGitHub(req: Request, res: Response): Promise<void> {
    const { projectId } = req.query;
    if (!projectId || typeof projectId !== 'string') {
      ApiResponse.badRequest(res, 'Missing projectId query parameter');
      return;
    }

    const project = await ProjectRepository.findById(projectId);
    if (!project) {
      ApiResponse.notFound(res, 'Project not found for this webhook');
      return;
    }

    const secret = project.webhookSecret || ENV.GITHUB_WEBHOOK_SECRET;
    const signature = req.headers['x-hub-signature-256'] as string;

    // In production, strictly enforce signature verification
    if (signature && !verifyGitHubWebhookSignature(secret, signature, JSON.stringify(req.body))) {
      logger.warn(`GitHub Webhook HMAC signature verification failed for project ${projectId}`);
      ApiResponse.forbidden(res, 'Invalid webhook signature');
      return;
    }

    const githubEvent = req.headers['x-github-event'] as string;
    logger.info(`Received GitHub webhook [${githubEvent}] for project ${project.name}`);

    try {
      // 1. Handle Push Event (Commits)
      if (githubEvent === 'push') {
        const { commits, ref } = req.body;
        const branch = ref ? ref.replace('refs/heads/', '') : 'main';

        if (Array.isArray(commits)) {
          for (const c of commits) {
            const files = [
              ...(c.added || []).map((path: string) => ({ path, additions: 1, deletions: 0 })),
              ...(c.modified || []).map((path: string) => ({ path, additions: 1, deletions: 1 })),
              ...(c.removed || []).map((path: string) => ({ path, additions: 0, deletions: 1 })),
            ];

            await CommitService.ingestCommit({
              projectId: project.id,
              commitHash: c.id,
              authorName: c.author?.name || 'GitHub User',
              authorEmail: c.author?.email || 'github@developer.com',
              message: c.message || 'Commit via GitHub',
              branch,
              filesChanged: files,
              additions: files.reduce((acc, f) => acc + f.additions, 0),
              deletions: files.reduce((acc, f) => acc + f.deletions, 0),
              timestamp: c.timestamp ? new Date(c.timestamp) : new Date(),
            });
          }
        }
      }

      // 2. Handle Deployment Status Event
      if (githubEvent === 'deployment_status') {
        const { deployment_status, deployment } = req.body;
        const state = deployment_status?.state;

        let status = DeploymentStatus.SUCCESS;
        if (state === 'failure' || state === 'error') status = DeploymentStatus.FAILED;
        if (state === 'in_progress' || state === 'queued') status = DeploymentStatus.IN_PROGRESS;

        await DeploymentService.recordDeployment({
          projectId: project.id,
          version: deployment?.ref || `gh-deploy-${deployment?.id}`,
          commitHash: deployment?.sha || 'unknown-sha',
          environment: deployment?.environment || 'production',
          developerEmail: deployment?.creator?.email || 'devops@company.internal',
          developerName: deployment?.creator?.login || 'CI/CD Bot',
          status,
          notes: deployment_status?.description || `Triggered via GitHub Actions: ${state}`,
          occurredAt: deployment_status?.created_at ? new Date(deployment_status.created_at) : new Date(),
        });
      }

      ApiResponse.success(res, { received: true, event: githubEvent });
    } catch (err) {
      logger.error('Error processing GitHub webhook event', err);
      ApiResponse.error(res, 'Failed to process webhook event', 500);
    }
  }
}
