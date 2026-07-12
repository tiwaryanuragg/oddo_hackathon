import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import type { AuthController } from './auth.controller.js';
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  sessionIdParamSchema,
  signupSchema,
} from './auth.schema.js';

/**
 * Stricter limiter for credential-handling endpoints to blunt brute-force /
 * enumeration attempts, independent of the global API limiter.
 */
const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again shortly.' } },
});

export function buildAuthRouter(controller: AuthController): Router {
  const router = Router();

  router.post('/signup', authLimiter, validate({ body: signupSchema }), asyncHandler(controller.signup));
  router.post('/login', authLimiter, validate({ body: loginSchema }), asyncHandler(controller.login));
  router.post('/refresh', asyncHandler(controller.refresh));
  router.post('/logout', asyncHandler(controller.logout));
  router.post(
    '/forgot-password',
    authLimiter,
    validate({ body: forgotPasswordSchema }),
    asyncHandler(controller.forgotPassword),
  );
  router.post(
    '/reset-password',
    authLimiter,
    validate({ body: resetPasswordSchema }),
    asyncHandler(controller.resetPassword),
  );

  // Authenticated
  router.get('/me', authenticate, asyncHandler(controller.me));
  router.get('/sessions', authenticate, asyncHandler(controller.sessions));
  router.delete(
    '/sessions/:id',
    authenticate,
    validate({ params: sessionIdParamSchema }),
    asyncHandler(controller.revokeSession),
  );

  return router;
}
