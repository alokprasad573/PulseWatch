import { getEnv, QUEUE_NAMES } from '@pulsewatch/config';
import { prisma, disconnectPrisma } from '@pulsewatch/database';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const env = getEnv();

let isRunning = false;
let redisConnection: IORedis | null = null;
let monitoringQueue: Queue | null = null;
let schedulerTimer: NodeJS.Timeout | null = null;

export function getRedisConnection(): IORedis {
  if (!redisConnection) {
    redisConnection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    redisConnection.on('error', (err) => {
      // Suppress unhandled EventEmitter crash during reconnects
    });
  }
  return redisConnection;
}

export function getMonitoringQueue(): Queue {
  if (!monitoringQueue) {
    monitoringQueue = new Queue(QUEUE_NAMES.MONITORING, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
  }
  return monitoringQueue;
}

export async function processDueMonitors(): Promise<number> {
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + env.SCHEDULER_LEASE_DURATION_MS);

  // Find monitors due for checking
  const dueMonitors = await prisma.monitor.findMany({
    where: {
      enabled: true,
      OR: [
        { nextCheckAt: null },
        { nextCheckAt: { lte: now } },
      ],
    },
    take: env.SCHEDULER_BATCH_SIZE,
  });

  if (dueMonitors.length === 0) {
    return 0;
  }

  let scheduledCount = 0;
  const queue = getMonitoringQueue();

  for (const monitor of dueMonitors) {
    try {
      const scheduledAt = now;
      const nextCheckAt = new Date(now.getTime() + monitor.intervalSeconds * 1000);

      // Create occurrence and advance nextCheckAt atomically
      await prisma.$transaction(async (tx) => {
        const occurrence = await tx.monitoringOccurrence.create({
          data: {
            monitorId: monitor.id,
            scheduledAt,
            status: 'PENDING',
            claimedAt: now,
            leaseExpiresAt,
          },
        });

        await tx.monitor.update({
          where: { id: monitor.id },
          data: { nextCheckAt },
        });

        // Enqueue BullMQ job
        await queue.add(
          `check-${monitor.id}-${scheduledAt.getTime()}`,
          {
            monitorId: monitor.id,
            occurrenceId: occurrence.id,
            scheduledAt: scheduledAt.toISOString(),
            url: monitor.url,
            method: monitor.method,
            timeoutMs: monitor.timeoutMs,
            expectedStatusCode: monitor.expectedStatusCode,
          },
          {
            jobId: occurrence.id,
          }
        );
      });

      scheduledCount++;
    } catch (err: any) {
      // If occurrence already exists for this scheduledAt, unique constraint safely ignores duplicate
      if (err.code !== 'P2002') {
        console.error(`[Scheduler] Error scheduling monitor ${monitor.id}:`, err.message);
      }
    }
  }

  return scheduledCount;
}

export async function startScheduler(): Promise<void> {
  console.log('[Scheduler] Starting PulseWatch Scheduler service...');
  isRunning = true;

  try {
    const redis = getRedisConnection();
    await redis.connect().catch((err) => {
      console.warn('[Scheduler] Redis connection warning (offline mode for testing/local):', err.message);
    });
  } catch (err: any) {
    console.warn('[Scheduler] Redis initial connect error:', err.message);
  }

  const runLoop = async () => {
    if (!isRunning) return;
    try {
      const scheduled = await processDueMonitors();
      if (scheduled > 0) {
        console.log(`[Scheduler] Dispatched ${scheduled} monitoring jobs.`);
      }
    } catch (err: any) {
      console.error('[Scheduler] Error in scheduler loop iteration:', err.message);
    } finally {
      if (isRunning) {
        schedulerTimer = setTimeout(runLoop, env.SCHEDULER_POLL_INTERVAL_MS);
      }
    }
  };

  runLoop();
}

export async function stopScheduler(): Promise<void> {
  console.log('[Scheduler] Stopping Scheduler...');
  isRunning = false;
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }
  if (monitoringQueue) {
    await monitoringQueue.close().catch(() => {});
    monitoringQueue = null;
  }
  if (redisConnection) {
    await redisConnection.quit().catch(() => {});
    redisConnection = null;
  }
  await disconnectPrisma();
  console.log('[Scheduler] Stopped.');
}

if (require.main === module) {
  startScheduler();

  const shutdown = async () => {
    await stopScheduler();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
