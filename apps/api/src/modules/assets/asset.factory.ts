import type { PrismaClient } from '@prisma/client';
import { AssetRepository } from './asset.repository.js';
import { AssetService } from './asset.service.js';
import { AssetController } from './asset.controller.js';
import { buildAssetRouter } from './asset.routes.js';
import type { Router } from 'express';

export interface AssetModule {
  router: Router;
  service: AssetService;
}

/**
 * Composition root for the Asset module.
 * Wires repository → service → controller → router and returns both the
 * Express router (for mounting) and the service (for inter-module use by
 * Allocation, Maintenance, Booking modules in later phases).
 */
export function createAssetModule(prisma: PrismaClient): AssetModule {
  const repository = new AssetRepository(prisma);
  const service = new AssetService(repository);
  const controller = new AssetController(service);
  const router = buildAssetRouter(controller);
  return { router, service };
}
