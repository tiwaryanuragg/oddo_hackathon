import { PrismaClient } from '@prisma/client';
import { isProd } from '../config/env.js';

/**
 * A single shared PrismaClient. In dev we stash it on globalThis so that
 * tsx's hot-reload doesn't exhaust the connection pool by instantiating a new
 * client on every file change.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd ? ['warn', 'error'] : ['query', 'warn', 'error'],
  });

if (!isProd) globalForPrisma.prisma = prisma;
