import { Injectable, Logger } from '@nestjs/common';
import { prisma, checkDatabaseHealth } from '@pulsewatch/database';
import { getEnv } from '@pulsewatch/config';
import IORedis from 'ioredis';

const env = getEnv();

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  services: {
    database: {
      status: 'up' | 'down';
      latencyMs?: number;
    };
    redis: {
      status: 'up' | 'down';
      latencyMs?: number;
    };
  };
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  async checkHealth(): Promise<HealthStatus> {
    const startDb = Date.now();
    let dbStatus: 'up' | 'down' = 'down';
    let dbLatencyMs: number | undefined;

    try {
      const isDbHealthy = await checkDatabaseHealth();
      dbLatencyMs = Date.now() - startDb;
      dbStatus = isDbHealthy ? 'up' : 'down';
    } catch (err: any) {
      this.logger.error(`Database health check failed: ${err.message}`);
    }

    const startRedis = Date.now();
    let redisStatus: 'up' | 'down' = 'down';
    let redisLatencyMs: number | undefined;

    try {
      const redis = new IORedis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: true,
      });
      await redis.connect();
      const ping = await redis.ping();
      redisLatencyMs = Date.now() - startRedis;
      redisStatus = ping === 'PONG' ? 'up' : 'down';
      await redis.quit();
    } catch {
      // Redis might be optional or local dev offline
      redisStatus = 'down';
    }

    const memoryUsage = process.memoryUsage();
    const overallStatus: 'ok' | 'degraded' | 'error' =
      dbStatus === 'up' && redisStatus === 'up'
        ? 'ok'
        : dbStatus === 'up'
        ? 'degraded'
        : 'error';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        redis: {
          status: redisStatus,
          latencyMs: redisLatencyMs,
        },
      },
      memory: {
        heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      },
    };
  }
}
