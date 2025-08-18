import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ConnectionInfo,
  EventPayloadMap,
  PermissionMatrix,
  RoomContext,
  RoomStatus,
  Subscription,
  UserRole,
  WebSocketStats,
} from "./types";
import { WebSocketService, WebSocketServiceOptions } from "./services/websocket.service";

// Create individual WebSocket instances per hook to avoid room context conflicts
export type UseWebSocketOptions = WebSocketServiceOptions & {
  autoConnect?: boolean;
  tournamentId?: string;
  fieldId?: string;
  role?: UserRole;
  permissions?: PermissionMatrix; // override per-hook if desired
  instanceId?: string; // Optional unique identifier for this instance
};

export type UseWebSocketReturn<TMap extends EventPayloadMap = EventPayloadMap> = {
  // state
  info: ConnectionInfo;
  roomStatus: RoomStatus;
  getStats: () => WebSocketStats;
  // core
  connect: (url?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  emit: <K extends keyof TMap & string>(event: K, data: TMap[K]) => void;
  emitScoped: <K extends keyof TMap & string>(
    event: K,
    data: TMap[K],
    options?: { includeContext?: boolean; contextOverride?: RoomContext }
  ) => void;
  on: <K extends keyof TMap & string>(event: K, cb: (data: TMap[K]) => void) => Subscription;
  off: <K extends keyof TMap & string>(event: K, cb: (data: TMap[K]) => void) => void;
  // rooms
  setRoomContext: (ctx: RoomContext) => Promise<void>;
  getRoomStatus: () => RoomStatus;
  // roles
  setUserRole: (role: UserRole) => void;
  canEmit: (event: string) => boolean;
  // convenience senders
  sendScoreUpdate: (data: unknown) => void;
  sendTimerUpdate: (data: unknown) => void;
  sendMatchUpdate: (data: unknown) => void;
  sendDisplayModeChange: (data: unknown) => void;
  sendAnnouncement: (data: unknown) => void;
};

// Global WebSocket service - shared across all instances for unified communication
let globalWebSocketService: WebSocketService<any> | null = null;
const instanceContexts = new Map<string, { tournamentId?: string; fieldId?: string; role?: UserRole }>();

function getOrCreateSharedInstance<TMap extends EventPayloadMap = EventPayloadMap>(
  instanceId: string,
  opts?: WebSocketServiceOptions & { tournamentId?: string; fieldId?: string; role?: UserRole }
): WebSocketService<TMap> {
  // Store context for this instance
  instanceContexts.set(instanceId, {
    tournamentId: opts?.tournamentId,
    fieldId: opts?.fieldId,
    role: opts?.role
  });
  
  if (!globalWebSocketService) {
    // Enable debug mode in development environment
    const debugMode = process.env.NODE_ENV === 'development' || opts?.debug;
    globalWebSocketService = new WebSocketService<TMap>({ debug: debugMode, ...opts });
    console.log(`🔌 [WebSocket] Created SHARED global instance (first requester: ${instanceId})`);
  } else {
    console.log(`🔌 [WebSocket] Reusing SHARED global instance for: ${instanceId}`);
  }
  
  return globalWebSocketService as WebSocketService<TMap>;
}

export function useWebSocket<TMap extends EventPayloadMap = EventPayloadMap>(
  options: UseWebSocketOptions = {}
): UseWebSocketReturn<TMap> {
  const {
    autoConnect = true,
    tournamentId,
    fieldId,
    role,
    permissions,
    instanceId,
    ...serviceOptions
  } = options;

  // Create a unique instance ID based on the page context
  const effectiveInstanceId = instanceId || `${tournamentId || 'global'}-${fieldId || 'no-field'}`;
  
  console.log(`🔌 [useWebSocket] Initializing with instanceId: ${effectiveInstanceId}`);
  console.log(`🔌 [useWebSocket] Context: tournamentId=${tournamentId}, fieldId=${fieldId}, role=${role}`);
  
  const serviceRef = useRef<WebSocketService<TMap> | null>(null);
  if (!serviceRef.current) {
    try {
      serviceRef.current = getOrCreateSharedInstance<TMap>(effectiveInstanceId, { 
        ...serviceOptions, 
        permissions, 
        tournamentId, 
        fieldId, 
        role 
      });
      console.log(`✅ [useWebSocket] Service created/reused successfully for: ${effectiveInstanceId}`);
    } catch (error) {
      console.error(`❌ [useWebSocket] Failed to create service for: ${effectiveInstanceId}`, error);
      throw error;
    }
  }
  const service = serviceRef.current!;

  // reflect connection info and room status in React state
  const [info, setInfo] = useState<ConnectionInfo>(service.info());
  const [roomStatus, setRoomStatus] = useState<RoomStatus>(service.getRoomStatus());

  // subscribe to connection-related events via local bus if needed later
  // For now, we poll via socket handlers updates already change service.info(); just mirror periodically or on lifecycle events

  // initialize service and connection
  useEffect(() => {
    let mounted = true;
    console.log(`🚀 [useWebSocket] Starting initialization for: ${effectiveInstanceId}`);
    (async () => {
      try {
        if (role) {
          console.log(`👤 [useWebSocket] Setting user role: ${role} for ${effectiveInstanceId}`);
          service.setUserRole(role);
        }
        if (autoConnect && service.info().state !== "connected") {
          console.log(`🔗 [useWebSocket] Connecting shared service for: ${effectiveInstanceId}`);
          await service.connect();
          console.log(`✅ [useWebSocket] Connected shared service for: ${effectiveInstanceId}`);
        } else if (autoConnect) {
          console.log(`🔗 [useWebSocket] Shared service already connected for: ${effectiveInstanceId}`);
        }
        // set initial room context for this instance
        if (tournamentId || fieldId) {
          console.log(`🏠 [useWebSocket] Setting room context: ${JSON.stringify({ tournamentId, fieldId })} for ${effectiveInstanceId}`);
          await service.setRoomContext({ tournamentId, fieldId });
          console.log(`✅ [useWebSocket] Room context set for: ${effectiveInstanceId}`);
        }
        
        // Merge with other active instances' room contexts
        const allContexts = Array.from(instanceContexts.values());
        const allTournaments = [...new Set(allContexts.map(c => c.tournamentId).filter(Boolean))];
        const allFields = [...new Set(allContexts.map(c => c.fieldId).filter(Boolean))];
        
        console.log(`🏠 [useWebSocket] Active contexts from all instances:`, {
          allContexts: allContexts,
          uniqueTournaments: allTournaments,
          uniqueFields: allFields,
          instanceId: effectiveInstanceId
        });
        
        // Ensure we're joined to all required rooms for all active instances
        const allRoomsNeeded = [
          ...allTournaments.map(t => `tournament:${t}`),
          ...allFields.map(f => `field:${f}`)
        ];
        
        const currentRooms = service.getRoomStatus().rooms;
        const missingRooms = allRoomsNeeded.filter(room => !currentRooms.includes(room));
        
        if (missingRooms.length > 0) {
          console.log(`🏠 [useWebSocket] Joining missing rooms for other instances:`, missingRooms);
          // Add missing rooms one by one
          for (const room of missingRooms) {
            if (room.startsWith('tournament:')) {
              const tournamentId = room.replace('tournament:', '');
              await service.setRoomContext({ tournamentId });
            } else if (room.startsWith('field:')) {
              const fieldId = room.replace('field:', '');
              await service.setRoomContext({ fieldId });
            }
          }
        }
        
        console.log(`✅ [useWebSocket] Final room status for: ${effectiveInstanceId}`);
        console.log(`🏠 [useWebSocket] Joined rooms:`, service.getRoomStatus().rooms);
        if (mounted) {
          setInfo(service.info());
          setRoomStatus(service.getRoomStatus());
          console.log(`📊 [useWebSocket] State updated for: ${effectiveInstanceId}`, {
            connectionState: service.info().state,
            roomCount: service.getRoomStatus().rooms.length
          });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`❌ [useWebSocket] Init error for ${effectiveInstanceId}:`, e);
      }
    })();

    return () => {
      mounted = false;
      console.log(`🧹 [useWebSocket] Cleanup for: ${effectiveInstanceId}`);
      // Do not auto-disconnect singleton by default to keep single connection across app
      // If desired, a prop could force disconnect on unmount.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // react to prop changes for room context
  useEffect(() => {
    (async () => {
      try {
        await service.setRoomContext({ tournamentId, fieldId });
        setRoomStatus(service.getRoomStatus());
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("useWebSocket setRoomContext error", e);
      }
    })();
  }, [service, tournamentId, fieldId]);

  // reflect connection info transitions
  useEffect(() => {
    // Hook into socket state via a lightweight interval monitor
    const id = window.setInterval(() => {
      setInfo((prev) => {
        const next = service.info();
        if (
          prev.state !== next.state ||
          prev.lastError !== next.lastError ||
          prev.lastConnectedAt !== next.lastConnectedAt
        )
          return { ...next };
        return prev;
      });
    }, 300);
    return () => window.clearInterval(id);
  }, [service]);

  // API bindings
  const connect = useCallback((url?: string) => service.connect(url), [service]);
  const disconnect = useCallback(() => service.disconnect(), [service]);
  const emit = useCallback(<K extends keyof TMap & string>(event: K, data: TMap[K]) => service.emit(event, data), [service]);
  const emitScoped = useCallback(
    <K extends keyof TMap & string>(
      event: K,
      data: TMap[K],
      options?: { includeContext?: boolean; contextOverride?: RoomContext }
    ) => service.emitScoped(event, data, options),
    [service]
  );
  const on = useCallback(<K extends keyof TMap & string>(event: K, cb: (data: TMap[K]) => void) => service.on(event, cb), [service]);
  const off = useCallback(<K extends keyof TMap & string>(event: K, cb: (data: TMap[K]) => void) => service.off(event, cb), [service]);

  const setRoomContext = useCallback((ctx: RoomContext) => service.setRoomContext(ctx), [service]);
  const getRoomStatus = useCallback(() => service.getRoomStatus(), [service]);
  const getStats = useCallback(() => service.getStats(), [service]);

  const setUserRole = useCallback((r: UserRole) => service.setUserRole(r), [service]);
  const canEmit = useCallback((event: string) => service.canEmit(event), [service]);

  // convenience pass-throughs
  const sendScoreUpdate = useCallback((d: unknown) => service.sendScoreUpdate(d), [service]);
  const sendTimerUpdate = useCallback((d: unknown) => service.sendTimerUpdate(d), [service]);
  const sendMatchUpdate = useCallback((d: unknown) => service.sendMatchUpdate(d), [service]);
  const sendDisplayModeChange = useCallback((d: unknown) => service.sendDisplayModeChange(d), [service]);
  const sendAnnouncement = useCallback((d: unknown) => service.sendAnnouncement(d), [service]);

  return useMemo(
    () => ({
      info,
      roomStatus,
      connect,
      disconnect,
      emit,
      emitScoped,
      on,
      off,
      setRoomContext,
      getRoomStatus,
      getStats,
      setUserRole,
      canEmit,
      sendScoreUpdate,
      sendTimerUpdate,
      sendMatchUpdate,
      sendDisplayModeChange,
      sendAnnouncement,
    }),
    [
      info,
      roomStatus,
      getStats,
      connect,
      disconnect,
      emit,
      emitScoped,
      on,
      off,
      setRoomContext,
      getRoomStatus,
      setUserRole,
      canEmit,
      sendScoreUpdate,
      sendTimerUpdate,
      sendMatchUpdate,
      sendDisplayModeChange,
      sendAnnouncement,
    ]
  );
}
