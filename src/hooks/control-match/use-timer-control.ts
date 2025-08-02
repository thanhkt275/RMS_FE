import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket } from "@/hooks/websocket/use-websocket";
import { MatchStatus } from "@/types/types";

interface UseTimerControlProps {
  tournamentId: string;
  selectedFieldId: string | null;
  initialDuration?: number;
  selectedMatchId?: string;
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
  sendMatchStateChange,
  updateMatchStatusAPI,
}: UseTimerControlProps): TimerControlReturn {
  // Timer configuration state
  const [timerDuration, setTimerDuration] = useState<number>(initialDuration);
  const [matchPeriod, setMatchPeriod] = useState<string>("auto");

  // Timer display state for live clock
  const [timerRemaining, setTimerRemaining] = useState<number>(timerDuration);
  const [timerIsRunning, setTimerIsRunning] = useState<boolean>(false);

  // Use refs to store stable references to callback functions
  const sendMatchStateChangeRef = useRef(sendMatchStateChange);
  const updateMatchStatusAPIRef = useRef(updateMatchStatusAPI);
  
  // Add ref to track last API update to prevent duplicate calls
  const lastAPIUpdateRef = useRef<{ matchId: string; status: MatchStatus; timestamp: number } | null>(null);
  
  // Update refs when callbacks change
  useEffect(() => {
    sendMatchStateChangeRef.current = sendMatchStateChange;
  }, [sendMatchStateChange]);
  
  useEffect(() => {
    updateMatchStatusAPIRef.current = updateMatchStatusAPI;
  }, [updateMatchStatusAPI]);

  // Helper function to debounce API updates (prevent rapid successive calls)
  const debouncedAPIUpdate = useCallback((matchId: string, status: MatchStatus) => {
    const now = Date.now();
    const lastUpdate = lastAPIUpdateRef.current;
    
    // Only call API if this is a different status or enough time has passed (1 second)
    if (!lastUpdate || 
        lastUpdate.matchId !== matchId || 
        lastUpdate.status !== status ||
        now - lastUpdate.timestamp > 1000) {
      
      if (updateMatchStatusAPIRef.current) {
        updateMatchStatusAPIRef.current({ matchId, status });
        lastAPIUpdateRef.current = { matchId, status, timestamp: now };
      }
    }
  }, []);

  // WebSocket connection for timer controls
  const {
    startTimer,
    pauseTimer,
    resetTimer,
    subscribe,
  } = useWebSocket({ tournamentId, autoConnect: true });

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

  // Reset timer when match changes
  useEffect(() => {
    if (selectedMatchId) {
      console.log(`[useTimerControl] Match changed to: ${selectedMatchId}, resetting timer`);
      
      // Reset all timer state to initial values
      setTimerRemaining(timerDuration);
      setTimerIsRunning(false);
      setMatchPeriod("auto");
      
      // Send reset command to server with full duration to sync audience displays
      const timerData = {
        duration: timerDuration,
        remaining: timerDuration, // Important: set to full duration, not 0
        isRunning: false,
        fieldId: selectedFieldId || undefined,
        matchId: selectedMatchId, // Include matchId for proper routing
        period: "auto", // Reset to auto period
      };
      resetTimer(timerData);
      
      // Reset match status to PENDING
      if (sendMatchStateChangeRef.current) {
        sendMatchStateChangeRef.current({
          matchId: selectedMatchId,
          status: MatchStatus.PENDING,
          currentPeriod: "auto",
          fieldId: selectedFieldId || undefined,
        });
      }
      
      // Also update match status via API
      if (updateMatchStatusAPIRef.current) {
        debouncedAPIUpdate(selectedMatchId, MatchStatus.PENDING);
      }
    }
  }, [selectedMatchId, timerDuration, selectedFieldId, resetTimer]);

  // Reset timer when field changes  
  useEffect(() => {
    if (selectedFieldId) {
      console.log(`[useTimerControl] Field changed to: ${selectedFieldId}, resetting timer`);
      
      // Reset all timer state to initial values
      setTimerRemaining(timerDuration);
      setTimerIsRunning(false);
      setMatchPeriod("auto");
      
      // Send reset command to server with full duration to sync audience displays
      const timerData = {
        duration: timerDuration,
        remaining: timerDuration, // Important: set to full duration, not 0
        isRunning: false,
        fieldId: selectedFieldId,
        matchId: selectedMatchId, // Include matchId for proper routing
        period: "auto", // Reset to auto period
      };
      resetTimer(timerData);
      
      // Reset match status to PENDING if we have a selected match
      if (sendMatchStateChangeRef.current && selectedMatchId) {
        sendMatchStateChangeRef.current({
          matchId: selectedMatchId,
          status: MatchStatus.PENDING,
          currentPeriod: "auto",
          fieldId: selectedFieldId || undefined,
        });
      }
      
      // Also update match status via API if we have a selected match
      if (updateMatchStatusAPIRef.current && selectedMatchId) {
        debouncedAPIUpdate(selectedMatchId, MatchStatus.PENDING);
      }
    }
  }, [selectedFieldId, timerDuration, resetTimer, selectedMatchId]);

  // Listen for timer updates from WebSocket
  useEffect(() => {
    const handleTimerUpdate = (data: any) => {
      console.log("Timer update received:", data, "for match:", selectedMatchId);
      
      // Filter messages by fieldId if we're in a specific field room
      if (selectedFieldId && data.fieldId && data.fieldId !== selectedFieldId) {
        console.log(`Ignoring timer update for different field: ${data.fieldId}`);
        return;
      }

      // Filter messages by matchId if we have a selected match
      if (selectedMatchId && data.matchId && data.matchId !== selectedMatchId) {
        console.log(`Ignoring timer update for different match: ${data.matchId}`);
        return;
      }

      // Update local timer state from the websocket data
      if (data) {
        console.log(`Updating timer state: remaining=${data.remaining}, isRunning=${data.isRunning}`);
        setTimerRemaining(data.remaining || timerDuration); // Fallback to full duration
        setTimerIsRunning(data.isRunning || false);
        
        // Also update period if provided
        if (data.period) {
          setMatchPeriod(data.period);
        }
      }
    };

    // Subscribe to timer updates using the subscribe method from useWebSocket
    const unsubscribe = subscribe("timer_update", handleTimerUpdate);
    
    // Cleanup subscription when component unmounts
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribe, selectedFieldId, selectedMatchId, timerDuration]);

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
      console.log('[useTimerControl] Transitioning from auto to teleop at', elapsedTime/1000, 'seconds elapsed (', timerRemaining/1000, 'seconds remaining)');
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
      
      // Update API status with debouncing to prevent excessive queries
      if (selectedMatchId) {
        debouncedAPIUpdate(selectedMatchId, MatchStatus.IN_PROGRESS);
      }
    }
    // Transition to endgame in the last 30 seconds (when 0:30 remains)
    else if ((matchPeriod === "auto" || matchPeriod === "teleop") && timerRemaining <= 30000 && timerRemaining > 0) {
      console.log('[useTimerControl] Transitioning to endgame at', timerRemaining/1000, 'seconds remaining');
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
      
      // Update API status with debouncing to prevent excessive queries
      if (selectedMatchId) {
        debouncedAPIUpdate(selectedMatchId, MatchStatus.IN_PROGRESS);
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
      
      // Update API status with debouncing to prevent excessive queries
      if (selectedMatchId) {
        debouncedAPIUpdate(selectedMatchId, MatchStatus.COMPLETED);
      }
    }
  }, [timerIsRunning, timerRemaining, matchPeriod, timerDuration, selectedMatchId]);  // Timer control handlers
  const handleStartTimer = useCallback(() => {
    const timerData = {
      duration: timerDuration,
      remaining: timerRemaining,
      isRunning: true, // Start the timer as running
      fieldId: selectedFieldId || undefined,
      matchId: selectedMatchId, // Include matchId for proper routing
      period: "auto", // Include period information
    };
    startTimer(timerData);
    
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
    
    // Update API status with debouncing to prevent excessive queries
    if (selectedMatchId) {
      debouncedAPIUpdate(selectedMatchId, MatchStatus.IN_PROGRESS);
    }
  }, [timerDuration, timerRemaining, selectedFieldId, selectedMatchId, startTimer]);

  const handlePauseTimer = useCallback(() => {
    const timerData = {
      duration: timerDuration,
      remaining: timerRemaining,
      isRunning: false,
      fieldId: selectedFieldId || undefined,
      matchId: selectedMatchId, // Include matchId for proper routing
      period: matchPeriod, // Include current period
    };
    pauseTimer(timerData);
    
    // Change match status to PENDING when pausing via WebSocket (immediate)
    if (sendMatchStateChangeRef.current && selectedMatchId) {
      sendMatchStateChangeRef.current({
        matchId: selectedMatchId,
        status: MatchStatus.PENDING,
        currentPeriod: "auto",
        fieldId: selectedFieldId || undefined,
      });
    }
    
    // Update API status with debouncing to prevent excessive queries
    if (selectedMatchId) {
      debouncedAPIUpdate(selectedMatchId, MatchStatus.PENDING);
    }
  }, [timerDuration, timerRemaining, selectedFieldId, selectedMatchId, matchPeriod, pauseTimer]);

  const handleResetTimer = useCallback(() => {
    const timerData = {
      duration: timerDuration,
      remaining: timerDuration, // Reset to full duration
      isRunning: false,
      fieldId: selectedFieldId || undefined,
      matchId: selectedMatchId, // Include matchId for proper routing
      period: "auto", // Reset to auto period
    };
    resetTimer(timerData);
    setTimerRemaining(timerDuration);
    setTimerIsRunning(false);
    setMatchPeriod("auto");
    
    // Broadcast match state change to reset via WebSocket (immediate)
    if (sendMatchStateChangeRef.current && selectedMatchId) {
      sendMatchStateChangeRef.current({
        matchId: selectedMatchId,
        status: MatchStatus.PENDING,
        currentPeriod: "auto",
        fieldId: selectedFieldId || undefined,
      });
    }
    
    // Update API status with debouncing to prevent excessive queries
    if (selectedMatchId) {
      debouncedAPIUpdate(selectedMatchId, MatchStatus.PENDING);
    }
  }, [timerDuration, selectedFieldId, selectedMatchId, resetTimer]);

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
