import { Team } from './team.types';

export interface Match {
  id: string;
  matchNumber: string | number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledTime: string;
  startTime?: string | null;
  endTime?: string | null;
  winningAlliance?: 'RED' | 'BLUE' | 'TIE' | null;
  redScore?: number;
  blueScore?: number;
  alliances?: Array<{
    color: 'RED' | 'BLUE';
    teamAlliances: Array<{
      teamId: string;
      team?: {
        id: string;
        name: string;
        teamNumber?: string;
      };
    }>;
  }>;
  roundNumber?: number | null;
  bracketSlot?: number | null;
  recordBucket?: string | null;
  feedsIntoMatchId?: string | null;
  loserFeedsIntoMatchId?: string | null;
  feedsIntoMatch?: BracketLink | null;
  loserFeedsIntoMatch?: BracketLink | null;
  stage?: {
    id: string;
    name: string;
    tournamentId: string;
    type: 'SWISS' | 'PLAYOFF' | 'FINAL';
  };
  fieldId?: string;
}

export interface BracketLink {
  id: string;
  matchNumber: number | string;
  roundNumber: number | null;
  bracketSlot: number | null;
}

export interface BracketAllianceTeam {
  id: string;
  teamId: string;
  teamNumber: string | null;
  teamName: string | null;
  stationPosition: number;
  isSurrogate: boolean;
}

export interface BracketAlliance {
  id: string;
  color: 'RED' | 'BLUE';
  score: number;
  autoScore: number;
  driveScore: number;
  teamAlliances: BracketAllianceTeam[];
}

export interface BracketMatch extends Match {
  stageId: string;
  alliances?: BracketAlliance[];
}

export type BracketStructure =
  | {
      type: 'elimination';
      rounds: Array<{
        roundNumber: number;
        label: string;
        matches: string[];
      }>;
    }
  | {
      type: 'swiss';
      buckets: Array<{
        record: string;
        matches: string[];
      }>;
      rounds: Array<{
        roundNumber: number;
        matches: string[];
      }>;
    }
  | {
      type: 'standard';
      rounds: Array<{
        roundNumber: number;
        matches: string[];
      }>;
    };

export interface StageBracketResponse {
  stageId: string;
  stageName: string;
  tournamentId: string;
  stageType: string;
  teamsPerAlliance: number;
  generatedAt: string;
  matches: BracketMatch[];
  structure: BracketStructure;
}

export interface BracketUpdateEvent {
  type: 'bracket_update';
  stageId: string;
  tournamentId: string;
  timestamp: number;
  bracket: StageBracketResponse;
}
