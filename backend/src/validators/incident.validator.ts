import { z } from 'zod';

export const incidentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum(['OPEN', 'RECOVERING', 'RESOLVED']).optional(),
});

export const updateIncidentSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().optional(),
  status: z.enum(['OPEN', 'RECOVERING', 'RESOLVED']).optional(),
});

export type IncidentQueryInput = z.infer<typeof incidentQuerySchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
