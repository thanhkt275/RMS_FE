import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/websockets/simplified/useWebSocket';
import { UserRole, TimerData } from '@/types/types';

export interface UseAudienceTimerOptions {
  tournamentId: string;
  fieldId?: string;
}

export interface UseAudienceTimerReturn {
  // Timer state
  timer: TimerData | null;
  isConnected: boolean;
  connectionStatus: string;
  
  // Connection status indicators
  showConnectionStatus: boolean;
  connectionMessage: string;
  
  // Utility functions
  formatTime: (ms: number) => string;
}

/**
 * Hook for audience display timer handling with unified WebSocket service
 * Provides smooth timer updates without jumps and connection status indicators
 */
export function useAudienceTimer({ 
  tournamentId, 
  fieldId 
}: UseAudienceTimerOptions): UseAudienceTimerReturn {
  
  // Timer state with drift correction
  const [timer, setTimer] = useState<TimerData | null>(null);
  const [showConnectionStatus, setShowConnectionStatus] = useState<boolean>(false);
  const [connectionMessage, setConnectionMessage] = useState<string>('');
  
  // Refs for stable timer state access
  const timerRef = useRef<TimerData | null>(null);
  const localIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number | null>(null);

  // Simplified WebSocket connection with unique instance ID to avoid conflicts
  const { info, on, off, setRoomContext, setUserRole } = useWebSocket({
    autoConnect: true,
    tournamentId: tournamentId || 'all',
    fieldId,
    role: UserRole.COMMON, // Audience display is read-only
    instanceId: 'audience-timer', // Unique instance ID
  });
  const isConnected = info.state === 'connected';
  const connectionStatus = info.state;
  useEffect(() => { setUserRole(UserRole.COMMON); }, [setUserRole]);
  useEffect(() => { void setRoomContext({ tournamentId: tournamentId || 'all', fieldId }); }, [tournamentId, fieldId, setRoomContext]);

  // Update timer ref when state changes
  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  // Timer drift correction function
  const calculateDriftCorrectedTime = useCallback((serverData: any): number => {
    if (!serverData.startedAt || !serverData.isRunning) {
      return serverData.remaining || 0;
    }

    const now = Date.now();
    const serverElapsed = now - serverData.startedAt;
    const correctedRemaining = Math.max(0, serverData.duration - serverElapsed);
    
    console.log('[useAudienceTimer] Drift correction:', {
      serverRemaining: serverData.remaining,
      correctedRemaining,
      drift: Math.abs(correctedRemaining - serverData.remaining),
      serverElapsed,
    });

    return correctedRemaining;
  }, []);

  // Handle timer updates with smooth transitions
  const handleTimerUpdate = useCallback((data: any) => {
    console.log('[useAudienceTimer] Timer update received:', data);
    console.log('[useAudienceTimer] Current fieldId filter:', fieldId);
    console.log('[useAudienceTimer] Data fieldId:', data.fieldId);
    
    // Filter messages by fieldId if we're in a specific field
    // Only filter if both fieldId and data.fieldId are present and different
    if (fieldId && data.fieldId && data.fieldId !== fieldId) {
      console.log(`[useAudienceTimer] Ignoring timer update for different field: ${data.fieldId} (expected: ${fieldId})`);
      return;
    }

    // If no fieldId is specified in the data, accept it (tournament-wide timer)
    if (fieldId && !data.fieldId) {
      console.log(`[useAudienceTimer] Accepting timer update without fieldId (tournament-wide)`);
    }

    // Apply drift correction for running timers
    const correctedRemaining = data.isRunning 
      ? calculateDriftCorrectedTime(data)
      : data.remaining || 0;

    const newTimerData: TimerData = {
      duration: data.duration || 0,
      remaining: correctedRemaining,
      isRunning: data.isRunning || false,
      startedAt: data.startedAt,
      pausedAt: data.pausedAt,
      period: data.period,
      tournamentId: data.tournamentId || tournamentId,
      fieldId: data.fieldId || fieldId,
    };

    setTimer(newTimerData);
    lastSyncTimeRef.current = Date.now();

    console.log('[useAudienceTimer] Timer state updated:', newTimerData);
  }, [fieldId, calculateDriftCorrectedTime]);

  // Subscribe to timer events from simplified service
  useEffect(() => {
    console.log('[useAudienceTimer] Setting up WebSocket subscriptions for tournament:', tournamentId, 'field:', fieldId);
    const sub = on('timer_update' as any, handleTimerUpdate as any);
    console.log('[useAudienceTimer] WebSocket subscriptions established');

    return () => {
      off('timer_update' as any, handleTimerUpdate as any);
      sub?.unsubscribe?.();
    };
  }, [on, off, handleTimerUpdate, tournamentId, fieldId]);

  // Local timer continuation for smooth countdown
  useEffect(() => {
    // Clear any existing interval
    if (localIntervalRef.current) {
      clearInterval(localIntervalRef.current);
      localIntervalRef.current = null;
    }

    // Start local countdown if timer is running
    if (timer?.isRunning && timer.remaining > 0) {
      console.log('[useAudienceTimer] Starting local timer countdown');
      
      localIntervalRef.current = setInterval(() => {
        setTimer(prevTimer => {
          if (!prevTimer?.isRunning || prevTimer.remaining <= 0) {
            return prevTimer;
          }

          const newRemaining = Math.max(0, prevTimer.remaining - 100);
          
          return {
            ...prevTimer,
            remaining: newRemaining,
          };
        });
      }, 100); // Update every 100ms for smooth countdown
    }

    return () => {
      if (localIntervalRef.current) {
        clearInterval(localIntervalRef.current);
        localIntervalRef.current = null;
      }
    };
  }, [timer?.isRunning, timer?.remaining]);

  // Connection status management
  useEffect(() => {
    if (!isConnected) {
      setShowConnectionStatus(true);
      setConnectionMessage('Connection lost - Timer may not be accurate');
    } else {
      // Hide connection status after a brief delay when reconnected
      const timer = setTimeout(() => {
        setShowConnectionStatus(false);
        setConnectionMessage('');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  // Fallback timer display during disconnection
  useEffect(() => {
    if (!isConnected && timer?.isRunning) {
      console.log('[useAudienceTimer] Connection lost, continuing timer locally');
      // Local timer continuation is handled by the interval effect above
    }
  }, [isConnected, timer?.isRunning]);

  // Format timer as MM:SS
  const formatTime = useCallback((ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  return {
    timer,
    isConnected,
    connectionStatus,
    showConnectionStatus,
    connectionMessage,
    formatTime,
  };
}