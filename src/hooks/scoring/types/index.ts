export interface GameElement {
  element: string;
  count: number;
  pointsEach: number;
  totalPoints: number;
  operation: string;
}

export interface AllianceScoreDetails {
  flagsSecured: number;
  successfulFlagHits: number;
  opponentFieldAmmo: number;
}

export interface AllianceScoreBreakdown {
  flagsPoints: number;
  flagHitsPoints: number;
  fieldControlPoints: number;
  totalPoints: number;
}

export interface MatchScoreDetails {
  red: AllianceScoreDetails;
  blue: AllianceScoreDetails;
  breakdown?: {
    red: AllianceScoreBreakdown;
    blue: AllianceScoreBreakdown;
  };
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
  scoreDetails: MatchScoreDetails;
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
  scoreDetails?: MatchScoreDetails;
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
  scoreDetails: MatchScoreDetails;
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
  scoreDetails: MatchScoreDetails;
}

export type Alliance = 'red' | 'blue';
export type ScoreType = 'auto' | 'drive' | 'total' | 'penalty';

export interface UserActivity {
  isActive: boolean;
  timeout: NodeJS.Timeout | null;
}
