import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StageAdvancementService } from "@/services/stage-advancement.service";
import { AdvancementOptions } from "@/types/stage-advancement.types";
import { toast } from "sonner";

/**
 * Custom hooks for stage advancement operations
 * Implements separation of concerns by isolating data fetching logic
 */

/**
 * Hook to fetch stage rankings
 */
export function useStageRankings(stageId: string, enabled = true) {
  return useQuery({
    queryKey: ['stage-rankings', stageId],
    queryFn: () => StageAdvancementService.getStageRankings(stageId),
    enabled: enabled && !!stageId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

/**
 * Hook to check stage readiness
 */
export function useStageReadiness(stageId: string, enabled = true) {
  return useQuery({
    queryKey: ['stage-readiness', stageId],
    queryFn: () => StageAdvancementService.checkStageReadiness(stageId),
    enabled: enabled && !!stageId,
    staleTime: 1000 * 30, // 30 seconds
    retry: 2,
  });
}

/**
 * Hook to preview advancement
 */
export function useAdvancementPreview(stageId: string, teamsToAdvance?: number, enabled = true) {
  return useQuery({
    queryKey: ['advancement-preview', stageId, teamsToAdvance],
    queryFn: () => StageAdvancementService.previewAdvancement(stageId, teamsToAdvance),
    enabled: enabled && !!stageId && typeof teamsToAdvance === 'number' && teamsToAdvance > 0,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to advance teams mutation
 */
export function useAdvanceTeams(stageId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options: AdvancementOptions) => 
      StageAdvancementService.advanceTeams(stageId, options),
    onSuccess: (data) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      queryClient.invalidateQueries({ queryKey: ['stage-rankings'] });
      queryClient.invalidateQueries({ queryKey: ['stage-readiness'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      
      toast.success(`Successfully advanced ${data.totalTeamsAdvanced} teams`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to advance teams: ${error.message}`);
    },
  });
}
