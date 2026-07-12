import { registerActivitySubscriber } from './subscribers/activity.subscriber.js';
import { registerNotificationSubscriber } from './subscribers/notification.subscriber.js';

export { eventBus } from './event-bus.js';
export type { DomainEventMap, DomainEventName } from './events.js';

let registered = false;

/**
 * Idempotently wires all event subscribers. Called once during app
 * construction. New subscribers (analytics, realtime) register here in later
 * phases.
 */
export function registerSubscribers(): void {
  if (registered) return;
  registered = true;
  registerActivitySubscriber();
  registerNotificationSubscriber();
}
