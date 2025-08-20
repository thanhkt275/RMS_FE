import { Team } from './team.types';

export interface Match {
  id: string;
  matchNumber: string | number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledTime: string;
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
  round?: number;
  bracket?: string;
  stage?: {
    id: string;
    name: string;
    tournamentId: string;
    type: 'SWISS' | 'PLAYOFF' | 'FINAL';
  };
  fieldId?: string;
}