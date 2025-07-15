"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRef } from "react";
import { apiClient } from "@/lib/api-client";

import { QueryKeys } from "@/lib/query-keys";
import { MatchStatus } from "@/types/types";
import { MatchService } from "@/services/match-service";

/**
 * Hook to fetch all matches, optionally filtered by fieldId
 */
export function useMatches(filter?: { fieldId?: string | null }) {
  return useQuery({
    queryKey: filter?.fieldId
      ? [...QueryKeys.matches.all(), { fieldId: filter.fieldId }]
      : QueryKeys.matches.all(),
    queryFn: async () => {
      try {
        return await MatchService.getAllMatches(filter);
      } catch (error: any) {
        toast.error("Failed to fetch matches");
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch matches by stage ID
 */
export function useMatchesByStage(stageId: string) {
  return useQuery({
    queryKey: QueryKeys.matches.byStage(stageId),
    queryFn: async () => {
      try {
        return await MatchService.getMatchesByStage(stageId);
      } catch (error: any) {
        toast.error(`Failed to fetch matches for stage: ${error.message}`);
        throw error;
      }
    },
    enabled: !!stageId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch a specific match by ID
 */
export function useMatch(matchId: string) {
  return useQuery({
    queryKey: QueryKeys.matches.byId(matchId),
    queryFn: async () => {
      if (!matchId) throw new Error("Match ID is required");
      try {
        return await MatchService.getMatchById(matchId);
      } catch (error: any) {
        toast.error(`Failed to fetch match details: ${error.message}`);
        throw error;
      }
    },
    enabled: !!matchId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to update a match status
 */
export function useUpdateMatchStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, status }: { matchId: string; status: MatchStatus }) => {
      try {
        // Use the new /matches/:id/status endpoint
        return await apiClient.patch(`/matches/${matchId}/status`, { status });
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: (data) => {
      toast.success("Match status updated successfully");
      queryClient.invalidateQueries({ queryKey: QueryKeys.matches.all() });
      queryClient.invalidateQueries({ queryKey: QueryKeys.matches.byId(data.id) });
    },
    onError: (error: any) => {
      toast.error(`Failed to update match status: ${error.message}`);
    },
  });
}

/**
 * Hook to fetch match scores by match ID
 */
export function useMatchScores(matchId: string) {
  return useQuery({
    queryKey: QueryKeys.matchScores.byMatch(matchId),
    queryFn: async () => {
      if (!matchId) throw new Error("Match ID is required");
      try {
        return await MatchService.getMatchScores(matchId);
      } catch (error: any) {
        if (error.status === 401 || error.message?.includes('Unauthorized')) {
          toast.error("Authentication required. Please log in to view match scores.");
          throw new Error("Authentication required");
        }
        if (error.status === 404 || error.message?.includes('not found')) {
          return null;
        }
        toast.error(`Failed to fetch match scores: ${error.message}`);
        throw error;
      }
    },
    enabled: !!matchId,
    staleTime: 1000 * 60 * 1, // 1 minute
    retry: (failureCount, error) => {
      if (error instanceof Error) {
        if (error.message.includes("not found")) return false;
        if (error.message.includes("Authentication required")) return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook to create match scores for a match
 */
export function useCreateMatchScores() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      matchId: string;
      redAutoScore?: number;
      redDriveScore?: number;
      redTotalScore?: number;
      blueAutoScore?: number;
      blueDriveScore?: number;
      blueTotalScore?: number;
      redTeamCount?: number;
      blueTeamCount?: number;
      redMultiplier?: number;
      blueMultiplier?: number;
      redGameElements?: Record<string, number>;
      blueGameElements?: Record<string, number>;
      scoreDetails?: Record<string, any>;
    }) => {
      try {
        return await MatchService.createOrUpdateMatchScores(data);
      } catch (error: any) {
        if (error.status === 401 || error.message?.includes('Unauthorized')) {
          toast.error("Authentication required. Please log in to create match scores.");
          throw new Error("Authentication required");
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data?.matchId) {
        queryClient.invalidateQueries({ queryKey: QueryKeys.matchScores.byMatch(data.matchId) });
        queryClient.invalidateQueries({ queryKey: QueryKeys.matches.byId(data.matchId) });
        toast.success("Match scores created successfully");
      }
    },
    onError: (error: any) => {
      toast.error(`Failed to create match scores: ${error.message}`);
    },
  });
}

/**
 * Hook to update match scores
 */
export function useUpdateMatchScores() {
  const queryClient = useQueryClient();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastArgsRef = useRef<any>(null);
  const mutation = useMutation({
    mutationFn: async (data: {
      id: string;
      matchId?: string;
      redAutoScore?: number;
      redDriveScore?: number;
      redTotalScore?: number;
      blueAutoScore?: number;
      blueDriveScore?: number;
      blueTotalScore?: number;
      redTeamCount?: number;
      blueTeamCount?: number;
      redMultiplier?: number;
      blueMultiplier?: number;
      redGameElements?: Record<string, number>;
      blueGameElements?: Record<string, number>;
      scoreDetails?: Record<string, any>;
    }) => {
      if (!data.id) {
        throw new Error("Match scores ID is required for updates");
      }
      try {
        return await MatchService.updateMatchScores(data);
      } catch (error: any) {
        if (error.status === 401 || error.message?.includes('Unauthorized')) {
          toast.error("Authentication required. Please log in to update match scores.");
          throw new Error("Authentication required");
        }
        throw error;
      }
    },
    // We'll handle toast in the debounced trigger, not here
    onSuccess: (data) => {
      if (data?.matchId) {
        queryClient.invalidateQueries({ queryKey: QueryKeys.matchScores.byMatch(data.matchId) });
        queryClient.invalidateQueries({ queryKey: QueryKeys.matches.byId(data.matchId) });
        // toast will be handled in debounced trigger
      }
    },
    onError: (error: any) => {
      toast.error(`Failed to update match scores: ${error.message}`);
    },
  });

  // Debounced trigger for mutation
  const debouncedUpdate = (args: any) => {
    lastArgsRef.current = args;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await mutation.mutateAsync(lastArgsRef.current);
        if (result?.matchId) {
          toast.success("Match scores updated successfully");
        }
      } catch (error: any) {
        // Error toast is already handled in onError
      }
    }, 10); // 200ms debounce
  };

  // Return a similar API as useMutation, but with debounced mutate
  return {
    ...mutation,
    mutate: debouncedUpdate,
    debouncedMutate: debouncedUpdate, // explicit
    // For advanced use, expose the original mutateAsync
    mutateAsync: mutation.mutateAsync,
  };
}

/**
 * Hook to fetch all match scores
 */
export function useAllMatchScores(enabled: boolean = true) {
  return useQuery({
    queryKey: QueryKeys.matchScores.all(),
    queryFn: async () => {
      return await apiClient.get<any[]>("/match-scores");
    },
    staleTime: 60 * 1000, // 1 minute
    enabled,
  });
}

/**
 * Hook to delete a match
 */
export function useDeleteMatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (matchId: string) => {
      try {
        return await apiClient.delete(`/matches/${matchId}`);
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: (data, matchId) => {
      toast.success("Match deleted successfully");
      queryClient.invalidateQueries({ queryKey: QueryKeys.matches.all() });
      queryClient.invalidateQueries({ queryKey: QueryKeys.matches.byId(matchId) });
      // Also invalidate stage-specific matches if we can determine the stageId
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'matches' && 
          query.queryKey[1] === 'byStage'
      });
    },
    onError: (error: any) => {
      toast.error(`Failed to delete match: ${error.message}`);
    },
  });
}