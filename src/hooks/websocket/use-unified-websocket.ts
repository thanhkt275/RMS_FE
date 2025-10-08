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
  const [isReady, setIsReady] = useState<boolean>(false);
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

  // Score updates
  const sendScoreUpdate = useCallback((scoreData: Omit<ScoreData, 'tournamentId' | 'fieldId'>) => {
    const currentTournamentId = currentTournamentRef.current || tournamentId;
    const currentFieldId = currentFieldRef.current || fieldId;

    console.log('[useUnifiedWebSocket] sendScoreUpdate called:', {
      tournamentIdFromOptions: tournamentId,
      fieldIdFromOptions: fieldId,
      currentTournamentRef: currentTournamentRef.current,
      currentFieldRef: currentFieldRef.current,
      finalTournamentId: currentTournamentId,
      finalFieldId: currentFieldId,
      scoreData,
      timestamp: new Date().toISOString()
    });

    if (!currentTournamentId) {
      console.error('[useUnifiedWebSocket] No tournament ID available for sendScoreUpdate', {
        tournamentIdFromOptions: tournamentId,
        currentTournamentRef: currentTournamentRef.current,
        scoreData,
        timestamp: new Date().toISOString()
      });
      return;
    }

    unifiedWebSocketService.sendScoreUpdate({
      ...scoreData,
      tournamentId: currentTournamentId,
      fieldId: currentFieldId || undefined,
    });
  }, [tournamentId, fieldId]);

  // Winner badge updates
  const sendWinnerBadgeUpdate = useCallback((badgeData: Omit<{ matchId: string; tournamentId: string; fieldId?: string; showWinnerBadge: boolean }, 'tournamentId' | 'fieldId'>) => {
    console.log('[useUnifiedWebSocket] sendWinnerBadgeUpdate hook called with:', badgeData);
    console.log('[useUnifiedWebSocket] Current tournament ref:', currentTournamentRef.current);
    console.log('[useUnifiedWebSocket] Current field ref:', currentFieldRef.current);

    const currentTournamentId = currentTournamentRef.current || tournamentId;
    const currentFieldId = currentFieldRef.current || fieldId;

    console.log('[useUnifiedWebSocket] Final tournament ID:', currentTournamentId);
    console.log('[useUnifiedWebSocket] Final field ID:', currentFieldId);

    if (!currentTournamentId) {
      console.error('[useUnifiedWebSocket] No tournament ID available for sendWinnerBadgeUpdate');
      return;
    }

    const finalData = {
      ...badgeData,
      tournamentId: currentTournamentId,
      fieldId: currentFieldId || undefined,
    };

    console.log('[useUnifiedWebSocket] Calling unifiedWebSocketService.sendWinnerBadgeUpdate with:', finalData);
    unifiedWebSocketService.sendWinnerBadgeUpdate(finalData);
  }, [tournamentId, fieldId]);

  // Match updates
  const sendMatchUpdate = useCallback((matchData: Omit<MatchData, 'tournamentId' | 'fieldId'>) => {
    const currentTournamentId = currentTournamentRef.current || tournamentId;
    const currentFieldId = currentFieldRef.current || fieldId;

    if (!currentTournamentId) {
      console.error('[useUnifiedWebSocket] No tournament ID available for sendMatchUpdate', {
        tournamentIdFromOptions: tournamentId,
        currentTournamentRef: currentTournamentRef.current,
        timestamp: new Date().toISOString()
      });
      return;
    }

    unifiedWebSocketService.sendMatchUpdate({
      ...matchData,
      tournamentId: currentTournamentId,
      fieldId: currentFieldId || undefined,
    });
  }, [tournamentId, fieldId]);

  const sendMatchStateChange = useCallback((stateData: Omit<MatchStateData, 'tournamentId' | 'fieldId'>) => {
    const currentTournamentId = currentTournamentRef.current || tournamentId;
    const currentFieldId = currentFieldRef.current || fieldId;

    if (!currentTournamentId) {
      console.error('[useUnifiedWebSocket] No tournament ID available for sendMatchStateChange');
      return;
    }

    unifiedWebSocketService.sendMatchStateChange({
      ...stateData,
      tournamentId: currentTournamentId,
      fieldId: currentFieldId || undefined,
    });
  }, [tournamentId, fieldId]);

  // Display mode changes
  const changeDisplayMode = useCallback((settings: Omit<AudienceDisplaySettings, 'tournamentId' | 'fieldId'>) => {
    const currentTournamentId = currentTournamentRef.current || tournamentId;
    const currentFieldId = currentFieldRef.current || fieldId;

    console.log('[useUnifiedWebSocket] changeDisplayMode called:', {
      tournamentIdFromOptions: tournamentId,
      fieldIdFromOptions: fieldId,
      currentTournamentRef: currentTournamentRef.current,
      currentFieldRef: currentFieldRef.current,
      finalTournamentId: currentTournamentId,
      finalFieldId: currentFieldId,
      settings,
      timestamp: new Date().toISOString()
    });

    if (!currentTournamentId) {
      console.error('[useUnifiedWebSocket] No tournament ID available for changeDisplayMode');
      return;
    }

    unifiedWebSocketService.sendDisplayModeChange({
      ...settings,
      tournamentId: currentTournamentId,
      fieldId: currentFieldId || undefined,
      updatedAt: Date.now(),
    });
  }, [tournamentId, fieldId]);

  // Announcements
  const sendAnnouncement = useCallback((announcementData: any) => {
    const currentTournamentId = currentTournamentRef.current || tournamentId;
    const currentFieldId = currentFieldRef.current || fieldId;

    if (!currentTournamentId) {
      console.error('[useUnifiedWebSocket] No tournament ID available for sendAnnouncement');
      return;
    }

    // Support both old format (message, duration) and new format (AnnouncementData)
    let fullAnnouncementData;
    if (typeof announcementData === 'string') {
      // Legacy support: sendAnnouncement(message, duration)
      const message = announcementData;
      const duration = arguments[1]; // second parameter
      fullAnnouncementData = {
        type: 'text',
        content: message,
        title: undefined,
        duration: duration ? Math.floor(duration / 1000) : 10,
        tournamentId: currentTournamentId,
        fieldId: currentFieldId || undefined,
      };
    } else {
      // New format: sendAnnouncement(AnnouncementData)
      fullAnnouncementData = {
        ...announcementData,
        tournamentId: currentTournamentId,
        fieldId: currentFieldId || undefined,
      };
    }

    unifiedWebSocketService.sendAnnouncement(fullAnnouncementData);
  }, [tournamentId, fieldId]);

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
      setIsReady(status.ready && status.connected && status.state === 'CONNECTED');
      setConnectionStatus(status.state || 'disconnected');
    };

    // Subscribe to connection status updates
    const unsubscribe = unifiedWebSocketService.onConnectionStatus(handleConnectionStatus);

    // Set initial connection status
    const currentStatus = unifiedWebSocketService.getConnectionStatus();
    setIsConnected(currentStatus.connected && currentStatus.state === 'CONNECTED');
    setIsReady(currentStatus.ready && currentStatus.connected && currentStatus.state === 'CONNECTED');
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

  // Join rooms when connection is ready (not just connected)
  useEffect(() => {
    if (!isReady) {
      console.log(`[useUnifiedWebSocket] Connection not ready yet. Connected: ${isConnected}, Ready: ${isReady}`);
      return;
    }

    // Add a small delay to ensure socket is fully ready before joining rooms
    const delayTimeout = setTimeout(() => {
      // Double-check that we're still ready before joining
      const currentStatus = unifiedWebSocketService.getConnectionStatus();
      if (currentStatus.ready && currentStatus.connected) {
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
        console.warn('[useUnifiedWebSocket] Connection not ready before joining rooms');
      }
    }, 100); // 100ms delay for extra safety

    return () => clearTimeout(delayTimeout);
  }, [isReady, tournamentId, fieldId, joinTournament, joinFieldRoom]);

  return {
    // Connection state
    isConnected,
    isReady,
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

    // Data updates
    sendScoreUpdate,
    sendMatchUpdate,
    sendMatchStateChange,
    sendWinnerBadgeUpdate,
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