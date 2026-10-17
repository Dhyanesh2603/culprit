import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { TimelineService } from '../services/timeline.service';
import { ApiResponse } from '../utils/apiResponse';

export class TimelineController {
  static async listByProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { projectId } = req.params;
    const { eventType, limit, skip, order, incidentId } = req.query;

    const events = await TimelineService.getProjectTimeline(projectId, {
      eventType: eventType as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      skip: skip ? parseInt(skip as string, 10) : undefined,
      order: (order as 'asc' | 'desc') || 'desc',
      incidentId: incidentId as string,
    });

    ApiResponse.success(res, events);
  }

  static async listUnified(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { eventType, limit, skip, order } = req.query;

    const events = await TimelineService.getUnifiedTimeline({
      eventType: eventType as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      skip: skip ? parseInt(skip as string, 10) : undefined,
      order: (order as 'asc' | 'desc') || 'desc',
    });

    ApiResponse.success(res, events);
  }
}
