import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Team } from "@/types/team.types";
import { QueryKeys } from "@/lib/query-keys";
import TeamService from "@/services/team.service";
import { CreateTeamRequest, UpdateTeamRequest } from "@/types/team.types";
import { toast } from "sonner";

export function useTeams(tournamentId: string | undefined) {
  return useQuery({
    queryKey: QueryKeys.teams.byTournament(tournamentId ?? ""),
    queryFn: async () => {
      if (!tournamentId) return [];
      return await apiClient.get<Team[]>(`teams?tournamentId=${tournamentId}`);
    },
    enabled: !!tournamentId,
  });
}

export function useTeamsMutations() {
  const queryClient = useQueryClient();

  const createTeam = useMutation({
    mutationFn: async (data: CreateTeamRequest) => {
      return await TeamService.createTeam(data);
    },
    onSuccess: (_, data) => {
      toast.success("Team created successfully");
      [
        QueryKeys.teams.byTournament(data.tournamentId),
        QueryKeys.tournaments.all(),
      ].forEach((queryKey) =>
        queryClient.invalidateQueries({
          queryKey,
        })
      );
    },
    onError: (error: Error) => {},
  });

  const updateTeam = useMutation({
    mutationFn: async (data: UpdateTeamRequest) => {
      return await TeamService.updateTeam(data);
    },
    onSuccess: (_, data) => {
      toast.success("Team updated successfully");
      queryClient.invalidateQueries({
        queryKey: QueryKeys.tournaments.all(),
      });

      if (data.tournamentId) {
        queryClient.invalidateQueries({
          queryKey: QueryKeys.teams.byTournament(data.tournamentId),
        });
      }
    },
  });

  return {
    createTeam,
    updateTeam,
  };
}
