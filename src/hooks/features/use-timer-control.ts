import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/common/use-websocket";
import { MatchStatus } from "@/lib/types";

interface UseTimerControlProps {
  tournamentId: string;
  selectedFieldId: string | null;
  initialDuration?: number;
  selectedMatchId?: string;
  sendMatchStateChange?: (params: {
    matchId: string;
    status: MatchStatus;
    currentPeriod: string | null;
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
}: UseTimerControlProps): TimerControlReturn {
  // Timer configuration state
  const [timerDuration, setTimerDuration] = useState<number>(initialDuration);
  const [matchPeriod, setMatchPeriod] = useState<string>("auto");

  // Timer display state for live clock
  const [timerRemaining, setTimerRemaining] = useState<number>(timerDuration);
  const [timerIsRunning, setTimerIsRunning] = useState<boolean>(false);

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

  // Listen for timer updates from WebSocket
  useEffect(() => {
    const handleTimerUpdate = (data: any) => {
      console.log("Timer update received:", data);
      
      // Filter messages by fieldId if we're in a specific field room
      if (selectedFieldId && data.fieldId && data.fieldId !== selectedFieldId) {
        console.log(`Ignoring timer update for different field: ${data.fieldId}`);
        return;
      }

      // Update local timer state from the websocket data
      if (data) {
        setTimerRemaining(data.remaining || 0);
        setTimerIsRunning(data.isRunning || false);
      }
    };

    // Subscribe to timer updates using the subscribe method from useWebSocket
    const unsubscribe = subscribe("timer_update", handleTimerUpdate);    // Cleanup subscription when component unmounts
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribe, selectedFieldId]);

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
      
      // Broadcast match state change
      if (sendMatchStateChange && selectedMatchId) {
        sendMatchStateChange({
          matchId: selectedMatchId,
          status: MatchStatus.IN_PROGRESS,
          currentPeriod: "teleop",
        });
      }
    }
    // Transition to endgame in the last 30 seconds (when 0:30 remains)
    else if ((matchPeriod === "auto" || matchPeriod === "teleop") && timerRemaining <= 30000 && timerRemaining > 0) {
      console.log('[useTimerControl] Transitioning to endgame at', timerRemaining/1000, 'seconds remaining');
      setMatchPeriod("endgame");
      
      // Broadcast match state change
      if (sendMatchStateChange && selectedMatchId) {
        sendMatchStateChange({
          matchId: selectedMatchId,
          status: MatchStatus.IN_PROGRESS,
          currentPeriod: "endgame",
        });
      }
    }
    // Set match status to COMPLETED when timer reaches 0
    else if (timerRemaining <= 0 && matchPeriod !== "completed") {
      console.log('[useTimerControl] Match completed');
      setMatchPeriod("completed");
      
      // Broadcast match state change
      if (sendMatchStateChange && selectedMatchId) {
        sendMatchStateChange({
          matchId: selectedMatchId,
          status: MatchStatus.COMPLETED,
          currentPeriod: null,
        });
      }
    }
  }, [timerIsRunning, timerRemaining, matchPeriod, timerDuration, selectedMatchId, sendMatchStateChange, setMatchPeriod]);  // Timer control handlers
  const handleStartTimer = () => {
    const timerData = {
      duration: timerDuration,
      remaining: timerRemaining,
      isRunning: true, // Start the timer as running
      fieldId: selectedFieldId || undefined,
    };
    startTimer(timerData);
    
    // Set to auto period when starting
    setMatchPeriod("auto");
    
    // Broadcast match state change
    if (sendMatchStateChange && selectedMatchId) {
      sendMatchStateChange({
        matchId: selectedMatchId,
        status: MatchStatus.IN_PROGRESS,
        currentPeriod: "auto",
      });
    }
  };

  const handlePauseTimer = () => {
    const timerData = {
      duration: timerDuration,
      remaining: timerRemaining,
      isRunning: false,
      fieldId: selectedFieldId || undefined,
    };
    pauseTimer(timerData);
  };

  const handleResetTimer = () => {
    const timerData = {
      duration: timerDuration,
      remaining: timerDuration, // Reset to full duration
      isRunning: false,
      fieldId: selectedFieldId || undefined,
    };
    resetTimer(timerData);
    setTimerRemaining(timerDuration);
    setTimerIsRunning(false);
    setMatchPeriod("auto");
    
    // Broadcast match state change to reset
    if (sendMatchStateChange && selectedMatchId) {
      sendMatchStateChange({
        matchId: selectedMatchId,
        status: MatchStatus.PENDING,
        currentPeriod: "auto",
      });
    }
  };

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
