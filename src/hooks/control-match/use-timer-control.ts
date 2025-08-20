import { useState, useEffect, useRef, useCallback } from "react";
import { useUnifiedWebSocket } from "@/hooks/websocket/use-unified-websocket";
import { unifiedWebSocketService } from "@/lib/unified-websocket";
import { MatchStatus, UserRole } from "@/types/types";


interface UseTimerControlProps {
  tournamentId: string;
  selectedFieldId: string | null;
  initialDuration?: number;
  selectedMatchId?: string;
  userRole?: UserRole;
  sendMatchStateChange?: (params: {
    matchId: string;
    status: MatchStatus;
    currentPeriod: string | null;
    fieldId?: string;
  }) => void;
  // Add API update function
  updateMatchStatusAPI?: (params: {
    matchId: string;
    status: MatchStatus;
  }) => void;
}

interface TimerControlReturn {
  // Timer state
  timerDuration: number;
  timerRemaining: number;
  timerIsRunning: boolean;
  matchPeriod: string;

  // Timer setters
  setTimerDuration: (duration: number) => void;
  setMatchPeriod: (period: string) => void;

  // Timer controls
  handleStartTimer: () => void;
  handlePauseTimer: () => void;
  handleResetTimer: () => void;

  // Utility functions
  formatTime: (ms: number) => string;
}

export function useTimerControl({
  tournamentId,
  selectedFieldId,
  initialDuration = 150000, // 2:30 in ms
  selectedMatchId,
  userRole = UserRole.HEAD_REFEREE,
  sendMatchStateChange,
  updateMatchStatusAPI,
}: UseTimerControlProps): TimerControlReturn {
  // Timer configuration state
  const [timerDuration, setTimerDuration] = useState<number>(initialDuration);
  const [matchPeriod, setMatchPeriod] = useState<string>("auto");

  // Timer display state for live clock
  const [timerRemaining, setTimerRemaining] = useState<number>(timerDuration);
  const [timerIsRunning, setTimerIsRunning] = useState<boolean>(false);

  // Timer drift correction and local continuation state
  const [serverTimestamp, setServerTimestamp] = useState<number | null>(null);
  const [localStartTime, setLocalStartTime] = useState<number | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [connectionLost, setConnectionLost] = useState<boolean>(false);

  // Refs for stable timer state access
  const timerStateRef = useRef({
    duration: timerDuration,
    remaining: timerRemaining,
    isRunning: timerIsRunning,
    serverTimestamp: null as number | null,
    localStartTime: null as number | null,
  });

  // Ref for sendMatchStateChange to avoid stale closures
  const sendMatchStateChangeRef = useRef(sendMatchStateChange);

  // Update refs when state changes
  useEffect(() => {
    timerStateRef.current = {
      duration: timerDuration,
      remaining: timerRemaining,
      isRunning: timerIsRunning,
      serverTimestamp,
      localStartTime,
    };
  }, [timerDuration, timerRemaining, timerIsRunning, serverTimestamp, localStartTime]);

  // Update sendMatchStateChange ref when it changes
  useEffect(() => {
    sendMatchStateChangeRef.current = sendMatchStateChange;
  }, [sendMatchStateChange]);

  // Unified WebSocket connection for timer controls
  const {
    startTimer,
    pauseTimer,
    resetTimer,
    subscribe,
    isConnected,
    canAccess,
  } = useUnifiedWebSocket({
    tournamentId,
    fieldId: selectedFieldId || undefined,
    autoConnect: true,
    userRole
  });

  // Format timer as MM:SS
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Sync timerRemaining with timerDuration when duration changes
  useEffect(() => {
    setTimerRemaining(timerDuration);
  }, [timerDuration]);

  // Timer drift correction function
  const calculateDriftCorrectedTime = useCallback((serverData: any): number => {
    if (!serverData.startedAt || !serverData.isRunning) {
      return serverData.remaining || 0;
    }

    const now = Date.now();
    const serverElapsed = now - serverData.startedAt;
    const correctedRemaining = Math.max(0, serverData.duration - serverElapsed);

    console.log('[useTimerControl] Drift correction:', {
      serverRemaining: serverData.remaining,
      correctedRemaining,
      drift: Math.abs(correctedRemaining - serverData.remaining),
      serverElapsed,
    });

    return correctedRemaining;
  }, []);

  // Connection status tracking
  useEffect(() => {
    setConnectionLost(!isConnected);

    if (isConnected && connectionLost) {
      console.log('[useTimerControl] Connection restored, requesting timer resync');
      // Timer state will be resynced automatically by the unified service
    }
  }, [isConnected, connectionLost]);

  // Listen for timer updates from unified WebSocket service
  useEffect(() => {
    const handleTimerUpdate = (data: any) => {
      console.log('[useTimerControl] Timer update received:', data);

      // Filter messages by fieldId if we're in a specific field room
      if (selectedFieldId && data.fieldId && data.fieldId !== selectedFieldId) {
        console.log(`[useTimerControl] Ignoring timer update for different field: ${data.fieldId}`);
        return;
      }

      // Apply drift correction for running timers
      const correctedRemaining = data.isRunning
        ? calculateDriftCorrectedTime(data)
        : data.remaining || 0;

      // Update local timer state with server data
      setTimerRemaining(correctedRemaining);
      setTimerIsRunning(data.isRunning || false);

      // Update sync tracking
      setServerTimestamp(data.startedAt || null);
      setLastSyncTime(Date.now());

      if (data.isRunning && data.startedAt) {
        setLocalStartTime(Date.now() - (data.duration - correctedRemaining));
      } else {
        setLocalStartTime(null);
      }

      console.log('[useTimerControl] Timer state updated:', {
        remaining: correctedRemaining,
        isRunning: data.isRunning,
        serverTimestamp: data.startedAt,
      });
    };

    // Subscribe to multiple timer events from unified service
    const unsubscribeUpdate = subscribe("timer_update", handleTimerUpdate);
    const unsubscribeStart = subscribe("start_timer", handleTimerUpdate);
    const unsubscribePause = subscribe("pause_timer", handleTimerUpdate);
    const unsubscribeReset = subscribe("reset_timer", handleTimerUpdate);

    // Cleanup subscriptions when component unmounts
    return () => {
      if (unsubscribeUpdate) unsubscribeUpdate();
      if (unsubscribeStart) unsubscribeStart();
      if (unsubscribePause) unsubscribePause();
      if (unsubscribeReset) unsubscribeReset();
    };
  }, [subscribe, selectedFieldId, calculateDriftCorrectedTime]);

  // Main timer countdown logic with WebSocket emissions
  useEffect(() => {
    if (!timerIsRunning) return;

    console.log('[useTimerControl] Starting main timer countdown');
    
    const interval = setInterval(() => {
      setTimerRemaining(prevRemaining => {
        const newRemaining = Math.max(0, prevRemaining - 1000); // Decrease by 1 second (1000ms)
        
        // Emit timer update via WebSocket every second
        // Allow emission even without fieldId (tournament-wide timer)
        if (isConnected && tournamentId) {
          const currentTime = Date.now();
          const timerData = {
            duration: timerDuration,
            remaining: newRemaining,
            isRunning: true, // Always true during countdown - only stop when timer is manually paused/stopped
            startedAt: localStartTime || currentTime,
            timestamp: currentTime, // Add timestamp for better sync
            tournamentId,
            fieldId: selectedFieldId || null, // Allow null fieldId for tournament-wide timer
            period: matchPeriod, // Include current match period
          };

          // Use the unified WebSocket service to emit timer updates
          // Use direct emit with debounce disabled for continuous updates
          unifiedWebSocketService.emit('timer_update', timerData as any, {
            fieldId: selectedFieldId || undefined, // Use undefined if no field selected
            tournamentId: tournamentId,
            debounce: false, // Disable debouncing for continuous timer updates
            skipChangeDetection: true, // Skip data change detection for continuous timer updates
          });


          console.log('[useTimerControl] Emitted timer_update:', {
            ...timerData,
            remainingFormatted: `${Math.floor(newRemaining / 60000)}:${Math.floor((newRemaining % 60000) / 1000).toString().padStart(2, '0')}`
          });
        }
        
        // Stop timer when it reaches 0
        if (newRemaining <= 0) {
          setTimerIsRunning(false);
          console.log('[useTimerControl] Timer completed');
        }
        
        return newRemaining;
      });
    }, 1000); // Update every 1000ms (1 second)

    return () => {
      clearInterval(interval);
      console.log('[useTimerControl] Cleaned up timer interval');
    };
  }, [timerIsRunning, timerDuration, localStartTime, isConnected, selectedFieldId, tournamentId]);

  // Local timer continuation during connection loss (fallback)
  useEffect(() => {
    if (!timerIsRunning || !connectionLost || !localStartTime) return;

    console.log('[useTimerControl] Starting local timer continuation during connection loss');

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - localStartTime;
      const newRemaining = Math.max(0, timerDuration - elapsed);

      setTimerRemaining(newRemaining);

      if (newRemaining <= 0) {
        setTimerIsRunning(false);
        clearInterval(interval);
        console.log('[useTimerControl] Local timer completed during connection loss');
      }
    }, 100); // Update every 100ms for smooth countdown

    return () => clearInterval(interval);
  }, [timerIsRunning, connectionLost, localStartTime, timerDuration]);

  // Period transition logic - matches the FRC timing
  useEffect(() => {
    if (!timerIsRunning) return;

    const elapsedTime = timerDuration - timerRemaining;

    console.log('[useTimerControl Period Logic]', {
      matchPeriod,
      elapsedTime,
      timerRemaining,
      timerDuration,
      elapsedSeconds: Math.floor(elapsedTime / 1000),
      remainingSeconds: Math.floor(timerRemaining / 1000),
    });

    // For FRC match timing:
    // - Auto: 0-30 seconds elapsed (2:30 to 2:00 remaining for 2:30 match)
    // - Teleop: 30-120 seconds elapsed (2:00 to 0:30 remaining)  
    // - Endgame: 120+ seconds elapsed (last 30 seconds, 0:30 to 0:00 remaining)

    // Transition to teleop after 30 seconds (when 2:00 remains for 2:30 match)
    if (matchPeriod === "auto" && elapsedTime >= 30000) {
      console.log('[useTimerControl] Transitioning from auto to teleop at', elapsedTime / 1000, 'seconds elapsed (', timerRemaining / 1000, 'seconds remaining)');
      setMatchPeriod("teleop");

      // Broadcast match state change via WebSocket (immediate)
      if (sendMatchStateChangeRef.current && selectedMatchId) {
        sendMatchStateChangeRef.current({
          matchId: selectedMatchId,
          status: MatchStatus.IN_PROGRESS,
          currentPeriod: "teleop",
          fieldId: selectedFieldId || undefined,
        });
      }

      // Update API status
      if (updateMatchStatusAPI && selectedMatchId) {
        updateMatchStatusAPI({
          matchId: selectedMatchId,
          status: MatchStatus.IN_PROGRESS,
        });
      }
    }
    // Transition to endgame in the last 30 seconds (when 0:30 remains)
    else if ((matchPeriod === "auto" || matchPeriod === "teleop") && timerRemaining <= 30000 && timerRemaining > 0) {
      console.log('[useTimerControl] Transitioning to endgame at', timerRemaining / 1000, 'seconds remaining');
      setMatchPeriod("endgame");

      // Broadcast match state change via WebSocket (immediate)
      if (sendMatchStateChangeRef.current && selectedMatchId) {
        sendMatchStateChangeRef.current({
          matchId: selectedMatchId,
          status: MatchStatus.IN_PROGRESS,
          currentPeriod: "endgame",
          fieldId: selectedFieldId || undefined,
        });
      }

      // Update API status
      if (updateMatchStatusAPI && selectedMatchId) {
        updateMatchStatusAPI({
          matchId: selectedMatchId,
          status: MatchStatus.IN_PROGRESS,
        });
      }
    }
    // Set match status to COMPLETED when timer reaches 0
    else if (timerRemaining <= 0 && matchPeriod !== "completed") {
      console.log('[useTimerControl] Match completed');
      setMatchPeriod("completed");

      // Broadcast match state change via WebSocket (immediate)
      if (sendMatchStateChangeRef.current && selectedMatchId) {
        sendMatchStateChangeRef.current({
          matchId: selectedMatchId,
          status: MatchStatus.COMPLETED,
          currentPeriod: null,
          fieldId: selectedFieldId || undefined,
        });
      }

      // Update API status
      if (updateMatchStatusAPI && selectedMatchId) {
        updateMatchStatusAPI({
          matchId: selectedMatchId,
          status: MatchStatus.COMPLETED,
        });
      }
    }
  }, [timerIsRunning, timerRemaining, matchPeriod, timerDuration, selectedMatchId, updateMatchStatusAPI, setMatchPeriod]);

  // Handle match switching - timer must follow the new match
  useEffect(() => {
    if (selectedMatchId) {
      console.log('[useTimerControl] Match switched to:', selectedMatchId);

      // Reset timer state when switching matches to avoid confusion
      setTimerRemaining(timerDuration);
      setTimerIsRunning(false);
      setMatchPeriod("auto");
      setLocalStartTime(null);
      setServerTimestamp(null);

      console.log('[useTimerControl] Timer state reset for new match');
    }
  }, [selectedMatchId, timerDuration]);

  // Timer control handlers with access control
  const handleStartTimer = useCallback(() => {
    if (!canAccess('timer_control')) {
      console.warn('[useTimerControl] Access denied for timer control');
      return;
    }

    const currentTime = Date.now();
    // Calculate the actual start time based on current remaining time
    // If timer has 120 seconds left, the effective start time should be 30 seconds ago (for a 150s timer)
    const effectiveStartTime = currentTime - (timerDuration - timerRemaining);
    
    const timerData = {
      duration: timerDuration,
      remaining: timerRemaining, // Use current remaining time
      isRunning: true, // Start the timer as running
      startedAt: effectiveStartTime, // Use calculated effective start time
      timestamp: currentTime,
    };

    startTimer(timerData);

    // Update local state immediately for responsiveness
    setTimerIsRunning(true);
    setLocalStartTime(effectiveStartTime);

    // Only set to auto period when starting from full duration
    if (timerRemaining === timerDuration) {
      setMatchPeriod("auto");
    }
    // Otherwise keep current period

    // Emit immediate timer update for real-time sync
    if (isConnected && tournamentId) {
      unifiedWebSocketService.emit('timer_update', {
        ...timerData,
        tournamentId,
        fieldId: selectedFieldId || null,
        period: 'auto',
      } as any, {
        fieldId: selectedFieldId || undefined,
        tournamentId: tournamentId,
      });
    }

    // Broadcast match state change via WebSocket (immediate)
    if (sendMatchStateChangeRef.current && selectedMatchId) {
      sendMatchStateChangeRef.current({
        matchId: selectedMatchId,
        status: MatchStatus.IN_PROGRESS,
        currentPeriod: "auto",
        fieldId: selectedFieldId || undefined,
      });
    }

    console.log('[useTimerControl] Timer started:', timerData);
  }, [canAccess, timerDuration, timerRemaining, startTimer, selectedMatchId, selectedFieldId, isConnected, tournamentId]);

  const handlePauseTimer = useCallback(() => {
    if (!canAccess('timer_control')) {
      console.warn('[useTimerControl] Access denied for timer control');
      return;
    }

    const currentTime = Date.now();
    const timerData = {
      duration: timerDuration,
      remaining: timerRemaining,
      isRunning: false,
      pausedAt: currentTime,
      timestamp: currentTime,
    };

    pauseTimer(timerData);

    // Update local state immediately for responsiveness
    setTimerIsRunning(false);
    setLocalStartTime(null);

    // Emit immediate timer update for real-time sync
    if (isConnected && tournamentId) {
      unifiedWebSocketService.emit('timer_update', {
        ...timerData,
        tournamentId,
        fieldId: selectedFieldId || null,
      } as any, {
        fieldId: selectedFieldId || undefined,
        tournamentId: tournamentId,
      });
    }

    console.log('[useTimerControl] Timer paused:', timerData);
  }, [canAccess, timerDuration, timerRemaining, pauseTimer, isConnected, tournamentId, selectedFieldId]);

  const handleResetTimer = useCallback(() => {
    if (!canAccess('timer_control')) {
      console.warn('[useTimerControl] Access denied for timer control');
      return;
    }

    const currentTime = Date.now();
    const timerData = {
      duration: timerDuration,
      remaining: timerDuration, // Reset to full duration
      isRunning: false,
      timestamp: currentTime,
    };

    resetTimer(timerData);

    // Update local state immediately for responsiveness
    setTimerRemaining(timerDuration);
    setTimerIsRunning(false);
    setMatchPeriod("auto");
    setLocalStartTime(null);
    setServerTimestamp(null);

    // Emit immediate timer update for real-time sync
    if (isConnected && tournamentId) {
      unifiedWebSocketService.emit('timer_update', {
        ...timerData,
        tournamentId,
        fieldId: selectedFieldId || null,
        period: 'auto',
      } as any, {
        fieldId: selectedFieldId || undefined,
        tournamentId: tournamentId,
      });
    }

    // Broadcast match state change to reset via WebSocket (immediate)
    if (sendMatchStateChangeRef.current && selectedMatchId) {
      sendMatchStateChangeRef.current({
        matchId: selectedMatchId,
        status: MatchStatus.PENDING,
        currentPeriod: "auto",
        fieldId: selectedFieldId || undefined,
      });
    }

    console.log('[useTimerControl] Timer reset:', timerData);
  }, [canAccess, timerDuration, resetTimer, selectedMatchId, selectedFieldId, isConnected, tournamentId]);

  return {
    // Timer state
    timerDuration,
    timerRemaining,
    timerIsRunning,
    matchPeriod,

    // Timer setters
    setTimerDuration,
    setMatchPeriod,

    // Timer controls
    handleStartTimer,
    handlePauseTimer,
    handleResetTimer,

    // Utility functions
    formatTime,
  };
}
