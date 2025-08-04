import React from "react";
import { formatTimeMs } from "../../../../lib/utils";
import { useAudienceScores } from "../../../../hooks/audience-display/use-audience-scores";

interface Team {
  name: string;
}

interface MatchState {
  matchId: string | null;
  matchNumber: string | null;
  name: string | null;
  status: string | null;
  currentPeriod: string | null;
  redTeams: Team[];
  blueTeams: Team[];
}

interface TimerState {
  isRunning: boolean;
  remaining: number;
  initial?: number;
  phase?: string;
}

interface EnhancedMatchDisplayProps {
  matchState: MatchState;
  timer: TimerState;
  tournamentId: string;
  fieldId?: string;
}

interface ScoreDisplayProps {
  score: number;
  isAnimating: boolean;
  difference: number;
  className?: string;
}

const AnimatedScore: React.FC<ScoreDisplayProps> = ({ 
  score, 
  isAnimating, 
  difference, 
  className = "" 
}) => (
  <div className={`relative ${className}`}>
    <div 
      className={`text-9xl font-extrabold transition-all duration-500 ${
        isAnimating 
          ? 'scale-110 drop-shadow-lg' 
          : 'scale-100'
      }`}
    >
      {score}
    </div>
    {isAnimating && difference !== 0 && (
      <div 
        className={`absolute -top-4 -right-4 text-2xl font-bold px-2 py-1 rounded-full animate-bounce ${
          difference > 0 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}
      >
        {difference > 0 ? '+' : ''}{difference}
      </div>
    )}
  </div>
);

interface ConnectionStatusProps {
  isConnected: boolean;
  source: 'websocket' | 'database' | 'none';
  lastUpdateTime: number;
  error?: string | null;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  isConnected, 
  source, 
  lastUpdateTime, 
  error 
}) => (
  <div className="flex items-center space-x-2 text-sm">
    <div className={`w-3 h-3 rounded-full ${
      isConnected 
        ? 'bg-green-500 animate-pulse' 
        : 'bg-red-500'
    }`} />
    <span className={`font-medium ${
      isConnected ? 'text-green-700' : 'text-red-700'
    }`}>
      {isConnected ? 'Live' : 'Offline'}
    </span>
    <span className="text-gray-500">
      ({source === 'websocket' ? 'Real-time' : source === 'database' ? 'Database' : 'No data'})
    </span>
    {lastUpdateTime > 0 && (
      <span className="text-xs text-gray-400">
        Updated: {new Date(lastUpdateTime).toLocaleTimeString()}
      </span>
    )}
    {error && (
      <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
        {error}
      </span>
    )}
  </div>
);

export const EnhancedMatchDisplay: React.FC<EnhancedMatchDisplayProps> = ({ 
  matchState, 
  timer, 
  tournamentId, 
  fieldId 
}) => {
  const {
    scores,
    scoreAnimations,
    scoreDifferences,
    isConnected,
    lastUpdateTime,
    source,
    error,
  } = useAudienceScores(matchState.matchId || '', {
    tournamentId,
    fieldId,
    enableValidation: true,
    enableAnimations: true,
  });

  return (
    <>
      {/* Match Info */}
      <div className="mb-6 text-center">
        <div className="bg-white border border-gray-200 shadow-lg py-6 px-8 rounded-xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex-1 text-left">
              <h2 className="text-4xl font-bold text-gray-900 uppercase tracking-wide">
                {matchState?.matchNumber || matchState?.name || matchState?.matchId
                  ? `Match ${matchState.matchNumber || matchState.name || "Unknown"}`
                  : "Match Information"}
              </h2>
              <p className="text-sm font-medium text-gray-600 mt-2">
                {matchState?.matchId
                  ? `ID: ${matchState.matchId}`
                  : matchState?.redTeams?.length > 0 || matchState?.blueTeams?.length > 0
                  ? "Teams ready for match"
                  : "Waiting for match selection..."}
              </p>
            </div>
            <div className="flex-1 text-right">
              <div className="inline-block bg-blue-500 text-white text-xl px-4 py-2 rounded-lg font-bold uppercase shadow-md">
                {matchState?.currentPeriod ? (
                  <span className="flex items-center">
                    <span
                      className={`inline-block w-3 h-3 mr-2 rounded-full ${
                        matchState.currentPeriod === "auto"
                          ? "bg-yellow-300"
                          : matchState.currentPeriod === "teleop"
                          ? "bg-green-300"
                          : matchState.currentPeriod === "endgame"
                          ? "bg-red-300"
                          : "bg-gray-300"
                      }`}
                    ></span>
                    {matchState.currentPeriod.toUpperCase()}
                  </span>
                ) : (
                  "SETUP"
                )}
              </div>
              <div className="mt-2 text-lg font-semibold text-blue-800 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                Status: {matchState?.status ? matchState.status.replace(/_/g, " ").toUpperCase() : "PENDING"}
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
              <h3 className="text-lg font-bold text-red-800 mb-2">RED ALLIANCE</h3>
              <p className="text-md text-red-700">
                {Array.isArray(matchState?.redTeams) && matchState.redTeams.length > 0
                  ? matchState.redTeams.filter((t) => t && t.name).map((t) => t.name).join(", ")
                  : "Teams TBD"}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
              <h3 className="text-lg font-bold text-blue-800 mb-2">BLUE ALLIANCE</h3>
              <p className="text-md text-blue-700">
                {Array.isArray(matchState?.blueTeams) && matchState.blueTeams.length > 0
                  ? matchState.blueTeams.filter((t) => t && t.name).map((t) => t.name).join(", ")
                  : "Teams TBD"}
              </p>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <ConnectionStatus 
              isConnected={isConnected}
              source={source}
              lastUpdateTime={lastUpdateTime}
              error={error}
            />
          </div>
        </div>
      </div>

      {/* Timer Clock */}
      <div className="flex flex-col items-center mb-8 bg-white border border-gray-200 text-gray-900 p-6 rounded-xl shadow-lg">
        <div className="w-full flex justify-between items-center mb-4">
          <h2 className="text-xl uppercase font-bold text-gray-900">Match Timer</h2>
          {timer && (
            <div className="flex items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
              <span
                className={`inline-block w-4 h-4 rounded-full mr-2 ${
                  timer.isRunning
                    ? "bg-green-500 animate-pulse"
                    : timer?.remaining === 0
                    ? "bg-red-500"
                    : "bg-yellow-500"
                }`}
              ></span>
              <span className="font-mono text-sm font-semibold">
                {timer.isRunning
                  ? "RUNNING"
                  : timer?.remaining === 0
                  ? "COMPLETED"
                  : "PAUSED"}
              </span>
            </div>
          )}
        </div>
        <div className="bg-gray-900 w-full p-6 rounded-xl mb-4 border border-gray-300">
          <div
            className={`text-8xl font-extrabold font-mono tracking-wider text-center ${
              timer?.isRunning
                ? "text-green-400 animate-pulse"
                : timer?.remaining === 0
                ? "text-red-400"
                : "text-yellow-300"
            }`}
          >
            {formatTimeMs(timer?.remaining ?? 0)}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 w-full text-center">
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
            <div className="text-xs text-gray-600 font-semibold uppercase">PERIOD</div>
            <div className="text-lg font-bold text-gray-900">
              {matchState?.currentPeriod
                ? matchState.currentPeriod.toUpperCase()
                : timer?.phase
                ? timer.phase.toUpperCase()
                : "—"}
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
            <div className="text-xs text-gray-600 font-semibold uppercase">STATUS</div>
            <div className="text-lg font-bold text-gray-900">
              {matchState?.status
                ? matchState.status.replace(/_/g, " ").toUpperCase()
                : "STANDBY"}
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
            <div className="text-xs text-gray-600 font-semibold uppercase">ELAPSED</div>
            <div className="text-lg font-bold text-gray-900">
              {formatTimeMs((timer?.initial || 0) - (timer?.remaining || 0))}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Scoreboard with Animations */}
      <div className="relative mb-8">
        <div className="scoreboard-container border border-gray-200 rounded-xl overflow-hidden shadow-lg bg-white">
          <div className="grid grid-cols-2 gap-0">
            {/* Header */}
            <div className="col-span-2 bg-gray-50 border-b border-gray-200 p-4 text-center">
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-wider uppercase">
                Match Scoreboard
              </h2>
              {scores.isRealtime && (
                <div className="mt-2 inline-flex items-center text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Live Scores
                </div>
              )}
            </div>
            
            {/* Alliance Headers */}
            <div className="bg-red-500 text-white text-center p-4 border-r border-gray-200">
              <h3 className="text-4xl font-extrabold tracking-wider">RED</h3>
            </div>
            <div className="bg-blue-500 text-white text-center p-4">
              <h3 className="text-4xl font-extrabold tracking-wider">BLUE</h3>
            </div>
            
            {/* Main Score Display with Animations */}
            <div className="bg-red-50 border-b border-r border-gray-200 text-red-900 p-8 flex justify-center items-center">
              <AnimatedScore
                score={scores.redTotalScore}
                isAnimating={scoreAnimations.redScore}
                difference={scoreDifferences.redTotal}
                className="text-red-900"
              />
            </div>
            <div className="bg-blue-50 border-b border-gray-200 text-blue-900 p-8 flex justify-center items-center">
              <AnimatedScore
                score={scores.blueTotalScore}
                isAnimating={scoreAnimations.blueScore}
                difference={scoreDifferences.blueTotal}
                className="text-blue-900"
              />
            </div>

            {/* Score Breakdown with Animations */}
            <div className="bg-red-50 border-r border-gray-200 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-left">
                  <p className="text-lg font-bold text-red-800">Auto:</p>
                  <p className="text-lg font-bold text-red-800">TeleOp:</p>
                  <p className="text-lg font-bold text-red-800">Penalties:</p>
                  <p className="text-sm text-red-600 mt-1">(from Blue)</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold text-red-900 transition-all duration-300 ${
                    scoreAnimations.redAuto ? 'scale-110 text-green-600' : ''
                  }`}>
                    {scores.redAutoScore}
                    {scoreAnimations.redAuto && scoreDifferences.redAuto !== 0 && (
                      <span className="ml-2 text-sm text-green-600">
                        (+{scoreDifferences.redAuto})
                      </span>
                    )}
                  </p>
                  <p className={`text-lg font-bold text-red-900 transition-all duration-300 ${
                    scoreAnimations.redDrive ? 'scale-110 text-green-600' : ''
                  }`}>
                    {scores.redDriveScore}
                    {scoreAnimations.redDrive && scoreDifferences.redDrive !== 0 && (
                      <span className="ml-2 text-sm text-green-600">
                        (+{scoreDifferences.redDrive})
                      </span>
                    )}
                  </p>
                  <p className="text-lg font-bold text-red-900">+{scores.bluePenalty}</p>
                  <p className="text-sm text-red-600 mt-1">&nbsp;</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-left">
                  <p className="text-lg font-bold text-blue-800">Auto:</p>
                  <p className="text-lg font-bold text-blue-800">TeleOp:</p>
                  <p className="text-lg font-bold text-blue-800">Penalties:</p>
                  <p className="text-sm text-blue-600 mt-1">(from Red)</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold text-blue-900 transition-all duration-300 ${
                    scoreAnimations.blueAuto ? 'scale-110 text-green-600' : ''
                  }`}>
                    {scores.blueAutoScore}
                    {scoreAnimations.blueAuto && scoreDifferences.blueAuto !== 0 && (
                      <span className="ml-2 text-sm text-green-600">
                        (+{scoreDifferences.blueAuto})
                      </span>
                    )}
                  </p>
                  <p className={`text-lg font-bold text-blue-900 transition-all duration-300 ${
                    scoreAnimations.blueDrive ? 'scale-110 text-green-600' : ''
                  }`}>
                    {scores.blueDriveScore}
                    {scoreAnimations.blueDrive && scoreDifferences.blueDrive !== 0 && (
                      <span className="ml-2 text-sm text-green-600">
                        (+{scoreDifferences.blueDrive})
                      </span>
                    )}
                  </p>
                  <p className="text-lg font-bold text-blue-900">+{scores.redPenalty}</p>
                  <p className="text-sm text-blue-600 mt-1">&nbsp;</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};