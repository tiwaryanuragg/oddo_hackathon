import { Router } from 'express';
import { asyncHandler } from '../../../core/http/async-handler.js';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import type { CategoryController } from './category.controller.js';
import {
  categoryIdParamSchema,
  categoryListQuerySchema,
  createCategorySchema,
  updateCategorySchema,
} from './category.schema.js';

export function buildCategoryRouter(controller: CategoryController): Router {
  const router = Router();
  router.use(authenticate);

  router.get(
    '/',
    authorize('category:read'),
    validate({ query: categoryListQuerySchema }),
    asyncHandler(controller.list),
  );
  router.post(
    '/',
    authorize('category:manage'),
    validate({ body: createCategorySchema }),
    asyncHandler(controller.create),
  );
  router.get(
    '/:id',
    authorize('category:read'),
    validate({ params: categoryIdParamSchema }),
    asyncHandler(controller.get),
  );
  router.patch(
    '/:id',
    authorize('category:manage'),
    validate({ params: categoryIdParamSchema, body: updateCategorySchema }),
    asyncHandler(controller.update),
  );
  router.delete(
    '/:id',
    authorize('category:manage'),
    validate({ params: categoryIdParamSchema }),
    asyncHandler(controller.remove),
  );

  return router;
}
