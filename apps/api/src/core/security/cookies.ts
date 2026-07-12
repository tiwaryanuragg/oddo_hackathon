import type { CookieOptions } from 'express';
import { API_PREFIX } from '@assetflow/shared';
import { isProd } from '../../config/env.js';

/** Name of the httpOnly refresh-token cookie. */
export const REFRESH_COOKIE_NAME = 'af_refresh';

// Scope the cookie to the auth routes only — it is never sent to other
// endpoints, shrinking its exposure surface.
const COOKIE_PATH = `${API_PREFIX}/auth`;

const base: CookieOptions = {
  httpOnly: true,
  secure: isProd, // require HTTPS in production
  sameSite: 'strict', // CSRF-safe: browser won't attach it on cross-site requests
  path: COOKIE_PATH,
};

export function refreshCookieOptions(maxAgeMs: number): CookieOptions {
  return { ...base, maxAge: maxAgeMs };
}

export function clearRefreshCookieOptions(): CookieOptions {
  return { ...base };
}
