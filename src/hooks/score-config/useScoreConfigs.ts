
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScoreConfig } from '@/types/score-config';
import { apiClient } from '@/lib/api-client';
import { scoreConfigKeys } from '@/lib/query-keys';

export function useScoreConfig() {
  const queryClient = useQueryClient();

  // Fetch all score configs
  const query = useQuery({
    queryKey: scoreConfigKeys.all,
    queryFn: async () => {
      return await apiClient.get<ScoreConfig[]>('score-configs');
    },
  });

  // Create
  const create = useMutation({
    mutationFn: async (data: Partial<ScoreConfig>) => {
      return await apiClient.post<ScoreConfig>('score-configs', data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scoreConfigKeys.all }),
  });

  // Update
  const update = useMutation({
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

  // Delete
  const remove = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete<{ id: string }>(`score-configs/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scoreConfigKeys.all }),
  });

  // Assign
  const assign = useMutation({
    mutationFn: async ({ configId, tournamentIds }: { configId: string; tournamentIds: string[] }) => {
      // Assign to each tournament one by one (sequentially)
      // If you only want to assign to the first one, just use tournamentIds[0]
      if (!tournamentIds.length) return;
      // If you want to assign to all, you could loop, but your schema only allows one tournament per config
      // So, assign to the first one
      return await apiClient.post(
        `score-configs/${configId}/assign-tournament/${tournamentIds[0]}`,
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

  // Unassign from tournament using PATCH endpoint
  const unassign = useMutation({
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

  return {
    ...query,
    create,
    update,
    remove,
    assign,
    unassign,
  };
}

// Fetch score config by tournamentId
export function useScoreConfigByTournamentId(tournamentId: string | undefined) {
  return useQuery({
    queryKey: [scoreConfigKeys.all, 'byTournament', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return null;
      return await apiClient.get<ScoreConfig>(`score-configs/tournament/${tournamentId}`);
    },
    enabled: !!tournamentId,
  });
}