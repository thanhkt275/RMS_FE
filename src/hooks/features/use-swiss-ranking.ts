import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/lib/query-keys';
import { apiClient } from '@/lib/api-client';

export function useSwissRankings(stageId: string | undefined) {
  return useQuery({
    queryKey: QueryKeys.swissRankings.byStage(stageId ?? ''),
    queryFn: async () => {
      if (!stageId) return [];
      const data = await apiClient.post(`/match-scheduler/get-swiss-rankings/${stageId}`);
      return data.rankings || [];
    },
    enabled: !!stageId,
    staleTime: 2000,
  });
}
