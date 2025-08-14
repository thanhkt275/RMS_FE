/**
 * Real-time Ranking Table Component
 *
 * Main component for displaying live tournament rankings with polling-based updates.
 * Uses HTTP polling for reliable data updates and provides filtering and sorting.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Search, Filter, BarChart3, Users, Trophy } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
// import { cn } from '@/lib/utils';

import { usePollingRankings } from '@/hooks/rankings/use-polling-rankings';
import { RankingUpdateIndicator } from './ranking-update-indicator';
import { RankingRow, CompactRankingRow } from './ranking-row';
import {
  RealTimeRankingTableProps,
  RankingFilters,
  DEFAULT_RANKING_CONFIG
} from '@/types/ranking.types';

/**
 * Main real-time ranking table component
 */
export function RealTimeRankingTable({
  tournamentId,
  stageId,
  config = {},
  className,
  onRankingUpdate,
  onError,
  showFilters = true,
  showStats = true,
  highlightAdvancing = 0,
}: RealTimeRankingTableProps) {

  const finalConfig = { ...DEFAULT_RANKING_CONFIG, ...config };

  // Local state for filters and UI
  const [filters] = useState<RankingFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isCompactView, setIsCompactView] = useState(false);

  // Polling-based rankings hook
  const {
    rankings,
    isLoading,
    isConnected,
    lastUpdate,
    error,
    updateCount,
    isRecalculating,
    refetch,
    recalculate,
  } = usePollingRankings(tournamentId, stageId, {
    config: finalConfig,
    onUpdate: onRankingUpdate,
    onError,
  });

  // Filter and search rankings
  const filteredRankings = useMemo(() => {
    let filtered = [...rankings];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ranking =>
        ranking.teamName.toLowerCase().includes(term) ||
        ranking.teamNumber.toLowerCase().includes(term)
      );
    }

    // Apply rank range filter
    if (filters.minRank !== undefined) {
      filtered = filtered.filter(ranking => (ranking.rank || 0) >= filters.minRank!);
    }
    if (filters.maxRank !== undefined) {
      filtered = filtered.filter(ranking => (ranking.rank || 0) <= filters.maxRank!);
    }

    // Apply points range filter
    if (filters.minPoints !== undefined) {
      filtered = filtered.filter(ranking => ranking.pointsScored >= filters.minPoints!);
    }
    if (filters.maxPoints !== undefined) {
      filtered = filtered.filter(ranking => ranking.pointsScored <= filters.maxPoints!);
    }

    // Apply team number filter
    if (filters.teamNumbers && filters.teamNumbers.length > 0) {
      filtered = filtered.filter(ranking =>
        filters.teamNumbers!.includes(ranking.teamNumber)
      );
    }

    return filtered;
  }, [rankings, searchTerm, filters]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (rankings.length === 0) return null;

    const points = rankings.map(r => r.pointsScored);
    const totalMatches = rankings.reduce((sum, r) => sum + r.wins + r.losses + r.ties, 0);

    return {
      totalTeams: rankings.length,
      averagePoints: Math.round(points.reduce((sum, p) => sum + p, 0) / rankings.length),
      highestPoints: Math.max(...points),
      lowestPoints: Math.min(...points),
      totalMatches,
      lastCalculated: lastUpdate,
    };
  }, [rankings, lastUpdate]);

  // Handle team click
  const handleTeamClick = useCallback((teamId: string) => {
    console.log('Team clicked:', teamId);
    // TODO: Navigate to team details or show team modal
  }, []);

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Handle recalculation
  const handleRecalculate = useCallback(() => {
    recalculate();
  }, [recalculate]);

  // Loading skeleton
  if (isLoading && rankings.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-6 w-32" />
                <div className="flex-1" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && rankings.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load rankings</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Tournament Rankings
              {isRecalculating && (
                <Badge variant="outline" className="animate-pulse">
                  Calculating...
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {stageId ? 'Stage rankings' : 'Tournament-wide rankings'} •
              {filteredRankings.length} team{filteredRankings.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCompactView(!isCompactView)}
            >
              {isCompactView ? <BarChart3 className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              disabled={isRecalculating}
            >
              Recalculate
            </Button>
          </div>
        </div>

        {/* Update indicator */}
        <RankingUpdateIndicator
          isConnected={isConnected}
          lastUpdate={lastUpdate}
          isUpdating={isLoading}
          updateCount={updateCount}
          onManualRefresh={handleRefresh}
        />

        {/* Statistics */}
        {showStats && stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg dark:bg-gray-800">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalTeams}</div>
              <div className="text-sm text-gray-500">Teams</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.averagePoints}</div>
              <div className="text-sm text-gray-500">Avg Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.highestPoints}</div>
              <div className="text-sm text-gray-500">Highest</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.lowestPoints}</div>
              <div className="text-sm text-gray-500">Lowest</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.totalMatches}</div>
              <div className="text-sm text-gray-500">Matches</div>
            </div>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {/* Rankings list */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredRankings.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No teams found</h3>
              <p className="text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria' : 'No ranking data available'}
              </p>
            </div>
          ) : (
            filteredRankings.map((ranking, index) => {
              const isAdvancing = highlightAdvancing > 0 && (ranking.rank || index + 1) <= highlightAdvancing;

              if (isCompactView) {
                return (
                  <CompactRankingRow
                    key={ranking.teamId}
                    ranking={ranking}
                    index={index}
                    isAdvancing={isAdvancing}
                    onTeamClick={handleTeamClick}
                  />
                );
              }

              return (
                <RankingRow
                  key={ranking.teamId}
                  ranking={ranking}
                  index={index}
                  isAdvancing={isAdvancing}
                  onTeamClick={handleTeamClick}
                  showAnimation={finalConfig.autoUpdate}
                />
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
