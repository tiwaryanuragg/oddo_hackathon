import { EventEmitter } from 'node:events';
import type { DomainEventMap, DomainEventName } from './events.js';

/**
 * A thin, fully-typed wrapper over Node's EventEmitter. In-process only — for a
 * modular monolith this is the right amount of decoupling without the operational
 * cost of a message broker. If a module is later extracted, swap this
 * implementation for a real bus behind the same interface.
 */
class TypedEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Many modules subscribe; lift the default 10-listener warning ceiling.
    this.emitter.setMaxListeners(50);
  }

  emit<K extends DomainEventName>(event: K, payload: DomainEventMap[K]): void {
    this.emitter.emit(event, payload);
  }

  on<K extends DomainEventName>(event: K, handler: (payload: DomainEventMap[K]) => void): void {
    this.emitter.on(event, handler);
  }
}

export const eventBus = new TypedEventBus();
