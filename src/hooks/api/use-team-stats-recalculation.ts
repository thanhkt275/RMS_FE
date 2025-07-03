import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { QueryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

interface RecalculateStatsParams {
  tournamentId: string;
  stageId?: string;
}

interface RecalculateStatsResponse {
  success: boolean;
  message?: string;
  recalculatedCount?: number;
}

export function useTeamStatsRecalculation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tournamentId, stageId }: RecalculateStatsParams): Promise<RecalculateStatsResponse> => {
      const params = new URLSearchParams({ tournamentId });
      if (stageId) {
        params.append('stageId', stageId);
      }

      console.log(`🔄 Frontend: Recalculating stats for tournament ${tournamentId}${stageId ? `, stage ${stageId}` : ''}`);
      return await apiClient.post<RecalculateStatsResponse>(`/team-stats/recalculate-all?${params.toString()}`);
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({
        queryKey: QueryKeys.tournamentStats.byTournament(variables.tournamentId)
      });
      
      queryClient.invalidateQueries({
        queryKey: QueryKeys.teams.byTournament(variables.tournamentId)
      });

      if (variables.stageId) {
        queryClient.invalidateQueries({
          queryKey: QueryKeys.teams.rankings(variables.stageId)
        });
      }

      // Show success toast
      toast.success(
        data.message || 
        `Successfully recalculated team statistics${variables.stageId ? ' for stage' : ' for tournament'}`,
        {
          description: data.recalculatedCount 
            ? `Updated stats for ${data.recalculatedCount} teams`
            : undefined
        }
      );
    },
    onError: (error: Error) => {
      console.error('Failed to recalculate team stats:', error);
      toast.error('Failed to recalculate team statistics', {
        description: error.message || 'An unexpected error occurred'
      });
    },
  });
}

/**
 * Hook for updating rankings (separate from full recalculation)
 */
export function useUpdateRankings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tournamentId, stageId }: RecalculateStatsParams): Promise<{ success: boolean }> => {
      const params = new URLSearchParams({ tournamentId });
      if (stageId) {
        params.append('stageId', stageId);
      }

      return await apiClient.post<{ success: boolean }>(`/team-stats/update-rankings?${params.toString()}`);
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({
        queryKey: QueryKeys.tournamentStats.byTournament(variables.tournamentId)
      });
      
      queryClient.invalidateQueries({
        queryKey: QueryKeys.teams.byTournament(variables.tournamentId)
      });

      if (variables.stageId) {
        queryClient.invalidateQueries({
          queryKey: QueryKeys.teams.rankings(variables.stageId)
        });
      }

      toast.success('Successfully updated team rankings');
    },
    onError: (error: Error) => {
      console.error('Failed to update rankings:', error);
      toast.error('Failed to update rankings', {
        description: error.message || 'An unexpected error occurred'
      });
    },
  });
}
