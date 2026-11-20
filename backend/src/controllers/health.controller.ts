import { Request, Response, NextFunction } from 'express';
import { HealthService } from '../services/health.service';

export class HealthController {
  constructor(private healthService: HealthService = new HealthService()) {}

  getHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const health = await this.healthService.checkHealth();
      const statusCode = health.status === 'error' ? 503 : 200;
      res.status(statusCode).json({
        success: health.status !== 'error',
        message: `System health is ${health.status}`,
        data: health,
      });
    } catch (error) {
      next(error);
    }
  };

  getReady = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const isReady = await this.healthService.checkReady();
      const statusCode = isReady ? 200 : 503;
      res.status(statusCode).json({
        success: isReady,
        message: isReady ? 'System is ready' : 'System is not ready',
        data: { ready: isReady },
      });
    } catch (error) {
      next(error);
    }
  };
}
