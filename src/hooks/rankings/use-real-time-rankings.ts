/**
 * Real-time Rankings Hook
 *
 * Custom hook for managing real-time tournament and stage rankings.
 * Integrates with WebSocket for live updates and React Query for caching.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { RankingService } from '@/services/ranking.service';
import { unifiedWebSocketService } from '@/lib/unified-websocket';
import {
  RankingUpdateEvent,
  RankingRecalculationEvent,
  UseRealTimeRankingsOptions,
  UseRealTimeRankingsReturn,
  DEFAULT_RANKING_CONFIG,
  RankingTableState
} from '@/types/ranking.types';

/**
 * Query keys for ranking data
 */
export const RankingQueryKeys = {
  all: ['rankings'] as const,
  tournaments: () => [...RankingQueryKeys.all, 'tournaments'] as const,
  tournament: (id: string) => [...RankingQueryKeys.tournaments(), id] as const,
  stages: () => [...RankingQueryKeys.all, 'stages'] as const,
  stage: (id: string) => [...RankingQueryKeys.stages(), id] as const,
  live: (tournamentId: string, stageId?: string) => [
    ...RankingQueryKeys.tournament(tournamentId),
    'live',
    stageId || 'all'
  ] as const,
};

/**
 * Hook for real-time tournament/stage rankings
 */
export function useRealTimeRankings(
  tournamentId: string,
  stageId?: string,
  options: UseRealTimeRankingsOptions = {}
): UseRealTimeRankingsReturn {
  const {
    enabled = true,
    config = {},
    onUpdate,
    onError,
    staleTime = 30000, // 30 seconds
    refetchInterval = 60000, // 1 minute fallback
  } = options;

  const finalConfig = { ...DEFAULT_RANKING_CONFIG, ...config };
  const queryClient = useQueryClient();

  // Local state for real-time updates
  const [state, setState] = useState<RankingTableState>({
    rankings: [],
    isLoading: true,
    isConnected: false,
    updateCount: 0,
    isRecalculating: false,
  });

  // Refs for stable callbacks
  const onUpdateRef = useRef(onUpdate);
  const onErrorRef = useRef(onError);
  onUpdateRef.current = onUpdate;
  onErrorRef.current = onError;

  // Query key for this specific ranking request
  const queryKey = RankingQueryKeys.live(tournamentId, stageId);

  // React Query for initial data and fallback
  const {
    data: queryData,
    isLoading: queryLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (stageId) {
        return RankingService.getStageRankings(stageId);
      } else {
        return RankingService.getTournamentRankings(tournamentId);
      }
    },
    enabled: enabled && !!tournamentId,
    staleTime,
    refetchInterval: finalConfig.autoUpdate ? refetchInterval : false,
    retry: finalConfig.maxRetries,
    throwOnError: false,
  });

  // Update local state when query data changes
  useEffect(() => {
    if (queryData) {
      setState(prev => ({
        ...prev,
        rankings: queryData,
        isLoading: false,
        error: undefined,
        lastUpdate: new Date(),
      }));
      onUpdateRef.current?.(queryData);
    }
  }, [queryData]);

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      console.error('Failed to fetch rankings:', queryError);
      onErrorRef.current?.(queryError as Error);
      setState(prev => ({
        ...prev,
        error: (queryError as Error).message,
        isLoading: false
      }));
    }
  }, [queryError]);

  // WebSocket connection status
  useEffect(() => {
    const updateConnectionStatus = () => {
      setState(prev => ({
        ...prev,
        isConnected: unifiedWebSocketService.isConnected(),
      }));
    };

    // Initial status
    updateConnectionStatus();

    // Poll connection status periodically
    const interval = setInterval(updateConnectionStatus, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Handle ranking updates from WebSocket
  const handleRankingUpdate = useCallback((event: RankingUpdateEvent) => {
    // Only process updates for our tournament/stage
    if (event.tournamentId !== tournamentId) return;
    if (stageId && event.stageId !== stageId) return;

    console.log('Received ranking update:', event);

    setState(prev => {
      const oldRankings = prev.rankings;
      const newRankings = event.rankings;

      // Compare rankings to detect changes
      const comparisons = RankingService.compareRankings(oldRankings, newRankings);

      // Apply changes with update metadata
      const updatedRankings = RankingService.applyRankingChanges(newRankings, comparisons);

      const hasChanges = comparisons.some(c => c.rankChange !== 'same' || c.pointsChange !== 0);

      if (hasChanges) {
        // Show toast notification for significant changes
        const rankChanges = comparisons.filter(c => c.rankChange !== 'same');
        if (rankChanges.length > 0) {
          toast.info(`Rankings updated`, {
            description: `${rankChanges.length} team(s) changed position`,
          });
        }
      }

      return {
        ...prev,
        rankings: updatedRankings,
        lastUpdate: new Date(event.timestamp),
        updateCount: prev.updateCount + 1,
        error: undefined,
      };
    });

    // Update React Query cache
    queryClient.setQueryData(queryKey, event.rankings);

    // Call update callback
    onUpdateRef.current?.(event.rankings);
  }, [tournamentId, stageId, queryClient, queryKey]);

  // Handle ranking recalculation events
  const handleRecalculationEvent = useCallback((event: RankingRecalculationEvent) => {
    if (event.tournamentId !== tournamentId) return;
    if (stageId && event.stageId !== stageId) return;

    console.log('Received recalculation event:', event);

    setState(prev => ({
      ...prev,
      isRecalculating: event.type === 'ranking_recalculation_started',
    }));

    if (event.type === 'ranking_recalculation_completed') {
      // Refetch data after recalculation
      queryRefetch();
      toast.success('Rankings recalculated successfully');
    } else if (event.type === 'ranking_recalculation_failed') {
      toast.error('Failed to recalculate rankings', {
        description: event.error || 'An unexpected error occurred',
      });
    }
  }, [tournamentId, stageId, queryRefetch]);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!finalConfig.autoUpdate || !enabled) return;

    console.log('Subscribing to ranking updates for tournament:', tournamentId);

    // Subscribe to ranking updates
    const unsubscribeRankingUpdate = unifiedWebSocketService.on('ranking_update', handleRankingUpdate);
    const unsubscribeRecalculation = unifiedWebSocketService.on('ranking_recalculation', handleRecalculationEvent);

    // Join tournament room for updates
    if (unifiedWebSocketService.isConnected()) {
      unifiedWebSocketService.joinTournament(tournamentId);
    }

    return () => {
      unsubscribeRankingUpdate();
      unsubscribeRecalculation();
    };
  }, [tournamentId, finalConfig.autoUpdate, enabled, handleRankingUpdate, handleRecalculationEvent]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await queryRefetch();
    } catch (error) {
      console.error('Manual refetch failed:', error);
      onErrorRef.current?.(error as Error);
    }
  }, [queryRefetch]);

  // Manual recalculation function
  const recalculate = useCallback(async () => {
    setState(prev => ({ ...prev, isRecalculating: true }));
    try {
      await RankingService.recalculateRankings(tournamentId, stageId);
      toast.info('Ranking recalculation started');
    } catch (error) {
      console.error('Recalculation failed:', error);
      setState(prev => ({ ...prev, isRecalculating: false }));
      onErrorRef.current?.(error as Error);
      toast.error('Failed to start recalculation');
    }
  }, [tournamentId, stageId]);

  // Subscribe/unsubscribe functions
  const subscribe = useCallback(() => {
    if (unifiedWebSocketService.isConnected()) {
      unifiedWebSocketService.joinTournament(tournamentId);
    }
  }, [tournamentId]);

  const unsubscribe = useCallback(() => {
    // Note: We don't leave the tournament room as other components might need it
    // This is just for manual control if needed
  }, []);

  return {
    rankings: state.rankings,
    isLoading: queryLoading || state.isLoading,
    isConnected: state.isConnected,
    lastUpdate: state.lastUpdate,
    error: queryError?.message || state.error,
    updateCount: state.updateCount,
    isRecalculating: state.isRecalculating,
    refetch,
    recalculate,
    subscribe,
    unsubscribe,
  };
}
