import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@pulsewatch/database';
import { MonitorDto, PaginationMeta } from '@pulsewatch/shared';
import { CreateMonitorDto } from './dto/create-monitor.dto';
import { UpdateMonitorDto } from './dto/update-monitor.dto';

@Injectable()
export class MonitorsService {
  private formatMonitor(monitor: any, uptime24h?: number, avgResponseTime24h?: number): MonitorDto {
    return {
      id: monitor.id,
      userId: monitor.userId,
      name: monitor.name,
      url: monitor.url,
      method: monitor.method,
      intervalSeconds: monitor.intervalSeconds,
      timeoutMs: monitor.timeoutMs,
      expectedStatusCode: monitor.expectedStatusCode,
      enabled: monitor.enabled,
      status: monitor.status,
      nextCheckAt: monitor.nextCheckAt ? monitor.nextCheckAt.toISOString() : null,
      createdAt: monitor.createdAt.toISOString(),
      updatedAt: monitor.updatedAt.toISOString(),
      uptime24h,
      avgResponseTime24h,
      lastCheck: monitor.checks?.[0]
        ? {
            id: monitor.checks[0].id,
            monitorId: monitor.checks[0].monitorId,
            occurrenceId: monitor.checks[0].occurrenceId,
            statusCode: monitor.checks[0].statusCode,
            responseTimeMs: monitor.checks[0].responseTimeMs,
            isSuccess: monitor.checks[0].isSuccess,
            errorType: monitor.checks[0].errorType,
            errorMessage: monitor.checks[0].errorMessage,
            checkedAt: monitor.checks[0].checkedAt.toISOString(),
            createdAt: monitor.checks[0].createdAt.toISOString(),
          }
        : null,
    };
  }

  async create(userId: string, dto: CreateMonitorDto): Promise<MonitorDto> {
    const monitor = await prisma.monitor.create({
      data: {
        userId,
        name: dto.name.trim(),
        url: dto.url.trim(),
        method: dto.method ?? 'GET',
        intervalSeconds: dto.intervalSeconds ?? 60,
        timeoutMs: dto.timeoutMs ?? 10000,
        expectedStatusCode: dto.expectedStatusCode ?? 200,
        enabled: dto.enabled ?? true,
        nextCheckAt: new Date(), // Immediate eligibility for first check
      },
    });

    return this.formatMonitor(monitor, 100, 0);
  }

  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: MonitorDto[]; meta: PaginationMeta }> {
    const skip = (page - 1) * limit;

    const [total, monitors] = await Promise.all([
      prisma.monitor.count({ where: { userId } }),
      prisma.monitor.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          checks: {
            take: 1,
            orderBy: { checkedAt: 'desc' },
          },
        },
      }),
    ]);

    // Batch aggregate 24h metrics for returned monitors to prevent N+1 queries
    const monitorIds = monitors.map((m) => m.id);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalStats, successStats] = await Promise.all([
      monitorIds.length > 0
        ? prisma.monitorCheck.groupBy({
            by: ['monitorId'],
            where: {
              monitorId: { in: monitorIds },
              checkedAt: { gte: oneDayAgo },
            },
            _count: { id: true },
            _avg: { responseTimeMs: true },
          })
        : [],
      monitorIds.length > 0
        ? prisma.monitorCheck.groupBy({
            by: ['monitorId'],
            where: {
              monitorId: { in: monitorIds },
              checkedAt: { gte: oneDayAgo },
              isSuccess: true,
            },
            _count: { id: true },
          })
        : [],
    ]);

    const totalStatsMap = new Map(totalStats.map((s) => [s.monitorId, s]));
    const successStatsMap = new Map(successStats.map((s) => [s.monitorId, s._count.id]));

    const formattedMonitors = monitors.map((m) => {
      const stats = totalStatsMap.get(m.id);
      const totalChecks = stats?._count.id ?? 0;
      const successfulCount = successStatsMap.get(m.id) ?? 0;

      const uptime24h =
        totalChecks > 0 ? Number(((successfulCount / totalChecks) * 100).toFixed(2)) : 100;
      const avgResponseTime24h = stats?._avg?.responseTimeMs
        ? Math.round(stats._avg.responseTimeMs)
        : 0;

      return this.formatMonitor(m, uptime24h, avgResponseTime24h);
    });

    return {
      data: formattedMonitors,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(userId: string, id: string): Promise<MonitorDto> {
    const monitor = await prisma.monitor.findUnique({
      where: { id },
      include: {
        checks: {
          take: 1,
          orderBy: { checkedAt: 'desc' },
        },
      },
    });

    if (!monitor) {
      throw new NotFoundException('Monitor not found');
    }

    if (monitor.userId !== userId) {
      throw new ForbiddenException('Access denied to this monitor');
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stats = await prisma.monitorCheck.aggregate({
      where: {
        monitorId: id,
        checkedAt: { gte: oneDayAgo },
      },
      _count: { id: true },
      _avg: { responseTimeMs: true },
    });

    const successfulCount = await prisma.monitorCheck.count({
      where: {
        monitorId: id,
        checkedAt: { gte: oneDayAgo },
        isSuccess: true,
      },
    });

    const totalChecks = stats._count.id;
    const uptime24h =
      totalChecks > 0 ? Number(((successfulCount / totalChecks) * 100).toFixed(2)) : 100;
    const avgResponseTime24h = stats._avg.responseTimeMs
      ? Math.round(stats._avg.responseTimeMs)
      : 0;

    return this.formatMonitor(monitor, uptime24h, avgResponseTime24h);
  }

  async update(userId: string, id: string, dto: UpdateMonitorDto): Promise<MonitorDto> {
    await this.findOne(userId, id); // validates existence and ownership

    const updated = await prisma.monitor.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.url && { url: dto.url.trim() }),
        ...(dto.method && { method: dto.method }),
        ...(dto.intervalSeconds && { intervalSeconds: dto.intervalSeconds }),
        ...(dto.timeoutMs && { timeoutMs: dto.timeoutMs }),
        ...(dto.expectedStatusCode && { expectedStatusCode: dto.expectedStatusCode }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
      },
    });

    return this.formatMonitor(updated);
  }

  async setEnabled(userId: string, id: string, enabled: boolean): Promise<MonitorDto> {
    await this.findOne(userId, id);

    const updated = await prisma.monitor.update({
      where: { id },
      data: {
        enabled,
        status: enabled ? 'UNKNOWN' : 'PAUSED',
        nextCheckAt: enabled ? new Date() : null,
      },
    });

    return this.formatMonitor(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);

    // Delete child records cleanly or rely on cascade
    await prisma.$transaction([
      prisma.monitorCheck.deleteMany({ where: { monitorId: id } }),
      prisma.monitoringOccurrence.deleteMany({ where: { monitorId: id } }),
      prisma.incidentEvent.deleteMany({ where: { incident: { monitorId: id } } }),
      prisma.incident.deleteMany({ where: { monitorId: id } }),
      prisma.monitorHourlyAggregate.deleteMany({ where: { monitorId: id } }),
      prisma.monitorDailyAggregate.deleteMany({ where: { monitorId: id } }),
      prisma.monitor.delete({ where: { id } }),
    ]);
  }

  async getChecks(userId: string, id: string, limit: number = 50) {
    await this.findOne(userId, id);

    const checks = await prisma.monitorCheck.findMany({
      where: { monitorId: id },
      orderBy: { checkedAt: 'desc' },
      take: Math.min(limit, 200),
    });

    return checks.map((c) => ({
      id: c.id,
      monitorId: c.monitorId,
      occurrenceId: c.occurrenceId,
      statusCode: c.statusCode,
      responseTimeMs: c.responseTimeMs,
      isSuccess: c.isSuccess,
      errorType: c.errorType,
      errorMessage: c.errorMessage,
      checkedAt: c.checkedAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async getMetrics(userId: string, id: string) {
    await this.findOne(userId, id);

    const now = Date.now();
    const d24h = new Date(now - 24 * 60 * 60 * 1000);
    const d7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const d30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const calcUptime = async (since: Date) => {
      const total = await prisma.monitorCheck.count({
        where: { monitorId: id, checkedAt: { gte: since } },
      });
      if (total === 0) return 100;
      const success = await prisma.monitorCheck.count({
        where: { monitorId: id, checkedAt: { gte: since }, isSuccess: true },
      });
      return Number(((success / total) * 100).toFixed(2));
    };

    const [uptime24h, uptime7d, uptime30d, responseTimeStats, history] = await Promise.all([
      calcUptime(d24h),
      calcUptime(d7d),
      calcUptime(d30d),
      prisma.monitorCheck.aggregate({
        where: { monitorId: id, checkedAt: { gte: d24h }, responseTimeMs: { not: null } },
        _avg: { responseTimeMs: true },
        _min: { responseTimeMs: true },
        _max: { responseTimeMs: true },
      }),
      prisma.monitorCheck.findMany({
        where: { monitorId: id, checkedAt: { gte: d24h } },
        orderBy: { checkedAt: 'asc' },
        take: 100,
        select: {
          checkedAt: true,
          responseTimeMs: true,
          isSuccess: true,
          statusCode: true,
        },
      }),
    ]);

    return {
      monitorId: id,
      uptime24h,
      uptime7d,
      uptime30d,
      avgResponseTime24h: responseTimeStats._avg.responseTimeMs
        ? Math.round(responseTimeStats._avg.responseTimeMs)
        : 0,
      minResponseTime24h: responseTimeStats._min.responseTimeMs ?? 0,
      maxResponseTime24h: responseTimeStats._max.responseTimeMs ?? 0,
      history: history.map((h) => ({
        timestamp: h.checkedAt.toISOString(),
        responseTimeMs: h.responseTimeMs,
        isSuccess: h.isSuccess,
        statusCode: h.statusCode,
      })),
    };
  }
}
