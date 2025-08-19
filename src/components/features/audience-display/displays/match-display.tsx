import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTimeMsPad } from '@/lib/utils';

// Types should ideally be in a central file
interface Team {
  name: string;
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
      <CardHeader>
        <CardTitle
          className={cn(
            'text-5xl font-bold',
            isRed ? 'text-red-400' : 'text-blue-400'
          )}
        >
          {alliance.toUpperCase()} ALLIANCE
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="text-6xl font-semibold text-white space-y-4 min-h-[16rem]">
          {teams && teams.length > 0 ? (
            teams.map((team, index) => (
              <div key={`${team.name}-${index}`}>{team.name}</div>
            ))
          ) : (
            <>
              <div>Team A</div>
              <div>Team B</div>
            </>
          )}
        </div>
        <div
          className={cn(
            'text-9xl font-bold tracking-tighter',
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
    <div className="flex flex-col items-center justify-center text-white w-1/3">
      <div className="text-9xl font-mono font-bold tracking-tighter">
        {timer ? formatTimeMsPad(timer.remaining) : '00:00'}
      </div>
      <div className={`text-5xl font-bold ${getStatusColor(status)}`}>
        {status?.replace('_', ' ') || 'PENDING'}
      </div>
      {status === 'IN_PROGRESS' && period && (
        <div
          className={cn(
            'mt-4 px-6 py-2 rounded-full text-3xl font-bold text-white',
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
    <div className="bg-black text-white h-full w-full flex flex-col p-8 space-y-8">
      <header className="text-center">
        <h1 className="text-6xl font-bold">
          {matchState?.name || `Match ${matchState?.matchNumber || 'TBD'}`}
        </h1>
      </header>
      <main className="flex flex-1 space-x-8">
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