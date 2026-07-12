import type { NextFunction, Request, Response } from 'express';
import { hasPermission, type Permission } from '@assetflow/shared';
import { AppError } from '../core/errors/app-error.js';
import { ErrorCode } from '../core/errors/error-codes.js';

/**
 * Guards a route by permission. Must run after `authenticate`. Passes if the
 * user's role grants ANY of the listed permissions (SUPER_ADMIN always passes,
 * handled inside `hasPermission`). Row-level ownership checks live in services,
 * not here — this only answers "is this role allowed to attempt the action".
 */
export function authorize(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, ErrorCode.AUTH_UNAUTHENTICATED, 'Authentication required');
    }
    const granted = permissions.some((perm) => hasPermission(req.user!.role, perm));
    if (!granted) {
      throw new AppError(403, ErrorCode.AUTH_FORBIDDEN, 'You do not have permission to perform this action');
    }
    next();
  };
}
