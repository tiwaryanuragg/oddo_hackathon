import { Router } from 'express';
import { asyncHandler } from '../../../core/http/async-handler.js';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import type { UserController } from './user.controller.js';
import {
  promoteUserSchema,
  updateUserSchema,
  userIdParamSchema,
  userListQuerySchema,
} from './user.schema.js';

export function buildUserRouter(controller: UserController): Router {
  const router = Router();
  router.use(authenticate);

  router.get(
    '/',
    authorize('user:read'),
    validate({ query: userListQuerySchema }),
    asyncHandler(controller.list),
  );
  router.get(
    '/:id',
    authorize('user:read'),
    validate({ params: userIdParamSchema }),
    asyncHandler(controller.get),
  );
  router.patch(
    '/:id',
    authorize('user:manage'),
    validate({ params: userIdParamSchema, body: updateUserSchema }),
    asyncHandler(controller.update),
  );
  router.post(
    '/:id/promote',
    authorize('user:promote'),
    validate({ params: userIdParamSchema, body: promoteUserSchema }),
    asyncHandler(controller.promote),
  );

  return router;
}
