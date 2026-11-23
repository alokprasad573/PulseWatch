import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import config from './config';
import routes from './routes';
import healthRoutes from './routes/health.routes';
import { requestLogger, notFoundHandler } from './middlewares/logger.middleware';
import { errorHandler } from './middlewares/error.middleware';
import { apiRateLimiter } from './middlewares/rateLimiter.middleware';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  const allowedOrigins = [
    config.WEB_ORIGIN,
     process.env.CORS_ORIGIN,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter(Boolean) as string[];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || (origin.endsWith('.vercel.app') && (origin.includes('pulse-watch') || origin.includes('pulsewatch')))) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    })
  );

  // Body parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // Logging
  app.use(requestLogger);

  // General rate limiting
  app.use('/api', apiRateLimiter);

  // Root health endpoints (for docker and orchestrator probes)
  app.use('/', healthRoutes);

  // API v1 routes (with /api/vi alias for Roman numeral / keyboard typo)
  app.use('/api/v1', routes);
  app.use('/api/vi', routes);

  // 404 handler
  app.use(notFoundHandler);

  // Centralized Error handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
