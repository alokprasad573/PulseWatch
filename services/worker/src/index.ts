import { getEnv, QUEUE_NAMES } from '@pulsewatch/config';
import { prisma, disconnectPrisma } from '@pulsewatch/database';
import { MonitoringJob } from '@pulsewatch/shared';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { executeHttpCheck } from './executor';
import { evaluateIncidentState } from './incidents';
import { sendSlackAlert } from './slack';

const env = getEnv();

let redisConnection: IORedis | null = null;
let worker: Worker | null = null;

export function getRedisConnection(): IORedis {
  if (!redisConnection) {
    redisConnection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
  }
  return redisConnection;
}

export async function processMonitoringJob(job: Job<MonitoringJob>): Promise<void> {
  const { monitorId, occurrenceId, url, method, timeoutMs, expectedStatusCode } = job.data;
  const checkedAt = new Date();

  // Check if occurrence is already processed (Idempotency check)
  const existingOccurrence = await prisma.monitoringOccurrence.findUnique({
    where: { id: occurrenceId },
    include: { check: true },
  });

  if (!existingOccurrence || existingOccurrence.status === 'COMPLETED') {
    return; // Already completed or invalid
  }

  // Execute the HTTP check with SSRF validation
  const result = await executeHttpCheck({
    url,
    method,
    timeoutMs,
    expectedStatusCode,
    maxResponseBytes: env.MONITOR_MAX_RESPONSE_BYTES,
  });

  // Persist check result, update occurrence, and evaluate incident state inside a single transaction
  const transition = await prisma.$transaction(async (tx) => {
    // 1. Persist the check result
    await tx.monitorCheck.upsert({
      where: { occurrenceId },
      update: {
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        isSuccess: result.isSuccess,
        errorType: result.errorType,
        errorMessage: result.errorMessage,
        checkedAt,
      },
      create: {
        monitorId,
        occurrenceId,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        isSuccess: result.isSuccess,
        errorType: result.errorType,
        errorMessage: result.errorMessage,
        checkedAt,
      },
    });

    // 2. Mark occurrence as completed
    await tx.monitoringOccurrence.update({
      where: { id: occurrenceId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // 3. Evaluate incident state machine
    return await evaluateIncidentState(tx, {
      monitorId,
      isSuccess: result.isSuccess,
      failureThreshold: env.MONITOR_FAILURE_THRESHOLD,
      recoveryThreshold: env.MONITOR_RECOVERY_THRESHOLD,
      errorMessage: result.errorMessage,
      statusCode: result.statusCode,
    });
  });

  // 4. Asynchronous Outbox & Slack Alert dispatch
  if (transition && (transition.action === 'OPENED' || transition.action === 'REOPENED' || transition.action === 'RESOLVED')) {
    sendSlackAlert({
      monitorName: transition.monitorName ?? 'Monitored Service',
      monitorUrl: transition.monitorUrl ?? url,
      action: transition.action,
      statusCode: result.statusCode,
      errorMessage: result.errorMessage,
      timestamp: new Date().toISOString(),
    }).then(async (delivered) => {
      if (delivered && transition.incidentId) {
        // Mark corresponding outbox event as PUBLISHED
        await prisma.outboxEvent.updateMany({
          where: {
            aggregateId: transition.incidentId,
            status: 'PENDING',
          },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        }).catch((err) => console.warn('[Worker] Failed to update outbox status:', err.message));
      }
    }).catch((err) => {
      console.error('[Slack] Unhandled error during alert dispatch:', err.message);
    });
  }
}

export async function startWorker(): Promise<void> {
  console.log('[Worker] Starting PulseWatch Monitoring Worker...');
  const redis = getRedisConnection();

  try {
    await redis.connect().catch((err) => {
      console.warn('[Worker] Redis connection warning (offline/mock mode for test):', err.message);
    });
  } catch (err: any) {
    console.warn('[Worker] Redis initial connect error:', err.message);
  }

  worker = new Worker<MonitoringJob>(
    QUEUE_NAMES.MONITORING,
    async (job) => {
      await processMonitoringJob(job);
    },
    {
      connection: redis,
      concurrency: env.MONITOR_WORKER_CONCURRENCY,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed for monitor ${job.data.monitorId}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });
}

export async function stopWorker(): Promise<void> {
  console.log('[Worker] Stopping Worker...');
  if (worker) {
    await worker.close().catch(() => {});
    worker = null;
  }
  if (redisConnection) {
    await redisConnection.quit().catch(() => {});
    redisConnection = null;
  }
  await disconnectPrisma();
  console.log('[Worker] Stopped.');
}

if (require.main === module) {
  startWorker();

  const shutdown = async () => {
    await stopWorker();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
