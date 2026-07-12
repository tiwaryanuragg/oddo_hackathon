import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import type { AllocationController } from './allocation.controller.js';
import {
  allocationQuerySchema,
  idParamSchema,
  issueAllocationSchema,
  revokeAllocationSchema,
  createTransferSchema,
  decideTransferSchema,
  transferQuerySchema,
  requestReturnSchema,
  processReturnSchema,
  returnQuerySchema,
} from './allocation.schema.js';

export function buildAllocationRouter(controller: AllocationController): Router {
  const router = Router();

  // All allocation routes require authentication
  router.use(authenticate);

  // ══ ALLOCATIONS ════════════════════════════════════════════════════════════

  // GET /allocations
  router.get(
    '/',
    authorize('allocation:read'),
    validate({ query: allocationQuerySchema }),
    asyncHandler(controller.listAllocations),
  );

  // POST /allocations  — issue an allocation (MANAGER / ADMIN)
  router.post(
    '/',
    authorize('allocation:approve'),
    validate({ body: issueAllocationSchema }),
    asyncHandler(controller.issueAllocation),
  );

  // GET /allocations/:id
  router.get(
    '/:id',
    authorize('allocation:read'),
    validate({ params: idParamSchema }),
    asyncHandler(controller.getAllocation),
  );

  // DELETE /allocations/:id  — administrative revoke
  router.delete(
    '/:id',
    authorize('allocation:approve'),
    validate({ params: idParamSchema, body: revokeAllocationSchema }),
    asyncHandler(controller.revokeAllocation),
  );

  // ══ TRANSFERS ══════════════════════════════════════════════════════════════

  // GET /allocations/transfers
  router.get(
    '/transfers',
    authorize('allocation:read'),
    validate({ query: transferQuerySchema }),
    asyncHandler(controller.listTransfers),
  );

  // POST /allocations/transfers  — anyone with allocation:create can request
  router.post(
    '/transfers',
    authorize('transfer:request'),
    validate({ body: createTransferSchema }),
    asyncHandler(controller.requestTransfer),
  );

  // GET /allocations/transfers/:id
  router.get(
    '/transfers/:id',
    authorize('allocation:read'),
    validate({ params: idParamSchema }),
    asyncHandler(controller.getTransfer),
  );

  // PATCH /allocations/transfers/:id/decide — MANAGER / ADMIN
  router.patch(
    '/transfers/:id/decide',
    authorize('transfer:approve'),
    validate({ params: idParamSchema, body: decideTransferSchema }),
    asyncHandler(controller.decideTransfer),
  );

  // DELETE /allocations/transfers/:id — cancel (requester / manager)
  router.delete(
    '/transfers/:id',
    authorize('transfer:request'),
    validate({ params: idParamSchema }),
    asyncHandler(controller.cancelTransfer),
  );

  // ══ RETURNS ═════════════════════════════════════════════════════════════════

  // GET /allocations/returns
  router.get(
    '/returns',
    authorize('allocation:read'),
    validate({ query: returnQuerySchema }),
    asyncHandler(controller.listReturns),
  );

  // POST /allocations/returns  — holder requests a return
  router.post(
    '/returns',
    authorize('return:process'),
    validate({ body: requestReturnSchema }),
    asyncHandler(controller.requestReturn),
  );

  // GET /allocations/returns/:id
  router.get(
    '/returns/:id',
    authorize('allocation:read'),
    validate({ params: idParamSchema }),
    asyncHandler(controller.getReturn),
  );

  // PATCH /allocations/returns/:id/process — MANAGER / ADMIN approve or reject
  router.patch(
    '/returns/:id/process',
    authorize('allocation:approve'),
    validate({ params: idParamSchema, body: processReturnSchema }),
    asyncHandler(controller.processReturn),
  );

  return router;
}
