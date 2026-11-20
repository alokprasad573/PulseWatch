import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IncidentStatus } from '@pulsewatch/shared';
import { IncidentsService } from './incidents.service';

@Controller('api/v1/incidents')
@UseGuards(JwtAuthGuard)
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: IncidentStatus,
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const result = await this.incidentsService.findAll(userId, pageNum, limitNum, status);
    return {
      message: 'Incidents retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const incident = await this.incidentsService.findOne(userId, id);
    return {
      message: 'Incident details retrieved successfully',
      data: incident,
    };
  }
}
