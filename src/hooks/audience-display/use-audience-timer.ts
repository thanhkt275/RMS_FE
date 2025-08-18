import { useState, useEffect, useCallback, useRef } from 'react';
import { useUnifiedWebSocket } from '@/hooks/websocket/use-unified-websocket';
import { UserRole, MatchStatus } from '@/types/types';

// Import testing utility for development
let recordAudienceUpdate: ((remaining: number) => void) | null = null;
if (process.env.NODE_ENV === 'development') {
  try {
    const testUtils = require('@/utils/timer-sync-test');
    recordAudienceUpdate = testUtils.recordAudienceUpdate;
  } catch (error) {
    // Ignore if testing utility is not available
  }
}

export interface TimerData {
  duration: number;
  remaining: number;
  isRunning: boolean;
  startedAt?: number;
  pausedAt?: number;
  period?: string;
}

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
  
  // Match period state
  matchPeriod: string;
  matchStatus: MatchStatus | null;
  
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
  
  // Match period and status state
  const [matchPeriod, setMatchPeriod] = useState<string>('auto');
  const [matchStatus, setMatchStatus] = useState<MatchStatus | null>(null);
  
  // Refs for stable timer state access
  const timerRef = useRef<TimerData | null>(null);
  const localIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number | null>(null);
  const periodTransitionTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Constants for sync management
  const SYNC_TIMEOUT_MS = 3000; // 3 seconds without updates triggers local fallback
  const LOCAL_UPDATE_INTERVAL_MS = 100; // 100ms for smooth local countdown

  // Unified WebSocket connection
  const {
    isConnected,
    connectionStatus,
    subscribe,
  } = useUnifiedWebSocket({
    tournamentId,
    fieldId,
    autoConnect: true,
    userRole: UserRole.COMMON, // Audience display is read-only
  });

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

    // Filter messages by fieldId if we're in a specific field
    if (fieldId && data.fieldId && data.fieldId !== fieldId) {
      console.log(`[useAudienceTimer] Ignoring timer update for different field: ${data.fieldId}`);
      return;
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
    };

    setTimer(newTimerData);
    lastSyncTimeRef.current = Date.now();

    // Record update for sync testing
    if (recordAudienceUpdate) {
      recordAudienceUpdate(newTimerData.remaining);
    }

    // Clear any existing sync timeout and set a new one
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Set timeout to detect missed updates (only if timer is running)
    if (newTimerData.isRunning) {
      syncTimeoutRef.current = setTimeout(() => {
        console.log('[useAudienceTimer] Sync timeout - no updates received, starting local fallback');
        // Local fallback will be handled by the interval effect
      }, SYNC_TIMEOUT_MS);
    }

    console.log('[useAudienceTimer] Timer state updated:', {
      ...newTimerData,
      remainingFormatted: `${Math.floor(newTimerData.remaining / 60000)}:${Math.floor((newTimerData.remaining % 60000) / 1000).toString().padStart(2, '0')}`,
      receivedAt: new Date().toISOString()
    });
  }, [fieldId, calculateDriftCorrectedTime]);

  // Handle match state changes for period synchronization
  const handleMatchStateChange = useCallback((data: any) => {
    console.log('[useAudienceTimer] Match state change received:', data);
    
    // Filter messages by fieldId if we're in a specific field
    if (fieldId && data.fieldId && data.fieldId !== fieldId) {
      console.log(`[useAudienceTimer] Ignoring match state change for different field: ${data.fieldId}`);
      return;
    }

    // Update match status and period
    if (data.status) {
      setMatchStatus(data.status);
      console.log('[useAudienceTimer] Updated match status:', data.status);
    }

    if (data.currentPeriod !== undefined) {
      setMatchPeriod(data.currentPeriod || 'auto');
      console.log('[useAudienceTimer] Updated match period:', data.currentPeriod || 'auto');
    }
  }, [fieldId]);

  // Subscribe to timer and match state events from unified service
  useEffect(() => {
    const unsubscribeUpdate = subscribe("timer_update", handleTimerUpdate);
    const unsubscribeStart = subscribe("start_timer", handleTimerUpdate);
    const unsubscribePause = subscribe("pause_timer", handleTimerUpdate);
    const unsubscribeReset = subscribe("reset_timer", handleTimerUpdate);
    const unsubscribeMatchState = subscribe("match_state_change", handleMatchStateChange);

    return () => {
      if (unsubscribeUpdate) unsubscribeUpdate();
      if (unsubscribeStart) unsubscribeStart();
      if (unsubscribePause) unsubscribePause();
      if (unsubscribeReset) unsubscribeReset();
      if (unsubscribeMatchState) unsubscribeMatchState();
    };
  }, [subscribe, handleTimerUpdate, handleMatchStateChange]);

  // Local timer continuation - only when connection is lost or no recent updates
  useEffect(() => {
    // Clear any existing interval
    if (localIntervalRef.current) {
      clearInterval(localIntervalRef.current);
      localIntervalRef.current = null;
    }

    // Determine if we should run local countdown
    const shouldRunLocalCountdown = timer?.isRunning && timer.remaining > 0 && (
      !isConnected || // Connection is lost
      (lastSyncTimeRef.current && Date.now() - lastSyncTimeRef.current > SYNC_TIMEOUT_MS) // No recent updates
    );

    if (shouldRunLocalCountdown) {
      console.log('[useAudienceTimer] Starting local timer countdown (fallback mode)');

      localIntervalRef.current = setInterval(() => {
        setTimer(prevTimer => {
          if (!prevTimer?.isRunning || prevTimer.remaining <= 0) {
            return prevTimer;
          }

          const newRemaining = Math.max(0, prevTimer.remaining - LOCAL_UPDATE_INTERVAL_MS);

          return {
            ...prevTimer,
            remaining: newRemaining,
          };
        });
      }, LOCAL_UPDATE_INTERVAL_MS);
    } else if (timer?.isRunning && isConnected) {
      console.log('[useAudienceTimer] Connected and receiving updates - relying on WebSocket sync');
    }

    return () => {
      if (localIntervalRef.current) {
        clearInterval(localIntervalRef.current);
        localIntervalRef.current = null;
      }
    };
  }, [timer?.isRunning, timer?.remaining, isConnected]);

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

  // Automatic period transition logic based on timer remaining time (mirrors control-match logic)
  useEffect(() => {
    if (!timer?.isRunning || !timer.duration || !timer.remaining) return;

    const elapsedTime = timer.duration - timer.remaining;

    console.log('[useAudienceTimer] Period transition check:', {
      matchPeriod,
      elapsedTime,
      timerRemaining: timer.remaining,
      timerDuration: timer.duration,
      elapsedSeconds: Math.floor(elapsedTime / 1000),
      remainingSeconds: Math.floor(timer.remaining / 1000),
    });

    // Clear any existing timeout for this transition
    periodTransitionTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    periodTransitionTimeoutsRef.current.clear();

    // For FRC match timing (matches control-match logic):
    // - Auto: 0-30 seconds elapsed (2:30 to 2:00 remaining for 2:30 match)
    // - Teleop: 30-120 seconds elapsed (2:00 to 0:30 remaining)  
    // - Endgame: last 30 seconds (0:30 to 0:00 remaining)

    // Transition to teleop after 30 seconds (when 2:00 remains for 2:30 match)
    if (matchPeriod === "auto" && elapsedTime >= 30000) {
      console.log('[useAudienceTimer] Auto -> Teleop transition at', elapsedTime / 1000, 'seconds elapsed');
      setMatchPeriod("teleop");
      setMatchStatus(MatchStatus.IN_PROGRESS);
    }
    // Transition to endgame in the last 30 seconds (when 0:30 remains)
    else if ((matchPeriod === "auto" || matchPeriod === "teleop") && timer.remaining <= 30000 && timer.remaining > 0) {
      console.log('[useAudienceTimer] -> Endgame transition at', timer.remaining / 1000, 'seconds remaining');
      setMatchPeriod("endgame");
      setMatchStatus(MatchStatus.IN_PROGRESS);
    }
    // Set match status to COMPLETED when timer reaches 0
    else if (timer.remaining <= 0 && matchPeriod !== "completed") {
      console.log('[useAudienceTimer] Match completed');
      setMatchPeriod("completed");
      setMatchStatus(MatchStatus.COMPLETED);
    }
  }, [timer?.isRunning, timer?.remaining, timer?.duration, matchPeriod]);

  // Timer state reset when timer is reset or stopped
  useEffect(() => {
    if (!timer?.isRunning && timer?.remaining === timer?.duration) {
      // Timer has been reset
      setMatchPeriod('auto');
      setMatchStatus(MatchStatus.PENDING);
      console.log('[useAudienceTimer] Timer reset detected - reset to auto period');
    }
  }, [timer?.isRunning, timer?.remaining, timer?.duration]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear all timeout references
      periodTransitionTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      periodTransitionTimeoutsRef.current.clear();

      // Clear local timer interval
      if (localIntervalRef.current) {
        clearInterval(localIntervalRef.current);
      }

      // Clear sync timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

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
    matchPeriod,
    matchStatus,
    formatTime,
  };
}