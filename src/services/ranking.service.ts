/**
 * Ranking Service
 *
 * Service for managing tournament and stage rankings with real-time capabilities.
 * Integrates with existing API endpoints and provides enhanced ranking functionality.
 */

import { apiClient } from '@/lib/api-client';
import { RealTimeRanking, RankingStats, RankingComparison } from '@/types/ranking.types';
import { TeamRanking } from '@/types/stage-advancement.types';

/**
 * API Response Types
 */
interface TournamentStatsResponse {
  teamId?: string;
  teamNumber?: string;
  teamName?: string;
  wins?: number;
  losses?: number;
  ties?: number;
  pointsScored?: number;
  pointsConceded?: number;
  pointDifferential?: number;
  rankingPoints?: number;
  tiebreaker1?: number;
  tiebreaker2?: number;
  rank?: number;
  totalScore?: number;
  opponentWinPercentage?: number;
  matchesPlayed?: number;
  team?: {
    id?: string;
    teamNumber?: string;
    name?: string;
  };
}

/**
 * Enhanced service class for ranking operations with intelligent caching
 * Integrates with caching and WebSocket services for optimal performance
 */
export class RankingService {

  /**
   * Get real-time rankings for a tournament with intelligent caching
   */
  static async getTournamentRankings(
    tournamentId: string,
    options: { useCache?: boolean; filters?: any } = {}
  ): Promise<RealTimeRanking[]> {
    const { useCache = false, filters } = options; // Default to no cache for polling

    try {
      if (useCache) {
        // Try to get from cache first (only when explicitly requested)
        const { rankingCacheService } = await import('./ranking-cache.service');
        return await rankingCacheService.getRankings(
          tournamentId,
          undefined,
          filters,
          () => this.fetchTournamentRankings(tournamentId)
        );
      } else {
        // Direct fetch without caching (preferred for polling)
        return await this.fetchTournamentRankings(tournamentId);
      }
    } catch (error) {
      console.error('Failed to fetch tournament rankings:', error);
      throw new Error('Failed to fetch tournament rankings');
    }
  }

  /**
   * Internal method to fetch tournament rankings from API
   */
  private static async fetchTournamentRankings(tournamentId: string): Promise<RealTimeRanking[]> {
    const response = await apiClient.get<TournamentStatsResponse[]>(`/team-stats/tournament/${tournamentId}`);
    return this.transformToRealTimeRankings(response);
  }

  /**
   * Get real-time rankings for a specific stage with intelligent caching
   */
  static async getStageRankings(
    stageId: string,
    options: { useCache?: boolean; tournamentId?: string; filters?: any } = {}
  ): Promise<RealTimeRanking[]> {
    const { useCache = false, tournamentId, filters } = options; // Default to no cache for polling

    try {
      if (useCache && tournamentId) {
        // Try to get from cache first (only when explicitly requested)
        const { rankingCacheService } = await import('./ranking-cache.service');
        return await rankingCacheService.getRankings(
          tournamentId,
          stageId,
          filters,
          () => this.fetchStageRankings(stageId)
        );
      } else {
        // Direct fetch without caching (preferred for polling)
        return await this.fetchStageRankings(stageId);
      }
    } catch (error) {
      console.error('Failed to fetch stage rankings:', error);
      throw new Error('Failed to fetch stage rankings');
    }
  }

  /**
   * Internal method to fetch stage rankings from API
   */
  private static async fetchStageRankings(stageId: string): Promise<RealTimeRanking[]> {
    const response = await apiClient.get<{ success: boolean; data: TeamRanking[] }>(`/stages/${stageId}/rankings`);

    if (!response.success) {
      throw new Error('Failed to fetch stage rankings');
    }

    return this.transformToRealTimeRankings(response.data);
  }

  /**
   * Get live rankings with enhanced metadata
   */
  static async getLiveRankings(tournamentId: string, stageId?: string): Promise<RealTimeRanking[]> {
    try {
      // This endpoint would need to be implemented on the backend
      // For now, fall back to existing endpoints
      if (stageId) {
        return this.getStageRankings(stageId);
      } else {
        return this.getTournamentRankings(tournamentId);
      }
    } catch (error) {
      console.error('Failed to fetch live rankings:', error);
      throw new Error('Failed to fetch live rankings');
    }
  }

  /**
   * Trigger ranking recalculation
   */
  static async recalculateRankings(tournamentId: string, stageId?: string): Promise<void> {
    try {
      const params = new URLSearchParams({ tournamentId });
      if (stageId) {
        params.append('stageId', stageId);
      }

      await apiClient.post(`/team-stats/recalculate?${params.toString()}`);
    } catch (error) {
      console.error('Failed to recalculate rankings:', error);
      throw new Error('Failed to recalculate rankings');
    }
  }

  /**
   * Update rankings (lighter operation than full recalculation)
   */
  static async updateRankings(tournamentId: string, stageId?: string): Promise<void> {
    try {
      const params = new URLSearchParams({ tournamentId });
      if (stageId) {
        params.append('stageId', stageId);
      }

      await apiClient.post(`/team-stats/update-rankings?${params.toString()}`);
    } catch (error) {
      console.error('Failed to update rankings:', error);
      throw new Error('Failed to update rankings');
    }
  }

  /**
   * Get ranking statistics
   */
  static async getRankingStats(tournamentId: string, stageId?: string): Promise<RankingStats> {
    try {
      const rankings = stageId
        ? await this.getStageRankings(stageId)
        : await this.getTournamentRankings(tournamentId);

      return this.calculateRankingStats(rankings);
    } catch (error) {
      console.error('Failed to get ranking stats:', error);
      throw new Error('Failed to get ranking stats');
    }
  }

  /**
   * Transform API response to RealTimeRanking format
   */
  private static transformToRealTimeRankings(data: TournamentStatsResponse[]): RealTimeRanking[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item, index) => ({
      // Map existing fields
      teamId: item.teamId || item.team?.id || `team-${index}`,
      teamNumber: item.teamNumber || item.team?.teamNumber || `${index + 1}`,
      teamName: item.teamName || item.team?.name || 'Unknown Team',
      wins: item.wins || 0,
      losses: item.losses || 0,
      ties: item.ties || 0,
      pointsScored: item.pointsScored || item.totalScore || 0,
      pointsConceded: item.pointsConceded || 0,
      pointDifferential: item.pointDifferential || 0,
      rankingPoints: item.rankingPoints || 0,
      // After migration: tiebreaker1 = OWP, tiebreaker2 = pointsScored
      tiebreaker1: item.tiebreaker1 || item.opponentWinPercentage || 0, // OWP
       tiebreaker2: item.tiebreaker2 || item.pointsScored || 0, // Points scored (final tiebreaker)
      rank: item.rank || index + 1,

      // Add real-time specific fields
      lastUpdated: new Date(),
      isUpdated: false,
      updateSource: 'initial' as const,
    }));
  }

  /**
   * Calculate ranking statistics
   */
  private static calculateRankingStats(rankings: RealTimeRanking[]): RankingStats {
    if (rankings.length === 0) {
      return {
        totalTeams: 0,
        averagePoints: 0,
        highestPoints: 0,
        lowestPoints: 0,
        totalMatches: 0,
        lastCalculated: new Date(),
      };
    }

    const points = rankings.map(r => r.pointsScored);
    const matches = rankings.map(r => (r.wins + r.losses + r.ties));

    return {
      totalTeams: rankings.length,
      averagePoints: points.reduce((sum, p) => sum + p, 0) / rankings.length,
      highestPoints: Math.max(...points),
      lowestPoints: Math.min(...points),
      totalMatches: matches.reduce((sum, m) => sum + m, 0),
      lastCalculated: new Date(),
    };
  }

  /**
   * Compare rankings to detect changes
   */
  static compareRankings(
    oldRankings: RealTimeRanking[],
    newRankings: RealTimeRanking[]
  ): RankingComparison[] {
    const comparisons: RankingComparison[] = [];

    // Create maps for efficient lookup
    const oldRankMap = new Map(oldRankings.map(r => [r.teamId, r]));

    // Compare each team's ranking
    for (const newRanking of newRankings) {
      const oldRanking = oldRankMap.get(newRanking.teamId);

      if (oldRanking) {
        const oldRank = oldRanking.rank || 0;
        const newRank = newRanking.rank || 0;
        const pointsChange = newRanking.pointsScored - oldRanking.pointsScored;

        let rankChange: 'up' | 'down' | 'same' = 'same';
        if (newRank < oldRank) rankChange = 'up';
        else if (newRank > oldRank) rankChange = 'down';

        comparisons.push({
          teamId: newRanking.teamId,
          oldRank,
          newRank,
          rankChange,
          pointsChange,
        });
      }
    }

    return comparisons;
  }

  /**
   * Apply ranking changes to create updated rankings
   */
  static applyRankingChanges(
    rankings: RealTimeRanking[],
    comparisons: RankingComparison[]
  ): RealTimeRanking[] {
    const comparisonMap = new Map(comparisons.map(c => [c.teamId, c]));

    return rankings.map(ranking => {
      const comparison = comparisonMap.get(ranking.teamId);

      if (comparison) {
        return {
          ...ranking,
          previousRank: comparison.oldRank,
          rankChange: comparison.rankChange,
          isUpdated: comparison.rankChange !== 'same' || comparison.pointsChange !== 0,
          isHighlighted: comparison.rankChange !== 'same',
          lastUpdated: new Date(),
          updateSource: 'websocket' as const,
        };
      }

      return ranking;
    });
  }

  /**
   * Reset update flags on rankings
   */
  static resetUpdateFlags(rankings: RealTimeRanking[]): RealTimeRanking[] {
    return rankings.map(ranking => ({
      ...ranking,
      isUpdated: false,
      isHighlighted: false,
      rankChange: 'same' as const,
    }));
  }
}
