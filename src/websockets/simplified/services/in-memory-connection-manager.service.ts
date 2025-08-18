import { ConnectionInfo, EventPayloadMap } from "../types";
import { IConnectionManager, LocalEventBus } from "../core/connection-manager";
import { BroadcastChannelBroadcaster } from "../core/broadcaster";

// Minimal in-memory connection manager for development/testing.
// - No real network connection yet; acts as a façade.
// - Mirrors simplified BE structure and allows cross-tab event sync via BroadcastChannel.
export class InMemoryConnectionManager<TMap extends EventPayloadMap = EventPayloadMap>
  implements IConnectionManager<TMap>
{
  private bus = new LocalEventBus<TMap>();
  private broadcaster = new BroadcastChannelBroadcaster();
  private _info: ConnectionInfo = { state: "disconnected" };
  private readonly CHANNEL_EVENT = "WEBSOCKET_EVENT";

  constructor() {
    // Receive events from other tabs and re-emit locally
    this.broadcaster.on((msg) => {
      if (msg.type !== this.CHANNEL_EVENT || !msg.event) return;
      this.bus.emit(msg.event as keyof TMap & string, msg.payload as TMap[keyof TMap & string]);
    });
  }

  async connect(): Promise<void> {
    if (this._info.state === "connected") return;
    this._info = { state: "connecting" };
    // Simulate async establish
    await new Promise((r) => setTimeout(r, 10));
    this._info = { state: "connected", lastConnectedAt: Date.now() };
  }

  async disconnect(): Promise<void> {
    if (this._info.state === "disconnected") return;
    this._info = { state: "disconnected" };
  }

  emit<K extends keyof TMap & string>(event: K, data: TMap[K]): void {
    // Emit locally
    this.bus.emit(event, data);
    // Broadcast cross-tab
    this.broadcaster.post({ type: this.CHANNEL_EVENT, event, payload: data });
  }

  on<K extends keyof TMap & string>(event: K, listener: (data: TMap[K]) => void) {
    return this.bus.on(event, listener);
  }

  off<K extends keyof TMap & string>(event: K, listener: (data: TMap[K]) => void): void {
    this.bus.off(event, listener);
  }

  info(): ConnectionInfo {
    return { ...this._info };
  }
}
