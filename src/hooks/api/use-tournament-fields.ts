import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Field } from "@/components/fields/FieldSelectDropdown";
import { QueryKeys } from "@/lib/query-keys";

export function useTournamentFields(tournamentId: string) {
  return useQuery<Field[]>({
    queryKey: QueryKeys.tournamentFields.byTournament(tournamentId),
    queryFn: async () => {
      if (!tournamentId) return [];
      return await apiClient.get<Field[]>(`tournaments/${tournamentId}/fields`);
    },
    enabled: !!tournamentId,
  });
}
