import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/errors';
import { sendError } from '../utils/response';
import { Logger } from '../utils/logger';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    sendError(res, err.message, err.statusCode, err.errors, req.originalUrl);
    return;
  }

  Logger.error(`Unhandled error at ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';

  sendError(res, message, statusCode, null, req.originalUrl);
}
