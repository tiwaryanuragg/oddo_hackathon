import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { TOKEN, type Role, type UserStatus } from '@assetflow/shared';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/app-error.js';
import { ErrorCode } from '../../core/errors/error-codes.js';
import type { AccessTokenPayload } from './auth.types.js';

export interface AccessTokenSubject {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
}

/** Parse a compact duration ("15m", "7d", "30s") into milliseconds. */
function parseDurationMs(input: string): number {
  const match = /^(\d+)([smhd])$/.exec(input.trim());
  if (!match) throw new Error(`Invalid duration: ${input}`);
  const value = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const factor = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
  return value * factor;
}

/**
 * Owns all token cryptography. Access tokens are stateless JWTs; refresh tokens
 * are opaque random strings whose HMAC is persisted (so the raw value need never
 * be stored and a leaked DB reveals nothing usable).
 */
export const tokenService = {
  signAccessToken(user: AccessTokenSubject): string {
    const payload: Omit<AccessTokenPayload, 'sub'> = {
      email: user.email,
      role: user.role,
      status: user.status,
      type: 'access',
    };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      subject: user.id,
      expiresIn: TOKEN.ACCESS_TTL,
    } as jwt.SignOptions);
  },

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
      if (decoded.type !== 'access' || typeof decoded.sub !== 'string') {
        throw new AppError(401, ErrorCode.AUTH_TOKEN_INVALID, 'Invalid access token');
      }
      return {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        status: decoded.status,
        type: 'access',
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (err instanceof jwt.TokenExpiredError) {
        throw new AppError(401, ErrorCode.AUTH_TOKEN_EXPIRED, 'Access token expired');
      }
      throw new AppError(401, ErrorCode.AUTH_TOKEN_INVALID, 'Invalid access token');
    }
  },

  /** New opaque refresh token (raw value returned to the client via cookie). */
  generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  },

  /** Deterministic keyed hash of a refresh token for at-rest storage/lookup. */
  hashRefreshToken(rawToken: string): string {
    return crypto.createHmac('sha256', env.JWT_REFRESH_SECRET).update(rawToken).digest('hex');
  },

  refreshExpiryDate(): Date {
    return new Date(Date.now() + parseDurationMs(TOKEN.REFRESH_TTL));
  },

  resetTokenExpiryDate(): Date {
    return new Date(Date.now() + TOKEN.RESET_TTL_MINUTES * 60_000);
  },

  /** Opaque password-reset token + its at-rest hash. */
  generateResetToken(): { raw: string; hash: string } {
    const raw = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHmac('sha256', env.JWT_REFRESH_SECRET).update(raw).digest('hex');
    return { raw, hash };
  },
};
