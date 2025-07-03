import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { QueryKeys } from "@/lib/query-keys";

export interface TournamentTeamStats {
  id: string;
  teamId: string;
  teamNumber: string;
  teamName: string;
  organization?: string;
  tournamentId: string;
  tournamentName: string;
  stageId?: string;
  stageName?: string;
  wins: number;
  losses: number;
  ties: number;
  pointsScored: number;
  pointsConceded: number;
  matchesPlayed: number;
  rankingPoints: number;
  opponentWinPercentage: number;
  pointDifferential: number;
  rank?: number;
  tiebreaker1: number;
  tiebreaker2: number;
  winPercentage: number;
  avgPointsScored: number;
  avgPointsConceded: number;
  team?: {
    id: string;
    name: string;
    teamNumber: string;
  };
  // Legacy fields for backwards compatibility
  totalScore?: number;
  highestScore?: number;
}

export function useTournamentStats(tournamentId: string | undefined) {
  return useQuery({
    queryKey: QueryKeys.tournamentStats.byTournament(tournamentId ?? ''),
    queryFn: async () => {
      if (!tournamentId) return [];
      return await apiClient.get<TournamentTeamStats[]>(`/team-stats/tournament/${tournamentId}`);
    },
    enabled: !!tournamentId,
  });
}
