import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unifiedWebSocketService } from '@/lib/unified-websocket';
import { apiClient } from '@/lib/api-client';
import { QueryKeys } from '@/lib/query-keys';
import { MatchStatus, MatchData, MatchStateData } from '@/types/types';

export interface UnifiedMatchControlOptions {
  tournamentId: string;
  fieldId?: string;
  selectedMatchId?: string;
}

export interface MatchControlState {
  selectedMatch: any | null;
  matchStatus: MatchStatus;
  currentPeriod: 'auto' | 'teleop' | 'endgame' | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Unified Match Control Hook
 * Replaces existing match update logic with unified WebSocket service
 * Implements field-specific match filtering and match status synchronization
 */
export function useUnifiedMatchControl({
  tournamentId,
  fieldId,
  selectedMatchId
}: UnifiedMatchControlOptions) {
  const queryClient = useQueryClient();
  
  // Local state for match control
  const [matchState, setMatchState] = useState<MatchControlState>({
    selectedMatch: null,
    matchStatus: MatchStatus.PENDING,
    currentPeriod: null,
    isLoading: false,
    error: null
  });

  // Fetch selected match details with optimized caching
  const { data: selectedMatch, isLoading: isLoadingMatch } = useQuery({
    queryKey: QueryKeys.matches.byId(selectedMatchId || ''),
    queryFn: () => selectedMatchId ? apiClient.get(`/matches/${selectedMatchId}`) : null,
    enabled: !!selectedMatchId,
    staleTime: 30 * 1000, // Increased to 30 seconds to reduce unnecessary calls
    refetchInterval: false, // Disable automatic refetching, rely on WebSocket updates
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
  });

  // Update match status mutation
  const updateMatchStatusMutation = useMutation({
    mutationFn: async ({ matchId, status }: { matchId: string; status: MatchStatus }) => {
      return apiClient.patch(`/matches/${matchId}`, { status });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.matches.byId(data.id) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.matches.all() });
    },
    onError: (error) => {
      console.error('Failed to update match status:', error);
      setMatchState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update match status'
      }));
    },
  });

  // Update local match state when selected match changes
  useEffect(() => {
    if (selectedMatch) {
      setMatchState(prev => ({
        ...prev,
        selectedMatch,
        matchStatus: selectedMatch.status || MatchStatus.PENDING,
        isLoading: isLoadingMatch,
        error: null
      }));
    }
  }, [selectedMatch, isLoadingMatch]);

  // Send match update through unified WebSocket service
  const sendMatchUpdate = useCallback((matchData: Partial<MatchData>) => {
    if (!selectedMatchId) {
      console.warn('[useUnifiedMatchControl] No match selected for update');
      return;
    }

    const updateData: MatchData = {
      id: selectedMatchId,
      matchNumber: selectedMatch?.matchNumber || 0,
      status: matchData.status || matchState.matchStatus,
      tournamentId,
      fieldId,
      ...matchData
    };

    // Apply field-specific filtering - only send if fieldId matches or is global
    if (!fieldId || updateData.fieldId === fieldId) {
      console.log('[useUnifiedMatchControl] Sending match update:', updateData);
      unifiedWebSocketService.sendMatchUpdate(updateData);
    }
  }, [selectedMatchId, selectedMatch, matchState.matchStatus, tournamentId, fieldId]);

  // Send match state change through unified WebSocket service
  const sendMatchStateChange = useCallback((stateData: Partial<MatchStateData>) => {
    if (!selectedMatchId) {
      console.warn('[useUnifiedMatchControl] No match selected for state change');
      return;
    }

    const stateChangeData: MatchStateData = {
      matchId: selectedMatchId,
      status: stateData.status || matchState.matchStatus,
      currentPeriod: stateData.currentPeriod || matchState.currentPeriod,
      tournamentId,
      fieldId,
      ...stateData
    };

    console.log('[useUnifiedMatchControl] Sending match state change:', stateChangeData);
    unifiedWebSocketService.sendMatchStateChange(stateChangeData);
  }, [selectedMatchId, matchState.matchStatus, matchState.currentPeriod, tournamentId, fieldId]);

  // Update match status with WebSocket synchronization
  const updateMatchStatus = useCallback(async (status: MatchStatus) => {
    if (!selectedMatchId) {
      setMatchState(prev => ({ ...prev, error: 'No match selected' }));
      return;
    }

    // Check if status is already the current status to avoid unnecessary updates
    if (matchState.matchStatus === status) {
      console.log(`[useUnifiedMatchControl] Status already ${status}, skipping update`);
      return;
    }

    try {
      setMatchState(prev => ({ ...prev, isLoading: true, error: null }));

      // Update database only if status has changed
      await updateMatchStatusMutation.mutateAsync({ matchId: selectedMatchId, status });

      // Update local state
      setMatchState(prev => ({
        ...prev,
        matchStatus: status,
        isLoading: false
      }));

      // Send WebSocket updates only after successful database update
      sendMatchUpdate({ status });
      sendMatchStateChange({ status });

    } catch (error) {
      console.error('[useUnifiedMatchControl] Failed to update match status:', error);
      setMatchState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update match status'
      }));
    }
  }, [selectedMatchId, matchState.matchStatus, updateMatchStatusMutation, sendMatchUpdate, sendMatchStateChange]);

  // Update match period with WebSocket synchronization
  const updateMatchPeriod = useCallback((period: 'auto' | 'teleop' | 'endgame' | null) => {
    if (!selectedMatchId) {
      setMatchState(prev => ({ ...prev, error: 'No match selected' }));
      return;
    }

    // Check if period is already the current period to avoid unnecessary updates
    if (matchState.currentPeriod === period) {
      console.log(`[useUnifiedMatchControl] Period already ${period}, skipping update`);
      return;
    }

    console.log('[useUnifiedMatchControl] Updating match period:', period);

    // Update local state
    setMatchState(prev => ({
      ...prev,
      currentPeriod: period
    }));

    // Send WebSocket state change
    sendMatchStateChange({ currentPeriod: period });
  }, [selectedMatchId, matchState.currentPeriod, sendMatchStateChange]);

  // Start match (set to IN_PROGRESS)
  const startMatch = useCallback(() => {
    updateMatchStatus(MatchStatus.IN_PROGRESS);
  }, [updateMatchStatus]);

  // Complete match (set to COMPLETED)
  const completeMatch = useCallback(() => {
    updateMatchStatus(MatchStatus.COMPLETED);
  }, [updateMatchStatus]);

  // Reset match (set to PENDING)
  const resetMatch = useCallback(() => {
    updateMatchStatus(MatchStatus.PENDING);
    updateMatchPeriod(null);
  }, [updateMatchStatus, updateMatchPeriod]);

  // Listen for incoming match updates from other clients
  useEffect(() => {
    if (!tournamentId) return;

    const handleMatchUpdate = (data: MatchData) => {
      console.log('[useUnifiedMatchControl] Received match update:', data);

      // Apply field-specific filtering
      if (fieldId && data.fieldId && data.fieldId !== fieldId) {
        console.log('[useUnifiedMatchControl] Ignoring match update for different field:', data.fieldId);
        return;
      }

      // Update local state if this is for our selected match
      if (data.id === selectedMatchId) {
        setMatchState(prev => ({
          ...prev,
          matchStatus: (data.status as MatchStatus) || prev.matchStatus
        }));
      }
    };

    const handleMatchStateChange = (data: MatchStateData) => {
      console.log('[useUnifiedMatchControl] Received match state change:', data);

      // Apply field-specific filtering
      if (fieldId && data.fieldId && data.fieldId !== fieldId) {
        console.log('[useUnifiedMatchControl] Ignoring match state change for different field:', data.fieldId);
        return;
      }

      // Update local state if this is for our selected match
      if (data.matchId === selectedMatchId) {
        setMatchState(prev => ({
          ...prev,
          matchStatus: (data.status as MatchStatus) || prev.matchStatus,
          currentPeriod: data.currentPeriod || prev.currentPeriod
        }));
      }
    };

    // Subscribe to unified WebSocket events
    const unsubscribeMatchUpdate = unifiedWebSocketService.on('match_update', handleMatchUpdate);
    const unsubscribeMatchStateChange = unifiedWebSocketService.on('match_state_change', handleMatchStateChange);

    return () => {
      unsubscribeMatchUpdate();
      unsubscribeMatchStateChange();
    };
  }, [tournamentId, fieldId, selectedMatchId]);

  // Join collaborative session when match is selected
  useEffect(() => {
    if (selectedMatchId) {
      console.log('[useUnifiedMatchControl] Joining collaborative session for match:', selectedMatchId);
      unifiedWebSocketService.joinCollaborativeSession(selectedMatchId);

      return () => {
        console.log('[useUnifiedMatchControl] Leaving collaborative session for match:', selectedMatchId);
        unifiedWebSocketService.leaveCollaborativeSession(selectedMatchId);
      };
    }
  }, [selectedMatchId]);

  return {
    // State
    matchState,
    selectedMatch,
    isLoading: matchState.isLoading || isLoadingMatch,
    error: matchState.error,

    // Actions
    updateMatchStatus,
    updateMatchPeriod,
    startMatch,
    completeMatch,
    resetMatch,
    sendMatchUpdate,
    sendMatchStateChange,

    // Getters
    getCurrentStatus: () => matchState.matchStatus,
    getCurrentPeriod: () => matchState.currentPeriod,
    isMatchSelected: () => !!selectedMatchId,
    getSelectedMatchId: () => selectedMatchId,
  };
}