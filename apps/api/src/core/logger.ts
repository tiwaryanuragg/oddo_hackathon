import pino from 'pino';
import { env, isProd } from '../config/env.js';

/**
 * Structured JSON logging in production (machine-parseable, ships to any log
 * aggregator); pretty, colorized output in development.
 */
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : isProd ? 'info' : 'debug',
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
      },
});
