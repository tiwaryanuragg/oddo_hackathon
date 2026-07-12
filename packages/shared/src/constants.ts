/** Cross-cutting constants shared by API and web client. */

export const API_PREFIX = '/api/v1';

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const TOKEN = {
  /** Access token lifetime (short-lived, carried in Authorization header). */
  ACCESS_TTL: '15m',
  /** Refresh token lifetime (long-lived, stored hashed + rotated). */
  REFRESH_TTL: '7d',
  /** Password reset token lifetime. */
  RESET_TTL_MINUTES: 30,
} as const;

export const ASSET_TAG_PREFIX = 'AST';

/** Socket.io channels / event names. Kept here so client and server agree. */
export const SOCKET_EVENTS = {
  NOTIFICATION_NEW: 'notification:new',
  ASSET_UPDATED: 'asset:updated',
  ALLOCATION_UPDATED: 'allocation:updated',
  MAINTENANCE_UPDATED: 'maintenance:updated',
  BOOKING_UPDATED: 'booking:updated',
} as const;

/** Room naming helpers for Socket.io targeted delivery. */
export const SOCKET_ROOMS = {
  user: (userId: string) => `user:${userId}`,
  department: (departmentId: string) => `department:${departmentId}`,
  role: (role: string) => `role:${role}`,
} as const;
