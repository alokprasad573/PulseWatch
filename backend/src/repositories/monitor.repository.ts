import { prisma } from '@pulsewatch/database';
import { CreateMonitorSchemaInput, UpdateMonitorSchemaInput } from '../validators/monitor.validator';

export class MonitorRepository {
  async create(userId: string, data: CreateMonitorSchemaInput) {
    return prisma.monitor.create({
      data: {
        userId,
        name: data.name.trim(),
        url: data.url.trim(),
        method: (data.method as any) ?? 'GET',
        intervalSeconds: data.intervalSeconds ?? 60,
        timeoutMs: data.timeoutMs ?? 10000,
        expectedStatusCode: data.expectedStatusCode ?? 200,
        enabled: data.enabled ?? true,
        nextCheckAt: new Date(),
      },
    });
  }

  async findById(id: string) {
    return prisma.monitor.findUnique({
      where: { id },
      include: {
        checks: {
          take: 1,
          orderBy: { checkedAt: 'desc' },
        },
      },
    });
  }

  async count(userId: string) {
    return prisma.monitor.count({ where: { userId } });
  }

  async findMany(userId: string, skip: number, take: number) {
    return prisma.monitor.findMany({
      where: { userId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        checks: {
          take: 1,
          orderBy: { checkedAt: 'desc' },
        },
      },
    });
  }

  async getBatch24hStats(monitorIds: string[], since: Date) {
    if (monitorIds.length === 0) return { totalStats: [], successStats: [] };

    const [totalStats, successStats] = await Promise.all([
      prisma.monitorCheck.groupBy({
        by: ['monitorId'],
        where: {
          monitorId: { in: monitorIds },
          checkedAt: { gte: since },
        },
        _count: { id: true },
        _avg: { responseTimeMs: true },
      }),
      prisma.monitorCheck.groupBy({
        by: ['monitorId'],
        where: {
          monitorId: { in: monitorIds },
          checkedAt: { gte: since },
          isSuccess: true,
        },
        _count: { id: true },
      }),
    ]);

    return { totalStats, successStats };
  }

  async getMonitor24hStats(monitorId: string, since: Date) {
    const [stats, successfulCount] = await Promise.all([
      prisma.monitorCheck.aggregate({
        where: {
          monitorId,
          checkedAt: { gte: since },
        },
        _count: { id: true },
        _avg: { responseTimeMs: true },
      }),
      prisma.monitorCheck.count({
        where: {
          monitorId,
          checkedAt: { gte: since },
          isSuccess: true,
        },
      }),
    ]);

    return { stats, successfulCount };
  }

  async update(id: string, data: UpdateMonitorSchemaInput & { status?: any; nextCheckAt?: Date | null }) {
    return prisma.monitor.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.url && { url: data.url.trim() }),
        ...(data.method && { method: data.method as any }),
        ...(data.intervalSeconds && { intervalSeconds: data.intervalSeconds }),
        ...(data.timeoutMs && { timeoutMs: data.timeoutMs }),
        ...(data.expectedStatusCode && { expectedStatusCode: data.expectedStatusCode }),
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        ...(data.status && { status: data.status }),
        ...(data.nextCheckAt !== undefined && { nextCheckAt: data.nextCheckAt }),
      },
    });
  }

  async delete(id: string) {
    return prisma.$transaction([
      prisma.monitorCheck.deleteMany({ where: { monitorId: id } }),
      prisma.monitoringOccurrence.deleteMany({ where: { monitorId: id } }),
      prisma.incidentEvent.deleteMany({ where: { incident: { monitorId: id } } }),
      prisma.incident.deleteMany({ where: { monitorId: id } }),
      prisma.monitorHourlyAggregate.deleteMany({ where: { monitorId: id } }),
      prisma.monitorDailyAggregate.deleteMany({ where: { monitorId: id } }),
      prisma.monitor.delete({ where: { id } }),
    ]);
  }

  async findChecks(monitorId: string, limit: number = 50) {
    return prisma.monitorCheck.findMany({
      where: { monitorId },
      orderBy: { checkedAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }

  async getMetrics(monitorId: string, d24h: Date, d7d: Date, d30d: Date) {
    const calcUptime = async (since: Date) => {
      const total = await prisma.monitorCheck.count({
        where: { monitorId, checkedAt: { gte: since } },
      });
      if (total === 0) return 100;
      const success = await prisma.monitorCheck.count({
        where: { monitorId, checkedAt: { gte: since }, isSuccess: true },
      });
      return Number(((success / total) * 100).toFixed(2));
    };

    const [uptime24h, uptime7d, uptime30d, responseTimeStats, history] = await Promise.all([
      calcUptime(d24h),
      calcUptime(d7d),
      calcUptime(d30d),
      prisma.monitorCheck.aggregate({
        where: { monitorId, checkedAt: { gte: d24h }, responseTimeMs: { not: null } },
        _avg: { responseTimeMs: true },
        _min: { responseTimeMs: true },
        _max: { responseTimeMs: true },
      }),
      prisma.monitorCheck.findMany({
        where: { monitorId, checkedAt: { gte: d24h } },
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

    return { uptime24h, uptime7d, uptime30d, responseTimeStats, history };
  }
}
