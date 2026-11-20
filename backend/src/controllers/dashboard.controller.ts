import { Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class DashboardController {
  constructor(private dashboardService: DashboardService = new DashboardService()) {}

  getSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await this.dashboardService.getSummary(req.user!.id);
      sendSuccess(res, 'Dashboard summary retrieved successfully', summary, 200);
    } catch (error) {
      next(error);
    }
  };
}
