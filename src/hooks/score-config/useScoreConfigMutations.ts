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
      return await apiClient.patch<ScoreConfig>(`score-configs/${id}`, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: scoreConfigKeys.all });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: scoreConfigKeys.detail(variables.id) });
      }
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

export function useAssignScoreConfigToTournaments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ configId, tournamentIds }: { configId: string; tournamentIds: string[] }) => {
      return await apiClient.post<{ configId: string; tournamentIds: string[] }>(
        `score-configs/${configId}/assign-tournaments`,
        { tournamentIds }
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