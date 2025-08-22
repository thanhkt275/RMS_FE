import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { QueryKeys } from "@/lib/query-keys";
import { Team } from "@/types/team.types";
import type { Tournament } from "@/types/types";

/**
 * Hook for fetching teams publicly without authentication
 * Returns only basic team information suitable for public viewing
 */
export function usePublicTeams(tournamentId: string | undefined) {
  return useQuery({
    queryKey: [...QueryKeys.teams.byTournament(tournamentId ?? ""), 'public'],
    queryFn: async () => {
      if (!tournamentId) return [];
      
      try {
        // Use the existing public teams endpoint (no auth required)
        const result = await apiClient.get<Team[]>(`teams?tournamentId=${tournamentId}`);
        console.log('🏒 Public teams fetched for tournament:', tournamentId, result);
        return Array.isArray(result) ? result : [];
      } catch (error: any) {
        console.warn('Failed to fetch teams publicly:', error);
        return [];
      }
    },
    enabled: !!tournamentId,
    // Cache for 5 minutes since this is public data
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching tournaments publicly without authentication
 * Returns only basic tournament information suitable for public viewing
 */
export function usePublicTournaments() {
  return useQuery({
    queryKey: [...QueryKeys.tournaments.all(), 'public'],
    queryFn: async () => {
      try {
        // Use the existing public tournaments endpoint (no auth required)
        const result = await apiClient.get<Tournament[]>('tournaments');
        console.log('📊 Public tournaments fetched:', result);
        return Array.isArray(result) ? result : [];
      } catch (error: any) {
        console.warn('Failed to fetch tournaments publicly:', error);
        return [];
      }
    },
    // Cache for 7 days since tournaments don't change frequently
    staleTime: 60 * 60 * 1000,
  });
}
