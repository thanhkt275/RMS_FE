/**
 * Rankings Page
 *
 * Tournament and stage rankings page with automatic updates.
 * Shows complete tournament roster with polling-based updates for better reliability.
 */

"use client";

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Target, Users, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

import { RealTimeRankingTable } from '@/components/features/rankings';
import { usePollingRankings } from '@/hooks/rankings/use-polling-rankings';
import { apiClient } from '@/lib/api-client';
import { Tournament, Stage } from '@/types/tournament.types';
import { RealTimeRanking } from '@/types/ranking.types';

/**
 * Rankings content component with automatic updates
 */
function RankingsContent() {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');

  // Polling-based rankings for the selected tournament/stage
  const {
    rankings,
    isLoading: rankingsLoading,
    error: rankingsError,
    lastUpdate,
    updateCount,
    refetch: refetchRankings,
  } = usePollingRankings(selectedTournamentId, selectedStageId, {
    enabled: !!selectedTournamentId,
    config: {
      autoUpdate: true,
      maxRetries: 3,
    },
  });

  // Fetch tournaments
  const { data: tournaments = [], isLoading: tournamentsLoading } = useQuery({
    queryKey: ['tournaments'],
    queryFn: async () => {
      const response = await apiClient.get<Tournament[]>('/tournaments');
      return Array.isArray(response) ? response : [];
    },
    retry: 2,
  });

  // Fetch stages for selected tournament
  const { data: stages = [], isLoading: stagesLoading } = useQuery({
    queryKey: ['stages', selectedTournamentId],
    queryFn: async () => {
      if (!selectedTournamentId) return [];
      const response = await apiClient.get<Stage[]>(`/stages?tournamentId=${selectedTournamentId}`);
      return Array.isArray(response) ? response : [];
    },
    enabled: !!selectedTournamentId,
    retry: 2,
  });

  // Auto-select first tournament if available
  useEffect(() => {
    if (tournaments.length > 0 && !selectedTournamentId) {
      setSelectedTournamentId(tournaments[0].id);
    }
  }, [tournaments, selectedTournamentId]);

  // Auto-select first stage if available
  useEffect(() => {
    if (stages.length > 0 && !selectedStageId) {
      setSelectedStageId(stages[0].id);
    }
  }, [stages, selectedStageId]);

  // Handle ranking updates
  const handleRankingUpdate = (rankings: RealTimeRanking[]) => {
    console.log('Rankings updated:', rankings.length, 'teams');
  };

  // Handle errors
  const handleError = (error: Error) => {
    console.error('Ranking error:', error);
  };

  return (
    <div className="container mx-auto py-4 px-3 sm:py-6 sm:px-4 lg:py-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 break-words">
            <Trophy className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-yellow-500 flex-shrink-0" />
            <span className="break-words">Tournament Rankings</span>
          </h1>
          <p className="text-gray-500 mt-1 sm:mt-2 text-sm sm:text-base break-words">
            Tournament standings with automatic updates
          </p>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          {/* Polling Status */}
          <Badge
            variant="outline"
            className={cn(
              "text-xs flex-shrink-0",
              !rankingsError
                ? "bg-green-50 text-green-700 border-green-300"
                : "bg-red-50 text-red-700 border-red-300"
            )}
          >
            {!rankingsError ? (
              <>
                <Target className="w-3 h-3 mr-1" />
                <span className="hidden xs:inline">Polling </span>Active
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 mr-1" />
                <span className="hidden xs:inline">Polling </span>Error
              </>
            )}
          </Badge>

          {/* Last Update Time */}
          {lastUpdate && (
            <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
              Updated: {lastUpdate.toLocaleTimeString()}
            </Badge>
          )}

          {/* Update Count */}
          {updateCount > 0 && (
            <Badge variant="outline" className="text-xs hidden md:inline-flex">
              Updates: {updateCount}
            </Badge>
          )}

          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs flex-shrink-0">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 sm:mr-2 animate-pulse" />
            <span className="hidden xs:inline">Auto-</span>Update
          </Badge>
        </div>
      </div>

      {/* Tournament and Stage Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Target className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="break-words">Tournament Selection</span>
          </CardTitle>
          <CardDescription className="text-sm break-words">
            Select a tournament and stage to view rankings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Tournament Selection */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Tournament</label>
              <Select
                value={selectedTournamentId}
                onValueChange={setSelectedTournamentId}
                disabled={tournamentsLoading}
              >
                <SelectTrigger className="text-sm w-full min-w-0">
                  <SelectValue placeholder="Select tournament..." className="truncate" />
                </SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-2rem)]">
                  {tournaments.map((tournament) => (
                    <SelectItem key={tournament.id} value={tournament.id} className="max-w-full">
                      <div className="flex items-center justify-between gap-2 w-full min-w-0">
                        <span className="break-words text-sm truncate flex-1">{tournament.name}</span>
                        <Badge variant="outline" className="text-xs flex-shrink-0 ml-auto">
                          {tournament._count?.teams || 0}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stage Selection */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Stage (Optional)</label>
              <Select
                value={selectedStageId}
                onValueChange={setSelectedStageId}
                disabled={stagesLoading || !selectedTournamentId}
              >
                <SelectTrigger className="text-sm w-full min-w-0">
                  <SelectValue placeholder="All stages..." className="truncate" />
                </SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-2rem)]">
                  <SelectItem value="all-stages">All Stages</SelectItem>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id} className="max-w-full">
                      <div className="flex items-center justify-between gap-2 w-full min-w-0">
                        <span className="break-words text-sm truncate flex-1">{stage.name}</span>
                        <Badge
                          variant={stage.status === 'ACTIVE' ? 'default' : 'outline'}
                          className="text-xs flex-shrink-0 ml-auto"
                        >
                          {stage.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rankings Display */}
      {selectedTournamentId && (
        <Tabs defaultValue="tournament" className="space-y-3 sm:space-y-4">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="tournament" className="flex items-center gap-1 sm:gap-2 py-2 px-2 sm:px-3">
              <Trophy className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm truncate">Tournament Rankings</span>
            </TabsTrigger>
            <TabsTrigger 
              value="stage" 
              className="flex items-center gap-1 sm:gap-2 py-2 px-2 sm:px-3" 
              disabled={!selectedStageId || selectedStageId === 'all-stages'}
            >
              <Target className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm truncate">Stage Rankings</span>
            </TabsTrigger>
          </TabsList>

          {/* Tournament Rankings Tab */}
          <TabsContent value="tournament" className="space-y-3 sm:space-y-4">
            <RealTimeRankingTable
              tournamentId={selectedTournamentId}
              config={{
                autoUpdate: true,
                showLiveIndicator: true,
              }}
              onRankingUpdate={handleRankingUpdate}
              onError={handleError}
              showFilters={true}
              showStats={true}
            />
          </TabsContent>

          {/* Stage Rankings Tab */}
          <TabsContent value="stage" className="space-y-3 sm:space-y-4">
            {selectedStageId && selectedStageId !== 'all-stages' ? (
              <RealTimeRankingTable
                tournamentId={selectedTournamentId}
                stageId={selectedStageId}
                config={{
                  autoUpdate: true,
                  showLiveIndicator: true,
                }}
                onRankingUpdate={handleRankingUpdate}
                onError={handleError}
                showFilters={true}
                showStats={true}
                highlightAdvancing={4} // Highlight top 4 for stage advancement
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
                  <Target className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4 flex-shrink-0" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2 text-center break-words">No Stage Selected</h3>
                  <p className="text-gray-500 text-sm sm:text-base text-center break-words">
                    Please select a stage to view stage-specific rankings
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* No Tournament Selected */}
      {!selectedTournamentId && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
            <Users className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4 flex-shrink-0" />
            <h3 className="text-base sm:text-lg font-semibold mb-2 text-center break-words">No Tournament Selected</h3>
            <p className="text-gray-500 text-sm sm:text-base text-center break-words">
              Please select a tournament to view rankings
            </p>
          </CardContent>
        </Card>
      )}

      {/* Feature Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg break-words">Ranking Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 animate-pulse flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm sm:text-base break-words">Auto Updates</h4>
                <p className="text-xs sm:text-sm text-gray-500 break-words">
                  Rankings update automatically when match scores are submitted
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mt-1 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm sm:text-base break-words">Complete Roster</h4>
                <p className="text-xs sm:text-sm text-gray-500 break-words">
                  Shows all registered teams with their current standings
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 mt-1 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm sm:text-base break-words">Advanced Sorting</h4>
                <p className="text-xs sm:text-sm text-gray-500 break-words">
                  Multiple tiebreakers and ranking algorithms
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Main rankings page component with automatic updates
 */
export default function RankingsPage() {
  return <RankingsContent />;
}
