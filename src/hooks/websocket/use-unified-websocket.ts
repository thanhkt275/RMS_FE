import { useState, useEffect, useCallback, useRef } from 'react';
import { unifiedWebSocketService } from '@/lib/unified-websocket';
import {
  TimerData,
  MatchData,
  ScoreData,
  MatchStateData,
  AudienceDisplaySettings,
  UserRole
} from '@/types/types';

export interface UseUnifiedWebSocketOptions {
  tournamentId?: string;
  fieldId?: string;
  autoConnect?: boolean;
  userRole?: UserRole;
}

/**
 * React hook for using the unified WebSocket service
 * Provides timer synchronization with drift correction and connection recovery
 */
export function useUnifiedWebSocket(options: UseUnifiedWebSocketOptions = {}) {
  const { 
    tournamentId, 
    fieldId, 
    autoConnect = true, 
    userRole = UserRole.COMMON 
  } = options;

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  
  // Use refs to track current values without causing re-renders
  // Initialize with the passed value, "all" is a valid tournament ID
  const currentTournamentRef = useRef<string | null>(tournamentId || null);
  const currentFieldRef = useRef<string | null>(fieldId || null);

  // Update refs when props change
  useEffect(() => {
    currentTournamentRef.current = tournamentId || null;
  }, [tournamentId]);

  useEffect(() => {
    currentFieldRef.current = fieldId || null;
  }, [fieldId]);

  // Connection management
  const connect = useCallback(async (url?: string) => {
    try {
      await unifiedWebSocketService.connect(url);
    } catch (error) {
      console.error('[useUnifiedWebSocket] Connection failed:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    unifiedWebSocketService.disconnect();
  }, []);

  // Tournament and field management
  const joinTournament = useCallback((id: string) => {
    unifiedWebSocketService.joinTournament(id);
    currentTournamentRef.current = id;
  }, []);

  const leaveTournament = useCallback((id: string) => {
    unifiedWebSocketService.leaveTournament(id);
    currentTournamentRef.current = null;
  }, []);

  const joinFieldRoom = useCallback((id: string) => {
    unifiedWebSocketService.joinFieldRoom(id);
    currentFieldRef.current = id;
  }, []);

  const leaveFieldRoom = useCallback((id: string) => {
    unifiedWebSocketService.leaveFieldRoom(id);
    currentFieldRef.current = null;
  }, []);

  // Event subscription
  const subscribe = useCallback(<T>(eventName: string, callback: (data: T) => void) => {
    return unifiedWebSocketService.on<T>(eventName, callback);
  }, []);

  // Timer controls with automatic tournament/field context
  const startTimer = useCallback((timerData: Omit<TimerData, 'tournamentId' | 'fieldId'>) => {
    const tournamentId = currentTournamentRef.current;
    const fieldId = currentFieldRef.current;
    
    if (!tournamentId) {
      console.error('[useUnifiedWebSocket] No tournament ID available for startTimer');
      return;
    }

    unifiedWebSocketService.startTimer({
      ...timerData,
      tournamentId,
      fieldId: fieldId || undefined,
    });
  }, []);

  const pauseTimer = useCallback((timerData: Omit<TimerData, 'tournamentId' | 'fieldId'>) => {
    const tournamentId = currentTournamentRef.current;
    const fieldId = currentFieldRef.current;
    
    if (!tournamentId) {
      console.error('[useUnifiedWebSocket] No tournament ID available for pauseTimer');
      return;
    }

    unifiedWebSocketService.pauseTimer({
      ...timerData,
      tournamentId,
      fieldId: fieldId || undefined,
    });
  }, []);

  const resetTimer = useCallback((timerData: Omit<TimerData, 'tournamentId' | 'fieldId'>) => {
    const tournamentId = currentTournamentRef.current;
    const fieldId = currentFieldRef.current;
    
    if (!tournamentId) {
      console.error('[useUnifiedWebSocket] No tournament ID available for resetTimer');
      return;
    }

    unifiedWebSocketService.resetTimer({
      ...timerData,
      tournamentId,
      fieldId: fieldId || undefined,
    });
  }, []);

  // Timer updates for real-time synchronization
  const sendTimerUpdate = useCallback((timerData: Omit<TimerData, 'tournamentId' | 'fieldId'>) => {
    const tournamentId = currentTournamentRef.current;
    const fieldId = currentFieldRef.current;

    if (!tournamentId) {
      console.error('[useUnifiedWebSocket] No tournament ID available for sendTimerUpdate');
      return;
    }

    unifiedWebSocketService.sendTimerUpdate({
      ...timerData,
      tournamentId,
      fieldId: fieldId || undefined,
    });
  }, []);

  // Score updates
  const sendScoreUpdate = useCallback((scoreData: Omit<ScoreData, 'tournamentId' | 'fieldId'>) => {
    const tournamentId = currentTournamentRef.current;
    const fieldId = currentFieldRef.current;
    
    if (!tournamentId) {
      console.error('[useUnifiedWebSocket] No tournament ID available for sendScoreUpdate', {
        tournamentIdFromOptions: options.tournamentId,
        currentTournamentRef: currentTournamentRef.current,
        scoreData,
        timestamp: new Date().toISOString()
      });
      return;
    }

    unifiedWebSocketService.sendScoreUpdate({
      ...scoreData,
      tournamentId,
      fieldId: fieldId || undefined,
    });
  }, []);

  // Match updates
  const sendMatchUpdate = useCallback((matchData: Omit<MatchData, 'tournamentId' | 'fieldId'>) => {
    const tournamentId = currentTournamentRef.current;
    const fieldId = currentFieldRef.current;
    
    if (!tournamentId) {
      console.error('[useUnifiedWebSocket] No tournament ID available for sendMatchUpdate', {
        tournamentIdFromOptions: options.tournamentId,
        currentTournamentRef: currentTournamentRef.current,
        timestamp: new Date().toISOString()
      });
      return;
    }

    unifiedWebSocketService.sendMatchUpdate({
      ...matchData,
      tournamentId,
      fieldId: fieldId || undefined,
    });
  }, []);

  const sendMatchStateChange = useCallback((stateData: Omit<MatchStateData, 'tournamentId' | 'fieldId'>) => {
    const tournamentId = currentTournamentRef.current;
    const fieldId = currentFieldRef.current;
    
    if (!tournamentId) {
      console.error('[useUnifiedWebSocket] No tournament ID available for sendMatchStateChange');
      return;
    }

    unifiedWebSocketService.sendMatchStateChange({
      ...stateData,
      tournamentId,
      fieldId: fieldId || undefined,
    });
  }, []);

  // Display mode changes
  const changeDisplayMode = useCallback((settings: Omit<AudienceDisplaySettings, 'tournamentId' | 'fieldId'>) => {
    const tournamentId = currentTournamentRef.current;
    const fieldId = currentFieldRef.current;
    
    if (!tournamentId) {
      console.error('[useUnifiedWebSocket] No tournament ID available for changeDisplayMode');
      return;
    }

    unifiedWebSocketService.sendDisplayModeChange({
      ...settings,
      tournamentId,
      fieldId: fieldId || undefined,
      updatedAt: Date.now(),
    });
  }, []);

  // Announcements
  const sendAnnouncement = useCallback((message: string, duration?: number) => {
    const tournamentId = currentTournamentRef.current;
    const fieldId = currentFieldRef.current;
    
    if (!tournamentId) {
      console.error('[useUnifiedWebSocket] No tournament ID available for sendAnnouncement');
      return;
    }

    unifiedWebSocketService.sendAnnouncement({
      message,
      duration,
      tournamentId,
      fieldId: fieldId || undefined,
    });
  }, []);

  // Collaborative session management
  const joinCollaborativeSession = useCallback((matchId: string) => {
    unifiedWebSocketService.joinCollaborativeSession(matchId);
  }, []);

  const leaveCollaborativeSession = useCallback((matchId: string) => {
    unifiedWebSocketService.leaveCollaborativeSession(matchId);
  }, []);

  // Role management
  const setUserRole = useCallback((role: UserRole) => {
    unifiedWebSocketService.setUserRole(role);
  }, []);

  const canAccess = useCallback((feature: string) => {
    return unifiedWebSocketService.canAccess(feature as any);
  }, []);

  // Connection status tracking
  useEffect(() => {
    const handleConnectionStatus = (status: any) => {
      console.log(`[useUnifiedWebSocket] Connection status update:`, status);
      setIsConnected(status.connected && status.state === 'CONNECTED');
      setConnectionStatus(status.state || 'disconnected');
    };

    // Subscribe to connection status updates
    const unsubscribe = unifiedWebSocketService.onConnectionStatus(handleConnectionStatus);

    // Set initial connection status
    const currentStatus = unifiedWebSocketService.getConnectionStatus();
    setIsConnected(currentStatus.connected && currentStatus.state === 'CONNECTED');
    setConnectionStatus(currentStatus.state || 'disconnected');
    
    console.log(`[useUnifiedWebSocket] Initial connection status:`, currentStatus);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Auto-connect and setup
  useEffect(() => {
    // Set user role
    if (userRole) {
      unifiedWebSocketService.setUserRole(userRole);
    }

    // Auto-connect if enabled
    if (autoConnect && !unifiedWebSocketService.isConnected()) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (fieldId) {
        leaveFieldRoom(fieldId);
      }
      if (tournamentId) {
        leaveTournament(tournamentId);
      }
    };
  }, [autoConnect, userRole, connect, tournamentId, fieldId, leaveFieldRoom, leaveTournament]);

  // Join rooms when connection is established
  useEffect(() => {
    if (!isConnected) return;

    // Add a small delay to ensure socket is fully ready before joining rooms
    const delayTimeout = setTimeout(() => {
      // Double-check that we're still connected before joining
      if (unifiedWebSocketService.isConnected()) {
        // Join tournament if provided
        if (tournamentId) {
          console.log(`[useUnifiedWebSocket] Joining tournament: ${tournamentId}`);
          joinTournament(tournamentId);
        }

        // Join field room if provided
        if (fieldId) {
          console.log(`[useUnifiedWebSocket] Joining field room: ${fieldId}`);
          joinFieldRoom(fieldId);
        }
      } else {
        console.warn('[useUnifiedWebSocket] Connection lost before joining rooms');
      }
    }, 100); // 100ms delay to ensure socket is fully ready

    return () => clearTimeout(delayTimeout);
  }, [isConnected, tournamentId, fieldId, joinTournament, joinFieldRoom]);

  return {
    // Connection state
    isConnected,
    connectionStatus,
    
    // Connection management
    connect,
    disconnect,
    
    // Room management
    joinTournament,
    leaveTournament,
    joinFieldRoom,
    leaveFieldRoom,
    
    // Event subscription
    subscribe,
    
    // Timer controls
    startTimer,
    pauseTimer,
    resetTimer,
    sendTimerUpdate,

    // Data updates
    sendScoreUpdate,
    sendMatchUpdate,
    sendMatchStateChange,
    changeDisplayMode,
    sendAnnouncement,
    
    // Collaborative features
    joinCollaborativeSession,
    leaveCollaborativeSession,
    
    // Role management
    setUserRole,
    canAccess,
    
    // Direct service access for advanced usage
    service: unifiedWebSocketService,
  };
}