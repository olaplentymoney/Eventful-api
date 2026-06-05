import 'dotenv/config';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { startEmailProcessor } from './modules/notifications/processors/email.processor';
import { startReminderProcessor } from './modules/notifications/processors/reminder.processor';
import { env } from './config/env';
import { logger } from './config/logger';

async function bootstrap(): Promise<void> {
  // Connect infrastructure
  await connectDatabase();
  await connectRedis();

  // Start queue workers
  const emailWorker = startEmailProcessor();
  const reminderWorker = startReminderProcessor();

  // Start HTTP server
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`Eventful API running`, {
      port: env.PORT,
      env: env.NODE_ENV,
      docs: `${env.APP_URL}${env.API_PREFIX}/docs`,
    });
  });

  // Graceful shutdown
  async function shutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}, shutting down gracefully`);

    server.close(async () => {
      try {
        await Promise.all([emailWorker.close(), reminderWorker.close()]);
        await disconnectDatabase();
        await disconnectRedis();
        logger.info('Shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown', { error: err });
        process.exit(1);
      }
    });

    // Force exit after 15s
    setTimeout(() => {
      logger.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 15_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
