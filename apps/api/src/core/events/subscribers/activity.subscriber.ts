import { prisma } from '../../prisma.js';
import { logger } from '../../logger.js';
import { eventBus } from '../event-bus.js';

/**
 * Writes an append-only ActivityLog row in reaction to domain events. Failures
 * here must never break the originating request, so every write is guarded and
 * logged rather than thrown.
 */
async function record(params: {
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        actorId: params.actorId ?? null,
        ipAddress: params.ipAddress ?? null,
        metadata: params.metadata as object | undefined,
      },
    });
  } catch (err) {
    logger.error({ err, action: params.action }, 'Failed to write activity log');
  }
}

export function registerActivitySubscriber(): void {
  eventBus.on('user.registered', (p) => {
    void record({ action: 'auth.signup', entityType: 'User', entityId: p.userId, actorId: p.userId, ipAddress: p.ip });
  });
  eventBus.on('user.logged_in', (p) => {
    void record({ action: 'auth.login', entityType: 'User', entityId: p.userId, actorId: p.userId, ipAddress: p.ip });
  });
  eventBus.on('auth.password_changed', (p) => {
    void record({ action: 'auth.password_changed', entityType: 'User', entityId: p.userId, actorId: p.userId, ipAddress: p.ip });
  });
  eventBus.on('auth.password_reset_requested', (p) => {
    void record({ action: 'auth.password_reset_requested', entityType: 'User', entityId: p.userId });
  });

  // Generic audit trail from any module.
  eventBus.on('audit.activity', (p) => {
    void record({
      action: p.action,
      entityType: p.entityType,
      entityId: p.entityId,
      actorId: p.actorId,
      metadata: p.metadata,
    });
  });

  eventBus.on('user.role_changed', (p) => {
    void record({
      action: 'user.role_changed',
      entityType: 'User',
      entityId: p.userId,
      actorId: p.actorId,
      metadata: { fromRole: p.fromRole, toRole: p.toRole },
    });
  });
}
