import * as dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';

// Load .env from root or local directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('PulseWatch'),
  APP_ENV: z.string().default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),

  // Next.js frontend
  NEXT_PUBLIC_APP_NAME: z.string().default('PulseWatch'),
  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:4001/api/v1'),

  // PostgreSQL (Supabase)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT / Auth
  JWT_ACCESS_SECRET: z.string().min(16).default('pulsewatch_dev_jwt_access_secret_key_minimum_32_characters_long'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_ISSUER: z.string().default('pulsewatch'),
  JWT_AUDIENCE: z.string().default('pulsewatch-api'),

  REFRESH_TOKEN_PEPPER: z.string().min(16).default('pulsewatch_dev_refresh_token_pepper_secret_32_chars_min'),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().default(30),

  // Encryption
  ENCRYPTION_KEY: z.string().default('cHVsc2V3YXRjaF8zMl9ieXRlc19lbmNyeXB0aW9uX2tleV9kZXY='),
  ENCRYPTION_KEY_VERSION: z.string().default('v1'),

  // API Server
  PORT: z.coerce.number().default(4001),
  API_PORT: z.coerce.number().default(4001),
  API_PUBLIC_URL: z.string().default('http://localhost:4001'),
  WEB_ORIGIN: z.string().default('http://localhost:3001'),

  // Monitoring Defaults
  MONITOR_DEFAULT_INTERVAL_SECONDS: z.coerce.number().default(60),
  MONITOR_DEFAULT_TIMEOUT_MS: z.coerce.number().default(10000),
  MONITOR_MAX_TIMEOUT_MS: z.coerce.number().default(30000),
  MONITOR_FAILURE_THRESHOLD: z.coerce.number().default(3),
  MONITOR_RECOVERY_THRESHOLD: z.coerce.number().default(2),

  // Scheduler Defaults
  SCHEDULER_POLL_INTERVAL_MS: z.coerce.number().default(5000),
  SCHEDULER_BATCH_SIZE: z.coerce.number().default(500),
  SCHEDULER_LEASE_DURATION_MS: z.coerce.number().default(60000),

  // Worker Defaults
  MONITOR_WORKER_CONCURRENCY: z.coerce.number().default(10),
  MONITOR_MAX_RESPONSE_BYTES: z.coerce.number().default(1048576), // 1MB
  MONITOR_MAX_REDIRECTS: z.coerce.number().default(0),

  // Slack Alerting (Optional)
  SLACK_WEBHOOK_URL: z.string().optional().or(z.literal('')),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedConfig: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Environment validation errors:', result.error.format());
    throw new Error('Invalid environment configuration');
  }
  cachedConfig = result.data;
  return cachedConfig;
}

export const QUEUE_NAMES = {
  MONITORING: 'pulsewatch-monitoring-queue',
} as const;

export const CONSTANTS = {
  MAX_URL_LENGTH: 2048,
  MIN_INTERVAL_SECONDS: 30,
  MAX_INTERVAL_SECONDS: 86400, // 24 hours
  MIN_TIMEOUT_MS: 1000,
  MAX_TIMEOUT_MS: 30000,
  CONSECUTIVE_FAILURES_TO_OPEN: 3,
  CONSECUTIVE_SUCCESSES_TO_RESOLVE: 2,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
