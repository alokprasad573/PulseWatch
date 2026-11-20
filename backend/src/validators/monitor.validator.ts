import { z } from 'zod';

export const createMonitorSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  url: z.string().trim().url('Must be a valid HTTP or HTTPS URL'),
  method: z.enum(['GET', 'HEAD']).optional().default('GET'),
  intervalSeconds: z.coerce.number().int().min(10, 'Minimum interval is 10 seconds').max(86400, 'Maximum interval is 86400 seconds').optional().default(60),
  timeoutMs: z.coerce.number().int().min(1000, 'Minimum timeout is 1000ms').max(30000, 'Maximum timeout is 30000ms').optional().default(10000),
  expectedStatusCode: z.coerce.number().int().min(100).max(599).optional().default(200),
  enabled: z.boolean().optional().default(true),
});

export const updateMonitorSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  url: z.string().trim().url().optional(),
  method: z.enum(['GET', 'HEAD']).optional(),
  intervalSeconds: z.coerce.number().int().min(10).max(86400).optional(),
  timeoutMs: z.coerce.number().int().min(1000).max(30000).optional(),
  expectedStatusCode: z.coerce.number().int().min(100).max(599).optional(),
  enabled: z.boolean().optional(),
});

export const monitorQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateMonitorSchemaInput = z.infer<typeof createMonitorSchema>;
export type UpdateMonitorSchemaInput = z.infer<typeof updateMonitorSchema>;
