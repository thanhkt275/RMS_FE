import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ScoreConfig } from '@/types/score-config';
import { apiClient } from '@/lib/api-client';
import { scoreConfigKeys } from '@/lib/query-keys';

export function useCreateScoreConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<ScoreConfig>) => {
      return await apiClient.post<ScoreConfig>('score-configs', data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scoreConfigKeys.all }),
  });
}

export function useUpdateScoreConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ScoreConfig> }) => {
      console.log('[DEBUG] Updating score config:', { id, data });
      const result = await apiClient.patch<ScoreConfig>(`score-configs/${id}`, data);
      console.log('[DEBUG] Update result:', result);
      return result;
    },
    onSuccess: (_data, variables) => {
      console.log('[DEBUG] Update success, invalidating queries for:', variables);
      queryClient.invalidateQueries({ queryKey: scoreConfigKeys.all });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: scoreConfigKeys.detail(variables.id) });
      }
    },
    onError: (error, variables) => {
      console.error('[DEBUG] Update failed:', { error, variables });
    },
  });
}

export function useDeleteScoreConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete<{ id: string }>(`score-configs/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scoreConfigKeys.all }),
  });
}

export function useAssignScoreConfigToTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ configId, tournamentId }: { configId: string; tournamentId: string }) => {
      return await apiClient.post(
        `score-configs/${configId}/assign-tournament/${tournamentId}`,
        {}
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: scoreConfigKeys.all });
      if (variables?.configId) {
        queryClient.invalidateQueries({ queryKey: scoreConfigKeys.detail(variables.configId) });
      }
    },
  });
}

export function useUnassignScoreConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (configId: string) => {
      // Use PATCH endpoint to update the score config to unassign it
      return await apiClient.patch(`score-configs/${configId}`, { tournamentId: null });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: scoreConfigKeys.all });
      if (variables) {
        queryClient.invalidateQueries({ queryKey: scoreConfigKeys.detail(variables) });
      }
    },
  });
}
