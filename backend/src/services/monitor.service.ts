import { MonitorRepository } from '../repositories/monitor.repository';
import { CreateMonitorSchemaInput, UpdateMonitorSchemaInput } from '../validators/monitor.validator';
import { MonitorDto, PaginationMeta } from '@pulsewatch/shared';
import { NotFoundError, ForbiddenError } from '../utils/errors';

export class MonitorService {
  constructor(private monitorRepo: MonitorRepository = new MonitorRepository()) {}

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

  async create(userId: string, dto: CreateMonitorSchemaInput): Promise<MonitorDto> {
    const monitor = await this.monitorRepo.create(userId, dto);
    return this.formatMonitor(monitor, 100, 0);
  }

  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: MonitorDto[]; meta: PaginationMeta }> {
    const skip = (page - 1) * limit;

    const [total, monitors] = await Promise.all([
      this.monitorRepo.count(userId),
      this.monitorRepo.findMany(userId, skip, limit),
    ]);

    const monitorIds = monitors.map((m) => m.id);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const { totalStats, successStats } = await this.monitorRepo.getBatch24hStats(monitorIds, oneDayAgo);

    const totalStatsMap = new Map(totalStats.map((s: any) => [s.monitorId, s]));
    const successStatsMap = new Map(successStats.map((s: any) => [s.monitorId, s._count.id]));

    const formattedMonitors = monitors.map((m) => {
      const stats = totalStatsMap.get(m.id) as any;
      const totalChecks = stats?._count?.id ?? 0;
      const successfulCount = (successStatsMap.get(m.id) as number) ?? 0;

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
    const monitor = await this.monitorRepo.findById(id);

    if (!monitor) {
      throw new NotFoundError('Monitor not found');
    }

    if (monitor.userId !== userId) {
      throw new ForbiddenError('Access denied to this monitor');
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { stats, successfulCount } = await this.monitorRepo.getMonitor24hStats(id, oneDayAgo);

    const totalChecks = stats._count.id;
    const uptime24h =
      totalChecks > 0 ? Number(((successfulCount / totalChecks) * 100).toFixed(2)) : 100;
    const avgResponseTime24h = stats._avg.responseTimeMs
      ? Math.round(stats._avg.responseTimeMs)
      : 0;

    return this.formatMonitor(monitor, uptime24h, avgResponseTime24h);
  }

  async update(userId: string, id: string, dto: UpdateMonitorSchemaInput): Promise<MonitorDto> {
    await this.findOne(userId, id);

    const updated = await this.monitorRepo.update(id, dto);
    return this.formatMonitor(updated);
  }

  async setEnabled(userId: string, id: string, enabled: boolean): Promise<MonitorDto> {
    await this.findOne(userId, id);

    const updated = await this.monitorRepo.update(id, {
      enabled,
      status: enabled ? 'UNKNOWN' : 'PAUSED',
      nextCheckAt: enabled ? new Date() : null,
    });

    return this.formatMonitor(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.monitorRepo.delete(id);
  }

  async getChecks(userId: string, id: string, limit: number = 50) {
    await this.findOne(userId, id);
    const checks = await this.monitorRepo.findChecks(id, limit);

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

    const { uptime24h, uptime7d, uptime30d, responseTimeStats, history } =
      await this.monitorRepo.getMetrics(id, d24h, d7d, d30d);

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
