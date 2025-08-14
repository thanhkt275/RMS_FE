import { useState, useEffect, useRef, useCallback } from "react";
import { useUnifiedWebSocket } from "@/hooks/websocket/use-unified-websocket";
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
    sendTimerUpdate,
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

    // Subscribe to multiple timer events from unified service (using standardized event names)
    const unsubscribeUpdate = subscribe("timer_update", handleTimerUpdate);
    const unsubscribeStart = subscribe("timer_start", handleTimerUpdate);
    const unsubscribePause = subscribe("timer_pause", handleTimerUpdate);
    const unsubscribeReset = subscribe("timer_reset", handleTimerUpdate);

    // Cleanup subscriptions when component unmounts
    return () => {
      if (unsubscribeUpdate) unsubscribeUpdate();
      if (unsubscribeStart) unsubscribeStart();
      if (unsubscribePause) unsubscribePause();
      if (unsubscribeReset) unsubscribeReset();
    };
  }, [subscribe, selectedFieldId, calculateDriftCorrectedTime]);

  // Local timer continuation during connection loss
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

  // Real-time timer update broadcasting (only when connected and running)
  useEffect(() => {
    if (!timerIsRunning || !isConnected || connectionLost || !localStartTime) return;

    console.log('[useTimerControl] Starting real-time timer update broadcasting');

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - localStartTime;
      const newRemaining = Math.max(0, timerDuration - elapsed);

      // Update local state
      setTimerRemaining(newRemaining);

      // Broadcast timer update to all connected clients
      const timerUpdateData = {
        duration: timerDuration,
        remaining: newRemaining,
        isRunning: true,
        startedAt: localStartTime,
        period: matchPeriod,
      };
      console.log('[useTimerControl] Broadcasting timer update:', timerUpdateData);
      sendTimerUpdate(timerUpdateData);

      if (newRemaining <= 0) {
        setTimerIsRunning(false);
        clearInterval(interval);
        console.log('[useTimerControl] Timer completed, broadcasting final update');

        // Send final timer update
        sendTimerUpdate({
          duration: timerDuration,
          remaining: 0,
          isRunning: false,
          period: matchPeriod,
        });
      }
    }, 1000); // Broadcast every 1 second for real-time sync

    return () => clearInterval(interval);
  }, [timerIsRunning, isConnected, connectionLost, localStartTime, timerDuration, sendTimerUpdate, selectedMatchId, matchPeriod]);

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

      // Send timer update with new period
      sendTimerUpdate({
        duration: timerDuration,
        remaining: timerRemaining,
        isRunning: true,
        startedAt: localStartTime || undefined,
        period: "teleop",
      });

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

      // Send timer update with new period
      sendTimerUpdate({
        duration: timerDuration,
        remaining: timerRemaining,
        isRunning: true,
        startedAt: localStartTime || undefined,
        period: "endgame",
      });

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

      // Send final timer update
      sendTimerUpdate({
        duration: timerDuration,
        remaining: 0,
        isRunning: false,
        period: "completed",
      });

      // Update API status
      if (updateMatchStatusAPI && selectedMatchId) {
        updateMatchStatusAPI({
          matchId: selectedMatchId,
          status: MatchStatus.COMPLETED,
        });
      }
    }
  }, [timerIsRunning, timerRemaining, matchPeriod, timerDuration, selectedMatchId, updateMatchStatusAPI, setMatchPeriod, sendTimerUpdate, localStartTime, selectedFieldId]);

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

    const now = Date.now();
    const timerData = {
      duration: timerDuration,
      remaining: timerRemaining,
      isRunning: true,
      startedAt: now,
      period: "auto",
    };

    // Emit timer start event
    startTimer(timerData);

    // Update local state immediately for responsiveness
    setTimerIsRunning(true);
    setLocalStartTime(now);
    setServerTimestamp(now);

    // Set to auto period when starting
    setMatchPeriod("auto");

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
    console.log('[useTimerControl] WebSocket connection status:', isConnected);
    console.log('[useTimerControl] Tournament ID:', tournamentId);
    console.log('[useTimerControl] Field ID:', selectedFieldId);
    console.log('[useTimerControl] Timer duration (ms):', timerDuration);
    console.log('[useTimerControl] Timer duration (formatted):', formatTime(timerDuration));
  }, [canAccess, timerDuration, timerRemaining, startTimer, selectedMatchId, selectedFieldId, tournamentId]);

  const handlePauseTimer = useCallback(() => {
    if (!canAccess('timer_control')) {
      console.warn('[useTimerControl] Access denied for timer control');
      return;
    }

    const now = Date.now();
    const timerData = {
      duration: timerDuration,
      remaining: timerRemaining,
      isRunning: false,
      pausedAt: now,
      period: matchPeriod,
    };

    // Emit timer pause event
    pauseTimer(timerData);

    // Update local state immediately for responsiveness
    setTimerIsRunning(false);
    setLocalStartTime(null);

    console.log('[useTimerControl] Timer paused:', timerData);
  }, [canAccess, timerDuration, timerRemaining, pauseTimer, selectedFieldId, tournamentId, selectedMatchId, matchPeriod]);

  const handleResetTimer = useCallback(() => {
    if (!canAccess('timer_control')) {
      console.warn('[useTimerControl] Access denied for timer control');
      return;
    }

    const timerData = {
      duration: timerDuration,
      remaining: timerDuration, // Reset to full duration
      isRunning: false,
      period: "auto",
    };

    // Emit timer reset event
    resetTimer(timerData);

    // Update local state immediately for responsiveness
    setTimerRemaining(timerDuration);
    setTimerIsRunning(false);
    setMatchPeriod("auto");
    setLocalStartTime(null);
    setServerTimestamp(null);

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
  }, [canAccess, timerDuration, resetTimer, selectedMatchId, selectedFieldId, tournamentId]);

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
