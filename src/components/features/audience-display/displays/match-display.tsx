import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTimeMsPad } from '@/lib/utils';

// Types should ideally be in a central file
interface Team {
  id: string;
  name: string;
  teamNumber?: string;
}

interface AudienceMatchState {
  matchId: string | null;
  matchNumber: number | null;
  name: string | null;
  status: string | null;
  currentPeriod: 'auto' | 'teleop' | 'endgame' | null;
  redTeams: Array<Team>;
  blueTeams: Array<Team>;
}

interface TimerData {
  duration: number;
  remaining: number;
  isRunning: boolean;
}

interface ScoreData {
  redTotalScore: number;
  blueTotalScore: number;
}

interface MatchDisplayProps {
  matchState: AudienceMatchState | null;
  timer: TimerData | null;
  score: ScoreData | null;
}

const AllianceCard = ({
  alliance,
  teams,
  score,
}: {
  alliance: 'Red' | 'Blue';
  teams: Team[];
  score: number;
}) => {
  const isRed = alliance === 'Red';
  return (
    <Card
      className={cn(
        'flex-1 text-center border-4',
        isRed ? 'border-red-500 bg-red-950/50' : 'border-blue-500 bg-blue-950/50'
      )}
    >
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle
          className={cn(
            'text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold',
            isRed ? 'text-red-400' : 'text-blue-400'
          )}
        >
          {alliance.toUpperCase()} ALLIANCE
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-6 lg:space-y-8">
        <div className="text-2xl sm:text-3xl lg:text-4xl xl:text-6xl font-semibold text-white space-y-2 sm:space-y-3 lg:space-y-4 min-h-[8rem] sm:min-h-[12rem] lg:min-h-[16rem]">
          {teams && teams.length > 0 ? (
            teams.map((team, index) => {
              // Handle different team data formats
              const displayName = (() => {
                if (team.teamNumber && team.name) {
                  // If both teamNumber and name exist, show "number - name"
                  return `${team.teamNumber} - ${team.name}`;
                } else if (team.teamNumber) {
                  // If only teamNumber exists, show just the number
                  return team.teamNumber;
                } else if (team.name) {
                  // If only name exists, check if it looks like a team number or actual name
                  const nameStr = String(team.name);
                  
                  // If name looks like a team identifier (starts with letters followed by numbers)
                  // or is all numbers, treat it as a team number
                  if (/^[A-Z]+\d+$/.test(nameStr) || /^\d+$/.test(nameStr)) {
                    return nameStr; // Show as-is for team identifiers like "NIH00003"
                  } else {
                    return nameStr; // Show actual team names
                  }
                } else {
                  return `Team ${index + 1}`; // Fallback
                }
              })();

              return (
                <div key={`${team.id || index}-${index}`} className="break-words px-1 sm:px-2">
                  {displayName}
                </div>
              );
            })
          ) : (
            <>
              <div className="break-words px-1 sm:px-2">Team A</div>
              <div className="break-words px-1 sm:px-2">Team B</div>
            </>
          )}
        </div>
        <div
          className={cn(
            'text-4xl sm:text-6xl lg:text-7xl xl:text-9xl font-bold tracking-tighter',
            isRed ? 'text-red-500' : 'text-blue-500'
          )}
        >
          {score}
        </div>
      </CardContent>
    </Card>
  );
};

const TimerDisplay = ({
  timer,
  status,
  period,
}: {
  timer: TimerData | null;
  status: string | null;
  period: string | null;
}) => {
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'text-green-400';
      case 'COMPLETED':
        return 'text-yellow-400';
      case 'PENDING':
      default:
        return 'text-gray-400';
    }
  };

  const getPeriodColor = (period: string | null) => {
    switch (period) {
      case 'auto':
        return 'bg-purple-500';
      case 'teleop':
        return 'bg-green-500';
      case 'endgame':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-700';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-white w-full lg:w-1/3">
      <div className="text-4xl sm:text-6xl lg:text-7xl xl:text-9xl font-mono font-bold tracking-tighter">
        {timer ? formatTimeMsPad(timer.remaining) : '00:00'}
      </div>
      <div className={`text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold ${getStatusColor(status)} mt-2`}>
        {status?.replace('_', ' ') || 'PENDING'}
      </div>
      {status === 'IN_PROGRESS' && period && (
        <div
          className={cn(
            'mt-2 sm:mt-4 px-3 sm:px-4 lg:px-6 py-1 sm:py-2 rounded-full text-lg sm:text-2xl lg:text-3xl font-bold text-white',
            getPeriodColor(period)
          )}
        >
          {period.toUpperCase()}
        </div>
      )}
    </div>
  );
};

export const MatchDisplay: React.FC<MatchDisplayProps> = ({
  matchState,
  timer,
  score,
}) => {
  return (
    <div className="bg-black text-white h-full w-full flex flex-col p-2 sm:p-4 lg:p-6 xl:p-8 space-y-3 sm:space-y-6 lg:space-y-8">
      <header className="text-center">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-6xl font-bold">
          {matchState?.name || `Match ${matchState?.matchNumber || 'TBD'}`}
        </h1>
      </header>
      <main className="flex flex-col lg:flex-row flex-1 space-y-4 lg:space-y-0 lg:space-x-4 xl:space-x-8">
        <AllianceCard
          alliance="Blue"
          teams={matchState?.blueTeams || []}
          score={score?.blueTotalScore || 0}
        />
        <TimerDisplay
          timer={timer}
          status={matchState?.status || null}
          period={matchState?.currentPeriod || null}
        />
        <AllianceCard
          alliance="Red"
          teams={matchState?.redTeams || []}
          score={score?.redTotalScore || 0}
        />
      </main>
    </div>
  );
};