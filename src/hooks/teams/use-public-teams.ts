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
      console.log('📊 Fetching public tournaments...');
      
      try {
        // Use the existing public tournaments endpoint (no auth required)
        const result = await apiClient.get<Tournament[]>('tournaments');
        console.log('📊 Public tournaments fetched successfully:', result);
        
        // Ensure we return an array
        if (!Array.isArray(result)) {
          console.warn('Public tournaments API returned non-array:', result);
          return [];
        }
        
        return result;
      } catch (error: any) {
        console.error('Failed to fetch tournaments publicly:', {
          error: error.message,
          status: error.status,
          response: error.response
        });
        
        // Re-throw the error so React Query can handle it properly
        throw new Error(error.message || 'Failed to fetch tournaments');
      }
    },
    // Cache for 7 days since tournaments don't change frequently
    staleTime: 60 * 60 * 1000,
    // Retry with exponential backoff
    retry: (failureCount, error: any) => {
      console.log(`📊 Retry attempt ${failureCount} for tournaments:`, error);
      // Don't retry on 4xx errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      // Retry up to 3 times for network/server errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
