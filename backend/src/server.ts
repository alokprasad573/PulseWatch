import app from './app';
import config from './config';
import { checkDatabaseHealth, disconnectPrisma } from '@pulsewatch/database';
import { Logger } from './utils/logger';

const port = config.PORT || config.API_PORT || 4001;

async function bootstrap() {
  try {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      Logger.info('Successfully connected to PostgreSQL database (Prisma)');
    } else {
      Logger.warn('Database health check did not return positive, server will still attempt to listen');
    }

    const server = app.listen(port, () => {
      Logger.info(`[PulseWatch Express API] Server listening on port ${port} (Environment: ${config.NODE_ENV})`);
      Logger.info(`Health check available at http://localhost:${port}/health and http://localhost:${port}/api/v1/health`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      Logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        Logger.info('HTTP server closed.');
        try {
          await disconnectPrisma();
          Logger.info('Prisma disconnected.');
          process.exit(0);
        } catch (err) {
          Logger.error('Error during database disconnect:', err);
          process.exit(1);
        }
      });

      // Force exit after 10s if graceful shutdown hangs
      setTimeout(() => {
        Logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    Logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
