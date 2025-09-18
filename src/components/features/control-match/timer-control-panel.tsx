import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RotateCcw } from "lucide-react";

interface TimerControlPanelProps {
  timerDuration: number;
  timerRemaining: number;
  timerIsRunning: boolean;
  matchPeriod: string;
  setTimerDuration: (duration: number) => void;
  setMatchPeriod: (period: string) => void;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResetTimer: () => void;
  formatTime: (ms: number) => string;
  disabled?: boolean;
}

export function TimerControlPanel({
  timerDuration,
  timerRemaining,
  timerIsRunning,
  matchPeriod,
  setTimerDuration,
  setMatchPeriod,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  formatTime,
  disabled = false,
}: TimerControlPanelProps) {
  return (
    <Card className="bg-white border border-gray-200 shadow-lg rounded-xl p-8 min-h-[500px] flex flex-col justify-between text-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">Timer Control</h2>
      {/* Timer Display */}
      <div className="text-center mb-8">
        <div className="text-7xl font-mono font-extrabold text-blue-700 mb-2 drop-shadow-lg">
          {formatTime(timerRemaining)}
        </div>
        <div className="text-base text-gray-700 font-semibold">
          Duration: <span className="font-mono text-gray-900">{formatTime(timerDuration)}</span> |
          Period: <span className="uppercase font-bold text-blue-800">{matchPeriod}</span>
        </div>
      </div>
      {/* Timer Controls */}
      <div className="flex justify-center gap-4 mb-8">
        <Button
          onClick={timerIsRunning ? onPauseTimer : onStartTimer}
          disabled={disabled}
          className={timerIsRunning
            ? "bg-yellow-500 hover:bg-yellow-600 text-white font-bold shadow-md"
            : "bg-green-500 hover:bg-green-600 text-white font-bold shadow-md"}
          size="lg"
        >
          {timerIsRunning ? (
            <>
              <Pause className="w-5 h-5 mr-2" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              Start
            </>
          )}
        </Button>
        <Button
          onClick={onResetTimer}
          disabled={disabled}
          variant="outline"
          className="border-gray-400 text-gray-700 font-bold bg-white hover:bg-gray-100 shadow-sm"
          size="lg"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Reset
        </Button>
      </div>
      {/* Timer Configuration */}
      <div className="space-y-6 mt-auto">
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-800">
            Timer Duration (seconds)
          </label>
          <Input
            type="number"
            value={Math.floor(timerDuration / 1000)}
            onChange={(e) => setTimerDuration(Number(e.target.value) * 1000)}
            disabled={disabled || timerIsRunning}
            min={0}
            max={600}
            className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-lg font-mono focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-800">
            Match Period
          </label>
          <Select
            value={matchPeriod}
            onValueChange={setMatchPeriod}
            disabled={disabled || timerIsRunning}
          >
            <SelectTrigger className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-lg focus:ring-2 focus:ring-blue-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="teleop">Teleop</SelectItem>
              <SelectItem value="endgame">Endgame</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
