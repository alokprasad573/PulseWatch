import { DashboardRepository } from '../repositories/dashboard.repository';
import { DashboardSummaryDto, IncidentStatus, IncidentEventType } from '@pulsewatch/shared';

export class DashboardService {
  constructor(private dashboardRepo: DashboardRepository = new DashboardRepository()) {}

  async getSummary(userId: string): Promise<DashboardSummaryDto> {
    const {
      totalMonitors,
      operationalMonitors,
      downMonitors,
      pausedMonitors,
      activeIncidents,
      checksAggregate,
      successfulChecksCount,
      recentIncidents,
      recentChecks,
    } = await this.dashboardRepo.getSummary(userId);

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
        monitorName: c.monitor?.name,
      })),
    };
  }
}
