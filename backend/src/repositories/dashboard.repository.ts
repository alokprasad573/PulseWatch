import { prisma } from '@pulsewatch/database';

export class DashboardRepository {
  async getSummary(userId: string) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalMonitors,
      operationalMonitors,
      downMonitors,
      pausedMonitors,
      activeIncidents,
      checksAggregate,
      successfulChecksCount,
      recentIncidents,
      recentChecks,
    ] = await Promise.all([
      prisma.monitor.count({ where: { userId } }),
      prisma.monitor.count({ where: { userId, status: 'UP', enabled: true } }),
      prisma.monitor.count({ where: { userId, status: 'DOWN', enabled: true } }),
      prisma.monitor.count({ where: { userId, OR: [{ enabled: false }, { status: 'PAUSED' }] } }),
      prisma.incident.count({
        where: {
          monitor: { userId },
          status: { in: ['OPEN', 'RECOVERING'] },
        },
      }),
      prisma.monitorCheck.aggregate({
        where: {
          monitor: { userId },
          checkedAt: { gte: oneDayAgo },
        },
        _count: { id: true },
        _avg: { responseTimeMs: true },
      }),
      prisma.monitorCheck.count({
        where: {
          monitor: { userId },
          checkedAt: { gte: oneDayAgo },
          isSuccess: true,
        },
      }),
      prisma.incident.findMany({
        where: { monitor: { userId } },
        orderBy: { startedAt: 'desc' },
        take: 5,
        include: {
          monitor: { select: { id: true, name: true, url: true } },
          events: { take: 3, orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.monitorCheck.findMany({
        where: { monitor: { userId } },
        orderBy: { checkedAt: 'desc' },
        take: 10,
        include: {
          monitor: { select: { name: true } },
        },
      }),
    ]);

    return {
      totalMonitors,
      operationalMonitors,
      downMonitors,
      pausedMonitors,
      activeIncidents,
      checksAggregate,
      successfulChecksCount,
      recentIncidents,
      recentChecks,
    };
  }
}
