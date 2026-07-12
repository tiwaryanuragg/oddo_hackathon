import type { NextFunction, Request, Response } from 'express';
import { UserStatus } from '@assetflow/shared';
import { AppError } from '../core/errors/app-error.js';
import { ErrorCode } from '../core/errors/error-codes.js';
import { tokenService } from '../modules/auth/token.service.js';

/**
 * Verifies the Bearer access token and attaches `req.user`. Rejects missing /
 * malformed / expired tokens (401) and non-active accounts (403). The token is
 * self-contained, so no DB round-trip is needed on the hot path; account
 * deactivation takes effect on the next refresh (≤15m) or immediately via
 * session revocation.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, ErrorCode.AUTH_UNAUTHENTICATED, 'Missing or malformed Authorization header');
  }

  const token = header.slice('Bearer '.length).trim();
  const payload = tokenService.verifyAccessToken(token);

  if (payload.status !== UserStatus.ACTIVE) {
    throw new AppError(403, ErrorCode.AUTH_ACCOUNT_INACTIVE, 'Account is not active');
  }

  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    status: payload.status,
  };
  next();
}
