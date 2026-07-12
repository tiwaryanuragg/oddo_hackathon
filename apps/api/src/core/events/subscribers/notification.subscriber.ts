import { NotificationType } from '@assetflow/shared';
import { prisma } from '../../prisma.js';
import { logger } from '../../logger.js';
import { eventBus } from '../event-bus.js';

/**
 * Persists in-app Notifications in reaction to domain events. Realtime push
 * (Socket.io) is layered on top of this in Phase 10 — the row is the source of
 * truth; the socket is just delivery.
 */
async function notify(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, userId: params.userId }, 'Failed to create notification');
  }
}

export function registerNotificationSubscriber(): void {
  eventBus.on('user.role_changed', (p) => {
    void notify({
      userId: p.userId,
      type: NotificationType.ROLE_CHANGE,
      title: 'Your role was updated',
      message: `Your role changed from ${p.fromRole} to ${p.toRole}.`,
      entityType: 'User',
      entityId: p.userId,
    });
  });
}
