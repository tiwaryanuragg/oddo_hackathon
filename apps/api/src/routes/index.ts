import { Router } from 'express';
import { prisma } from '../core/prisma.js';
import { asyncHandler } from '../core/http/async-handler.js';
import { ok } from '../core/http/response.js';
import { createAuthModule } from '../modules/auth/auth.factory.js';
import { createOrganizationModule } from '../modules/organization/organization.factory.js';
import { createAssetModule } from '../modules/assets/asset.factory.js';
import { createAllocationModule } from '../modules/allocation/allocation.factory.js';

/**
 * API composition root. Feature modules are mounted here as phases complete.
 * Phase 1: health/readiness | Phase 2: auth | Phase 3: org | Phase 4: assets
 * Phase 5: allocation/transfers/returns
 */
export const apiRouter = Router();

// ── Module singletons (exported for inter-module use) ─────────────────────────
export const assetModule      = createAssetModule(prisma);
export const allocationModule = createAllocationModule(prisma, assetModule.service);

// Liveness — process is up.
apiRouter.get('/health', (_req, res) => ok(res, { status: 'ok' }));

// Readiness — dependencies (DB) reachable.
apiRouter.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    ok(res, { status: 'ready', database: 'up' });
  }),
);

// ── Feature routers ───────────────────────────────────────
apiRouter.use('/auth',        createAuthModule(prisma).router);
apiRouter.use('/',            createOrganizationModule(prisma)); // /departments, /categories, /users
apiRouter.use('/assets',      assetModule.router);               // Phase 4
apiRouter.use('/allocations', allocationModule.router);          // Phase 5
// apiRouter.use('/bookings',    bookingRouter);                  // Phase 6
// apiRouter.use('/maintenance', maintenanceRouter);              // Phase 7
// apiRouter.use('/audits',      auditRouter);                    // Phase 8

