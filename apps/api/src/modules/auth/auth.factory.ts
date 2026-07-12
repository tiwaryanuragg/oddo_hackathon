import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { buildAuthRouter } from './auth.routes.js';

/**
 * Composition root for the auth module (lightweight DI). Wires the concrete
 * Prisma repository → service → controller → router. Tests build their own
 * AuthService with a fake repository instead of calling this.
 */
export function createAuthModule(prisma: PrismaClient): { router: Router } {
  const repository = new AuthRepository(prisma);
  const service = new AuthService(repository);
  const controller = new AuthController(service);
  return { router: buildAuthRouter(controller) };
}
