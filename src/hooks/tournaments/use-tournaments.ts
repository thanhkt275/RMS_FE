"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { QueryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/common/use-auth";

import type { Tournament, CreateTournamentInput, UpdateTournamentInput } from "@/types/types";

/**
 * Hook to fetch all tournaments
 */
export function useTournaments() {
  return useQuery({
    queryKey: QueryKeys.tournaments.all(),
    queryFn: async () => {
      const data = await apiClient.get<Tournament[]>('tournaments');
      return data;
    }
  });
}

/**
 * Hook to fetch a single tournament by ID
 */
export function useTournament(tournamentId: string) {
  return useQuery({
    queryKey: QueryKeys.tournaments.byId(tournamentId),
    queryFn: async () => {
      const data = await apiClient.get<Tournament>(`tournaments/${tournamentId}`);
      return data;
    },
    enabled: !!tournamentId,
  });
}

/**
 * Hook to create a new tournament
 */
export function useCreateTournament() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: CreateTournamentInput) => {
      // Include adminId from currently logged in user
      return await apiClient.post<Tournament>('tournaments', {
        ...data,
        adminId: user?.id
      });
    },
    onSuccess: () => {
      toast.success("Tournament created successfully");
      queryClient.invalidateQueries({ queryKey: QueryKeys.tournaments.all() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create tournament: ${error.message}`);
    }
  });
}

/**
 * Hook to update a tournament
 */
export function useUpdateTournament(tournamentId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UpdateTournamentInput) => {
      return await apiClient.patch<Tournament>(`tournaments/${tournamentId}`, data);
    },
    onSuccess: () => {
      toast.success("Tournament updated successfully");
      queryClient.invalidateQueries({ queryKey: QueryKeys.tournaments.byId(tournamentId) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.tournaments.all() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update tournament: ${error.message}`);
    }
  });
}

/**
 * Hook to delete a tournament
 */
export function useDeleteTournament() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tournamentId: string) => {
      return await apiClient.delete<{ success: boolean }>(`tournaments/${tournamentId}`);
    },
    onSuccess: () => {
      toast.success("Tournament deleted successfully");
      queryClient.invalidateQueries({ queryKey: QueryKeys.tournaments.all() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete tournament: ${error.message}`);
    }
  });
}