export interface GameElement {
  element: string;
  count: number;
  pointsEach: number;
  totalPoints: number;
  operation: string;
}

export interface AllianceScores {
  autoScore: number;
  driveScore: number;
  totalScore: number;
  gameElements: GameElement[];
  teamCount: number;
  multiplier: number;
  penalty: number;
}

export interface MatchScoreData {
  redAlliance: AllianceScores;
  blueAlliance: AllianceScores;
  scoreDetails: any;
  isAddingRedElement: boolean;
  isAddingBlueElement: boolean;
}

export interface ScoringConfig {
  tournamentId: string;
  selectedMatchId: string;
  selectedFieldId: string | null;
}

export interface RealtimeScoreUpdate {
  matchId: string;
  fieldId?: string;
  tournamentId: string;
  redAutoScore: number;
  redDriveScore: number;
  redTotalScore: number;
  blueAutoScore: number;
  blueDriveScore: number;
  blueTotalScore: number;
  redGameElements?: any;
  blueGameElements?: any;
  redTeamCount?: number;
  blueTeamCount?: number;
  redMultiplier?: number;
  blueMultiplier?: number;
  redPenalty?: number;
  bluePenalty?: number;
  scoreDetails?: any;
}

export interface GameElementDto {
  element: string;
  count: number;
  pointsEach: number;
  totalPoints: number;
  operation: 'multiply' | 'add';
}

export interface PersistScoreData {
  matchId: string;
  redAutoScore: number;
  redDriveScore: number;
  redTotalScore: number;
  blueAutoScore: number;
  blueDriveScore: number;
  blueTotalScore: number;
  redGameElements: GameElementDto[];
  blueGameElements: GameElementDto[];
  redTeamCount: number;
  blueTeamCount: number;
  redMultiplier: number;
  blueMultiplier: number;
  redPenalty: number;
  bluePenalty: number;
  scoreDetails: any;
  fieldId?: string;
  tournamentId: string;
}

export interface ApiScoreData {
  matchId: string;
  redAutoScore: number;
  redDriveScore: number;
  redTotalScore: number;
  blueAutoScore: number;
  blueDriveScore: number;
  blueTotalScore: number;
  redGameElements: Record<string, number>;
  blueGameElements: Record<string, number>;
  redTeamCount: number;
  blueTeamCount: number;
  redMultiplier: number;
  blueMultiplier: number;
  redPenalty: number;
  bluePenalty: number;
  scoreDetails: any;
}

export type Alliance = 'red' | 'blue';
export type ScoreType = 'auto' | 'drive' | 'total' | 'penalty';

export interface UserActivity {
  isActive: boolean;
  timeout: NodeJS.Timeout | null;
}
