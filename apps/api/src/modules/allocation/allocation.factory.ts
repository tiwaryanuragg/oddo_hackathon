import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import { AllocationRepository } from './allocation.repository.js';
import { AllocationService } from './allocation.service.js';
import { AllocationController } from './allocation.controller.js';
import { buildAllocationRouter } from './allocation.routes.js';
import type { AssetService } from '../assets/asset.service.js';

export interface AllocationModule {
  router: Router;
  service: AllocationService;
}

/**
 * Composition root for the Allocation module.
 *
 * Receives AssetService from the Asset module factory so the Allocation
 * service can drive asset-status transitions without circular imports.
 */
export function createAllocationModule(
  prisma: PrismaClient,
  assetService: AssetService,
): AllocationModule {
  const repository  = new AllocationRepository(prisma);
  const service     = new AllocationService(repository, assetService);
  const controller  = new AllocationController(service);
  const router      = buildAllocationRouter(controller);
  return { router, service };
}
