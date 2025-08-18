import { ConnectionInfo, EventListener, EventPayloadMap, Subscription, WsEventName } from "../types";

// Interface for a simplified connection manager used by FE
export interface IConnectionManager<TMap extends EventPayloadMap = EventPayloadMap> {
  connect(url?: string): Promise<void>;
  disconnect(): Promise<void>;
  emit<K extends keyof TMap & string>(event: K, data: TMap[K]): void;
  on<K extends keyof TMap & string>(event: K, listener: (data: TMap[K]) => void): Subscription;
  off<K extends keyof TMap & string>(event: K, listener: (data: TMap[K]) => void): void;
  info(): ConnectionInfo;
}

// Lightweight event emitter to use in implementations
export class LocalEventBus<TMap extends EventPayloadMap = EventPayloadMap> {
  private listeners = new Map<WsEventName, Set<Function>>();

  on<K extends keyof TMap & string>(event: K, cb: (data: TMap[K]) => void): Subscription {
    const set = this.listeners.get(event) ?? new Set();
    set.add(cb);
    this.listeners.set(event, set);
    return { unsubscribe: () => this.off(event, cb) };
  }

  off<K extends keyof TMap & string>(event: K, cb: (data: TMap[K]) => void): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(cb);
    if (set.size === 0) this.listeners.delete(event);
  }

  emit<K extends keyof TMap & string>(event: K, data: TMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of Array.from(set)) {
      try {
        (cb as EventListener<TMap>)(event, data);
      } catch (e) {
        // Avoid throwing in event loop
        // eslint-disable-next-line no-console
        console.error("LocalEventBus listener error", e);
      }
    }
  }

  // Remove all listeners for all events – used to auto-clean subscriptions on disconnect
  clearAll(): void {
    this.listeners.clear();
  }
}
