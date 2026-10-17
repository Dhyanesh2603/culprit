import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { SimulationService } from '../services/simulation.service';
import { ApiResponse } from '../utils/apiResponse';

export class SimulationController {
  static async runScenario(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { scenarioId } = req.body || {};
    try {
      const result = await SimulationService.runScenario(scenarioId, {
        id: req.user?.id,
        email: req.user?.email,
        name: req.user?.name,
      });

      ApiResponse.created(
        res,
        result,
        `Scenario "${result.scenarioTitle}" successfully executed. Incident #${result.incident.incidentNumber} created with ${Math.round(result.confidenceScore * 100)}% attribution confidence.`
      );
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Failed to execute scenario');
    }
  }

  static async deployHealthy(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await SimulationService.deployHealthyRelease({
        id: req.user?.id,
        email: req.user?.email,
        name: req.user?.name,
      });

      ApiResponse.created(
        res,
        result,
        `Healthy release ${result.version} successfully deployed to production.`
      );
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Failed to deploy healthy release');
    }
  }
}
