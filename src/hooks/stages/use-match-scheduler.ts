"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { QueryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/common/use-auth";
import type {
  GenerateFrcScheduleRequest,
  GenerateSwissRoundRequest,
  GeneratePlayoffRequest
} from "@/types/types";

export function useMatchScheduler() {
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Use the existing AuthProvider
  const isAdmin = user?.role === 'ADMIN'; // Check if user has admin role

  /**
   * Generate FRC match schedule using simulated annealing
   * Used for qualification rounds
   */
  const generateFrcSchedule = useMutation({
    mutationFn: async (params: GenerateFrcScheduleRequest) => {
      if (!isAdmin) {
        throw new Error("Unauthorized: Admin role required");
      }
      
      const data = await apiClient.post(`/api/match-scheduler/generate`, params);
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate matches list for the stage
      queryClient.invalidateQueries({
        queryKey: QueryKeys.matches.byStage(variables.stageId),
      });
      
      // Invalidate stage details
      queryClient.invalidateQueries({
        queryKey: QueryKeys.stages.byId(variables.stageId),
      });
      
      toast.success("Match schedule generated successfully!");
    },
    onError: (error: any) => {
      toast.error(
        error.message || "Failed to generate schedule. Please try again."
      );
    },
  });

  /**
   * Generate Swiss-style round matches based on team rankings
   */
  const generateSwissRound = useMutation({
    mutationFn: async (params: GenerateSwissRoundRequest) => {
      if (!isAdmin) {
        throw new Error("Unauthorized: Admin role required");
      }
      
      const data = await apiClient.post(`/api/match-scheduler/generate-swiss-round`, params);
      return { data, stageId: params.stageId };
    },
    onSuccess: (result) => {
      // Invalidate matches list for the stage
      queryClient.invalidateQueries({
        queryKey: QueryKeys.matches.byStage(result.stageId),
      });
      
      // Invalidate stage details
      queryClient.invalidateQueries({
        queryKey: QueryKeys.stages.byId(result.stageId),
      });
      
      toast.success(`Swiss round ${result.data.round || ''} generated successfully!`);
    },
    onError: (error: any) => {
      toast.error(
        error.message || "Failed to generate Swiss round. Please try again."
      );
    },
  });

  /**
   * Generate playoff bracket structure
   */
  const generatePlayoff = useMutation({
    mutationFn: async (params: GeneratePlayoffRequest) => {
      if (!isAdmin) {
        throw new Error("Unauthorized: Admin role required");
      }
      
      const data = await apiClient.post(`/api/match-scheduler/generate-playoff`, params);
      return { data, stageId: params.stageId };
    },
    onSuccess: (result) => {
      // Invalidate matches list for the stage
      queryClient.invalidateQueries({
        queryKey: QueryKeys.matches.byStage(result.stageId),
      });
      
      // Invalidate stage details
      queryClient.invalidateQueries({
        queryKey: QueryKeys.stages.byId(result.stageId),
      });
      
      toast.success(`Playoff bracket with ${result.data.matches?.length || 0} matches generated!`);
    },
    onError: (error: any) => {
      toast.error(
        error.message || "Failed to generate playoff bracket. Please try again."
      );
    },
  });

  /**
   * Update playoff brackets (advance winners)
   */
  const updatePlayoffBrackets = useMutation({
    mutationFn: async (matchId: string) => {
      if (!isAdmin) {
        throw new Error("Unauthorized: Admin role required");
      }
      
      const data = await apiClient.post(`/api/match-scheduler/update-playoff-brackets/${matchId}`);
      return data;
    },
    onSuccess: (data) => {
      // We need to invalidate all match queries since multiple matches may be updated
      queryClient.invalidateQueries({
        queryKey: QueryKeys.matches.all(),
      });
      
      toast.success("Playoff brackets updated successfully!");
    },
    onError: (error: any) => {
      toast.error(
        error.message || "Failed to update playoff brackets. Please try again."
      );
    },
  });

  /**
   * Finalize playoff rankings after tournament completion
   */
  const finalizePlayoffRankings = useMutation({
    mutationFn: async (stageId: string) => {
      if (!isAdmin) {
        throw new Error("Unauthorized: Admin role required");
      }
      
      const data = await apiClient.post(`/api/match-scheduler/finalize-playoff-rankings/${stageId}`);
      return { data, stageId };
    },
    onSuccess: (result) => {
      // Invalidate matches and team rankings
      queryClient.invalidateQueries({
        queryKey: QueryKeys.matches.byStage(result.stageId),
      });
      
      // Invalidate team rankings
      queryClient.invalidateQueries({
        queryKey: QueryKeys.teams.all(), // Use the key for all teams
      });
      
      toast.success("Playoff rankings finalized successfully!");
    },
    onError: (error: any) => {
      toast.error(
        error.message || "Failed to finalize playoff rankings. Please try again."
      );
    },
  });

  /**
   * Shuffle match schedule (randomize team assignments while keeping times)
   */
  const shuffleSchedule = useMutation({
    mutationFn: async (stageId: string) => {
      if (!isAdmin) {
        throw new Error("Unauthorized: Admin role required");
      }
      
      await apiClient.post(`scheduler/shuffle/${stageId}`);
      return stageId;
    },
    onSuccess: (stageId) => {
      // Invalidate matches list for the stage
      queryClient.invalidateQueries({
        queryKey: QueryKeys.matches.byStage(stageId),
      });
      
      toast.success("Match schedule shuffled successfully!");
    },
    onError: (error: any) => {
      toast.error(
        error.message || "Failed to shuffle schedule. Please try again."
      );
    },
  });

  /**
   * Optimize schedule to minimize team wait times
   */
  const optimizeSchedule = useMutation({
    mutationFn: async (stageId: string) => {
      if (!isAdmin) {
        throw new Error("Unauthorized: Admin role required");
      }
      
      await apiClient.post(`scheduler/optimize/${stageId}`);
      return stageId;
    },
    onSuccess: (stageId) => {
      // Invalidate matches list for the stage
      queryClient.invalidateQueries({
        queryKey: QueryKeys.matches.byStage(stageId),
      });
      
      toast.success("Match schedule optimized successfully!");
    },
    onError: (error: any) => {
      toast.error(
        error.message || "Failed to optimize schedule. Please try again."
      );
    },
  });

  /**
   * Clear all matches in a stage
   */
  const clearSchedule = useMutation({
    mutationFn: async (stageId: string) => {
      if (!isAdmin) {
        throw new Error("Unauthorized: Admin role required");
      }
      
      await apiClient.delete(`scheduler/clear/${stageId}`);
      return stageId;
    },
    onSuccess: (stageId) => {
      // Invalidate matches list for the stage
      queryClient.invalidateQueries({
        queryKey: QueryKeys.matches.byStage(stageId),
      });
      
      // Invalidate stage details
      queryClient.invalidateQueries({
        queryKey: QueryKeys.stages.byId(stageId),
      });
      
      toast.success("Match schedule cleared successfully!");
    },
    onError: (error: any) => {
      toast.error(
        error.message || "Failed to clear schedule. Please try again."
      );
    },
  });

  return {
    generateFrcSchedule,
    generateSwissRound,
    generatePlayoff,
    updatePlayoffBrackets,
    finalizePlayoffRankings,
    shuffleSchedule,
    optimizeSchedule,
    clearSchedule,
  };
}