/**
 * Centralized WebSocket Hook
 * Single hook to replace all existing WebSocket hooks
 * Provides single connection per browser session with cross-tab synchronization
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { WebSocketManager } from '@/services/centralized-websocket/core/websocket-manager';
import {
  CentralizedConnectionState,
  CentralizedEmitOptions
} from '@/services/centralized-websocket/interfaces/websocket-manager.interface';
import { WebSocketEventData } from '@/types/websocket';
import { EventCallback } from '@/services/unified-websocket/event-manager';
import { ConnectionState } from '@/services/unified-websocket/connection-manager';

/**
 * Configuration options for centralized WebSocket hook
 */
export interface UseCentralizedWebSocketOptions {
  // Connection settings
  url?: string;
  autoConnect?: boolean;
  
  // Room management
  tournamentId?: string;
  fieldId?: string;
  
  // User context
  userRole?: string;
  userId?: string;
  
  // Event subscriptions
  events?: string[];
  
  // Behavior options
  reconnectOnFocus?: boolean;
  enableHeartbeat?: boolean;
  
  // Debug options
  debug?: boolean;
}

/**
 * Return type for centralized WebSocket hook
 */
export interface CentralizedWebSocketHookReturn {
  // Connection state
  isConnected: boolean;
  isLeader: boolean;
  connectionState: CentralizedConnectionState;
  
  // Connection management
  connect: (url?: string) => Promise<void>;
  disconnect: () => void;
  
  // Event handling
  emit: (event: string, data: WebSocketEventData, options?: CentralizedEmitOptions) => void;
  subscribe: <T = WebSocketEventData>(
    event: string, 
    callback: EventCallback<T>
  ) => () => void;
  
  // Room management
  joinRoom: (roomId: string, roomType?: 'tournament' | 'field' | 'match') => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  
  // Specialized emitters (backward compatibility)
  sendScoreUpdate: (data: any) => void;
  sendTimerUpdate: (data: any) => void;
  sendDisplayModeChange: (data: any) => void;
  sendMatchUpdate: (data: any) => void;
  
  // Statistics and monitoring
  getStats: () => Record<string, any>;
  
  // Error handling
  onError: (callback: (error: Error) => void) => () => void;
}

/**
 * Main centralized WebSocket hook
 */
export function useCentralizedWebSocket(
  options: UseCentralizedWebSocketOptions = {}
): CentralizedWebSocketHookReturn {
  // State management
  const [connectionState, setConnectionState] = useState<CentralizedConnectionState>({
    isConnected: false,
    isLeader: false,
    tabId: '',
    connectionStatus: ConnectionState.DISCONNECTED,
    lastHeartbeat: 0,
    leaderTabId: null
  });
  
  // Refs for stable references
  const managerRef = useRef<WebSocketManager | null>(null);
  const subscriptionsRef = useRef<Map<string, () => void>>(new Map());
  const roomsRef = useRef<Set<string>>(new Set());
  
  // Initialize WebSocket manager
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = WebSocketManager.getInstance({
        url: options.url,
        debug: options.debug,
        heartbeatInterval: options.enableHeartbeat ? 30000 : undefined
      });
      
      // Subscribe to connection state changes
      const unsubscribeState = managerRef.current.onConnectionStatusChange((state) => {
        setConnectionState(state);
      });
      
      return () => {
        unsubscribeState();
      };
    }
  }, [options.url, options.debug, options.enableHeartbeat]);
  
  // Auto-connect if enabled
  useEffect(() => {
    if (options.autoConnect && managerRef.current && !connectionState.isConnected) {
      managerRef.current.connect(options.url);
    }
  }, [options.autoConnect, options.url, connectionState.isConnected]);
  
  // Auto-join tournament room
  useEffect(() => {
    if (options.tournamentId && connectionState.isConnected && managerRef.current) {
      const roomId = options.tournamentId;
      if (!roomsRef.current.has(roomId)) {
        joinRoom(roomId, 'tournament');
      }
    }
  }, [options.tournamentId, connectionState.isConnected]);
  
  // Auto-join field room
  useEffect(() => {
    if (options.fieldId && connectionState.isConnected && managerRef.current) {
      const roomId = `field:${options.fieldId}`;
      if (!roomsRef.current.has(roomId)) {
        joinRoom(roomId, 'field');
      }
    }
  }, [options.fieldId, connectionState.isConnected]);
  
  // Subscribe to events
  useEffect(() => {
    if (options.events && managerRef.current) {
      options.events.forEach(event => {
        if (!subscriptionsRef.current.has(event)) {
          const unsubscribe = managerRef.current!.subscribe(event, (data) => {
            // Events are automatically distributed to all tabs
            console.log(`[useCentralizedWebSocket] Received event: ${event}`, data);
          });
          subscriptionsRef.current.set(event, unsubscribe);
        }
      });
    }
    
    return () => {
      // Cleanup subscriptions on unmount
      subscriptionsRef.current.forEach(unsubscribe => unsubscribe());
      subscriptionsRef.current.clear();
    };
  }, [options.events]);
  
  // Reconnect on window focus
  useEffect(() => {
    if (options.reconnectOnFocus) {
      const handleFocus = () => {
        if (managerRef.current && !connectionState.isConnected) {
          managerRef.current.connect();
        }
      };
      
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [options.reconnectOnFocus, connectionState.isConnected]);
  
  // Connection management functions
  const connect = useCallback(async (url?: string) => {
    if (managerRef.current) {
      await managerRef.current.connect(url);
    }
  }, []);
  
  const disconnect = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.disconnect();
    }
  }, []);
  
  // Event handling functions
  const emit = useCallback((event: string, data: WebSocketEventData, options?: CentralizedEmitOptions) => {
    if (managerRef.current) {
      managerRef.current.emit(event, data, options);
    }
  }, []);
  
  const subscribe = useCallback(<T = WebSocketEventData>(
    event: string, 
    callback: EventCallback<T>
  ) => {
    if (managerRef.current) {
      return managerRef.current.subscribe(event, callback);
    }
    return () => {}; // No-op unsubscribe
  }, []);
  
  // Room management functions
  const joinRoom = useCallback(async (roomId: string, roomType: 'tournament' | 'field' | 'match' = 'tournament') => {
    if (!managerRef.current) return;
    
    try {
      // Emit join room event to server
      const eventName = roomType === 'tournament' ? 'join_tournament' : 
                       roomType === 'field' ? 'joinFieldRoom' : 'join_match';
      
      const eventData = roomType === 'tournament' ? { tournamentId: roomId } :
                       roomType === 'field' ? { fieldId: roomId.replace('field:', '') } :
                       { matchId: roomId };
      
      managerRef.current.emit(eventName, eventData);
      roomsRef.current.add(roomId);
      
      console.log(`[useCentralizedWebSocket] Joined room: ${roomId} (${roomType})`);
    } catch (error) {
      console.error(`[useCentralizedWebSocket] Failed to join room ${roomId}:`, error);
    }
  }, []);
  
  const leaveRoom = useCallback(async (roomId: string) => {
    if (!managerRef.current) return;
    
    try {
      // Determine room type and emit appropriate leave event
      const roomType = roomId.startsWith('field:') ? 'field' : 'tournament';
      const eventName = roomType === 'tournament' ? 'leave_tournament' : 'leaveFieldRoom';
      
      const eventData = roomType === 'tournament' ? { tournamentId: roomId } :
                       { fieldId: roomId.replace('field:', '') };
      
      managerRef.current.emit(eventName, eventData);
      roomsRef.current.delete(roomId);
      
      console.log(`[useCentralizedWebSocket] Left room: ${roomId}`);
    } catch (error) {
      console.error(`[useCentralizedWebSocket] Failed to leave room ${roomId}:`, error);
    }
  }, []);
  
  // Specialized emitters for backward compatibility
  const sendScoreUpdate = useCallback((data: any) => {
    emit('score_update', data);
  }, [emit]);
  
  const sendTimerUpdate = useCallback((data: any) => {
    emit('timer_update', data);
  }, [emit]);
  
  const sendDisplayModeChange = useCallback((data: any) => {
    emit('display_mode_change', data);
  }, [emit]);
  
  const sendMatchUpdate = useCallback((data: any) => {
    emit('match_update', data);
  }, [emit]);
  
  // Statistics and monitoring
  const getStats = useCallback(() => {
    return managerRef.current?.getStats() || {};
  }, []);
  
  // Error handling
  const onError = useCallback((callback: (error: Error) => void) => {
    if (managerRef.current) {
      return managerRef.current.onError(callback);
    }
    return () => {}; // No-op unsubscribe
  }, []);
  
  return {
    // Connection state
    isConnected: connectionState.isConnected,
    isLeader: connectionState.isLeader,
    connectionState,
    
    // Connection management
    connect,
    disconnect,
    
    // Event handling
    emit,
    subscribe,
    
    // Room management
    joinRoom,
    leaveRoom,
    
    // Specialized emitters
    sendScoreUpdate,
    sendTimerUpdate,
    sendDisplayModeChange,
    sendMatchUpdate,
    
    // Statistics and monitoring
    getStats,
    
    // Error handling
    onError
  };
}

/**
 * Convenience hook for tournament-specific WebSocket connection
 */
export function useTournamentWebSocket(tournamentId: string, options: Omit<UseCentralizedWebSocketOptions, 'tournamentId'> = {}) {
  return useCentralizedWebSocket({
    ...options,
    tournamentId,
    autoConnect: true
  });
}

/**
 * Convenience hook for field-specific WebSocket connection
 */
export function useFieldWebSocket(fieldId: string, options: Omit<UseCentralizedWebSocketOptions, 'fieldId'> = {}) {
  return useCentralizedWebSocket({
    ...options,
    fieldId,
    autoConnect: true
  });
}

/**
 * Convenience hook for control-match interface
 */
export function useControlMatchWebSocket(tournamentId: string, fieldId?: string) {
  return useCentralizedWebSocket({
    tournamentId,
    fieldId,
    userRole: 'HEAD_REFEREE',
    autoConnect: true,
    events: ['score_update', 'timer_update', 'match_state_change'],
    reconnectOnFocus: true,
    enableHeartbeat: true
  });
}

/**
 * Convenience hook for audience display
 */
export function useAudienceDisplayWebSocket(tournamentId: string, fieldId?: string) {
  return useCentralizedWebSocket({
    tournamentId,
    fieldId,
    userRole: 'COMMON',
    autoConnect: true,
    events: ['display_mode_change', 'score_update', 'timer_update', 'match_update'],
    reconnectOnFocus: true
  });
}
