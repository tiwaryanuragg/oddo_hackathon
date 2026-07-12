import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import rateLimit from 'express-rate-limit';
import { API_PREFIX } from '@assetflow/shared';
import { env } from './config/env.js';
import { logger } from './core/logger.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { registerSubscribers } from './core/events/index.js';

/**
 * Builds the Express application (no listening). Kept separate from server.ts
 * so integration tests can import a fully-wired app without opening a port.
 */
export function createApp(): Express {
  // Wire domain-event subscribers once before handling any request.
  registerSubscribers();

  const app = express();

  // Behind a proxy/load-balancer in production (correct client IPs for rate limiting).
  app.set('trust proxy', 1);

  // Security & parsing
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  // Baseline rate limit; auth routes get a stricter limiter in Phase 2.
  app.use(
    API_PREFIX,
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  );

  app.use(API_PREFIX, apiRouter);

  // 404 + centralized error handling (must be last).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
