'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateTournamentDto, CreateStageDto } from '@/types/tournament.types';
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

export function useExportTournamentData(tournamentId: string) {
  return useMutation({
    mutationFn: (format: 'csv' | 'excel' | 'json' = 'csv') => 
      TournamentService.exportData(tournamentId, format),
    
    onSuccess: (blob, format) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tournament-data.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Tournament data exported successfully');
    },
    
    onError: () => {
      toast.error('Failed to export tournament data');
    },
  });
}

export function useTournamentSettings(tournamentId: string) {
  const queryClient = useQueryClient();
  
  const updateSettings = useMutation({
    mutationFn: (settings: any) => 
      TournamentService.updateSettings(tournamentId, settings),
    
    onSuccess: () => {
      // Invalidate both tournament settings and tournament management queries
      queryClient.invalidateQueries({ queryKey: ['tournament-settings', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-management', tournamentId] });
      toast.success('Tournament settings updated successfully');
    },
    
    onError: () => {
      toast.error('Failed to update tournament settings');
    },
  });

  return { updateSettings };
}

export function useStartMatch(tournamentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) => 
      TournamentService.startMatch(tournamentId, matchId),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-management', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Match started successfully');
    },
    
    onError: () => {
      toast.error('Failed to start match');
    },
  });
}

export function useDuplicateTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tournamentId, name }: { tournamentId: string; name: string }) => 
      TournamentService.duplicate(tournamentId, name),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      toast.success('Tournament duplicated successfully');
    },
    
    onError: () => {
      toast.error('Failed to duplicate tournament');
    },
  });
}
