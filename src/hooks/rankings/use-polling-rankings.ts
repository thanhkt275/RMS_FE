/**
 * Polling-based Rankings Hook
 *
 * Custom hook for managing tournament and stage rankings using intelligent polling
 * instead of WebSocket connections. Automatically detects match result changes
 * and updates rankings accordingly.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/common/use-auth';

import { apiClient } from '@/lib/api-client';

import {
  RealTimeRanking,
  RankingTableState,
  UseRealTimeRankingsOptions,
  UseRealTimeRankingsReturn
} from '@/types/ranking.types';
import type { Team } from '@/types/types';
import type { TournamentTeamStats } from '../tournaments/use-tournament-stats';

export interface PollingConfig {
  enabled: boolean;
  baseInterval: number; // Base polling interval in ms
  activeInterval: number; // Faster polling when activity detected
  maxInterval: number; // Maximum polling interval
  backoffMultiplier: number; // Multiplier for exponential backoff
  activityWindow: number; // Time window to consider recent activity
}

export interface MatchChangeDetection {
  lastMatchUpdate: number;
  lastRankingUpdate: number;
  recentMatchIds: Set<string>;
  changeDetected: boolean;
}

const DEFAULT_POLLING_CONFIG: PollingConfig = {
  enabled: true,
  baseInterval: 15000, // 15 seconds (reduced from 30)
  activeInterval: 5000, // 5 seconds when active (reduced from 10)
  maxInterval: 60000, // 1 minute max (reduced from 2 minutes)
  backoffMultiplier: 1.5,
  activityWindow: 300000, // 5 minutes
};

/**
 * Hook for polling-based tournament/stage rankings
 */
export function usePollingRankings(
  tournamentId: string,
  stageId?: string,
  options: UseRealTimeRankingsOptions = {}
): UseRealTimeRankingsReturn {
  const {
    enabled = true,
    onUpdate,
    onError,
  } = options;

  // Get authentication context
  const { user } = useAuth();
  const isAuthenticated = !!user;

  const pollingConfig = { ...DEFAULT_POLLING_CONFIG };
  const queryClient = useQueryClient();

  // Local state for rankings and polling
  const [state, setState] = useState<RankingTableState>({
    rankings: [],
    isLoading: false, // Start as false, will be set to true during actual loading
    isConnected: true, // Always "connected" for polling
    updateCount: 0,
    isRecalculating: false,
  });

  const [currentInterval, setCurrentInterval] = useState(pollingConfig.baseInterval);
  const [matchChangeDetection, setMatchChangeDetection] = useState<MatchChangeDetection>({
    lastMatchUpdate: 0,
    lastRankingUpdate: 0,
    recentMatchIds: new Set(),
    changeDetected: false,
  });

  // Refs for stable callbacks and polling control
  const onUpdateRef = useRef(onUpdate);
  const onErrorRef = useRef(onError);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  onUpdateRef.current = onUpdate;
  onErrorRef.current = onError;

  // Query key for this specific ranking request
  const queryKey = ['rankings', tournamentId, stageId || 'all'];

  /**
   * Check for recent match updates that might affect rankings
   */
  const checkForMatchUpdates = useCallback(async (): Promise<boolean> => {
    try {
      // Build query parameters
      const params = new URLSearchParams({
        tournamentId,
        since: matchChangeDetection.lastMatchUpdate.toString(),
        limit: '50',
      });

      if (stageId) {
        params.append('stageId', stageId);
      }

      const response = await apiClient.get(`/matches/recent-updates?${params.toString()}`);

      const recentMatches = Array.isArray(response) ? response : [];
      const hasNewMatches = recentMatches.length > 0;

      if (hasNewMatches) {
        const newMatchIds = new Set(recentMatches.map((m: any) => m.id));
        const hasNewCompletedMatches = recentMatches.some(
          (m: any) => m.status === 'COMPLETED' && !matchChangeDetection.recentMatchIds.has(m.id)
        );

        setMatchChangeDetection(prev => ({
          ...prev,
          lastMatchUpdate: Date.now(),
          recentMatchIds: new Set([...prev.recentMatchIds, ...newMatchIds]),
          changeDetected: hasNewCompletedMatches,
        }));

        return hasNewCompletedMatches;
      }

      return false;
    } catch (error) {
      console.warn('[PollingRankings] Error checking for match updates:', error);
      return false;
    }
  }, [tournamentId, stageId, matchChangeDetection.lastMatchUpdate, matchChangeDetection.recentMatchIds]);

  /**
   * Merge tournament stats with complete team roster
   */
  const mergeStatsWithTeamRoster = useCallback((
    tournamentStats: TournamentTeamStats[],
    tournamentTeams: Team[]
  ): RealTimeRanking[] => {
    console.log('[PollingRankings] Merging stats with team roster');

    // Create a map of team stats by team ID for quick lookup
    const statsMap = new Map<string, TournamentTeamStats>();
    tournamentStats.forEach(stat => {
      const teamId = stat.teamId || stat.team?.id;
      if (teamId) {
        statsMap.set(teamId, stat);
      }
    });

    // Create ranking rows for all teams
    const allTeamRankings = tournamentTeams.map((team) => {
      const stats = statsMap.get(team.id);

      if (stats) {
        // Team has stats - use actual data
        return {
          teamId: team.id,
          teamName: team.name,
          teamNumber: team.teamNumber,
          rank: stats.rank ?? 0,
          pointsScored: stats.pointsScored ?? stats.totalScore ?? 0,
          pointsConceded: stats.pointsConceded ?? 0,
          pointDifferential: stats.pointDifferential ?? 0,
          wins: stats.wins ?? 0,
          losses: stats.losses ?? 0,
          ties: stats.ties ?? 0,
          rankingPoints: stats.rankingPoints ?? 0,
          tiebreaker1: stats.tiebreaker1 ?? 0,
          tiebreaker2: stats.tiebreaker2 ?? 0,
          lastUpdated: new Date(),
          isUpdated: false,
          updateSource: 'initial' as const,
        } as RealTimeRanking;
      } else {
        // Team has no stats - use default values
        return {
          teamId: team.id,
          teamName: team.name,
          teamNumber: team.teamNumber,
          rank: 0,
          pointsScored: 0,
          pointsConceded: 0,
          pointDifferential: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          rankingPoints: 0,
          tiebreaker1: 0,
          tiebreaker2: 0,
          lastUpdated: new Date(),
          isUpdated: false,
          updateSource: 'initial' as const,
        } as RealTimeRanking;
      }
    });

    // Sort teams: teams with stats first, then teams without stats
    const sortedRankings = allTeamRankings.sort((a, b) => {
      const aHasPlayed = (a.wins + a.losses + a.ties) > 0;
      const bHasPlayed = (b.wins + b.losses + b.ties) > 0;

      // Teams with matches played rank higher
      if (aHasPlayed && !bHasPlayed) return -1;
      if (!aHasPlayed && bHasPlayed) return 1;

      // If both have played, sort by ranking criteria
      if (aHasPlayed && bHasPlayed) {
        if (a.rankingPoints !== b.rankingPoints) return b.rankingPoints - a.rankingPoints;
        if (a.pointDifferential !== b.pointDifferential) return b.pointDifferential - a.pointDifferential;
        return b.pointsScored - a.pointsScored;
      }

      // If neither has played, sort alphabetically
      return a.teamName.localeCompare(b.teamName);
    });

    // Assign final ranks
    const finalRankings = sortedRankings.map((ranking, index) => ({
      ...ranking,
      rank: index + 1,
    }));

    console.log(`[PollingRankings] Final rankings: ${finalRankings.length} teams (${tournamentStats.length} with stats)`);
    return finalRankings;
  }, []);

  /**
   * Fetch rankings data from API with complete team roster
   */
  const fetchRankings = useCallback(async (): Promise<RealTimeRanking[]> => {
    try {
      if (!tournamentId) {
        console.log('[PollingRankings] No tournament ID provided');
        return [];
      }

      // Note: Removed authentication check for initial load to show data immediately
      // Authentication will be handled by the API client and polling will retry if needed

      if (stageId) {
        // For stage rankings, fetch both stats and complete stage team roster
        console.log('[PollingRankings] Fetching stage stats and teams for complete roster');
        console.log('[PollingRankings] Stage ID:', stageId);
        console.log('[PollingRankings] Tournament ID:', tournamentId);
        console.log('[PollingRankings] User authenticated:', user?.email || 'unknown');
        console.log('[PollingRankings] Stage stats API URL:', `/stages/${stageId}/rankings`);
        console.log('[PollingRankings] Stage teams API URL:', `/stages/${stageId}/teams`);

        const [stageStatsResponse, stageTeamsResponse] = await Promise.all([
          apiClient.get(`/stages/${stageId}/rankings`).catch((error) => {
            console.error('[PollingRankings] Error fetching stage stats:', error);
            console.error('[PollingRankings] Stage stats error details:', error.status, error.message);
            return { success: false, data: [] };
          }),
          apiClient.get(`/stages/${stageId}/teams`).catch((error) => {
            console.error('[PollingRankings] Error fetching stage teams:', error);
            console.error('[PollingRankings] Stage teams error details:', error.status, error.message);

            // If authentication fails, try to show some basic data structure
            if (error.status === 401 || error.status === 403) {
              console.log('[PollingRankings] Authentication failed for stage teams, showing placeholder data');
            }
            return { success: false, data: [] };
          })
        ]);

        console.log('[PollingRankings] Raw stage stats response:', stageStatsResponse);
        console.log('[PollingRankings] Raw stage teams response:', stageTeamsResponse);

        // Extract data from API responses
        const stageStats = (stageStatsResponse?.success && Array.isArray(stageStatsResponse.data))
          ? stageStatsResponse.data
          : [];
        const stageTeamsData = (stageTeamsResponse?.success && Array.isArray(stageTeamsResponse.data))
          ? stageTeamsResponse.data
          : [];

        // Transform stage teams data to match Team interface
        let stageTeams: Team[] = stageTeamsData.map((team: any) => ({
          id: team.teamId,
          name: team.teamName,
          teamNumber: team.teamNumber,
          tournamentId: tournamentId || '',
          organization: team.organization,
          userId: team.userId || '',
          referralSource: team.referralSource || '',
        }));

        // Fallback: If no teams are assigned to this stage, use tournament teams
        // This handles the common case where this is the first stage and teams
        // haven't been formally advanced to it yet
        if (stageTeams.length === 0 && tournamentId) {
          console.log('[PollingRankings] No stage teams found, falling back to tournament teams');

          try {
            const tournamentTeamsResponse = await apiClient.get(`/teams?tournamentId=${tournamentId}`).catch((error) => {
              console.error('[PollingRankings] Error fetching tournament teams for stage fallback:', error);
              return [];
            });

            const tournamentTeamsData = Array.isArray(tournamentTeamsResponse) ? tournamentTeamsResponse : [];

            stageTeams = tournamentTeamsData.map((team: any) => ({
              id: team.id,
              name: team.name,
              teamNumber: team.teamNumber,
              tournamentId: team.tournamentId,
              organization: team.organization,
              userId: team.userId || '',
              referralSource: team.referralSource || '',
            }));

            console.log('[PollingRankings] Fallback successful - using', stageTeams.length, 'tournament teams for stage');
          } catch (error) {
            console.error('[PollingRankings] Fallback to tournament teams failed:', error);
          }
        }

        console.log('[PollingRankings] Stage stats:', stageStats.length);
        console.log('[PollingRankings] Stage teams:', stageTeams.length);

        if (stageTeams.length > 0) {
          console.log('[PollingRankings] Stage teams data:', stageTeams.map(t => ({
            id: t.id,
            name: t.name,
            number: t.teamNumber,
            tournamentId: t.tournamentId
          })));
        } else {
          console.log('[PollingRankings] No stage teams found - this is likely the first stage where teams haven\'t been formally assigned yet');
          console.log('[PollingRankings] Will fallback to tournament teams for complete roster');
        }

        // Transform stage stats to TournamentTeamStats format for merging
        const transformedStageStats: TournamentTeamStats[] = stageStats.map((stat: any) => ({
          teamId: stat.teamId,
          teamNumber: stat.teamNumber,
          teamName: stat.teamName,
          wins: stat.wins || 0,
          losses: stat.losses || 0,
          ties: stat.ties || 0,
          pointsScored: stat.pointsScored || 0,
          pointsConceded: stat.pointsConceded || 0,
          pointDifferential: stat.pointDifferential || 0,
          rankingPoints: stat.rankingPoints || 0,
          tiebreaker1: stat.tiebreaker1 || 0,
          tiebreaker2: stat.tiebreaker2 || 0,
          rank: stat.rank,
        }));

        // Merge stage stats with complete stage team roster
        return mergeStatsWithTeamRoster(transformedStageStats, stageTeams);
      } else {
        // For tournament rankings, fetch both stats and complete team roster
        console.log('[PollingRankings] Fetching tournament stats and teams for complete roster');
        console.log('[PollingRankings] Tournament ID:', tournamentId);
        console.log('[PollingRankings] User authenticated:', user?.email || 'unknown');
        console.log('[PollingRankings] Stats API URL:', `/team-stats/tournament/${tournamentId}`);
        console.log('[PollingRankings] Teams API URL:', `/teams?tournamentId=${tournamentId}`);

        const [tournamentStatsResponse, tournamentTeamsResponse] = await Promise.all([
          apiClient.get(`/team-stats/tournament/${tournamentId}`).catch((error) => {
            console.error('[PollingRankings] Error fetching tournament stats:', error);
            console.error('[PollingRankings] Stats error details:', error.status, error.message);
            return [];
          }),
          apiClient.get(`/teams?tournamentId=${tournamentId}`).catch((error) => {
            console.error('[PollingRankings] Error fetching tournament teams:', error);
            console.error('[PollingRankings] Teams error details:', error.status, error.message);

            // If authentication fails, try to show some basic data structure
            if (error.status === 401 || error.status === 403) {
              console.log('[PollingRankings] Authentication failed, showing placeholder data');
              // Return empty array for now, but could return demo data structure
            }
            return [];
          })
        ]);

        console.log('[PollingRankings] Raw stats response:', tournamentStatsResponse);
        console.log('[PollingRankings] Raw teams response:', tournamentTeamsResponse);

        const tournamentStats: TournamentTeamStats[] = Array.isArray(tournamentStatsResponse)
          ? tournamentStatsResponse
          : [];
        const tournamentTeams: Team[] = Array.isArray(tournamentTeamsResponse)
          ? tournamentTeamsResponse
          : [];

        console.log('[PollingRankings] Tournament stats:', tournamentStats.length);
        console.log('[PollingRankings] Tournament teams:', tournamentTeams.length);

        if (tournamentTeams.length > 0) {
          console.log('[PollingRankings] Tournament teams data:', tournamentTeams.map(t => ({
            id: t.id,
            name: t.name,
            number: t.teamNumber,
            tournamentId: t.tournamentId
          })));
        } else {
          console.log('[PollingRankings] No teams found - this indicates an issue with the API call or data');
        }

        // Merge stats with complete team roster
        return mergeStatsWithTeamRoster(tournamentStats, tournamentTeams);
      }
    } catch (error) {
      console.error('[PollingRankings] Error fetching rankings:', error);
      throw error;
    }
  }, [tournamentId, stageId, isAuthenticated, user?.email, mergeStatsWithTeamRoster]);

  /**
   * Main polling function
   */
  const pollForUpdates = useCallback(async () => {
    if (!enabled || !tournamentId || !isAuthenticated || isPollingRef.current) {
      return;
    }

    isPollingRef.current = true;

    try {
      // Check for match updates first
      const hasMatchChanges = await checkForMatchUpdates();

      // If we detected changes or it's time for a regular update, fetch rankings
      const shouldUpdateRankings = hasMatchChanges || 
        (Date.now() - matchChangeDetection.lastRankingUpdate) > currentInterval;

      if (shouldUpdateRankings) {
        const newRankings = await fetchRankings();
        
        // Compare with current rankings to detect changes
        const hasRankingChanges = !arraysEqual(
          state.rankings.map(r => ({ id: r.teamId, rank: r.rank, points: r.rankingPoints })),
          newRankings.map(r => ({ id: r.teamId, rank: r.rank, points: r.rankingPoints }))
        );

        if (hasRankingChanges || hasMatchChanges) {
          setState(prev => ({
            ...prev,
            rankings: newRankings,
            lastUpdate: new Date(),
            updateCount: prev.updateCount + 1,
            error: undefined,
            isLoading: false,
          }));

          // Update React Query cache
          queryClient.setQueryData(queryKey, newRankings);

          // Call update callback
          onUpdateRef.current?.(newRankings);

          // Show notification for significant changes
          if (hasRankingChanges) {
            toast.info('Rankings updated', {
              description: `${newRankings.length} teams updated`,
            });
          }

          // Reset to active polling interval
          setCurrentInterval(pollingConfig.activeInterval);
        } else {
          // No changes detected, increase polling interval (exponential backoff)
          setCurrentInterval(prev => 
            Math.min(prev * pollingConfig.backoffMultiplier, pollingConfig.maxInterval)
          );
        }

        setMatchChangeDetection(prev => ({
          ...prev,
          lastRankingUpdate: Date.now(),
          changeDetected: false,
        }));
      }
    } catch (error) {
      console.error('[PollingRankings] Polling error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      }));
      onErrorRef.current?.(error instanceof Error ? error : new Error('Unknown error'));

      // Increase interval on error
      setCurrentInterval(prev => 
        Math.min(prev * pollingConfig.backoffMultiplier, pollingConfig.maxInterval)
      );
    } finally {
      isPollingRef.current = false;
    }
  }, [
    enabled,
    tournamentId,
    checkForMatchUpdates,
    fetchRankings,
    currentInterval,
    matchChangeDetection.lastRankingUpdate,
    state.rankings,
    queryClient,
    queryKey,
    pollingConfig,
  ]);

  /**
   * Immediate data loading on mount (before authentication check)
   */
  useEffect(() => {
    if (!enabled || !tournamentId) {
      return;
    }

    // Load data immediately without waiting for authentication
    const loadInitialData = async () => {
      try {
        console.log('[PollingRankings] Loading initial data immediately...');
        setState(prev => ({ ...prev, isLoading: true }));

        // Try to fetch data immediately (will handle auth errors gracefully)
        const rankings = await fetchRankings();

        setState(prev => ({
          ...prev,
          rankings,
          isLoading: false,
          error: undefined,
          lastUpdate: new Date(),
        }));

        console.log('[PollingRankings] Initial data loaded:', rankings.length, 'teams');
      } catch (error) {
        console.log('[PollingRankings] Initial load failed, will retry with polling:', error);
        // Don't set error state here, let polling handle it
      }
    };

    loadInitialData();
  }, [enabled, tournamentId, fetchRankings]);

  /**
   * Start/stop polling based on configuration
   */
  useEffect(() => {
    if (!enabled || !tournamentId || !isAuthenticated) {
      return;
    }

    // Set up polling interval (after authentication)
    const scheduleNextPoll = () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }

      pollingTimeoutRef.current = setTimeout(() => {
        pollForUpdates().then(scheduleNextPoll);
      }, currentInterval);
    };

    // Start polling after a short delay to allow initial load
    const initialDelay = setTimeout(() => {
      scheduleNextPoll();
    }, 1000); // 1 second delay

    // Cleanup
    return () => {
      clearTimeout(initialDelay);
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, [enabled, tournamentId, isAuthenticated, currentInterval, pollForUpdates]);

  /**
   * Manual refresh function
   */
  const refetch = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      await pollForUpdates();
      // Reset to active interval after manual refresh
      setCurrentInterval(pollingConfig.activeInterval);
    } catch (error) {
      console.error('[PollingRankings] Manual refresh error:', error);
    }
  }, [pollForUpdates, pollingConfig.activeInterval]);

  /**
   * Trigger ranking recalculation
   */
  const recalculate = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isRecalculating: true }));

      // Build query parameters for recalculation
      const params = new URLSearchParams({ tournamentId });
      if (stageId) {
        params.append('stageId', stageId);
      }

      await apiClient.post(`/team-stats/recalculate-all?${params.toString()}`);

      // Force immediate update after recalculation
      setTimeout(() => {
        pollForUpdates();
      }, 2000); // Wait 2 seconds for recalculation to complete

    } catch (error) {
      console.error('[PollingRankings] Recalculation error:', error);
      onErrorRef.current?.(error instanceof Error ? error : new Error('Recalculation failed'));
    } finally {
      setState(prev => ({ ...prev, isRecalculating: false }));
    }
  }, [tournamentId, stageId, pollForUpdates]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  return {
    rankings: state.rankings,
    isLoading: state.isLoading,
    isConnected: state.isConnected,
    lastUpdate: state.lastUpdate,
    error: state.error,
    updateCount: state.updateCount,
    isRecalculating: state.isRecalculating,
    refetch,
    recalculate,
    subscribe: () => () => {}, // No-op for polling
    unsubscribe: () => {}, // No-op for polling
  };
}

/**
 * Helper function to compare arrays for equality
 */
function arraysEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => 
    item.id === b[index].id && 
    item.rank === b[index].rank && 
    item.points === b[index].points
  );
}
