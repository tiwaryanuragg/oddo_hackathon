import type { Role, UserStatus } from '@assetflow/shared';

/** The authenticated principal attached to `req.user` by `authenticate`. */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
}

/** Decoded access-token claims. */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
  status: UserStatus;
  type: 'access';
}

/** Result returned by the service on successful authentication. */
export interface AuthTokens {
  accessToken: string;
  /** Raw refresh token — set as an httpOnly cookie by the controller, never JSON. */
  refreshToken: string;
  refreshExpiresAt: Date;
}
