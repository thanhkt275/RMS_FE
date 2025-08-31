"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { QueryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/common/use-auth";

export interface UpdateMatchTimeRequest {
  scheduledTime: Date;
  updateSubsequent?: boolean;
  fieldIntervalMinutes?: number;
}

export interface BulkUpdateMatchTimesRequest {
  stageId: string;
  startTime: Date;
  matchIntervalMinutes?: number;
  fieldIntervalMinutes?: number;
  resetAllTimes?: boolean;
}

export function useMatchTimeManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  /**
   * Update the scheduled time for a single match
   */
  const updateMatchTime = useMutation({
    mutationFn: async ({ matchId, data }: { matchId: string; data: UpdateMatchTimeRequest }) => {
      if (!isAdmin) {
        throw new Error("Unauthorized: Admin role required");
      }
      
      const result = await apiClient.patch(`/matches/${matchId}/time`, data);
      return { result, matchId };
    },
    onSuccess: (response) => {
      // Invalidate matches queries
      queryClient.invalidateQueries({
        queryKey: QueryKeys.matches.all(),
      });
      
      // Invalidate stage-specific queries if available
      if (response.result.stageId) {
        queryClient.invalidateQueries({
          queryKey: QueryKeys.matches.byStage(response.result.stageId),
        });
      }
      
      toast.success("Match time updated successfully!");
    },
    onError: (error: any) => {
      toast.error(
        error.message || "Failed to update match time. Please try again."
      );
    },
  });

  /**
   * Bulk update match times for an entire stage
   */
  const bulkUpdateMatchTimes = useMutation({
    mutationFn: async (data: BulkUpdateMatchTimesRequest) => {
      if (!isAdmin) {
        throw new Error("Unauthorized: Admin role required");
      }
      
      const result = await apiClient.post('/matches/bulk-update-times', data);
      return { result, stageId: data.stageId };
    },
    onSuccess: (response) => {
      // Invalidate matches queries
      queryClient.invalidateQueries({
        queryKey: QueryKeys.matches.all(),
      });
      
      // Invalidate stage-specific queries
      queryClient.invalidateQueries({
        queryKey: QueryKeys.matches.byStage(response.stageId),
      });
      
      toast.success(`Successfully updated times for ${response.result.updated} matches!`);
    },
    onError: (error: any) => {
      toast.error(
        error.message || "Failed to bulk update match times. Please try again."
      );
    },
  });

  /**
   * Get the current schedule for a stage
   */
  const useStageSchedule = (stageId: string | null) => {
    return useQuery({
      queryKey: QueryKeys.matches.stageSchedule(stageId || ''),
      queryFn: async () => {
        if (!stageId) return null;
        return await apiClient.get(`/matches/stage/${stageId}/schedule`);
      },
      enabled: !!stageId,
    });
  };

  return {
    updateMatchTime,
    bulkUpdateMatchTimes,
    useStageSchedule,
    isAdmin,
  };
}
