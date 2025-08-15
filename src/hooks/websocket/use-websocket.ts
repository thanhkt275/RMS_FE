/**
 * Unified WebSocket Hook for RMS System
 * Provides type-safe, optimized WebSocket functionality with standardized events
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { unifiedWebSocketService } from '@/lib/unified-websocket';
import {
  WebSocketEvents,
  WebSocketEventName,
  WebSocketEventHandler,
  WebSocketUnsubscribe,
  EventEmissionOptions
} from '@/types/websocket-events';
import { UserRole } from '@/types/types';
// Phase 2 optimization: Field filtering for better performance
// import { FieldFilter, createAudienceDisplayFilter, createControlMatchFilter } from '@/utils/fieldFilter';

export interface UseWebSocketOptions {
  tournamentId?: string;
  fieldId?: string;
  userRole?: UserRole;
  autoConnect?: boolean;
  events?: WebSocketEventName[];
}

export interface UseWebSocketReturn {
  // Connection state
  isConnected: boolean;
  connectionStatus: string;
  
  // Event handling
  emit: <K extends WebSocketEventName>(
    event: K, 
    data: WebSocketEvents[K],
    options?: EventEmissionOptions
  ) => void;
  
  subscribe: <K extends WebSocketEventName>(
    event: K,
    handler: WebSocketEventHandler<K>
  ) => WebSocketUnsubscribe;
  
  // Room management
  joinRoom: (roomId: string, roomType?: 'tournament' | 'field' | 'match') => void;
  leaveRoom: (roomId: string, roomType?: 'tournament' | 'field' | 'match') => void;
  
  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // Convenience methods for common operations
  sendScoreUpdate: (data: WebSocketEvents['score_update']) => void;
  sendTimerUpdate: (data: WebSocketEvents['timer_update']) => void;
  sendMatchUpdate: (data: WebSocketEvents['match_update']) => void;
  sendAnnouncement: (data: WebSocketEvents['announcement']) => void;
  
  // Role and permissions
  setUserRole: (role: UserRole) => void;
  canAccess: (feature: string) => boolean;
}

/**
 * @deprecated Use the new unified useWebSocket from use-websocket-unified.ts instead
 * This hook is maintained for backward compatibility only
 */
export function useWebSocketLegacy(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { 
    tournamentId, 
    fieldId, 
    userRole = UserRole.COMMON,
    autoConnect = true,
    events = []
  } = options;

  // State management
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  
  // Stable references
  const serviceRef = useRef(unifiedWebSocketService);
  const currentTournamentRef = useRef<string | undefined>(tournamentId);
  const currentFieldRef = useRef<string | undefined>(fieldId);
  
  // Update refs when props change
  useEffect(() => {
    currentTournamentRef.current = tournamentId;
  }, [tournamentId]);

  useEffect(() => {
    currentFieldRef.current = fieldId;
  }, [fieldId]);

  // Stable connection status handler
  const handleConnectionStatus = useCallback((status: any) => {
    setIsConnected(status.connected && status.state === 'CONNECTED');
    setConnectionStatus(status.state || 'disconnected');
  }, []);

  // Connection management
  const connect = useCallback(async () => {
    try {
      await serviceRef.current.connect();
    } catch (error) {
      console.error('[useWebSocket] Connection failed:', error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    serviceRef.current.disconnect();
  }, []);

  // Room management
  const joinRoom = useCallback((roomId: string, roomType: 'tournament' | 'field' | 'match' = 'tournament') => {
    switch (roomType) {
      case 'tournament':
        serviceRef.current.joinTournament(roomId);
        break;
      case 'field':
        serviceRef.current.joinFieldRoom(roomId);
        break;
      case 'match':
        // For future implementation
        console.log(`[useWebSocket] Match room joining not yet implemented: ${roomId}`);
        break;
    }
  }, []);

  const leaveRoom = useCallback((roomId: string, roomType: 'tournament' | 'field' | 'match' = 'tournament') => {
    switch (roomType) {
      case 'tournament':
        serviceRef.current.leaveTournament(roomId);
        break;
      case 'field':
        serviceRef.current.leaveFieldRoom(roomId);
        break;
      case 'match':
        // For future implementation
        console.log(`[useWebSocket] Match room leaving not yet implemented: ${roomId}`);
        break;
    }
  }, []);

  // Event handling
  const emit = useCallback(<K extends WebSocketEventName>(
    event: K, 
    data: WebSocketEvents[K],
    options?: EventEmissionOptions
  ) => {
    const eventData = {
      ...data,
      tournamentId: options?.tournamentId || currentTournamentRef.current,
      fieldId: options?.fieldId || currentFieldRef.current,
      timestamp: Date.now(),
    };

    serviceRef.current.emit(event, eventData as any, {
      fieldId: eventData.fieldId,
      tournamentId: eventData.tournamentId,
      debounce: options?.debounce,
    });
  }, []);

  const subscribe = useCallback(<K extends WebSocketEventName>(
    event: K,
    handler: WebSocketEventHandler<K>
  ): WebSocketUnsubscribe => {
    return serviceRef.current.on(event, handler);
  }, []);

  // Convenience methods
  const sendScoreUpdate = useCallback((data: WebSocketEvents['score_update']) => {
    emit('score_update', data);
  }, [emit]);

  const sendTimerUpdate = useCallback((data: WebSocketEvents['timer_update']) => {
    emit('timer_update', data);
  }, [emit]);

  const sendMatchUpdate = useCallback((data: WebSocketEvents['match_update']) => {
    emit('match_update', data);
  }, [emit]);

  const sendAnnouncement = useCallback((data: WebSocketEvents['announcement']) => {
    emit('announcement', data);
  }, [emit]);

  // Role management
  const setUserRole = useCallback((role: UserRole) => {
    serviceRef.current.setUserRole(role);
  }, []);

  const canAccess = useCallback((feature: string) => {
    return serviceRef.current.canAccess(feature as any);
  }, []);

  // Initialize connection and setup
  useEffect(() => {
    // Set user role
    if (userRole) {
      serviceRef.current.setUserRole(userRole);
    }

    // Subscribe to connection status
    const unsubscribeStatus = serviceRef.current.onConnectionStatus(handleConnectionStatus);

    // Set initial connection status
    const currentStatus = serviceRef.current.getConnectionStatus();
    setIsConnected(currentStatus.connected && currentStatus.state === 'CONNECTED');
    setConnectionStatus(currentStatus.state || 'disconnected');

    return () => {
      if (unsubscribeStatus) unsubscribeStatus();
    };
  }, [userRole, handleConnectionStatus]);

  // Auto-connect and room management
  useEffect(() => {
    if (autoConnect && !serviceRef.current.isConnected()) {
      connect().catch(error => {
        console.error('[useWebSocket] Auto-connect failed:', error);
      });
    }

    // Join rooms when connected
    if (isConnected) {
      if (tournamentId) {
        joinRoom(tournamentId, 'tournament');
      }
      if (fieldId) {
        joinRoom(fieldId, 'field');
      }
    }

    // Cleanup on unmount
    return () => {
      if (fieldId) {
        leaveRoom(fieldId, 'field');
      }
      if (tournamentId) {
        leaveRoom(tournamentId, 'tournament');
      }
    };
  }, [autoConnect, isConnected, tournamentId, fieldId, connect, joinRoom, leaveRoom]);

  return {
    // Connection state
    isConnected,
    connectionStatus,
    
    // Event handling
    emit,
    subscribe,
    
    // Room management
    joinRoom,
    leaveRoom,
    
    // Connection management
    connect,
    disconnect,
    
    // Convenience methods
    sendScoreUpdate,
    sendTimerUpdate,
    sendMatchUpdate,
    sendAnnouncement,
    
    // Role management
    setUserRole,
    canAccess,
  };
}
