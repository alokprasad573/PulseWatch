import { prisma, Prisma } from '@pulsewatch/database';
import { MonitorChecksSort, MonitorMetricsPointDto } from '@pulsewatch/shared';
import { CreateMonitorSchemaInput, UpdateMonitorSchemaInput } from '../validators/monitor.validator';

const BUCKET_STEP_SECONDS = [
  60,
  300,
  900,
  1800,
  3600,
  7200,
  14400,
  21600,
  43200,
  86400,
  172800,
  259200,
  604800,
  1209600,
  2592000,
];

const RAW_HISTORY_LIMIT = 150;
const TARGET_MAX_BUCKETS = 96;

function selectBucketSeconds(spanSeconds: number): number {
  for (const step of BUCKET_STEP_SECONDS) {
    if (spanSeconds / step <= TARGET_MAX_BUCKETS) {
      return step;
    }
  }
  return BUCKET_STEP_SECONDS[BUCKET_STEP_SECONDS.length - 1];
}

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

  async findChecks(
    monitorId: string,
    skip: number = 0,
    take: number = 20,
    sort: MonitorChecksSort = 'newest'
  ) {
    const direction = sort === 'oldest' ? 'asc' : 'desc';

    const [total, checks] = await Promise.all([
      prisma.monitorCheck.count({ where: { monitorId } }),
      prisma.monitorCheck.findMany({
        where: { monitorId },
        orderBy: [{ checkedAt: direction }, { id: direction }],
        skip,
        take,
      }),
    ]);

    return { total, checks };
  }

  async getMetrics(
    monitorId: string,
    rangeStart: Date | null,
    d24h: Date,
    d7d: Date,
    d30d: Date
  ) {
    const calcUptime = async (since: Date) => {
      const [total, success] = await Promise.all([
        prisma.monitorCheck.count({
          where: { monitorId, checkedAt: { gte: since } },
        }),
        prisma.monitorCheck.count({
          where: { monitorId, checkedAt: { gte: since }, isSuccess: true },
        }),
      ]);
      if (total === 0) return 100;
      return Number(((success / total) * 100).toFixed(2));
    };

    const rangeWhere = rangeStart
      ? { monitorId, checkedAt: { gte: rangeStart } }
      : { monitorId };

    const [uptime24h, uptime7d, uptime30d, responseTimeStats, rangeAggregate, rangeSuccessCount] =
      await Promise.all([
        calcUptime(d24h),
        calcUptime(d7d),
        calcUptime(d30d),
        prisma.monitorCheck.aggregate({
          where: { monitorId, checkedAt: { gte: d24h }, responseTimeMs: { not: null } },
          _avg: { responseTimeMs: true },
          _min: { responseTimeMs: true },
          _max: { responseTimeMs: true },
        }),
        prisma.monitorCheck.aggregate({
          where: rangeWhere,
          _count: { id: true },
          _avg: { responseTimeMs: true },
          _min: { checkedAt: true, responseTimeMs: true },
          _max: { checkedAt: true, responseTimeMs: true },
        }),
        prisma.monitorCheck.count({
          where: { ...rangeWhere, isSuccess: true },
        }),
      ]);

    const totalInRange = rangeAggregate._count.id;
    let bucketSeconds: number | null = null;
    let history: MonitorMetricsPointDto[] = [];

    if (totalInRange > 0 && totalInRange <= RAW_HISTORY_LIMIT) {
      const rawChecks = await prisma.monitorCheck.findMany({
        where: rangeWhere,
        orderBy: [{ checkedAt: 'asc' }, { id: 'asc' }],
        select: {
          checkedAt: true,
          responseTimeMs: true,
          isSuccess: true,
          statusCode: true,
        },
      });

      history = rawChecks.map((h) => ({
        timestamp: h.checkedAt.toISOString(),
        responseTimeMs: h.responseTimeMs,
        isSuccess: h.isSuccess,
        statusCode: h.statusCode,
        sampleCount: 1,
        successRate: h.isSuccess ? 100 : 0,
      }));
    } else if (totalInRange > RAW_HISTORY_LIMIT && rangeAggregate._min.checkedAt && rangeAggregate._max.checkedAt) {
      const spanSeconds = Math.max(
        1,
        Math.floor(
          (rangeAggregate._max.checkedAt.getTime() - rangeAggregate._min.checkedAt.getTime()) / 1000
        )
      );
      bucketSeconds = selectBucketSeconds(spanSeconds);

      const sinceClause = rangeStart
        ? Prisma.sql`AND checked_at >= ${rangeStart}`
        : Prisma.empty;

      const bucketedRows = await prisma.$queryRaw<
        Array<{
          bucket_epoch: number;
          avg_ms: number | null;
          min_ms: number | null;
          max_ms: number | null;
          total_count: bigint;
          success_count: bigint;
          latest_status_code: number | null;
        }>
      >`
        SELECT
          bucket_epoch,
          ROUND(AVG(response_time_ms))::integer AS avg_ms,
          MIN(response_time_ms)::integer AS min_ms,
          MAX(response_time_ms)::integer AS max_ms,
          COUNT(*)::bigint AS total_count,
          COUNT(*) FILTER (WHERE is_success = true)::bigint AS success_count,
          (ARRAY_AGG(status_code ORDER BY checked_at DESC))[1] AS latest_status_code
        FROM (
          SELECT
            (FLOOR(EXTRACT(EPOCH FROM checked_at) / ${bucketSeconds}) * ${bucketSeconds})::double precision AS bucket_epoch,
            response_time_ms,
            is_success,
            status_code,
            checked_at
          FROM monitor_checks
          WHERE monitor_id = ${monitorId}::uuid
          ${sinceClause}
        ) AS bucketed
        GROUP BY bucket_epoch
        ORDER BY bucket_epoch ASC
      `;

      history = bucketedRows.map((row) => {
        const sampleCount = Number(row.total_count);
        const successCount = Number(row.success_count);
        const successRate =
          sampleCount > 0 ? Number(((successCount / sampleCount) * 100).toFixed(1)) : 100;

        return {
          timestamp: new Date(row.bucket_epoch * 1000).toISOString(),
          responseTimeMs: row.avg_ms,
          minResponseTimeMs: row.min_ms,
          maxResponseTimeMs: row.max_ms,
          isSuccess: successCount === sampleCount,
          statusCode: row.latest_status_code,
          sampleCount,
          successRate,
        };
      });
    }

    return {
      uptime24h,
      uptime7d,
      uptime30d,
      responseTimeStats,
      rangeAggregate,
      rangeSuccessCount,
      bucketSeconds,
      history,
    };
  }
}
