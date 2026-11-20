import { checkDatabaseHealth } from '@pulsewatch/database';
import config from '../config';
import IORedis from 'ioredis';
import { Logger } from '../utils/logger';

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

export class HealthService {
  async checkHealth(): Promise<HealthStatus> {
    const startDb = Date.now();
    let dbStatus: 'up' | 'down' = 'down';
    let dbLatencyMs: number | undefined;

    try {
      const isDbHealthy = await checkDatabaseHealth();
      dbLatencyMs = Date.now() - startDb;
      dbStatus = isDbHealthy ? 'up' : 'down';
    } catch (err: any) {
      Logger.error(`Database health check failed: ${err.message}`);
    }

    const startRedis = Date.now();
    let redisStatus: 'up' | 'down' = 'down';
    let redisLatencyMs: number | undefined;

    try {
      const redis = new IORedis(config.REDIS_URL, {
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });

      await redis.connect();
      await redis.ping();
      redisLatencyMs = Date.now() - startRedis;
      redisStatus = 'up';
      await redis.quit();
    } catch (err: any) {
      Logger.error(`Redis health check failed: ${err.message}`);
    }

    let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';
    if (dbStatus === 'down' && redisStatus === 'down') {
      overallStatus = 'error';
    } else if (dbStatus === 'down' || redisStatus === 'down') {
      overallStatus = 'degraded';
    }

    const mem = process.memoryUsage();

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
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        rssMB: Math.round(mem.rss / 1024 / 1024),
      },
    };
  }

  async checkReady(): Promise<boolean> {
    try {
      const isDbHealthy = await checkDatabaseHealth();
      return isDbHealthy;
    } catch (error) {
      return false;
    }
  }
}
