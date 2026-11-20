import { Injectable } from '@nestjs/common';
import { prisma } from '@pulsewatch/database';
import { DashboardSummaryDto, IncidentStatus, IncidentEventType } from '@pulsewatch/shared';

@Injectable()
export class DashboardService {
  async getSummary(userId: string): Promise<DashboardSummaryDto> {
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

    const totalValidChecks = checksAggregate._count.id;
    const overallUptime24h =
      totalValidChecks > 0
        ? Number(((successfulChecksCount / totalValidChecks) * 100).toFixed(2))
        : 100;
    const averageResponseTime24h = checksAggregate._avg.responseTimeMs
      ? Math.round(checksAggregate._avg.responseTimeMs)
      : 0;

    return {
      totalMonitors,
      operationalMonitors,
      downMonitors,
      pausedMonitors,
      activeIncidents,
      overallUptime24h,
      averageResponseTime24h,
      recentIncidents: recentIncidents.map((i) => ({
        id: i.id,
        monitorId: i.monitorId,
        title: i.title,
        description: i.description,
        status: i.status as unknown as IncidentStatus,
        startedAt: i.startedAt.toISOString(),
        resolvedAt: i.resolvedAt ? i.resolvedAt.toISOString() : null,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
        monitor: i.monitor,
        events: i.events?.map((e) => ({
          id: e.id,
          incidentId: e.incidentId,
          eventType: e.eventType as unknown as IncidentEventType,
          message: e.message,
          metadata: e.metadata as Record<string, any>,
          createdAt: e.createdAt.toISOString(),
        })),
      })),
      recentChecks: recentChecks.map((c) => ({
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
      })),
    };
  }
}
