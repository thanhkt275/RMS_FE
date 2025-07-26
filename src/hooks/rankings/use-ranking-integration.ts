/**
 * Ranking Integration Hook
 *
 * Hook for integrating ranking updates with the existing scoring system.
 * Automatically triggers ranking updates when match scores are submitted.
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { RankingService } from '@/services/ranking.service';
import webSocketService from '@/services/websocket-service';
import { RankingQueryKeys } from './use-real-time-rankings';
import { ScoreData } from '@/types/types';
import { RankingUpdateEvent } from '@/types/ranking.types';

/**
 * Options for ranking integration
 */
export interface RankingIntegrationOptions {
  autoUpdate?: boolean;
  showNotifications?: boolean;
  debounceMs?: number;
}

/**
 * Return type for ranking integration hook
 */
export interface UseRankingIntegrationReturn {
  triggerRankingUpdate: (tournamentId: string, stageId?: string) => Promise<void>;
  isUpdatingRankings: boolean;
  lastUpdateTime?: Date;
}

/**
 * Hook for integrating ranking updates with scoring
 */
export function useRankingIntegration(
  options: RankingIntegrationOptions = {}
): UseRankingIntegrationReturn {
  const {
    autoUpdate = true,
    showNotifications = true,
  } = options;

  const queryClient = useQueryClient();

  // Mutation for triggering ranking updates
  const updateRankingsMutation = useMutation({
    mutationFn: async ({ tournamentId, stageId }: { tournamentId: string; stageId?: string }) => {
      await RankingService.updateRankings(tournamentId, stageId);
      return { tournamentId, stageId };
    },
    onSuccess: ({ tournamentId, stageId }) => {
      // Invalidate ranking queries to trigger refetch
      queryClient.invalidateQueries({
        queryKey: RankingQueryKeys.tournament(tournamentId),
      });

      if (stageId) {
        queryClient.invalidateQueries({
          queryKey: RankingQueryKeys.stage(stageId),
        });
      }

      // Emit WebSocket event for real-time updates
      if (webSocketService.isConnectedToServer()) {
        webSocketService.sendRankingRecalculation({
          type: 'ranking_recalculation_completed',
          tournamentId,
          stageId,
          timestamp: Date.now(),
        });
      }

      if (showNotifications) {
        toast.success('Rankings updated successfully');
      }
    },
    onError: (error) => {
      console.error('Failed to update rankings:', error);
      if (showNotifications) {
        toast.error('Failed to update rankings', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
        });
      }
    },
  });

  // Trigger ranking update function
  const triggerRankingUpdate = useCallback(async (tournamentId: string, stageId?: string) => {
    if (!autoUpdate) return;

    try {
      await updateRankingsMutation.mutateAsync({ tournamentId, stageId });
    } catch (error) {
      // Error is already handled in the mutation
      console.error('Ranking update failed:', error);
    }
  }, [autoUpdate, updateRankingsMutation]);

  return {
    triggerRankingUpdate,
    isUpdatingRankings: updateRankingsMutation.isPending,
    lastUpdateTime: updateRankingsMutation.data ? new Date() : undefined,
  };
}

/**
 * Hook for automatically triggering ranking updates after score submission
 */
export function useScoreSubmissionIntegration(
  tournamentId: string,
  stageId?: string,
  options: RankingIntegrationOptions = {}
) {
  const { triggerRankingUpdate, isUpdatingRankings } = useRankingIntegration(options);

  // Enhanced score submission function that triggers ranking updates
  const submitScoreWithRankingUpdate = useCallback(async (scoreData: ScoreData) => {
    // First submit the score (this would be called from the existing scoring system)
    // The actual score submission is handled by the existing match service

    // Then trigger ranking update
    if (scoreData.tournamentId) {
      await triggerRankingUpdate(scoreData.tournamentId, stageId);
    }
  }, [triggerRankingUpdate, stageId]);

  return {
    submitScoreWithRankingUpdate,
    triggerRankingUpdate,
    isUpdatingRankings,
  };
}

/**
 * Hook for batch ranking updates (useful for multiple match completions)
 */
export function useBatchRankingUpdate(options: RankingIntegrationOptions = {}) {
  const { triggerRankingUpdate, isUpdatingRankings } = useRankingIntegration(options);

  // Batch update function
  const batchUpdateRankings = useCallback(async (
    updates: Array<{ tournamentId: string; stageId?: string }>
  ) => {
    // Group by tournament to avoid duplicate updates
    const tournamentGroups = updates.reduce((groups, update) => {
      const key = update.tournamentId;
      if (!groups[key]) {
        groups[key] = { tournamentId: update.tournamentId, stageIds: new Set<string>() };
      }
      if (update.stageId) {
        groups[key].stageIds.add(update.stageId);
      }
      return groups;
    }, {} as Record<string, { tournamentId: string; stageIds: Set<string> }>);

    // Execute updates for each tournament
    const promises = Object.values(tournamentGroups).map(async (group) => {
      // If we have specific stages, update each stage
      if (group.stageIds.size > 0) {
        const stagePromises = Array.from(group.stageIds).map(stageId =>
          triggerRankingUpdate(group.tournamentId, stageId)
        );
        await Promise.all(stagePromises);
      } else {
        // Update tournament-wide rankings
        await triggerRankingUpdate(group.tournamentId);
      }
    });

    await Promise.all(promises);
  }, [triggerRankingUpdate]);

  return {
    batchUpdateRankings,
    isUpdatingRankings,
  };
}

/**
 * Utility function to extract tournament and stage info from score data
 */
export function extractRankingContext(scoreData: ScoreData): {
  tournamentId: string;
  stageId?: string;
} {
  return {
    tournamentId: scoreData.tournamentId,
    // Note: stageId would need to be added to ScoreData type or derived from match data
    stageId: undefined, // TODO: Extract from match context
  };
}

/**
 * Hook for monitoring ranking update events
 */
export function useRankingUpdateMonitor(tournamentId: string, stageId?: string) {
  const queryClient = useQueryClient();

  // Listen for ranking update events and invalidate queries
  const handleRankingUpdate = useCallback((event: RankingUpdateEvent) => {
    if (event.tournamentId === tournamentId && (!stageId || event.stageId === stageId)) {
      // Invalidate and refetch ranking data
      queryClient.invalidateQueries({
        queryKey: RankingQueryKeys.live(tournamentId, stageId),
      });
    }
  }, [tournamentId, stageId, queryClient]);

  // Set up WebSocket listeners (this would be called in a useEffect)
  const setupListeners = useCallback(() => {
    const unsubscribe = webSocketService.on('ranking_update', handleRankingUpdate);
    return unsubscribe;
  }, [handleRankingUpdate]);

  return {
    setupListeners,
    handleRankingUpdate,
  };
}
