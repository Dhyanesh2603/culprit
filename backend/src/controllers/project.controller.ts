import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { ProjectRepository } from '../repositories/project.repository';
import { ApiResponse } from '../utils/apiResponse';
import { AuditService } from '../services/audit.service';
import { AuditAction } from '../config/constants';
import { RepoSyncService } from '../services/repoSync.service';

export class ProjectController {
  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const projects = await ProjectRepository.listAll();
    ApiResponse.success(res, projects);
  }

  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const project = await ProjectRepository.findById(id);
    if (!project) {
      ApiResponse.notFound(res, 'Project not found');
      return;
    }
    ApiResponse.success(res, project);
  }

  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const project = await ProjectRepository.create(req.body, req.user?.id);

    await AuditService.logAction({
      projectId: project.id,
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: AuditAction.CREATE_PROJECT,
      entityType: 'PROJECT',
      entityId: project.id,
      afterState: project,
    });

    ApiResponse.created(res, project);
  }

  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const project = await ProjectRepository.update(id, req.body);

    await AuditService.logAction({
      projectId: project.id,
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: AuditAction.UPDATE_PROJECT,
      entityType: 'PROJECT',
      entityId: project.id,
      afterState: project,
    });

    ApiResponse.success(res, project, 'Project updated successfully');
  }

  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    await ProjectRepository.delete(id);

    await AuditService.logAction({
      projectId: id,
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: AuditAction.DELETE_PROJECT,
      entityType: 'PROJECT',
      entityId: id,
    });

    ApiResponse.success(res, null, 'Project deleted successfully');
  }

  static async addMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { userId, role } = req.body;
    const member = await ProjectRepository.addMember(id, userId, role);
    ApiResponse.success(res, member, 'Member added to project');
  }

  static async removeMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id, userId } = req.params;
    await ProjectRepository.removeMember(id, userId);
    ApiResponse.success(res, null, 'Member removed from project');
  }

  static async syncRepo(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { githubToken } = req.body || {};
    try {
      const result = await RepoSyncService.syncRepository(id, githubToken);
      ApiResponse.success(res, result, `Successfully synced ${result.syncedCount} commits from repository`);
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Failed to sync repository');
    }
  }

  static async connectRepo(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { repositoryUrl, name, environment, githubToken, correlationWindowMinutes } = req.body;
    if (!repositoryUrl) {
      ApiResponse.badRequest(res, 'Repository URL is required (e.g., https://github.com/owner/repo)');
      return;
    }

    try {
      const result = await RepoSyncService.connectAndMonitorRepo({
        repositoryUrl,
        name,
        environment,
        githubToken,
        correlationWindowMinutes,
        creatorUserId: req.user?.id,
      });

      ApiResponse.created(res, result, `Connected and monitoring repository ${repositoryUrl}`);
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Failed to connect repository');
    }
  }
}
