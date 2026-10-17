import { CommitRepository } from '../repositories/commit.repository';
import { TimelineService } from './timeline.service';
import { IngestCommitDTO } from '../types/dtos';
import { TimelineEventType } from '../config/constants';

export class CommitService {
  static async ingestCommit(data: IngestCommitDTO) {
    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

    // 1. Upsert commit (handles duplicate commits gracefully)
    const commit = await CommitRepository.upsert(data);

    // 2. Add to timeline stream
    await TimelineService.recordEvent({
      projectId: commit.projectId,
      commitId: commit.id,
      eventType: TimelineEventType.COMMIT,
      title: `Commit ${commit.commitHash.substring(0, 7)}: ${commit.message}`,
      description: `Author: ${commit.authorName} (${commit.authorEmail}) | +${commit.additions} -${commit.deletions}`,
      actorEmail: commit.authorEmail,
      actorName: commit.authorName,
      occurredAt: timestamp,
      metadata: {
        commitHash: commit.commitHash,
        branch: commit.branch,
        additions: commit.additions,
        deletions: commit.deletions,
      },
    });

    return commit;
  }

  static async batchIngest(projectId: string, commits: Omit<IngestCommitDTO, 'projectId'>[]) {
    const results = [];
    for (const commitData of commits) {
      const res = await this.ingestCommit({ ...commitData, projectId });
      results.push(res);
    }
    return results;
  }

  static async listCommits(projectId: string, limit?: number, skip?: number) {
    return CommitRepository.listByProject(projectId, limit, skip);
  }

  static async getCommit(id: string) {
    return CommitRepository.findById(id);
  }
}
