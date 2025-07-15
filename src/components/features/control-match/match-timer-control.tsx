"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateMatchStatus } from "@/hooks/matches/use-matches";
import { MatchStatus } from "@/types/types";

interface CombinedMatchTimerControlProps {
  selectedMatchId: string;
  setSelectedMatchId: (id: string) => void;
  matchPeriod: string;
  setMatchPeriod: (period: string) => void;  sendMatchStateChange: (params: {
    matchId: string;
    status: MatchStatus;
    currentPeriod: string | null;
  }) => void;
  selectedMatch: any | null;
  timerDuration: number;
  setTimerDuration: (duration: number) => void;
  timerRemaining: number;
  timerIsRunning: boolean;
  formatTime: (ms: number) => string;
  handleStartTimer: () => void;
  handlePauseTimer: () => void;
  handleResetTimer: () => void;
}

const CombinedMatchTimerControl: React.FC<CombinedMatchTimerControlProps> = ({
  selectedMatchId,
  setSelectedMatchId,
  matchPeriod,
  setMatchPeriod,
  sendMatchStateChange,
  selectedMatch,
  timerDuration,
  setTimerDuration,
  timerRemaining,
  timerIsRunning,
  formatTime,
  handleStartTimer,
  handlePauseTimer,
  handleResetTimer,
}) => {
  const prevTimerRunning = useRef(timerIsRunning);
  const updateMatchStatus = useUpdateMatchStatus();
  // Helper to update match status both server and websocket
  const handleMatchStatusChange = useCallback((status: MatchStatus, currentPeriod: string | null) => {
    if (!selectedMatchId) return;
    sendMatchStateChange({
      matchId: selectedMatchId,
      status,
      currentPeriod,
    });
    updateMatchStatus.mutate({ matchId: selectedMatchId, status });
  }, [selectedMatchId, sendMatchStateChange, updateMatchStatus]);

  useEffect(() => {
    if (!prevTimerRunning.current && timerIsRunning) {
      setMatchPeriod("auto");
    }
    prevTimerRunning.current = timerIsRunning;
  }, [timerIsRunning, setMatchPeriod]);  useEffect(() => {
    if (!timerIsRunning) return;
    
    const elapsedTime = timerDuration - timerRemaining;
    
    console.log('[Timer Logic]', {
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
      console.log('[Timer Logic] Transitioning from auto to teleop at', elapsedTime/1000, 'seconds elapsed (', timerRemaining/1000, 'seconds remaining)');
      setMatchPeriod("teleop");
      handleMatchStatusChange(MatchStatus.IN_PROGRESS, "teleop");
    }
    // Transition to endgame in the last 30 seconds (when 0:30 remains)
    else if ((matchPeriod === "auto" || matchPeriod === "teleop") && timerRemaining <= 30000 && timerRemaining > 0) {
      console.log('[Timer Logic] Transitioning to endgame at', timerRemaining/1000, 'seconds remaining');
      setMatchPeriod("endgame");
      handleMatchStatusChange(MatchStatus.IN_PROGRESS, "endgame");
    }
    // Set match status to COMPLETED when timer reaches 0
    else if (timerRemaining <= 0 && matchPeriod !== "completed") {
      console.log('[Timer Logic] Match completed');
      setMatchPeriod("completed");
      handleMatchStatusChange(MatchStatus.COMPLETED, null);
    }
  }, [timerIsRunning, timerRemaining, matchPeriod, selectedMatchId, timerDuration, handleMatchStatusChange]);
  const handleReset = () => {
    handleResetTimer();
    setMatchPeriod("auto");
    sendMatchStateChange({
      matchId: selectedMatchId,
      status: MatchStatus.PENDING,
      currentPeriod: "auto",
    });
    updateMatchStatus.mutate({ matchId: selectedMatchId, status: MatchStatus.PENDING });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Match & Timer Control</CardTitle>
        <CardDescription>Manage match period and timer in one place</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full items-center gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="matchIdControl">Match ID</Label>
            <Input
              id="matchIdControl"
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
              placeholder="Enter match ID"
              readOnly={selectedMatch !== null}
            />
            {selectedMatch && (
              <div className="text-sm text-gray-600">
                Using selected match: {selectedMatch.matchNumber}
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="matchPeriod">Match Period</Label>
            <Select value={matchPeriod} onValueChange={setMatchPeriod}>
              <SelectTrigger id="matchPeriod">
                <SelectValue placeholder="Select match period" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="auto">Autonomous</SelectItem>
                <SelectItem value="teleop">Teleop</SelectItem>
                <SelectItem value="endgame">Endgame</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col items-center my-4">
            <div className={`text-5xl font-mono font-bold ${timerIsRunning ? "text-green-700" : "text-gray-700"}`}>{formatTime(timerRemaining)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {matchPeriod === "auto" && timerIsRunning ? "Autonomous" :
                matchPeriod === "teleop" && timerIsRunning ? "Teleop" :
                matchPeriod === "endgame" ? "Endgame" :
                timerIsRunning ? "Running" : "Paused"}
            </div>
          </div>

          <div>
            <div className="text-sm mb-2">Set Timer Duration:</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setTimerDuration(60000)}>1m</Button>
              <Button size="sm" variant="outline" onClick={() => setTimerDuration(120000)}>2m</Button>
              <Button size="sm" variant="outline" onClick={() => setTimerDuration(150000)}>2m30s</Button>
              <Button size="sm" variant="outline" onClick={() => setTimerDuration(180000)}>3m</Button>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={handleStartTimer} disabled={!selectedMatchId}>Start Timer</Button>
        <Button onClick={handlePauseTimer} disabled={!selectedMatchId}>Pause Timer</Button>
        <Button onClick={handleReset} disabled={!selectedMatchId}>Reset Timer</Button>
        <Button
          onClick={() => handleMatchStatusChange(MatchStatus.IN_PROGRESS, matchPeriod as any)}
          disabled={!selectedMatchId}
        >
          Update Match State
        </Button>
        <Button
          onClick={() => handleMatchStatusChange(MatchStatus.COMPLETED, null)}
          disabled={!selectedMatchId}
          variant="destructive"
        >
          Complete Match
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CombinedMatchTimerControl;
