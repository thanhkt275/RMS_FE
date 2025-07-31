// TimerControl.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useUnifiedWebSocket as useWebSocket } from '@/hooks/websocket/use-unified-websocket';
import { unifiedWebSocketService as websocketService } from '@/lib/unified-websocket';
import { MatchStatus } from '@/types/types';

interface TimerControlProps {
  matchId: string;
  tournamentId: string;
  matchPeriod?: string;
  setMatchPeriod?: (period: string) => void;
  sendMatchStateChange?: (params: {
    matchId: string;
    status: MatchStatus;
    currentPeriod: string | null;
  }) => void;
}

const MATCH_DURATION = 150000; // 2:30 in ms

export default function TimerControl({ 
  matchId, 
  tournamentId, 
  matchPeriod = "auto",
  setMatchPeriod,
  sendMatchStateChange
}: TimerControlProps) {
  const [remaining, setRemaining] = useState<number>(MATCH_DURATION);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentPeriod, setCurrentPeriod] = useState<string>(matchPeriod);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection
  const { startTimer, pauseTimer, resetTimer, subscribe } = useWebSocket({ tournamentId });

  // Format time as MM:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };  // Start timer
  const handleStart = () => {
    if (isRunning) return;
    setIsRunning(true);
    setCurrentPeriod("auto");
    setMatchPeriod?.("auto");
    
    startTimer({
      duration: MATCH_DURATION,
      remaining,
      isRunning: true,
    });
    
    // Broadcast match state change to start in auto period
    if (sendMatchStateChange) {
      sendMatchStateChange({
        matchId,
        status: MatchStatus.IN_PROGRESS,
        currentPeriod: "auto",
      });
    }
  };

  // Stop timer
  const handleStop = () => {
    setIsRunning(false);
    pauseTimer({
      duration: MATCH_DURATION,
      remaining,
      isRunning: false,
    });
  };
  // Reset timer
  const handleReset = () => {
    setIsRunning(false);
    setRemaining(MATCH_DURATION);
    setCurrentPeriod("auto");
    setMatchPeriod?.("auto");
    
    resetTimer({
      duration: MATCH_DURATION,
      remaining: MATCH_DURATION,
      isRunning: false,
    });
    
    // Broadcast match state change to reset period
    if (sendMatchStateChange) {
      sendMatchStateChange({
        matchId,
        status: MatchStatus.PENDING,
        currentPeriod: "auto",
      });
    }
  };
  // Local timer countdown
  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          const newRemaining = prev - 1000;
          // Broadcast the new remaining time to audience-display via timer_update
          websocketService.emit('timer_update', {
            duration: MATCH_DURATION,
            remaining: newRemaining > 0 ? newRemaining : 0,
            isRunning: newRemaining > 0,
            tournamentId,
            matchId,
          });
          if (prev <= 1000) {
            setIsRunning(false);
            return 0;
          }
          return newRemaining;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, remaining, tournamentId, matchId]);

  // Period transition logic - matches the FRC timing from match-timer-control.tsx
  useEffect(() => {
    if (!isRunning) return;
    
    const elapsedTime = MATCH_DURATION - remaining;
    
    console.log('[Timer Control Period Logic]', {
      currentPeriod,
      elapsedTime,
      remaining,
      elapsedSeconds: Math.floor(elapsedTime / 1000),
      remainingSeconds: Math.floor(remaining / 1000),
    });
    
    // For FRC match timing:
    // - Auto: 0-30 seconds elapsed (2:30 to 2:00 remaining for 2:30 match)
    // - Teleop: 30-120 seconds elapsed (2:00 to 0:30 remaining)  
    // - Endgame: 120+ seconds elapsed (last 30 seconds, 0:30 to 0:00 remaining)
    
    // Transition to teleop after 30 seconds (when 2:00 remains for 2:30 match)
    if (currentPeriod === "auto" && elapsedTime >= 30000) {
      console.log('[Timer Control] Transitioning from auto to teleop at', elapsedTime/1000, 'seconds elapsed (', remaining/1000, 'seconds remaining)');
      setCurrentPeriod("teleop");
      setMatchPeriod?.("teleop");
      
      // Broadcast match state change
      if (sendMatchStateChange) {
        sendMatchStateChange({
          matchId,
          status: MatchStatus.IN_PROGRESS,
          currentPeriod: "teleop",
        });
      }
    }
    // Transition to endgame in the last 30 seconds (when 0:30 remains)
    else if ((currentPeriod === "auto" || currentPeriod === "teleop") && remaining <= 30000 && remaining > 0) {
      console.log('[Timer Control] Transitioning to endgame at', remaining/1000, 'seconds remaining');
      setCurrentPeriod("endgame");
      setMatchPeriod?.("endgame");
      
      // Broadcast match state change
      if (sendMatchStateChange) {
        sendMatchStateChange({
          matchId,
          status: MatchStatus.IN_PROGRESS,
          currentPeriod: "endgame",
        });
      }
    }
    // Set match status to COMPLETED when timer reaches 0
    else if (remaining <= 0 && currentPeriod !== "completed") {
      console.log('[Timer Control] Match completed');
      setCurrentPeriod("completed");
      setMatchPeriod?.("completed");
      
      // Broadcast match state change
      if (sendMatchStateChange) {
        sendMatchStateChange({
          matchId,
          status: MatchStatus.COMPLETED,
          currentPeriod: null,
        });
      }
    }
  }, [isRunning, remaining, currentPeriod, matchId, setMatchPeriod, sendMatchStateChange]);
  // Sync with external period changes
  useEffect(() => {
    setCurrentPeriod(matchPeriod);
  }, [matchPeriod]);

  // Listen for timer updates from WebSocket (sync from other clients)
  useEffect(() => {
    const unsubscribe = subscribe('timer_update', (data: any) => {
      if (data.tournamentId === tournamentId && data.matchId === matchId) {
        setRemaining(data.remaining);
        setIsRunning(data.isRunning);
      }
    });
    return () => { unsubscribe(); };
  }, [subscribe, matchId, tournamentId]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-5xl font-mono font-bold mb-2">{formatTime(remaining)}</div>
      <div className="flex gap-2">
        <Button onClick={handleStart} disabled={isRunning}>Start</Button>
        <Button onClick={handleStop} disabled={!isRunning} variant="destructive">Stop</Button>
        <Button onClick={handleReset} variant="outline">Reset</Button>
      </div>
    </div>
  );
}
