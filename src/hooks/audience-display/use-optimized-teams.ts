import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import { QueryKeys } from "@/lib/query-keys";
import type { Team } from "@/types/team.types";

interface UseOptimizedTeamsOptions {
  tournamentId: string | undefined;
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
}

interface UseOptimizedTeamsReturn {
  teams: Team[];
  isLoading: boolean;
  error: string | null;
  isRefetching: boolean;
  refetch: () => void;
  teamCount: number;
  hasTeams: boolean;
}

/**
 * Optimized teams data fetching hook for audience display
 * Features:
 * - Enhanced error handling with user-friendly messages
 * - Performance optimizations with memoization
 * - Configurable caching and refetch intervals
 * - Simplified API for audience display components
 */
export function useOptimizedTeams({
  tournamentId,
  enabled = true,
  refetchInterval = 30000, // 30 seconds default
  staleTime = 60000, // 1 minute default
}: UseOptimizedTeamsOptions): UseOptimizedTeamsReturn {
  const queryClient = useQueryClient();

  const {
    data: teams = [],
    isLoading,
    error: queryError,
    isRefetching,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: QueryKeys.teams.byTournament(tournamentId ?? ""),
    queryFn: async (): Promise<Team[]> => {
      if (!tournamentId) {
        throw new Error("Tournament ID is required");
      }

      try {
        const response = await apiClient.get<Team[]>(`teams?tournamentId=${tournamentId}`);
        return response || [];
      } catch (error: any) {
        // Transform API errors into user-friendly messages
        if (error.status === 404) {
          throw new Error("Tournament not found or no teams registered yet");
        } else if (error.status === 403) {
          throw new Error("Access denied. Please check your permissions");
        } else if (error.status === 500) {
          throw new Error("Server error. Please try again later");
        } else if (!navigator.onLine) {
          throw new Error("No internet connection. Please check your network");
        } else {
          throw new Error("Failed to load teams. Please try again");
        }
      }
    },
    enabled: enabled && !!tournamentId,
    refetchInterval,
    staleTime,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 or 403 errors
      if (error?.status === 404 || error?.status === 403) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Memoized computed values for performance
  const teamCount = useMemo(() => teams.length, [teams.length]);
  const hasTeams = useMemo(() => teamCount > 0, [teamCount]);

  // Enhanced error message
  const error = useMemo(() => {
    if (!queryError) return null;
    return queryError instanceof Error ? queryError.message : "An unexpected error occurred";
  }, [queryError]);

  // Enhanced refetch function with cache invalidation
  const refetch = useCallback(() => {
    // Invalidate related queries to ensure fresh data
    queryClient.invalidateQueries({
      queryKey: QueryKeys.teams.byTournament(tournamentId ?? ""),
    });
    return queryRefetch();
  }, [queryClient, queryRefetch, tournamentId]);

  return {
    teams,
    isLoading,
    error,
    isRefetching,
    refetch,
    teamCount,
    hasTeams,
  };
}

/**
 * Hook for prefetching teams data
 * Useful for preloading data before navigation
 */
export function usePrefetchTeams() {
  const queryClient = useQueryClient();

  return useCallback(
    (tournamentId: string) => {
      queryClient.prefetchQuery({
        queryKey: QueryKeys.teams.byTournament(tournamentId),
        queryFn: async () => {
          return await apiClient.get<Team[]>(`teams?tournamentId=${tournamentId}`);
        },
        staleTime: 60000, // 1 minute
      });
    },
    [queryClient]
  );
}

/**
 * Hook for invalidating teams cache
 * Useful for forcing refresh after data changes
 */
export function useInvalidateTeams() {
  const queryClient = useQueryClient();

  return useCallback(
    (tournamentId?: string) => {
      if (tournamentId) {
        queryClient.invalidateQueries({
          queryKey: QueryKeys.teams.byTournament(tournamentId),
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: QueryKeys.teams.all(),
        });
      }
    },
    [queryClient]
  );
}
