/**
 * Enhanced WebSocket Hook for RMS System
 * Provides comprehensive WebSocket functionality with state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import EnhancedWebSocketService from '@/lib/enhanced-websocket.service';
import {
  WebSocketConnectionState,
  ConnectionMetrics,
  WebSocketError,
  MatchSession,
  MatchStateSnapshot,
  ActiveUser,
  EnhancedWebSocketConfig,
  UseEnhancedWebSocketReturn,
  WebSocketEventMap,
  TimerState,
  ScoreState,
  AudienceDisplaySettings,
  AnnouncementData,
} from '@/types/enhanced-websocket';

interface UseEnhancedWebSocketOptions {
  autoConnect?: boolean;
  config?: Partial<EnhancedWebSocketConfig>;
  userId?: string;
  username?: string;
  role?: string;
}

export function useEnhancedWebSocket(
  options: UseEnhancedWebSocketOptions = {}
): UseEnhancedWebSocketReturn {
  const {
    autoConnect = true,
    config = {},
    userId,
    username,
    role,
  } = options;

  // Get singleton service instance
  const serviceRef = useRef(EnhancedWebSocketService.getInstance());
  const service = serviceRef.current;

  // State management
  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>(() =>
    service.getConnectionState()
  );
  const [metrics, setMetrics] = useState<ConnectionMetrics>(() => service.getMetrics());
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [matchStates, setMatchStates] = useState<Map<string, MatchStateSnapshot>>(new Map());

  // Callbacks using useCallback to prevent unnecessary re-renders
  const connect = useCallback((userConfig?: Partial<EnhancedWebSocketConfig>) => {
    service.connect({ ...config, ...userConfig });
  }, [config]);

  const disconnect = useCallback(() => {
    service.disconnect();
  }, []);

  const reconnect = useCallback(() => {
    service.reconnect();
  }, []);

  // Match session management
  const createMatchSession = useCallback(async (
    matchId: string,
    tournamentId: string,
    fieldId?: string
  ): Promise<MatchSession> => {
    return service.createMatchSession(matchId, tournamentId, fieldId);
  }, []);

  const joinMatchSession = useCallback(async (matchId: string) => {
    await service.joinMatchSession(matchId);
  }, []);

  const leaveMatchSession = useCallback(async (matchId: string) => {
    await service.leaveMatchSession(matchId);
  }, []);

  const resetMatch = useCallback(async (matchId: string, reason?: string) => {
    await service.resetMatch(matchId, reason);
  }, []);

  // State management
  const getMatchState = useCallback((matchId: string) => {
    return service.getMatchState(matchId);
  }, []);

  const updateMatchState = useCallback(async (
    matchId: string,
    updates: Partial<MatchStateSnapshot>
  ) => {
    await service.updateMatchState(matchId, updates);
  }, []);

  // Real-time scoring
  const sendRealtimeScore = useCallback(async (
    matchId: string,
    scores: Partial<ScoreState>
  ) => {
    await service.sendRealtimeScore(matchId, scores);
  }, []);

  const persistScores = useCallback(async (matchId: string, scores: ScoreState) => {
    return service.persistScores(matchId, scores);
  }, []);

  // Timer control
  const startTimer = useCallback(async (matchId: string, duration: number) => {
    await service.startTimer(matchId, duration);
  }, []);

  const pauseTimer = useCallback(async (matchId: string) => {
    await service.pauseTimer(matchId);
  }, []);

  const resumeTimer = useCallback(async (matchId: string) => {
    await service.resumeTimer(matchId);
  }, []);

  const resetTimer = useCallback(async (matchId: string) => {
    await service.resetTimer(matchId);
  }, []);

  // User activity
  const getActiveUsers = useCallback((matchId?: string, fieldId?: string) => {
    return service.getActiveUsers(matchId, fieldId);
  }, []);

  const trackActivity = useCallback((action: string, metadata?: Record<string, any>) => {
    service.trackActivity(action, metadata);
  }, []);

  // Event subscription
  const subscribe = useCallback(<K extends keyof WebSocketEventMap>(
    event: K,
    callback: (data: WebSocketEventMap[K]) => void
  ) => {
    return service.subscribe(event, callback);
  }, []);

  // Display control
  const updateDisplay = useCallback(async (settings: AudienceDisplaySettings) => {
    await service.updateDisplay(settings);
  }, []);

  const sendAnnouncement = useCallback(async (announcement: AnnouncementData) => {
    await service.sendAnnouncement(announcement);
  }, []);

  // Error handling
  const onError = useCallback((callback: (error: WebSocketError) => void) => {
    return service.onError(callback);
  }, []);

  const retryFailedAction = useCallback(async (actionId: string) => {
    await service.retryFailedAction(actionId);
  }, []);

  // Setup effects
  useEffect(() => {
    // Set user information if provided
    if (userId) {
      service.setUser(userId, username, role);
    }

    // Subscribe to connection state changes
    const unsubscribeConnection = service.subscribe('connection:status', setConnectionState);
    
    // Subscribe to match state changes
    const unsubscribeMatchState = service.subscribe('match:state_changed', (state) => {
      setMatchStates(prev => new Map(prev).set(state.matchId, state));
    });

    // Subscribe to user events
    const unsubscribeUserJoined = service.subscribe('user:joined', (user) => {
      setActiveUsers(prev => {
        const filtered = prev.filter(u => u.userId !== user.userId);
        return [...filtered, user];
      });
    });

    const unsubscribeUserLeft = service.subscribe('user:left', (user) => {
      setActiveUsers(prev => prev.filter(u => u.userId !== user.userId));
    });

    // Auto-connect if requested
    if (autoConnect) {
      connect();
    }

    // Update metrics periodically
    const metricsInterval = setInterval(() => {
      setMetrics(service.getMetrics());
    }, 5000);

    return () => {
      unsubscribeConnection();
      unsubscribeMatchState();
      unsubscribeUserJoined();
      unsubscribeUserLeft();
      clearInterval(metricsInterval);
    };
  }, [autoConnect, connect, userId, username, role]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only disconnect if this is the last hook instance
      // In a real implementation, you might want to track hook instances
    };
  }, []);

  return {
    // Connection state
    connectionState,
    metrics,
    
    // Core connection methods
    connect,
    disconnect,
    reconnect,
    
    // Match session management
    createMatchSession,
    joinMatchSession,
    leaveMatchSession,
    resetMatch,
    
    // State management
    getMatchState,
    updateMatchState,
    
    // Real-time scoring
    sendRealtimeScore,
    persistScores,
    
    // Timer control
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    
    // User activity
    getActiveUsers,
    trackActivity,
    
    // Event subscription
    subscribe,
    
    // Display control
    updateDisplay,
    sendAnnouncement,
    
    // Error handling
    onError,
    retryFailedAction,
  };
}