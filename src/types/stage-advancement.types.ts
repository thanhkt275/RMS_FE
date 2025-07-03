// Types for stage advancement
export interface Team {
  id: string;
  teamNumber: string;
  name: string;
  currentStageId?: string;
}

export interface TeamRanking {
  teamId: string;
  teamNumber: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsScored: number;
  pointsConceded: number;
  pointDifferential: number;
  rankingPoints: number;
  tiebreaker1: number;
  tiebreaker2: number;
  rank?: number;
}

export interface StageReadiness {
  ready: boolean;
  reason?: string;
  incompleteMatches?: number;
  totalTeams?: number;
}

export interface AdvancementPreview {
  teamsToAdvance: TeamRanking[];
  remainingTeams: TeamRanking[];
  totalTeams: number;
}

export interface AdvancementOptions {
  teamsToAdvance: number;
  nextStageId?: string;
  createNextStage?: boolean;
  nextStageConfig?: NextStageConfig;
}

export interface NextStageConfig {
  name: string;
  type: 'SWISS' | 'PLAYOFF' | 'FINAL';
  startDate: Date;
  endDate: Date;
  teamsPerAlliance?: number;
}

export interface AdvancementResult {
  advancedTeams: Team[];
  completedStage: {
    id: string;
    name: string;
    status: string;
  };
  nextStage?: {
    id: string;
    name: string;
    type: string;
  };
  totalTeamsAdvanced: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}
