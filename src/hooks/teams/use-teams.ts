import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Team } from "@/types/types";
import { QueryKeys } from "@/lib/query-keys";

export function useTeams(tournamentId: string | undefined) {
  return useQuery({
    queryKey: QueryKeys.teams.byTournament(tournamentId ?? ''),
    queryFn: async () => {
      if (!tournamentId) return [];
      return await apiClient.get<Team[]>(`teams?tournamentId=${tournamentId}`);
    },
    enabled: !!tournamentId,
  });
}
