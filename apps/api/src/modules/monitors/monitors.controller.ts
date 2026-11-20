import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateMonitorDto } from './dto/create-monitor.dto';
import { UpdateMonitorDto } from './dto/update-monitor.dto';
import { MonitorsService } from './monitors.service';

@Controller('api/v1/monitors')
@UseGuards(JwtAuthGuard)
export class MonitorsController {
  constructor(private readonly monitorsService: MonitorsService) {}

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMonitorDto,
  ) {
    const monitor = await this.monitorsService.create(userId, dto);
    return {
      message: 'Monitor created successfully',
      data: monitor,
    };
  }

  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const result = await this.monitorsService.findAll(userId, pageNum, limitNum);
    return {
      message: 'Monitors retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const monitor = await this.monitorsService.findOne(userId, id);
    return {
      message: 'Monitor details retrieved successfully',
      data: monitor,
    };
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMonitorDto,
  ) {
    const monitor = await this.monitorsService.update(userId, id, dto);
    return {
      message: 'Monitor updated successfully',
      data: monitor,
    };
  }

  @Patch(':id/enable')
  async enable(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const monitor = await this.monitorsService.setEnabled(userId, id, true);
    return {
      message: 'Monitor enabled successfully',
      data: monitor,
    };
  }

  @Patch(':id/disable')
  async disable(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const monitor = await this.monitorsService.setEnabled(userId, id, false);
    return {
      message: 'Monitor disabled successfully',
      data: monitor,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    await this.monitorsService.remove(userId, id);
    return {
      message: 'Monitor deleted successfully',
      data: null,
    };
  }

  @Get(':id/checks')
  async getChecks(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('limit') limit: string = '50',
  ) {
    const limitNum = parseInt(limit, 10) || 50;
    const checks = await this.monitorsService.getChecks(userId, id, limitNum);
    return {
      message: 'Monitor checks retrieved successfully',
      data: checks,
    };
  }

  @Get(':id/metrics')
  async getMetrics(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const metrics = await this.monitorsService.getMetrics(userId, id);
    return {
      message: 'Monitor metrics retrieved successfully',
      data: metrics,
    };
  }
}
