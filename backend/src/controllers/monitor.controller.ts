import { Response, NextFunction } from 'express';
import { MonitorChecksSort, MonitorMetricsRange } from '@pulsewatch/shared';
import { MonitorService } from '../services/monitor.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class MonitorController {
  constructor(private monitorService: MonitorService = new MonitorService()) {}

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const monitor = await this.monitorService.create(req.user!.id, req.body);
      sendSuccess(res, 'Monitor created successfully', monitor, 201);
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const result = await this.monitorService.findAll(req.user!.id, page, limit);
      sendSuccess(res, 'Monitors retrieved successfully', result.data, 200, result.meta);
    } catch (error) {
      next(error);
    }
  };

  findOne = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const monitor = await this.monitorService.findOne(req.user!.id, id);
      sendSuccess(res, 'Monitor details retrieved successfully', monitor, 200);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const monitor = await this.monitorService.update(req.user!.id, id, req.body);
      sendSuccess(res, 'Monitor updated successfully', monitor, 200);
    } catch (error) {
      next(error);
    }
  };

  enable = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const monitor = await this.monitorService.setEnabled(req.user!.id, id, true);
      sendSuccess(res, 'Monitor enabled successfully', monitor, 200);
    } catch (error) {
      next(error);
    }
  };

  disable = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const monitor = await this.monitorService.setEnabled(req.user!.id, id, false);
      sendSuccess(res, 'Monitor disabled successfully', monitor, 200);
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      await this.monitorService.remove(req.user!.id, id);
      sendSuccess(res, 'Monitor deleted successfully', null, 200);
    } catch (error) {
      next(error);
    }
  };

  getChecks = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const sort = (req.query.sort === 'oldest' ? 'oldest' : 'newest') as MonitorChecksSort;
      const result = await this.monitorService.getChecks(req.user!.id, id, page, limit, sort);
      sendSuccess(res, 'Monitor checks retrieved successfully', result.data, 200, result.meta);
    } catch (error) {
      next(error);
    }
  };

  getMetrics = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const range = (req.query.range as MonitorMetricsRange) || '1d';
      const metrics = await this.monitorService.getMetrics(req.user!.id, id, range);
      sendSuccess(res, 'Monitor metrics retrieved successfully', metrics, 200);
    } catch (error) {
      next(error);
    }
  };
}
