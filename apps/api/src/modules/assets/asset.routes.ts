import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import type { AssetController } from './asset.controller.js';
import {
  assetIdParamSchema,
  assetQuerySchema,
  assetQrQuerySchema,
  changeStatusSchema,
  registerAssetSchema,
  retireAssetSchema,
  updateAssetSchema,
} from './asset.schema.js';

export function buildAssetRouter(controller: AssetController): Router {
  const router = Router();

  // All asset routes require authentication
  router.use(authenticate);

  // ── Collection ─────────────────────────────────────────────────────────────

  router.get(
    '/',
    authorize('asset:read'),
    validate({ query: assetQuerySchema }),
    asyncHandler(controller.list),
  );

  router.post(
    '/',
    authorize('asset:manage'),
    validate({ body: registerAssetSchema }),
    asyncHandler(controller.register),
  );

  // ── Single resource ────────────────────────────────────────────────────────

  router.get(
    '/:id',
    authorize('asset:read'),
    validate({ params: assetIdParamSchema }),
    asyncHandler(controller.get),
  );

  router.patch(
    '/:id',
    authorize('asset:manage'),
    validate({ params: assetIdParamSchema, body: updateAssetSchema }),
    asyncHandler(controller.update),
  );

  // ── Sub-resources ──────────────────────────────────────────────────────────

  router.patch(
    '/:id/status',
    authorize('asset:manage'),
    validate({ params: assetIdParamSchema, body: changeStatusSchema }),
    asyncHandler(controller.changeStatus),
  );

  router.post(
    '/:id/retire',
    authorize('asset:retire'),
    validate({ params: assetIdParamSchema, body: retireAssetSchema }),
    asyncHandler(controller.retire),
  );

  router.get(
    '/:id/history',
    authorize('asset:read'),
    validate({ params: assetIdParamSchema }),
    asyncHandler(controller.getHistory),
  );

  router.get(
    '/:id/qr',
    authorize('asset:read'),
    validate({ params: assetIdParamSchema, query: assetQrQuerySchema }),
    asyncHandler(controller.getQr),
  );

  router.get(
    '/:id/depreciation',
    authorize('asset:read'),
    validate({ params: assetIdParamSchema }),
    asyncHandler(controller.getDepreciation),
  );

  return router;
}
