import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  async getRootHealth(@Res() res: Response) {
    const health = await this.healthService.checkHealth();
    const httpStatus =
      health.status === 'error'
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.OK;
    return res.status(httpStatus).json({
      success: health.status !== 'error',
      message: `System health is ${health.status}`,
      data: health,
    });
  }

  @Get('api/v1/health')
  async getApiHealth(@Res() res: Response) {
    const health = await this.healthService.checkHealth();
    const httpStatus =
      health.status === 'error'
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.OK;
    return res.status(httpStatus).json({
      success: health.status !== 'error',
      message: `System health is ${health.status}`,
      data: health,
    });
  }
}
