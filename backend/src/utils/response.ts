import { Response } from 'express';
import { ApiResponse, PaginationMeta, ApiErrorResponse } from '@pulsewatch/shared';

export function sendSuccess<T>(
  res: Response,
  message: string,
  data: T,
  statusCode: number = 200,
  meta?: PaginationMeta | null
): Response {
  const payload: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta: meta ?? null,
  };
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = 500,
  errors: Record<string, string[]> | null = null,
  path: string = ''
): Response {
  const payload: ApiErrorResponse = {
    success: false,
    statusCode,
    message,
    errors: errors ?? null,
    timestamp: new Date().toISOString(),
    path,
  };
  return res.status(statusCode).json(payload);
}
