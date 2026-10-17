import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { DashboardService } from '../services/dashboard.service';
import { ApiResponse } from '../utils/apiResponse';

export class DashboardController {
  static async getOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { projectId } = req.query;
    const dashboard = await DashboardService.getProjectDashboard(projectId as string);
    ApiResponse.success(res, dashboard);
  }
}
