export interface Team {
  id: string;
  name: string;
  teamNumber?: string;
}

export interface AudienceMatchState {
  matchId: string | null;
  matchNumber: number | null;
  name: string | null;
  status: string | null;
  currentPeriod: 'auto' | 'teleop' | 'endgame' | null;
  redTeams: Array<Team>;
  blueTeams: Array<Team>;
}

export interface TimerData {
  duration: number;
  remaining: number;
  isRunning: boolean;
}

export interface ScoreData {
  redTotalScore: number;
  blueTotalScore: number;
}
