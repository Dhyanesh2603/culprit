import { ProjectRepository } from '../repositories/project.repository';
import { CommitService } from './commit.service';
import { DeploymentService } from './deployment.service';
import { logger } from '../utils/logger';

export class RepoSyncService {
  /**
   * Parse GitHub owner and repo from various URL formats
   * Examples:
   * - https://github.com/facebook/react
   * - https://github.com/facebook/react.git
   * - git@github.com:facebook/react.git
   * - facebook/react
   */
  static parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    if (!url) return null;
    let cleanUrl = url.trim();

    // Remove trailing .git and trailing slash
    cleanUrl = cleanUrl.replace(/\.git$/, '').replace(/\/$/, '');

    // Match https://github.com/owner/repo or http://
    const httpsMatch = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)$/i);
    if (httpsMatch) {
      return { owner: httpsMatch[1], repo: httpsMatch[2] };
    }

    // Match git@github.com:owner/repo
    const sshMatch = cleanUrl.match(/github\.com:([^\/]+)\/([^\/]+)$/i);
    if (sshMatch) {
      return { owner: sshMatch[1], repo: sshMatch[2] };
    }

    // Match simple "owner/repo"
    const simpleMatch = cleanUrl.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (simpleMatch) {
      return { owner: simpleMatch[1], repo: simpleMatch[2] };
    }

    return null;
  }

  /**
   * Fetch repository details and recent commits from GitHub API
   */
  static async syncRepository(projectId: string, githubToken?: string) {
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw new Error('Project not found');

    const parsed = this.parseGitHubUrl(project.repositoryUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: "${project.repositoryUrl}". Please provide a valid GitHub link (e.g., https://github.com/owner/repo)`);
    }

    const { owner, repo } = parsed;
    logger.info(`Syncing commits from GitHub repository ${owner}/${repo} for project ${project.name}`);

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'WhoBrokeTheBuild-Monitor',
    };
    if (githubToken) {
      headers.Authorization = `token ${githubToken}`;
    }

    // 1. Fetch Repo info
    let defaultBranch = project.defaultBranch || 'main';
    try {
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (repoRes.ok) {
        const repoData: any = await repoRes.json();
        defaultBranch = repoData.default_branch || defaultBranch;
      }
    } catch (e) {
      logger.warn(`Could not fetch repo metadata for ${owner}/${repo}`);
    }

    // 2. Fetch Commits
    const commitsRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=15&sha=${defaultBranch}`,
      { headers }
    );

    if (!commitsRes.ok) {
      const errorText = await commitsRes.text();
      if (commitsRes.status === 404) {
        throw new Error(`Repository "${owner}/${repo}" not found or is private. If it is private, provide a GitHub Personal Access Token in Settings.`);
      }
      if (commitsRes.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please provide a GitHub Personal Access Token to increase the limit.');
      }
      throw new Error(`Failed to fetch commits from GitHub: ${commitsRes.status} ${errorText}`);
    }

    const rawCommits: any = await commitsRes.json();
    if (!Array.isArray(rawCommits) || rawCommits.length === 0) {
      return { syncedCount: 0, commits: [] };
    }

    // 3. Ingest top commits into database & timeline
    const ingestedCommits = [];

    // For the latest 5 commits, fetch specific commit detail with files changed
    for (let i = 0; i < Math.min(10, rawCommits.length); i++) {
      const c = rawCommits[i];
      let files: any[] = [];
      let additions = 0;
      let deletions = 0;

      // Fetch file change details for the top 5 commits
      if (i < 5) {
        try {
          const detailRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits/${c.sha}`,
            { headers }
          );
          if (detailRes.ok) {
            const detailData: any = await detailRes.json();
            files = (detailData.files || []).map((f: any) => ({
              path: f.filename,
              additions: f.additions || 0,
              deletions: f.deletions || 0,
            }));
            additions = detailData.stats?.additions || files.reduce((acc, f) => acc + f.additions, 0);
            deletions = detailData.stats?.deletions || files.reduce((acc, f) => acc + f.deletions, 0);
          }
        } catch {
          // fallback without details
        }
      }

      const authorName = c.commit?.author?.name || c.author?.login || 'GitHub Developer';
      const authorEmail = c.commit?.author?.email || 'dev@github.com';
      const message = c.commit?.message?.split('\n')[0] || 'Commit';
      const timestamp = c.commit?.author?.date ? new Date(c.commit.author.date) : new Date();

      const savedCommit = await CommitService.ingestCommit({
        projectId: project.id,
        commitHash: c.sha,
        authorName,
        authorEmail,
        message,
        branch: defaultBranch,
        filesChanged: files,
        additions,
        deletions,
        timestamp,
      });

      ingestedCommits.push(savedCommit);
    }

    // 4. Create an active deployment record pointing to the latest commit
    if (ingestedCommits.length > 0) {
      const latestCommit = ingestedCommits[0];
      const versionTag = `deploy-${latestCommit.commitHash.substring(0, 7)}`;

      try {
        await DeploymentService.recordDeployment({
          projectId: project.id,
          version: versionTag,
          commitHash: latestCommit.commitHash,
          branch: defaultBranch,
          environment: project.environment || 'production',
          developerEmail: latestCommit.authorEmail,
          developerName: latestCommit.authorName,
          status: 'SUCCESS' as any,
          notes: `Synced from GitHub repo: ${owner}/${repo} (${latestCommit.message})`,
          occurredAt: latestCommit.timestamp,
        });
      } catch (err) {
        logger.warn('Initial deployment creation already exists or skipped', err);
      }
    }

    return {
      syncedCount: ingestedCommits.length,
      repository: `${owner}/${repo}`,
      branch: defaultBranch,
      latestCommit: ingestedCommits[0],
    };
  }

  /**
   * One-step helper: Connect a repo URL to monitor, create project if needed, and sync commits immediately!
   */
  static async connectAndMonitorRepo(data: {
    repositoryUrl: string;
    name?: string;
    environment?: string;
    githubToken?: string;
    correlationWindowMinutes?: number;
    creatorUserId?: string;
  }) {
    const parsed = this.parseGitHubUrl(data.repositoryUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: "${data.repositoryUrl}". Please enter a valid URL like https://github.com/owner/repo`);
    }

    const { owner, repo } = parsed;
    const projectName = data.name?.trim() || `${repo} (${owner})`;
    const slug = `${repo.toLowerCase()}-${Date.now().toString().slice(-4)}`;

    // Create the project
    const project = await ProjectRepository.create(
      {
        name: projectName,
        slug,
        description: `Actively monitoring GitHub repository: https://github.com/${owner}/${repo}`,
        repositoryUrl: `https://github.com/${owner}/${repo}`,
        defaultBranch: 'main',
        environment: data.environment || 'production',
        correlationWindowMinutes: data.correlationWindowMinutes || 60,
      },
      data.creatorUserId
    );

    // Sync commits from GitHub immediately
    let syncResult = null;
    try {
      syncResult = await this.syncRepository(project.id, data.githubToken);
    } catch (syncErr: any) {
      logger.warn(`Project created but initial sync warning: ${syncErr.message}`);
    }

    return {
      project,
      syncResult,
    };
  }
}
