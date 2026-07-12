import { Router } from 'express';
import { asyncHandler } from '../../../core/http/async-handler.js';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import type { DepartmentController } from './department.controller.js';
import {
  createDepartmentSchema,
  departmentIdParamSchema,
  departmentListQuerySchema,
  updateDepartmentSchema,
} from './department.schema.js';

export function buildDepartmentRouter(controller: DepartmentController): Router {
  const router = Router();
  router.use(authenticate);

  router.get(
    '/',
    authorize('department:read'),
    validate({ query: departmentListQuerySchema }),
    asyncHandler(controller.list),
  );
  router.post(
    '/',
    authorize('department:manage'),
    validate({ body: createDepartmentSchema }),
    asyncHandler(controller.create),
  );
  router.get(
    '/:id',
    authorize('department:read'),
    validate({ params: departmentIdParamSchema }),
    asyncHandler(controller.get),
  );
  router.patch(
    '/:id',
    authorize('department:manage'),
    validate({ params: departmentIdParamSchema, body: updateDepartmentSchema }),
    asyncHandler(controller.update),
  );
  router.delete(
    '/:id',
    authorize('department:manage'),
    validate({ params: departmentIdParamSchema }),
    asyncHandler(controller.remove),
  );

  return router;
}
