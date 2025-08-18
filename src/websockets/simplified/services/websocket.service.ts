import { io, Socket } from "socket.io-client";
import { ConnectionInfo, EventPayloadMap, RoomContext, RoomKey, RoomStatus, Subscription, UserRole, PermissionMatrix, WsEventName, WebSocketStats, ConnectionError, PermissionDeniedError, RoomOperationError } from "../types";
import { IConnectionManager, LocalEventBus } from "../core/connection-manager";
import { ReconnectionManager, BackoffOptions } from "./reconnection-manager";

export type WebSocketServiceOptions = {
  url?: string; // defaults to process.env.NEXT_PUBLIC_WS_URL
  reconnection?: boolean; // default false (we manage it)
  backoff?: BackoffOptions;
  debug?: boolean;
  permissions?: PermissionMatrix;
  onError?: (error: Error) => void;
};

export class WebSocketService<TMap extends EventPayloadMap = EventPayloadMap>
  implements IConnectionManager<TMap>
{
  private socket: Socket | null = null;
  private bus = new LocalEventBus<TMap>();
  private _info: ConnectionInfo = { state: "disconnected" };
  private reconnect = new ReconnectionManager();
  private rooms = new Set<string>();
  private onAnyHandler?: (event: string, ...args: any[]) => void;
  private url?: string;
  private options: WebSocketServiceOptions;
  private currentContext: RoomContext = {};
  private userRole: UserRole = UserRole.COMMON;
  private permissions: PermissionMatrix = {
    [UserRole.ADMIN]: '*',
    [UserRole.HEAD_REFEREE]: '*',
    [UserRole.ALLIANCE_REFEREE]: ['score_update' as WsEventName],
    [UserRole.TEAM_LEADER]: [],
    [UserRole.TEAM_MEMBER]: [],
    [UserRole.COMMON]: [],
  };
  private _stats: WebSocketStats = { sentCount: 0, receivedCount: 0, reconnectAttempts: 0 };

  constructor(options: WebSocketServiceOptions = {}) {
    this.options = options;
    this.url = options.url ?? process.env.NEXT_PUBLIC_WS_URL;
    if (options.backoff) this.reconnect = new ReconnectionManager(options.backoff);
    if (options.permissions) this.permissions = options.permissions;
  }

  async connect(url?: string): Promise<void> {
    if (this._info.state === "connected") return;
    this._info = { state: "connecting" };

    const target = url ?? this.url;
    if (!target) {
      const errMsg = "WebSocketService: URL is not provided (NEXT_PUBLIC_WS_URL or options.url)";
      const err = new ConnectionError(errMsg);
      this._info = { state: "error", lastError: errMsg };
      // eslint-disable-next-line no-console
      console.error(errMsg);
      this.options.onError?.(err);
      return;
    }

    // Ensure previous socket cleaned up
    this.teardownSocket();

    try {
      this.socket = io(target, {
        transports: ["websocket"],
        autoConnect: true,
        reconnection: false,
      });
      this.attachSocketHandlers();
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      this._info = { state: "error", lastError: msg };
      // eslint-disable-next-line no-console
      console.error("WebSocketService.connect error:", e);
      this.options.onError?.(new ConnectionError(msg));
    }
  }

  async disconnect(): Promise<void> {
    this.reconnect.stop();
    if (this.socket) {
      this.socket.disconnect();
    }
    this.teardownSocket();
    // Automatic subscription cleanup on manual disconnect
    this.bus.clearAll();
    this._info = { state: "disconnected" };
  }

  emit<K extends keyof TMap & string>(event: K, data: TMap[K]): void {
    // Permission validation (Requirement 5, 6.5)
    if (!this.canEmit(event)) {
      const message = `WebSocketService.emit blocked: role ${this.userRole} not permitted to emit '${event}'`;
      // eslint-disable-next-line no-console
      console.warn(message);
      this.options.onError?.(new PermissionDeniedError(message, { role: this.userRole, event }));
      return;
    }
    if (!event || typeof event !== "string") {
      // Basic event validation
      // eslint-disable-next-line no-console
      console.warn("WebSocketService.emit: invalid event name", event);
      return;
    }
    // Emit over network if connected
    if (this.socket && this._info.state === "connected") {
      this.socket.emit(event, data as any);
      this._stats.sentCount += 1;
      this._stats.lastEventAt = Date.now();
      if (this.options.debug) {
        // eslint-disable-next-line no-console
        console.info("[WS] emit", { event, scoped: typeof data === 'object' ? { ...data } : data });
      }
    }
    // Emit locally as well (optimistic update, optional)
    this.bus.emit(event, data);
  }

  on<K extends keyof TMap & string>(event: K, listener: (data: TMap[K]) => void): Subscription {
    return this.bus.on(event, listener);
  }

  off<K extends keyof TMap & string>(event: K, listener: (data: TMap[K]) => void): void {
    this.bus.off(event, listener);
  }

  info(): ConnectionInfo {
    return { ...this._info };
  }

  getStats(): WebSocketStats {
    return { ...this._stats };
  }

  // Room helpers to support auto-rejoin after reconnect
  joinRoom(room: string) {
    try {
      this.rooms.add(room);
      if (this.socket && this._info.state === "connected") {
        this.socket.emit("join_room", { room });
      }
      if (this.options.debug) {
        // eslint-disable-next-line no-console
        console.info("[WS] joinRoom", { room });
      }
    } catch (e: any) {
      const msg = `Failed to join room ${room}: ${String(e?.message ?? e)}`;
      // eslint-disable-next-line no-console
      console.warn(msg);
      this.options.onError?.(new RoomOperationError(msg, { room }));
    }
  }

  leaveRoom(room: string) {
    try {
      this.rooms.delete(room);
      if (this.socket && this._info.state === "connected") {
        this.socket.emit("leave_room", { room });
      }
      if (this.options.debug) {
        // eslint-disable-next-line no-console
        console.info("[WS] leaveRoom", { room });
      }
    } catch (e: any) {
      const msg = `Failed to leave room ${room}: ${String(e?.message ?? e)}`;
      // eslint-disable-next-line no-console
      console.warn(msg);
      this.options.onError?.(new RoomOperationError(msg, { room }));
    }
  }

  // Convenience helpers for tournament/field rooms
  private roomKeyFromContext(ctx: RoomContext): RoomKey[] {
    const keys: RoomKey[] = [];
    if (ctx.tournamentId) keys.push(`tournament:${ctx.tournamentId}`);
    if (ctx.fieldId) keys.push(`field:${ctx.fieldId}`);
    return keys;
  }

  async setRoomContext(ctx: RoomContext): Promise<void> {
    const prevKeys = this.roomKeyFromContext(this.currentContext);
    const nextKeys = this.roomKeyFromContext(ctx);
    // leave rooms that are not needed anymore
    for (const rk of prevKeys) if (!nextKeys.includes(rk)) this.leaveRoom(rk);
    // join new rooms
    for (const rk of nextKeys) if (!this.rooms.has(rk)) this.joinRoom(rk);
    this.currentContext = { ...ctx };
    if (this.options.debug) {
      // eslint-disable-next-line no-console
      console.info("[WS] setRoomContext", { context: this.currentContext });
    }
  }

  getJoinedRooms(): RoomKey[] {
    return Array.from(this.rooms);
  }

  getRoomStatus(): RoomStatus {
    const rooms = this.getJoinedRooms();
    return {
      rooms,
      hasTournament: rooms.some((r) => r.startsWith("tournament:")),
      hasField: rooms.some((r) => r.startsWith("field:")),
    };
  }

  private attachSocketHandlers() {
    if (!this.socket) return;

    // onAny passthrough to local bus
    this.onAnyHandler = (event: string, ...args: any[]) => {
      // Only forward first arg as payload by convention
      const payload = args[0];
      
      // Debug: Log ALL events received (for debugging)
      if (this.options.debug || event === 'match_update' || event === 'score_update') {
        console.log("🔥 [WS] RAW event received:", {
          event,
          payload: payload,
          joinedRooms: Array.from(this.rooms),
          currentContext: this.currentContext,
          timestamp: new Date().toISOString()
        });
      }
      
      // Room-based filtering for incoming events (Requirement 4.5)
      if (!this.isPayloadAllowedByRoom(payload)) {
        if (this.options.debug) {
          // eslint-disable-next-line no-console
          console.info("[WS] drop (room filter)", { event, payload });
        }
        return; // drop events that are out of current room context
      }
      
      this._stats.receivedCount += 1;
      this._stats.lastEventAt = Date.now();
      if (this.options.debug) {
        // eslint-disable-next-line no-console
        console.info("[WS] recv (passed filter)", { event, payload });
      }
      
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.bus.emit(event as keyof TMap & string, payload as any);
    };
    this.socket.onAny(this.onAnyHandler);

    this.socket.on("connect", () => {
      this._info = { state: "connected", lastConnectedAt: Date.now() };
      if (this.options.debug) {
        // eslint-disable-next-line no-console
        console.info("[WS] connected", { url: this.url });
      }
      // Reset backoff
      this.reconnect.reset();
      this._stats.connectedSince = Date.now();
      // Rejoin rooms
      for (const room of this.rooms) {
        this.socket?.emit("join_room", { room });
      }
    });

    this.socket.on("disconnect", (reason) => {
      // Socket.IO emits manual disconnect reason as 'io client disconnect'
      const manual = reason === "io client disconnect";
      this._info = { state: manual ? "disconnected" : "reconnecting", lastError: String(reason) };
      if (this.options.debug) {
        // eslint-disable-next-line no-console
        console.info("[WS] disconnect", { reason, manual });
      }

      if (!manual) {
        // schedule reconnect
        const { scheduled, delay } = this.reconnect.schedule(() => {
          // only if still not connected
          if (this.socket && this._info.state !== "connected") {
            try {
              this.socket.connect();
            } catch (e) {
              // swallow and reschedule
              this.reconnect.schedule(() => this.socket?.connect());
            }
          }
        });
        if (scheduled) this._stats.reconnectAttempts += 1;
        if (this.options.debug) {
          // eslint-disable-next-line no-console
          console.info("[WS] reconnect scheduled", { delay });
        }
      }
    });

    this.socket.on("connect_error", (err: Error) => {
      this._info = { state: "error", lastError: err.message };
      if (this.options.debug) {
        // eslint-disable-next-line no-console
        console.info("[WS] connect_error", { error: err.message });
      }
      // try to reconnect
      this._info = { state: "reconnecting", lastError: err.message };
      this.reconnect.schedule(() => this.socket?.connect());
      this._stats.reconnectAttempts += 1;
      this.options.onError?.(new ConnectionError(err.message));
    });

    this.socket.on("error", (err: any) => {
      this._info = { state: "error", lastError: String(err?.message ?? err) };
      if (this.options.debug) {
        // eslint-disable-next-line no-console
        console.info("[WS] error", { error: this._info.lastError });
      }
      this.options.onError?.(new ConnectionError(this._info.lastError ?? 'socket error'));
    });
  }

  private teardownSocket() {
    if (!this.socket) return;

    try {
      if (this.onAnyHandler) {
        this.socket.offAny(this.onAnyHandler);
      }
      this.socket.removeAllListeners();
      if (this.socket.connected) this.socket.disconnect();
    } catch {
      // ignore
    } finally {
      this.socket = null;
      this.onAnyHandler = undefined;
    }
  }

  // Decide if incoming payload belongs to current joined rooms
  private isPayloadAllowedByRoom(payload: unknown): boolean {
    try {
      // TEMPORARY DEBUG: Special flag to bypass room filtering completely (for testing)
      if (typeof window !== 'undefined' && (window as any).BYPASS_ROOM_FILTER === true) {
        console.log('🚨 [WS] BYPASSING ROOM FILTER (DEBUG MODE):', { payload });
        return true;
      }
      
      if (!payload || typeof payload !== "object") return true; // no scoping info => allow
      const p = payload as Record<string, unknown>;
      
      // Allow broadcast events (these bypass room filtering)
      if (p["broadcast"] === true) {
        if (this.options.debug) {
          console.log('[WS] Allowing broadcast event:', p);
        }
        return true;
      }
      
      const rooms = this.getJoinedRooms();
      const hasTournament = typeof p["tournamentId"] === "string";
      const hasField = typeof p["fieldId"] === "string";
      const roomKey = typeof p["roomKey"] === "string" ? (p["roomKey"] as string) : undefined;

      if (roomKey) {
        return rooms.includes(roomKey);
      }
      // If either scope is present, enforce it
      if (hasTournament) {
        if (!rooms.includes(`tournament:${String(p["tournamentId"])}`)) {
          if (this.options.debug) {
            console.log('[WS] Filtering out event - tournament mismatch:', {
              eventTournament: p["tournamentId"],
              joinedRooms: rooms,
              expectedRoom: `tournament:${String(p["tournamentId"])}`
            });
          }
          return false;
        }
      }
      if (hasField) {
        if (!rooms.includes(`field:${String(p["fieldId"])}`)) {
          if (this.options.debug) {
            console.log('[WS] Filtering out event - field mismatch:', {
              eventField: p["fieldId"],
              joinedRooms: rooms,
              expectedRoom: `field:${String(p["fieldId"])}`
            });
          }
          return false;
        }
      }
      return true;
    } catch {
      return true; // be permissive if structure unexpected
    }
  }

  // Emit with optional scoping metadata from current context
  emitScoped<K extends keyof TMap & string>(
    event: K,
    data: TMap[K],
    options?: { includeContext?: boolean; contextOverride?: RoomContext }
  ): void {
    const include = options?.includeContext ?? true;
    let payload: any = data;
    if (include && data && typeof data === "object") {
      const ctx = options?.contextOverride ?? this.currentContext;
      payload = {
        ...(data as Record<string, unknown>),
        ...(ctx.tournamentId ? { tournamentId: ctx.tournamentId } : {}),
        ...(ctx.fieldId ? { fieldId: ctx.fieldId } : {}),
      };
    }

    // Handle broadcast scenario - if tournamentId is 'all', emit without tournament scoping
    if (payload?.tournamentId === 'all') {
      const { tournamentId, ...broadcastPayload } = payload;
      // Emit without tournamentId for broadcast (will reach all rooms)
      this.emit(event, { ...broadcastPayload, broadcast: true } as TMap[K]);
      
      if (this.options.debug) {
        console.log('[WS] Broadcasting event to all tournaments:', event, broadcastPayload);
      }
    } else {
      this.emit(event, payload as TMap[K]);
    }
  }

  // Role management API
  setUserRole(role: UserRole): void {
    if (!Object.values(UserRole).includes(role)) {
      // eslint-disable-next-line no-console
      console.warn("WebSocketService.setUserRole: invalid role", role);
      return;
    }
    this.userRole = role;
    if (this.options.debug) {
      // eslint-disable-next-line no-console
      console.info("[WS] role set", { role });
    }
  }

  canEmit(event: string): boolean {
    const perms = this.permissions;
    if (perms === '*') return true;
    const allow = perms[this.userRole];
    if (!allow) return false;
    if (allow === '*') return true;
    return allow.includes(event as WsEventName);
  }

  // Convenience senders (Requirement 9)
  // 9.1 Score updates
  sendScoreUpdate(data: unknown): void {
    const event = 'score_update' as keyof TMap & string;
    if (!data || typeof data !== 'object') {
      console.warn('[WS] sendScoreUpdate: invalid payload (expected object)');
      return;
    }

    const d = data as Record<string, unknown>;

    // matchId is required
    if (typeof d['matchId'] !== 'string') {
      console.warn('[WS] sendScoreUpdate: missing required field matchId:string');
      return;
    }

    // Accept either a full score payload (red/blue totals) or a scoped alliance update
    const hasFullScores =
      typeof d['redTotalScore'] === 'number' || typeof d['blueTotalScore'] === 'number';
    const hasAllianceUpdate = typeof d['alliance'] === 'string';

    if (!hasFullScores && !hasAllianceUpdate) {
      console.warn('[WS] sendScoreUpdate: payload must include redTotalScore/blueTotalScore or an alliance update');
      return;
    }

    // If alliance update provided, ensure score (when present) is numeric
    if (hasAllianceUpdate && d['score'] != null && typeof d['score'] !== 'number') {
      console.warn('[WS] sendScoreUpdate: score must be number when provided for alliance updates');
      return;
    }

    // Finally emit scoped payload
    this.emitScoped(event, d as any);
  }

  // 9.2 Timer updates
  sendTimerUpdate(data: unknown): void {
    const event = 'timer_update' as keyof TMap & string;
    if (!data || typeof data !== 'object') {
      console.warn('[WS] sendTimerUpdate: invalid payload (expected object)');
      return;
    }
    const d = { ...(data as Record<string, unknown>) };
    if (typeof d['matchId'] !== 'string') {
      console.warn('[WS] sendTimerUpdate: missing required field matchId:string');
      return;
    }
    // Normalize seconds
    if (typeof d['seconds'] === 'number') {
      d['seconds'] = Math.max(0, Math.floor(d['seconds'] as number));
    }
    // state optional: 'start' | 'pause' | 'reset' | 'sync'
    if (d['state'] != null && typeof d['state'] !== 'string') {
      console.warn('[WS] sendTimerUpdate: state must be string when provided');
      return;
    }
    this.emitScoped(event, d as any);
  }

  // 9.3 Match updates
  sendMatchUpdate(data: unknown): void {
    const event = 'match_update' as keyof TMap & string;
    if (!data || typeof data !== 'object') {
      console.warn('[WS] sendMatchUpdate: invalid payload (expected object)');
      return;
    }
    const d = data as Record<string, unknown>;
    
    // Debug logging to help identify the source of missing matchId
    if (this.options.debug) {
      console.log('[WS] sendMatchUpdate payload:', JSON.stringify(d, null, 2));
    }
    
    // Support callers that use either `matchId` or `id` for match identifier
    if (typeof d['matchId'] !== 'string' && typeof d['id'] === 'string') {
      d['matchId'] = d['id'];
      if (this.options.debug) {
        console.log('[WS] sendMatchUpdate: converted id to matchId:', d['matchId']);
      }
    }

    if (typeof d['matchId'] !== 'string') {
      console.warn('[WS] sendMatchUpdate: missing required field matchId:string (or id)');
      console.warn('[WS] sendMatchUpdate: received data keys:', Object.keys(d));
      console.warn('[WS] sendMatchUpdate: received data:', d);
      return;
    }

    // Emit normalized payload
    this.emitScoped(event, d as any);
  }

  // 9.4 Audience display mode changes
  sendDisplayModeChange(data: unknown): void {
    const event = 'display_mode_change' as keyof TMap & string;
    if (!data || typeof data !== 'object') {
      console.warn('[WS] sendDisplayModeChange: invalid payload (expected object)');
      return;
    }
    const d = data as Record<string, unknown>;
    // Check for both 'mode' and 'displayMode' fields for compatibility
    if (typeof d['mode'] !== 'string' && typeof d['displayMode'] !== 'string') {
      console.warn('[WS] sendDisplayModeChange: missing required field mode:string or displayMode:string');
      console.warn('[WS] sendDisplayModeChange: received data:', d);
      return;
    }
    
    // Normalize the data to use 'displayMode' consistently
    if (typeof d['displayMode'] === 'string' && typeof d['mode'] !== 'string') {
      d['mode'] = d['displayMode'];
    }
    
    this.emitScoped(event, d as any);
  }

  // 9.5 Announcements
  sendAnnouncement(data: unknown): void {
    const event = 'announcement' as keyof TMap & string;
    if (!data || typeof data !== 'object') {
      console.warn('[WS] sendAnnouncement: invalid payload (expected object)');
      return;
    }
    const d = { ...(data as Record<string, unknown>) };
    if (typeof d['message'] !== 'string') {
      console.warn('[WS] sendAnnouncement: missing required field message:string');
      return;
    }
    d['message'] = (d['message'] as string).trim();
    if (!(d['message'] as string)) {
      console.warn('[WS] sendAnnouncement: message cannot be empty');
      return;
    }
    // optional: level: 'info' | 'warning' | 'error'
    if (d['level'] != null && typeof d['level'] !== 'string') {
      console.warn('[WS] sendAnnouncement: level must be string when provided');
      return;
    }
    this.emitScoped(event, d as any);
  }
}
