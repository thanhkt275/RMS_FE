"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { QueryKeys } from "@/lib/query-keys";

import type { Stage, CreateStageInput, UpdateStageInput } from "@/types/types";

/**
 * Hook to fetch all stages
 */
export function useStages() {
  return useQuery({
    queryKey: QueryKeys.stages.all(),
    queryFn: async () => {
      const data = await apiClient.get<Stage[]>('stages');
      return data;
    }
  });
}

/**
 * Hook to fetch a single stage by ID
 */
export function useStage(stageId: string) {
  return useQuery({
    queryKey: QueryKeys.stages.byId(stageId),
    queryFn: async () => {
      const data = await apiClient.get<Stage>(`stages/${stageId}`);
      return data;
    },
    enabled: !!stageId,
  });
}

/**
 * Hook to fetch stages by tournament ID
 */
export function useStagesByTournament(tournamentId: string) {
  return useQuery({
    queryKey: QueryKeys.stages.byTournament(tournamentId),
    queryFn: async () => {
      const data = await apiClient.get<Stage[]>(`stages?tournamentId=${tournamentId}`);
      return data;
    },
    enabled: !!tournamentId,
  });
}

/**
 * Hook to create a new stage
 */
export function useCreateStage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateStageInput) => {
      return await apiClient.post<Stage>('stages', data);
    },
    onSuccess: (data) => {
      toast.success("Stage created successfully");
      queryClient.invalidateQueries({ queryKey: QueryKeys.stages.all() });
      queryClient.invalidateQueries({ queryKey: QueryKeys.stages.byTournament(data.tournamentId) });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create stage: ${error.message}`);
    }
  });
}

/**
 * Hook to update a stage
 */
export function useUpdateStage(stageId: string, tournamentId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UpdateStageInput) => {
      return await apiClient.patch<Stage>(`stages/${stageId}`, data);
    },
    onSuccess: () => {
      toast.success("Stage updated successfully");
      queryClient.invalidateQueries({ queryKey: QueryKeys.stages.byId(stageId) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.stages.byTournament(tournamentId) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.stages.all() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update stage: ${error.message}`);
    }
  });
}

/**
 * Hook to delete a stage
 */
export function useDeleteStage(tournamentId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (stageId: string) => {
      return await apiClient.delete<{ success: boolean }>(`stages/${stageId}`);
    },
    onSuccess: () => {
      toast.success("Stage deleted successfully");
      queryClient.invalidateQueries({ queryKey: QueryKeys.stages.all() });
      queryClient.invalidateQueries({ queryKey: QueryKeys.stages.byTournament(tournamentId) });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete stage: ${error.message}`);
    }
  });
}