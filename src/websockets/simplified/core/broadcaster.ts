import { JsonValue, Subscription } from "../types";

export type CrossTabMessage = {
  type: string;
  payload?: JsonValue;
  event?: string;
  ts: number;
  senderId: string;
};

export interface IBroadcaster {
  post(message: CrossTabMessage): void;
  on(handler: (message: CrossTabMessage) => void): Subscription;
  close(): void;
}

const CHANNEL_NAME = "ws-simplified-sync";

export class BroadcastChannelBroadcaster implements IBroadcaster {
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<(message: CrossTabMessage) => void>();
  private readonly id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.addEventListener("message", (ev: MessageEvent<CrossTabMessage>) => {
        const msg = ev.data;
        if (!msg || msg.senderId === this.id) return;
        for (const l of Array.from(this.listeners)) {
          try { l(msg); } catch (e) { console.error("Broadcaster listener error", e); }
        }
      });
    }
  }

  post(message: Omit<CrossTabMessage, "senderId" | "ts"> & Partial<Pick<CrossTabMessage, "senderId" | "ts">>): void {
    const payload: CrossTabMessage = {
      senderId: this.id,
      ts: Date.now(),
      ...message,
    } as CrossTabMessage;

    if (this.channel) {
      this.channel.postMessage(payload);
    } else {
      // Fallback: no-op for now; can add localStorage fallback later
      console.debug("Broadcast fallback(no-op)", payload.type);
    }
  }

  on(handler: (message: CrossTabMessage) => void): Subscription {
    this.listeners.add(handler);
    return { unsubscribe: () => this.listeners.delete(handler) };
  }

  close(): void {
    this.listeners.clear();
    this.channel?.close();
    this.channel = null;
  }
}
