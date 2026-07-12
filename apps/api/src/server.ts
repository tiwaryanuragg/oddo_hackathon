import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './core/logger.js';
import { prisma } from './core/prisma.js';

/**
 * Process entrypoint. Wires the Express app onto a raw http.Server (so Socket.io
 * can share the port in Phase 10), starts listening, and installs graceful
 * shutdown handlers that drain connections and close the DB pool.
 */
async function bootstrap(): Promise<void> {
  const app = createApp();
  const httpServer = createServer(app);

  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 AssetFlow API listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down gracefully`);
    httpServer.close(async () => {
      await prisma.$disconnect();
      logger.info('Shutdown complete');
      process.exit(0);
    });
    // Force-exit if connections don't drain in time.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Fatal error during bootstrap');
  process.exit(1);
});
