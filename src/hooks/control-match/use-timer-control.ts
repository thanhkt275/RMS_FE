import { useState, useEffect, useRef, useCallback } from "react";
import { useUnifiedWebSocket } from "@/hooks/websocket/use-unified-websocket";
import { unifiedWebSocketService } from "@/lib/unified-websocket";
import { MatchStatus } from "@/types/types";
import { UserRole } from "@/types/user.types"; // Use the same UserRole enum as auth
import { toast } from "sonner";


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

  // RBAC state
  canControlTimer: boolean;
  hasTimerPermission: boolean;

  // Utility functions
  formatTime: (ms: number) => string;
}

const ENDGAME_THRESHOLD_MS = 30000;

export function useTimerControl({
  tournamentId,
  selectedFieldId,
  initialDuration = 120000, // 2:00 in ms
  selectedMatchId,
  userRole,
  sendMatchStateChange,
  updateMatchStatusAPI,
}: UseTimerControlProps): TimerControlReturn {
  // RBAC validation - only ADMIN and HEAD_REFEREE can control timer
  const hasTimerPermission = userRole === UserRole.ADMIN || userRole === UserRole.HEAD_REFEREE;
  // Timer configuration state
  const [timerDuration, setTimerDuration] = useState<number>(initialDuration);
  const [matchPeriod, setMatchPeriod] = useState<string>("teleop");

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
      if (data.period && ["teleop", "endgame", "completed"].includes(data.period)) {
        setMatchPeriod(data.period);
      }

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
          const recalculatedStart = currentTime - (timerDuration - newRemaining);
          const timerData = {
            duration: timerDuration,
            remaining: newRemaining,
            isRunning: true, // Always true during countdown - only stop when timer is manually paused/stopped
            startedAt: recalculatedStart,
            timestamp: currentTime, // Add timestamp for better sync
            tournamentId,
            fieldId: selectedFieldId || null, // Allow null fieldId for tournament-wide timer
            matchId: selectedMatchId || null,
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
  }, [
    timerIsRunning,
    timerDuration,
    localStartTime,
    isConnected,
    selectedFieldId,
    tournamentId,
    matchPeriod,
    selectedMatchId,
  ]);

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

  // Period transition logic - teleop into endgame for 120s matches
  useEffect(() => {
    // Allow completion logic to run even when timer is stopped (for auto-completion when timer reaches 0)
    const shouldRunCompletionCheck = timerRemaining <= 0 && matchPeriod !== "completed";
    
    if (!timerIsRunning && !shouldRunCompletionCheck) return;

    const elapsedTime = timerDuration - timerRemaining;

    console.log('[useTimerControl Period Logic]', {
      matchPeriod,
      elapsedTime,
      timerRemaining,
      timerDuration,
      elapsedSeconds: Math.floor(elapsedTime / 1000),
      remainingSeconds: Math.floor(timerRemaining / 1000),
      timerIsRunning,
      shouldRunCompletionCheck
    });

    // Only run period transitions when timer is actively running
    if (timerIsRunning) {
      // Transition to endgame in the last 30 seconds
      if (matchPeriod === "teleop" && timerRemaining <= ENDGAME_THRESHOLD_MS && timerRemaining > 0) {
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
    }
    // Set match status to COMPLETED when timer reaches 0
    else if (timerRemaining <= 0 && matchPeriod !== "completed") {
      console.log('[useTimerControl] Match completed - Auto-setting status to COMPLETED');
      console.log('[useTimerControl] Completion check:', {
        timerRemaining,
        matchPeriod,
        selectedMatchId,
        hasStateChangeCallback: !!sendMatchStateChangeRef.current,
        hasAPICallback: !!updateMatchStatusAPI
      });
      
      setMatchPeriod("completed");

      // Broadcast match state change via WebSocket (immediate)
      if (sendMatchStateChangeRef.current && selectedMatchId) {
        console.log('[useTimerControl] Broadcasting COMPLETED status via WebSocket');
        sendMatchStateChangeRef.current({
          matchId: selectedMatchId,
          status: MatchStatus.COMPLETED,
          currentPeriod: null,
          fieldId: selectedFieldId || undefined,
        });
      } else {
        console.warn('[useTimerControl] Cannot broadcast completion: missing callback or matchId', {
          hasCallback: !!sendMatchStateChangeRef.current,
          selectedMatchId
        });
      }

      // Update API status
      if (updateMatchStatusAPI && selectedMatchId) {
        console.log('[useTimerControl] Updating match status to COMPLETED via API');
        updateMatchStatusAPI({
          matchId: selectedMatchId,
          status: MatchStatus.COMPLETED,
        });
      } else {
        console.warn('[useTimerControl] Cannot update API: missing callback or matchId', {
          hasAPICallback: !!updateMatchStatusAPI,
          selectedMatchId
        });
      }
    } else {
      // Debug why auto-completion didn't trigger
      if (timerRemaining <= 0) {
        console.log('[useTimerControl] Timer reached 0 but completion blocked:', {
          timerRemaining,
          matchPeriod,
          isAlreadyCompleted: matchPeriod === "completed",
          shouldComplete: timerRemaining <= 0 && matchPeriod !== "completed"
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
      setMatchPeriod("teleop");
      setLocalStartTime(null);
      setServerTimestamp(null);

      console.log('[useTimerControl] Timer state reset for new match');
    }
  }, [selectedMatchId, timerDuration]);

  // Timer control handlers with enhanced RBAC
  const handleStartTimer = useCallback(() => {
    // Primary RBAC check - only ADMIN and HEAD_REFEREE allowed
    if (!hasTimerPermission) {
      const message = `Access denied: Timer control requires ADMIN or HEAD_REFEREE role. Current role: ${userRole}`;
      console.warn('[useTimerControl]', message);
      toast.error('Timer Control Access Denied', {
        description: `Only Admins and Head Referees can control the timer. Your role: ${userRole}`
      });
      return;
    }
    
    // Secondary WebSocket permission check
    if (!canAccess('timer_control')) {
      const message = 'WebSocket service denied timer control access';
      console.warn('[useTimerControl]', message);
      toast.error('Timer Control Unavailable', {
        description: 'Timer control is currently unavailable. Please check your connection and permissions.'
      });
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
      matchId: selectedMatchId || null,
    };

    startTimer(timerData);

    // Update local state immediately for responsiveness
    setTimerIsRunning(true);
    setLocalStartTime(effectiveStartTime);

    const nextPeriod = timerRemaining === timerDuration ? "teleop" : matchPeriod;
    setMatchPeriod(nextPeriod);

    // Emit immediate timer update for real-time sync
    if (isConnected && tournamentId) {
      unifiedWebSocketService.emit('timer_update', {
        ...timerData,
        tournamentId,
        fieldId: selectedFieldId || null,
        period: nextPeriod,
        matchId: selectedMatchId || null,
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
        currentPeriod: nextPeriod,
        fieldId: selectedFieldId || undefined,
      });
    }

    console.log('[useTimerControl] Timer started:', { timerData, nextPeriod });
  }, [hasTimerPermission, canAccess, timerDuration, timerRemaining, matchPeriod, startTimer, selectedMatchId, selectedFieldId, isConnected, tournamentId, userRole]);

  const handlePauseTimer = useCallback(() => {
    // Primary RBAC check - only ADMIN and HEAD_REFEREE allowed
    if (!hasTimerPermission) {
      const message = `Access denied: Timer control requires ADMIN or HEAD_REFEREE role. Current role: ${userRole}`;
      console.warn('[useTimerControl]', message);
      toast.error('Timer Control Access Denied', {
        description: `Only Admins and Head Referees can control the timer. Your role: ${userRole}`
      });
      return;
    }
    
    // Secondary WebSocket permission check
    if (!canAccess('timer_control')) {
      const message = 'WebSocket service denied timer control access';
      console.warn('[useTimerControl]', message);
      toast.error('Timer Control Unavailable', {
        description: 'Timer control is currently unavailable. Please check your connection and permissions.'
      });
      return;
    }

    const currentTime = Date.now();
    const timerData = {
      duration: timerDuration,
      remaining: timerRemaining,
      isRunning: false,
      pausedAt: currentTime,
      timestamp: currentTime,
      matchId: selectedMatchId || null,
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
        matchId: selectedMatchId || null,
        period: matchPeriod,
      } as any, {
        fieldId: selectedFieldId || undefined,
        tournamentId: tournamentId,
      });
    }

    console.log('[useTimerControl] Timer paused:', timerData);
  }, [
    hasTimerPermission,
    canAccess,
    timerDuration,
    timerRemaining,
    pauseTimer,
    isConnected,
    tournamentId,
    selectedFieldId,
    selectedMatchId,
    userRole,
    matchPeriod
  ]);

  const handleResetTimer = useCallback(() => {
    // Primary RBAC check - only ADMIN and HEAD_REFEREE allowed
    if (!hasTimerPermission) {
      const message = `Access denied: Timer control requires ADMIN or HEAD_REFEREE role. Current role: ${userRole}`;
      console.warn('[useTimerControl]', message);
      toast.error('Timer Control Access Denied', {
        description: `Only Admins and Head Referees can control the timer. Your role: ${userRole}`
      });
      return;
    }
    
    // Secondary WebSocket permission check
    if (!canAccess('timer_control')) {
      const message = 'WebSocket service denied timer control access';
      console.warn('[useTimerControl]', message);
      toast.error('Timer Control Unavailable', {
        description: 'Timer control is currently unavailable. Please check your connection and permissions.'
      });
      return;
    }

    const currentTime = Date.now();
    const timerData = {
      duration: timerDuration,
      remaining: timerDuration, // Reset to full duration
      isRunning: false,
      timestamp: currentTime,
      matchId: selectedMatchId || null,
    };

    resetTimer(timerData);

    // Update local state immediately for responsiveness
    setTimerRemaining(timerDuration);
    setTimerIsRunning(false);
    setMatchPeriod("teleop");
    setLocalStartTime(null);
    setServerTimestamp(null);

    // Emit immediate timer update for real-time sync
    if (isConnected && tournamentId) {
      unifiedWebSocketService.emit('timer_update', {
        ...timerData,
        tournamentId,
        fieldId: selectedFieldId || null,
        period: 'teleop',
        matchId: selectedMatchId || null,
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
        currentPeriod: "teleop",
        fieldId: selectedFieldId || undefined,
      });
    }

    console.log('[useTimerControl] Timer reset:', timerData);
  }, [hasTimerPermission, canAccess, timerDuration, resetTimer, selectedMatchId, selectedFieldId, isConnected, tournamentId, userRole]);

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

    // RBAC state
    canControlTimer: canAccess('timer_control'),
    hasTimerPermission,

    // Utility functions
    formatTime,
  };
}
