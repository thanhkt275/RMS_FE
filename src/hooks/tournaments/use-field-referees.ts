'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { 
  RefereeAssignment, 
  BatchRefereeAssignment, 
  AvailableReferee,
  AssignRefereesDto,
  BatchAssignRefereesDto 
} from '@/types/referee.types';
import { FieldRefereeService } from '@/services/field-referee.service';
import { toast } from 'sonner';

export function useAvailableReferees() {
  return useQuery({
    queryKey: ['available-referees'],
    queryFn: () => FieldRefereeService.getAvailableReferees(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useAvailableRefereesForTournament(tournamentId: string) {
  return useQuery({
    queryKey: ['available-referees', tournamentId],
    queryFn: () => FieldRefereeService.getAvailableRefereesForTournament(tournamentId),
    staleTime: 30 * 1000, // 30 seconds (more frequent updates for tournament-specific)
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!tournamentId, // Only run if tournamentId is provided
  });
}

export function useAssignFieldReferees(fieldId: string, tournamentId?: string) {
  const queryClient = useQueryClient();
  const tournamentQueryKey = ['tournament-management', tournamentId];

  return useMutation({
    mutationFn: (assignments: RefereeAssignment[]) => 
      FieldRefereeService.assignReferees(fieldId, { referees: assignments }),
    
    onMutate: async (newAssignments) => {
      if (!tournamentId) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: tournamentQueryKey });
      
      // Optimistic update for immediate UI feedback
      const previousData = queryClient.getQueryData(tournamentQueryKey);
      
      queryClient.setQueryData(tournamentQueryKey, (old: any) => {
        if (!old?.fields) return old;
        
        return {
          ...old,
          fields: old.fields.map((field: any) => 
            field.id === fieldId 
              ? { 
                  ...field, 
                  // Add new assignments to existing ones (additive behavior)
                  fieldReferees: [
                    ...(field.fieldReferees || []),
                    ...newAssignments.map((assignment, index) => ({
                      id: `temp-${index}`,
                      fieldId,
                      userId: assignment.userId,
                      isHeadRef: assignment.isHeadRef,
                      createdAt: new Date(),
                      user: { 
                        id: assignment.userId, 
                        username: 'Loading...', 
                        email: '', 
                        role: assignment.isHeadRef ? 'HEAD_REFEREE' : 'ALLIANCE_REFEREE' 
                      }
                    }))
                  ]
                }
              : field
          )
        };
      });

      return { previousData };
    },
    
    onError: (err, variables, context) => {
      // Rollback optimistic update
      if (context?.previousData && tournamentId) {
        queryClient.setQueryData(tournamentQueryKey, context.previousData);
      }
      toast.error('Failed to assign referees');
    },
    
    onSuccess: () => {
      toast.success('Referees assigned successfully');
    },
    
    onSettled: () => {
      // Refetch to ensure data consistency
      if (tournamentId) {
        queryClient.invalidateQueries({ queryKey: tournamentQueryKey });
        // Invalidate tournament-specific available referees
        queryClient.invalidateQueries({ queryKey: ['available-referees', tournamentId] });
      }
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'field-referees' ||
          query.queryKey[0] === 'tournament-fields' ||
          query.queryKey[0] === 'available-referees'
      });
    }
  });
}

export function useRemoveFieldReferee(fieldId: string, tournamentId?: string) {
  const queryClient = useQueryClient();
  const tournamentQueryKey = ['tournament-management', tournamentId];

  return useMutation({
    mutationFn: (userId: string) => 
      FieldRefereeService.removeReferee(fieldId, userId),
    
    onMutate: async (userId) => {
      if (!tournamentId) return;

      await queryClient.cancelQueries({ queryKey: tournamentQueryKey });
      const previousData = queryClient.getQueryData(tournamentQueryKey);
      
      // Optimistic removal
      queryClient.setQueryData(tournamentQueryKey, (old: any) => {
        if (!old?.fields) return old;
        
        return {
          ...old,
          fields: old.fields.map((field: any) => 
            field.id === fieldId 
              ? { 
                  ...field, 
                  fieldReferees: field.fieldReferees.filter((fr: any) => fr.userId !== userId)
                }
              : field
          )
        };
      });

      return { previousData };
    },
    
    onError: (err, variables, context) => {
      if (context?.previousData && tournamentId) {
        queryClient.setQueryData(tournamentQueryKey, context.previousData);
      }
      
      // Check if the error is because the assignment was already removed
      const errorMessage = (err as any)?.response?.data?.message || (err as Error)?.message || 'Failed to remove referee';
      
      if (errorMessage.includes('not found') || errorMessage.includes('already')) {
        // If the assignment was already removed, just show a warning and refresh
        toast.warning('Referee was already removed');
        // Force refresh to sync the UI with the actual database state
        if (tournamentId) {
          queryClient.invalidateQueries({ queryKey: tournamentQueryKey });
        }
      } else {
        toast.error('Failed to remove referee');
      }
    },
    
    onSuccess: () => {
      toast.success('Referee removed successfully');
    },
    
    onSettled: () => {
      if (tournamentId) {
        queryClient.invalidateQueries({ queryKey: tournamentQueryKey });
        // Invalidate tournament-specific available referees
        queryClient.invalidateQueries({ queryKey: ['available-referees', tournamentId] });
      }
      // Invalidate all related queries
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'field-referees' ||
          query.queryKey[0] === 'tournament-fields' ||
          query.queryKey[0] === 'available-referees'
      });
    }
  });
}

export function useBatchAssignReferees(tournamentId?: string) {
  const queryClient = useQueryClient();
  const tournamentQueryKey = ['tournament-management', tournamentId];

  return useMutation({
    mutationFn: (assignments: BatchRefereeAssignment[]) => 
      FieldRefereeService.batchAssignReferees({ assignments }),
    
    onSuccess: () => {
      if (tournamentId) {
        queryClient.invalidateQueries({ queryKey: tournamentQueryKey });
        // Invalidate tournament-specific available referees
        queryClient.invalidateQueries({ queryKey: ['available-referees', tournamentId] });
      }
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'field-referees' ||
          query.queryKey[0] === 'tournament-fields' ||
          query.queryKey[0] === 'available-referees'
      });
      toast.success('Bulk assignment completed successfully');
    },
    
    onError: () => {
      toast.error('Failed to complete bulk assignment');
    }
  });
}

export function useFieldReferees(tournamentId: string) {
  const {
    data: fieldReferees,
    isLoading: isFieldRefereesLoading,
    error: fieldRefereesError,
  } = useQuery({
    queryKey: ['field-referees', tournamentId],
    queryFn: () => FieldRefereeService.getRefereesByTournament(tournamentId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const {
    data: availableReferees,
    isLoading: isAvailableRefereesLoading,
    error: availableRefereesError,
  } = useAvailableRefereesForTournament(tournamentId);

  return {
    fieldReferees: fieldReferees || [],
    availableReferees: availableReferees || [],
    isLoading: isFieldRefereesLoading || isAvailableRefereesLoading,
    error: fieldRefereesError || availableRefereesError,
  };
}

export function useReplaceFieldReferees(fieldId: string, tournamentId?: string) {
  const queryClient = useQueryClient();
  const tournamentQueryKey = ['tournament-management', tournamentId];

  return useMutation({
    mutationFn: (assignments: RefereeAssignment[]) => 
      FieldRefereeService.replaceAllReferees(fieldId, { referees: assignments }),
    
    onMutate: async (newAssignments) => {
      if (!tournamentId) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: tournamentQueryKey });
      
      // Optimistic update for immediate UI feedback
      const previousData = queryClient.getQueryData(tournamentQueryKey);
      
      queryClient.setQueryData(tournamentQueryKey, (old: any) => {
        if (!old?.fields) return old;
        
        return {
          ...old,
          fields: old.fields.map((field: any) => 
            field.id === fieldId 
              ? { 
                  ...field, 
                  // Replace all assignments (replacement behavior)
                  fieldReferees: newAssignments.map((assignment, index) => ({
                    id: `temp-${index}`,
                    fieldId,
                    userId: assignment.userId,
                    isHeadRef: assignment.isHeadRef,
                    createdAt: new Date(),
                    user: { 
                      id: assignment.userId, 
                      username: 'Loading...', 
                      email: '', 
                      role: assignment.isHeadRef ? 'HEAD_REFEREE' : 'ALLIANCE_REFEREE' 
                    }
                  }))
                }
              : field
          )
        };
      });

      return { previousData };
    },
    
    onError: (err, variables, context) => {
      // Rollback optimistic update
      if (context?.previousData && tournamentId) {
        queryClient.setQueryData(tournamentQueryKey, context.previousData);
      }
      toast.error('Failed to replace referees');
    },
    
    onSuccess: () => {
      toast.success('Referees replaced successfully');
    },
    
    onSettled: () => {
      // Refetch to ensure data consistency
      if (tournamentId) {
        queryClient.invalidateQueries({ queryKey: tournamentQueryKey });
        // Invalidate tournament-specific available referees
        queryClient.invalidateQueries({ queryKey: ['available-referees', tournamentId] });
      }
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'field-referees' ||
          query.queryKey[0] === 'tournament-fields' ||
          query.queryKey[0] === 'available-referees'
      });
    }
  });
}
