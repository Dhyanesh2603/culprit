import { DeploymentRepository } from '../repositories/deployment.repository';
import { CommitRepository } from '../repositories/commit.repository';
import { ProjectRepository } from '../repositories/project.repository';
import { RelationshipEngineResult, FileChange } from '../types';
import { DeploymentStatus } from '../config/constants';

const CRITICAL_FILE_PATTERNS = [
  /migration/i,
  /schema\.prisma/i,
  /auth/i,
  /payment/i,
  /billing/i,
  /security/i,
  /config/i,
  /docker/i,
  /\.env/i,
  /database/i,
  /gateway/i,
];

export class RelationshipEngineService {
  /**
   * Deterministic correlation algorithm to identify potential responsible deployments & commits.
   */
  static async correlateIncident(
    projectId: string,
    incidentOccurredAt: Date,
    customWindowMinutes?: number
  ): Promise<RelationshipEngineResult> {
    const project = await ProjectRepository.findById(projectId);
    const windowMinutes = customWindowMinutes || project?.correlationWindowMinutes || 60;

    const incidentTime = new Date(incidentOccurredAt).getTime();
    const windowStartTime = new Date(incidentTime - windowMinutes * 60 * 1000);
    const windowEndTime = new Date(incidentTime);

    // 1. Fetch deployments within the correlation window
    let candidateDeployments = await DeploymentRepository.findDeploymentsInWindow(
      projectId,
      windowStartTime,
      windowEndTime
    );

    // If no deployments in exact window, fetch the most recent deployment preceding the incident
    if (candidateDeployments.length === 0) {
      const priorDeployments = await DeploymentRepository.listByProject(projectId, {
        limit: 1,
      });
      if (
        priorDeployments.length > 0 &&
        new Date(priorDeployments[0].occurredAt).getTime() <= incidentTime
      ) {
        candidateDeployments = [priorDeployments[0] as any];
      }
    }

    // 2. Fetch commits within the correlation window
    const candidateCommits = await CommitRepository.findCommitsInWindow(
      projectId,
      windowStartTime,
      windowEndTime
    );

    const reasons: string[] = [];
    let topDeployment: any = null;
    let topCommit: any = null;
    let highestDeploymentScore = -1;
    let highestCommitScore = -1;

    // 3. Score deployments
    for (const dep of candidateDeployments) {
      let score = 0;
      const depTime = new Date(dep.occurredAt).getTime();
      const minutesBeforeIncident = Math.max(0, (incidentTime - depTime) / (60 * 1000));

      // Proximity score: Exponential decay over time (closer = higher)
      const proximityScore = Math.max(0, 50 * (1 - minutesBeforeIncident / windowMinutes));
      score += proximityScore;

      // Status signals
      if (dep.status === DeploymentStatus.FAILED) {
        score += 35;
      }
      if (dep.isRollback) {
        score += 20;
      }
      if (dep.environment === 'production') {
        score += 15;
      }

      if (score > highestDeploymentScore) {
        highestDeploymentScore = score;
        topDeployment = dep;
      }
    }

    if (topDeployment) {
      const diffMins = Math.round(
        (incidentTime - new Date(topDeployment.occurredAt).getTime()) / (60 * 1000)
      );
      reasons.push(
        `Deployment ${topDeployment.version} completed ${diffMins} minute${
          diffMins === 1 ? '' : 's'
        } prior to incident`
      );

      if (topDeployment.status === DeploymentStatus.FAILED) {
        reasons.push(`Deployment ${topDeployment.version} reported FAILED status`);
      }
      if (topDeployment.isRollback) {
        reasons.push(`Deployment was a rollback action`);
      }
    }

    // 4. Score commits
    for (const commit of candidateCommits) {
      let score = 0;
      const commitTime = new Date(commit.timestamp).getTime();
      const minutesBeforeIncident = Math.max(0, (incidentTime - commitTime) / (60 * 1000));

      // Proximity score
      score += Math.max(0, 40 * (1 - minutesBeforeIncident / windowMinutes));

      // File changes risk heuristic
      let files: FileChange[] = [];
      try {
        files = JSON.parse(commit.filesChanged || '[]');
      } catch {
        files = [];
      }

      let criticalFilesCount = 0;
      for (const file of files) {
        if (CRITICAL_FILE_PATTERNS.some((pattern) => pattern.test(file.path))) {
          criticalFilesCount++;
        }
      }

      if (criticalFilesCount > 0) {
        score += Math.min(35, criticalFilesCount * 12);
      }

      // Large changes heuristic
      if (commit.additions + commit.deletions > 200 || files.length > 8) {
        score += 15;
      }

      // If commit belongs to suspected deployment
      if (topDeployment && commit.deploymentId === topDeployment.id) {
        score += 25;
      }

      if (score > highestCommitScore) {
        highestCommitScore = score;
        topCommit = {
          ...commit,
          filesParsed: files,
        };
      }
    }

    if (topCommit) {
      const diffMins = Math.round(
        (incidentTime - new Date(topCommit.timestamp).getTime()) / (60 * 1000)
      );
      reasons.push(
        `Commit ${topCommit.commitHash.substring(0, 7)} by ${
          topCommit.authorName
        } authored ${diffMins}m before incident`
      );

      const files: FileChange[] = topCommit.filesParsed || [];
      const criticalFiles = files.filter((f) =>
        CRITICAL_FILE_PATTERNS.some((p) => p.test(f.path))
      );
      if (criticalFiles.length > 0) {
        reasons.push(
          `Commit touched critical infrastructure: ${criticalFiles
            .map((f) => f.path)
            .slice(0, 3)
            .join(', ')}`
        );
      }
    }

    // 5. Aggregate involved developers
    const devMap = new Map<string, { name: string; email: string; count: number; lastTime: Date }>();
    for (const commit of candidateCommits) {
      const existing = devMap.get(commit.authorEmail);
      if (existing) {
        existing.count += 1;
        if (new Date(commit.timestamp) > existing.lastTime) {
          existing.lastTime = new Date(commit.timestamp);
        }
      } else {
        devMap.set(commit.authorEmail, {
          name: commit.authorName,
          email: commit.authorEmail,
          count: 1,
          lastTime: new Date(commit.timestamp),
        });
      }
    }

    const involvedDevelopers = Array.from(devMap.values()).map((dev) => ({
      name: dev.name,
      email: dev.email,
      commitCount: dev.count,
      lastCommitAt: dev.lastTime,
    }));

    // 6. Calculate overall confidence score between 0.0 and 1.0
    let confidence = 0.0;
    if (topDeployment) {
      confidence += 0.45;
      if (topDeployment.status === DeploymentStatus.FAILED) confidence += 0.25;
    }
    if (topCommit) {
      confidence += 0.2;
      const files: FileChange[] = topCommit.filesParsed || [];
      if (files.some((f) => CRITICAL_FILE_PATTERNS.some((p) => p.test(f.path)))) {
        confidence += 0.1;
      }
    }
    confidence = Math.min(0.98, Math.max(0.1, Number(confidence.toFixed(2))));

    return {
      suspectedDeployment: topDeployment
        ? {
            id: topDeployment.id,
            version: topDeployment.version,
            commitHash: topDeployment.commitHash,
            branch: topDeployment.branch,
            developerEmail: topDeployment.developerEmail,
            developerName: topDeployment.developerName,
            status: topDeployment.status,
            occurredAt: topDeployment.occurredAt,
            notes: topDeployment.notes,
          }
        : null,
      suspectedCommit: topCommit
        ? {
            id: topCommit.id,
            commitHash: topCommit.commitHash,
            authorName: topCommit.authorName,
            authorEmail: topCommit.authorEmail,
            message: topCommit.message,
            timestamp: topCommit.timestamp,
            filesChanged: topCommit.filesParsed || [],
            additions: topCommit.additions,
            deletions: topCommit.deletions,
          }
        : null,
      involvedDevelopers,
      confidenceScore: topDeployment || topCommit ? confidence : 0.0,
      correlationReasons: reasons,
      candidateDeploymentsCount: candidateDeployments.length,
      candidateCommitsCount: candidateCommits.length,
      timeWindowMinutes: windowMinutes,
    };
  }
}
