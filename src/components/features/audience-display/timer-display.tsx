import React from "react";
import { useAudienceTimer } from "@/hooks/audience-display/use-audience-timer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface TimerDisplayProps {
  tournamentId: string;
  fieldId?: string;
  className?: string;
  showConnectionStatus?: boolean;
}

export function TimerDisplay({
  tournamentId,
  fieldId,
  className = "",
  showConnectionStatus = true,
}: TimerDisplayProps) {
  const {
    timer,
    isConnected,
    connectionStatus,
    showConnectionStatus: showStatus,
    connectionMessage,
    matchPeriod,
    matchStatus,
    formatTime,
  } = useAudienceTimer({ tournamentId, fieldId });

  if (!timer) {
    return (
      <div className={`text-center ${className}`}>
        <div className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-400">--:--</div>
        <div className="text-sm sm:text-base lg:text-lg text-gray-500 mt-2">No Timer Data</div>
      </div>
    );
  }

  const getPeriodColor = (period?: string) => {
    switch (period) {
      case "auto":
        return "bg-blue-500";
      case "teleop":
        return "bg-green-500";
      case "endgame":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPeriodText = (period?: string) => {
    switch (period) {
      case "auto":
        return "AUTONOMOUS";
      case "teleop":
        return "TELEOPERATED";
      case "endgame":
        return "ENDGAME";
      default:
        return "MATCH";
    }
  };

  return (
    <div className={`text-center ${className}`}>
      {/* Connection Status Indicator */}
      {showConnectionStatus && showStatus && (
        <Alert className="mb-2 sm:mb-4 bg-yellow-50 border-yellow-200">
          <AlertDescription className="text-yellow-800 text-xs sm:text-sm">
            {connectionMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Timer Display */}
      <div className="relative">
        <div
          className={`text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold transition-colors duration-300 ${
            timer.isRunning
              ? timer.remaining <= 30000
                ? "text-red-600 animate-pulse"
                : "text-green-600"
              : "text-gray-600"
          }`}
        >
          {formatTime(timer.remaining)}
        </div>

        {/* Period Indicator - Use synchronized match period */}
        {(matchPeriod || timer.period) && (
          <Badge
            className={`mt-1 sm:mt-2 text-white text-sm sm:text-base lg:text-lg px-2 sm:px-3 lg:px-4 py-1 sm:py-2 ${getPeriodColor(
              matchPeriod || timer.period
            )} transition-all duration-500`}
          >
            {getPeriodText(matchPeriod || timer.period)}
          </Badge>
        )}

        {/* Running Status */}
        <div className="mt-1 sm:mt-2 flex items-center justify-center gap-1 sm:gap-2">
          <div
            className={`w-2 sm:w-3 h-2 sm:h-3 rounded-full ${
              timer.isRunning ? "bg-green-500 animate-pulse" : "bg-gray-400"
            }`}
          />
          <span className="text-sm sm:text-base lg:text-lg text-gray-600">
            {timer.isRunning ? "RUNNING" : "STOPPED"}
          </span>
        </div>

        {/* Connection Status Badge */}
        {showConnectionStatus && (
          <div className="absolute top-0 right-0">
            <Badge
              variant={isConnected ? "default" : "destructive"}
              className="text-2xs sm:text-xs"
            >
              {isConnected ? "● LIVE" : "● OFFLINE"}
            </Badge>
          </div>
        )}
      </div>

      {/* Match Period and Status Info */}
      {(matchStatus || matchPeriod !== 'auto') && (
        <div className="mt-2 sm:mt-4 flex justify-center gap-1 sm:gap-2">
          {matchStatus && (
            <Badge variant="outline" className="text-2xs sm:text-xs">
              Status: {matchStatus}
            </Badge>
          )}
          {matchPeriod && matchPeriod !== 'auto' && (
            <Badge variant="outline" className="text-2xs sm:text-xs">
              Period: {matchPeriod.toUpperCase()}
            </Badge>
          )}
        </div>
      )}

      {/* Debug Info (development only) */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-2 sm:mt-4 text-2xs sm:text-xs text-gray-500 bg-gray-50 p-1 sm:p-2 rounded">
          <div>Duration: {formatTime(timer.duration)}</div>
          <div>Remaining: {formatTime(timer.remaining)}</div>
          <div>Elapsed: {formatTime(timer.duration - timer.remaining)}</div>
          <div>Status: {connectionStatus}</div>
          <div>Match Status: {matchStatus || 'N/A'}</div>
          <div>Match Period: {matchPeriod}</div>
          <div>Timer Period: {timer.period || 'N/A'}</div>
          <div>Field: {fieldId || "All"}</div>
          <div>Running: {timer.isRunning ? 'Yes' : 'No'}</div>
          {timer.startedAt && (
            <div>Started: {new Date(timer.startedAt).toLocaleTimeString()}</div>
          )}
        </div>
      )}
    </div>
  );
}
