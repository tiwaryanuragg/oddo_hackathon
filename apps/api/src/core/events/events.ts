import type { Role } from '@assetflow/shared';

/**
 * Typed domain-event catalogue. Services announce facts here after a successful
 * transaction; subscribers (activity log, notifications, analytics) react. This
 * decouples side effects from business logic — Auth doesn't import ActivityLog.
 */
export interface DomainEventMap {
  'user.registered': { userId: string; email: string; ip?: string };
  'user.logged_in': { userId: string; ip?: string; userAgent?: string };
  'auth.password_reset_requested': { userId: string; email: string };
  'auth.password_changed': { userId: string; ip?: string };

  // Generic audit trail — any module emits this to append an ActivityLog row.
  'audit.activity': {
    action: string;
    entityType: string;
    entityId: string;
    actorId?: string;
    metadata?: Record<string, unknown>;
  };

  // Organization
  'user.role_changed': { userId: string; actorId: string; fromRole: Role; toRole: Role };
}

export type DomainEventName = keyof DomainEventMap;
