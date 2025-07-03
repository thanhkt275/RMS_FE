import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Match } from "@/lib/types";
import { QueryKeys } from "@/lib/query-keys";

export function useMatchesByTournament(tournamentId: string) {
  return useQuery({
    queryKey: QueryKeys.matches.byTournament(tournamentId),
    queryFn: async () => {
      if (!tournamentId) return [];
      try {
        const data = await apiClient.get<Match[]>(
          `/matches?tournamentId=${tournamentId}`
        );
        return data;
      } catch (error) {
        console.error("Error fetching tournament matches:", error);
        return [];
      }
    },
    enabled: !!tournamentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
