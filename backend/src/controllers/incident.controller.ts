import { Response, NextFunction } from 'express';
import { IncidentService } from '../services/incident.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { IncidentStatus } from '@pulsewatch/shared';

export class IncidentController {
  constructor(private incidentService: IncidentService = new IncidentService()) {}

  findAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const status = req.query.status as IncidentStatus | undefined;

      const result = await this.incidentService.findAll(req.user!.id, page, limit, status);
      sendSuccess(res, 'Incidents retrieved successfully', result.data, 200, result.meta);
    } catch (error) {
      next(error);
    }
  };

  findOne = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const incident = await this.incidentService.findOne(req.user!.id, id);
      sendSuccess(res, 'Incident details retrieved successfully', incident, 200);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const incident = await this.incidentService.update(req.user!.id, id, req.body);
      sendSuccess(res, 'Incident updated successfully', incident, 200);
    } catch (error) {
      next(error);
    }
  };
}
