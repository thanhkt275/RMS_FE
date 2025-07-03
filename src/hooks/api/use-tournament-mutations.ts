'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateTournamentDto, CreateStageDto } from '@/lib/types/tournament.types';
import { TournamentService } from '@/services/tournament.service';
import { toast } from 'sonner';

export function useUpdateTournament(tournamentId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['tournament-management', tournamentId];

  return useMutation({
    mutationFn: (data: UpdateTournamentDto) => 
      TournamentService.update(tournamentId, data),
    
    // Optimistic update for immediate UI feedback
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          ...newData,
          startDate: newData.startDate ? new Date(newData.startDate) : old.startDate,
          endDate: newData.endDate ? new Date(newData.endDate) : old.endDate,
        };
      });

      return { previousData };
    },
    
    onError: (err, newData, context) => {
      // Rollback optimistic update on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error('Failed to update tournament');
    },
    
    onSuccess: () => {
      toast.success('Tournament updated successfully');
    },
    
    onSettled: () => {
      // Always refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useDeleteTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tournamentId: string) => 
      TournamentService.delete(tournamentId),
    
    onSuccess: (_, tournamentId) => {
      // Remove from cache and refresh tournament list
      queryClient.removeQueries({ queryKey: ['tournament-management', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      toast.success('Tournament deleted successfully');
    },
    
    onError: () => {
      toast.error('Failed to delete tournament');
    },
  });
}

export function useCreateStage(tournamentId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['tournament-management', tournamentId];

  return useMutation({
    mutationFn: (data: CreateStageDto) => 
      TournamentService.createStage(tournamentId, data),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Stage created successfully');
    },
    
    onError: () => {
      toast.error('Failed to create stage');
    },
  });
}
