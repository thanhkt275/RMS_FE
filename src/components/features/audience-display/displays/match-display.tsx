import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
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
  fieldName?: string | null;
}

interface TimerData {
  duration: number;
  remaining: number;
  isRunning: boolean;
}

interface ScoreData {
  redTotalScore: number;
  blueTotalScore: number;
  redBreakdown?: {
    flagsPoints?: number;
    flagHitsPoints?: number;
    fieldControlPoints?: number;
    totalPoints?: number;
  };
  blueBreakdown?: {
    flagsPoints?: number;
    flagHitsPoints?: number;
    fieldControlPoints?: number;
    totalPoints?: number;
  };
}

interface ScoreBreakdown {
  flagsPoints?: number;
  flagHitsPoints?: number;
  fieldControlPoints?: number;
  totalPoints?: number;
}

interface MatchDisplayProps {
  matchState: AudienceMatchState | null;
  timer: TimerData | null;
  score: ScoreData | null;
  showWinnerBadge?: boolean;
}

const TeamCard = ({
  alliance,
  teams,
  score,
  isWinner,
  side,
}: {
  alliance: 'Red' | 'Blue';
  teams: Team[];
  score: number;
  isWinner?: boolean;
  side: 'left' | 'right';
}) => {
  const isRed = alliance === 'Red';
  const team = teams && teams.length > 0 ? teams[0] : null;
  
  const displayName = (() => {
    if (!team) return 'TEAM';
    if (team.teamNumber && team.name) {
      return team.name;
    } else if (team.teamNumber) {
      return team.teamNumber;
    } else if (team.name) {
      const nameStr = String(team.name);
      if (/^[A-Z]+\d+$/.test(nameStr) || /^\d+$/.test(nameStr)) {
        return nameStr;
      } else {
        return nameStr;
      }
    } else {
      return 'TEAM';
    }
  })();

  const teamNumber = team?.teamNumber || '#000';

  return (
    <div className="relative">
      {/* Team card */}
      <div
        className={cn(
          'relative w-[389px] h-[452px] rounded-lg border-4 flex flex-col items-center justify-start pt-10',
          isRed 
            ? 'bg-[#3E1A1A] border-[#FF3A3A]' 
            : 'bg-[#1A1A3E] border-[#3A3AFF]'
        )}
      >
        {/* Team Number */}
        <div className={cn(
          'text-5xl font-bold text-white text-center',
          'mb-2'
        )}>
          {teamNumber}
        </div>
        
        {/* Team Name */}
        <div className="text-[42px] font-normal text-white text-center mb-4">
          {displayName}
        </div>
        
        {/* Score */}
        <div className={cn(
          'text-[140px] font-bold leading-tight',
          isRed ? 'text-[#FF3A3A]' : 'text-[#3A3AFF]'
        )}>
          {score}
        </div>
      </div>
    </div>
  );
};

const ScoreBreakdownTable = ({
  redScore,
  blueScore,
  redBreakdown,
  blueBreakdown,
}: {
  redScore: number;
  blueScore: number;
  redBreakdown?: ScoreBreakdown;
  blueBreakdown?: ScoreBreakdown;
}) => {
  // Scoring categories based on the actual score breakdown structure
  const categories = [
    { key: 'flagsPoints', label: 'Điểm bảo vệ cờ' },
    { key: 'flagHitsPoints', label: 'Điểm bắn phá cờ' },
    { key: 'fieldControlPoints', label: 'Đạn trên sân đối phương' },
    { key: 'total', label: 'Tổng điểm' },
  ] as const;

  const getScore = (
    breakdown: ScoreBreakdown | undefined, 
    key: typeof categories[number]['key'], 
    total: number
  ) => {
    if (key === 'total') return total;
    if (!breakdown) return 0;
    return breakdown[key] || 0;
  };

  return (
    <div className="w-[694px] h-[320px] bg-white rounded-lg flex flex-col">
      {categories.map((category, index) => (
        <div 
          key={category.key}
          className={cn(
            "flex items-center justify-between px-8 flex-1",
            index < categories.length - 1 && "border-b border-gray-200"
          )}
        >
          {/* Blue Score */}
          <div className="text-[#3A3AFF] text-4xl font-bold w-20 text-center">
            {getScore(blueBreakdown, category.key, blueScore)}
          </div>
          
          {/* Category Label */}
          <div className="text-black text-4xl font-bold flex-1 text-center">
            {category.label}
          </div>
          
          {/* Red Score */}
          <div className="text-[#FF3A3A] text-4xl font-bold w-20 text-center">
            {getScore(redBreakdown, category.key, redScore)}
          </div>
        </div>
      ))}
    </div>
  );
};

const TimerDisplay = ({
  timer,
  status,
}: {
  timer: TimerData | null;
  status: string | null;
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-[#FFFFFF] w-full">
      <div className="text-[160px] font-bold leading-tight tracking-tight">
        {timer ? formatTimeMsPad(timer.remaining) : '00:00'}
      </div>
    </div>
  );
};

export const MatchDisplay: React.FC<MatchDisplayProps> = ({
  matchState,
  timer,
  score,
  showWinnerBadge = false,
}) => {
  const redScore = score?.redTotalScore || 0;
  const blueScore = score?.blueTotalScore || 0;
  const shouldShowWinnerBadge = Boolean(showWinnerBadge);
  const isBlueWinner = shouldShowWinnerBadge && blueScore > redScore;
  const isRedWinner = shouldShowWinnerBadge && redScore > blueScore;

  return (
    <div className="bg-[url('/AYOR2026_bg.avif')] bg-cover bg-no-repeat text-white w-full h-full flex flex-col relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
      {/* Top White Bar */}
      <div className="absolute top-0 left-0 right-0 h-[120px] bg-white z-30 flex items-center justify-center">
        <h1 className="text-black text-5xl font-bold">
          {`Trận đấu số ${matchState?.matchNumber || 'TBD'}`}
          {matchState?.fieldName && ` - Sân ${matchState.fieldName.replace('Field ', '')}`}
        </h1>
      </div>

      {/* Winner Badge - Blue (Left) */}
      {isBlueWinner && (
        <div className="absolute top-[60px] left-0 z-40 flex items-start">
          <div className="flex items-center">
            {/* Rectangle part */}
            <div className="bg-[#FFDE5C] h-[170px] w-[370px] flex items-center justify-center">
              <span className="text-black text-6xl font-bold">WINNER</span>
            </div>
            {/* Arrow triangle pointing right */}
            {/* <div 
              className="w-0 h-0"
              style={{
                borderTop: '85px solid transparent',
                borderBottom: '85px solid transparent',
                borderLeft: '146px solid #FFDE5C',
              }}
            /> */}
          </div>
        </div>
      )}

      {/* Winner Badge - Red (Right) */}
      {isRedWinner && (
        <div className="absolute top-[60px] right-0 z-40 flex items-start">
          <div className="flex items-center">
            {/* Arrow triangle pointing left */}
            <div 
              className="w-0 h-0"
              style={{
                borderTop: '85px solid transparent',
                borderBottom: '85px solid transparent',
                borderRight: '146px solid #FFDE5C',
              }}
            />
            {/* Rectangle part */}
            <div className="bg-[#FFDE5C] h-[170px] w-[300px] flex items-center justify-center">
              <span className="text-black text-6xl font-bold">WINNER</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Main content area - Black section */}
      <div className="relative z-10 flex-1 flex flex-col pt-[120px]">
        {/* Timer */}
        <div className="flex justify-center mb-8 mt-6">
          <TimerDisplay
            timer={timer}
            status={matchState?.status || null}
          />
        </div>

        {/* Main scoring area */}
        <div className="flex items-center justify-center gap-12 px-8 mb-auto">
          {/* Blue Team */}
          <TeamCard
            alliance="Blue"
            teams={matchState?.blueTeams || []}
            score={blueScore}
            isWinner={isBlueWinner}
            side="left"
          />

          {/* Score Breakdown Table */}
          <div className="flex items-center">
            <ScoreBreakdownTable
              blueScore={blueScore}
              redScore={redScore}
              blueBreakdown={score?.blueBreakdown}
              redBreakdown={score?.redBreakdown}
            />
          </div>

          {/* Red Team */}
          <TeamCard
            alliance="Red"
            teams={matchState?.redTeams || []}
            score={redScore}
            isWinner={isRedWinner}
            side="right"
          />
        </div>
      </div>

      {/* Bottom White Bar - Footer */}
      <footer className="bg-white h-[10%] w-full flex items-center px-8 relative z-20">
        {/* Logos */}
        <div className="flex items-center gap-4 h-full py-2 w-[400px]">
          <div className="relative h-full aspect-square w-full">
        <Image
          src="/btc_trans.png"
          alt="Logo STEAM For Vietnam, Đại học Bách khoa Hà Nội, UNICEF, Đại sứ quán Hoa Kỳ"
          fill
          className="object-contain"
          sizes="400px"
        />
          </div>
        </div>

        {/* Event info */}
        <div className="flex-1 text-center">
          <p className="text-black text-3xl font-bold">
        STEMESE Festival - 19/10 - Đại học Bách Khoa Hà Nội
          </p>
        </div>

        {/* LIVE indicator */}
        <div className="flex items-center justify-end gap-2 w-[320px]">
          <div className="w-[18px] h-[18px] bg-[#00FF2F] rounded-full animate-pulse" />
          <span className="text-[#00FF2F] text-[32px] font-bold">LIVE</span>
        </div>
      </footer>
    </div>
  );
};
