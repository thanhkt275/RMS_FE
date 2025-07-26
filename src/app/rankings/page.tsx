/**
 * Rankings Page
 *
 * Demo page for the real-time ranking table feature.
 * Shows tournament and stage rankings with live updates.
 */

"use client";

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Target, Users, BarChart3 } from 'lucide-react';

import { RealTimeRankingTable } from '@/components/features/rankings';
import { apiClient } from '@/lib/api-client';
import { Tournament, Stage } from '@/types/tournament.types';
import { RealTimeRanking } from '@/types/ranking.types';

/**
 * Rankings demo page component
 */
export default function RankingsPage() {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');

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
      const response = await apiClient.get<Stage[]>(`/tournaments/${selectedTournamentId}/stages`);
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
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Real-time Rankings
          </h1>
          <p className="text-gray-500 mt-2">
            Live tournament standings with automatic updates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
            Live Demo
          </Badge>
        </div>
      </div>

      {/* Tournament and Stage Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Tournament Selection
          </CardTitle>
          <CardDescription>
            Select a tournament and stage to view live rankings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tournament Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tournament</label>
              <Select
                value={selectedTournamentId}
                onValueChange={setSelectedTournamentId}
                disabled={tournamentsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tournament..." />
                </SelectTrigger>
                <SelectContent>
                  {tournaments.map((tournament) => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      <div className="flex items-center gap-2">
                        <span>{tournament.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {tournament._count?.teams || 0} teams
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stage Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Stage (Optional)</label>
              <Select
                value={selectedStageId}
                onValueChange={setSelectedStageId}
                disabled={stagesLoading || !selectedTournamentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All stages..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Stages</SelectItem>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <span>{stage.name}</span>
                        <Badge
                          variant={stage.status === 'ACTIVE' ? 'default' : 'outline'}
                          className="text-xs"
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
        <Tabs defaultValue="live" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="live" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Live Rankings
            </TabsTrigger>
            <TabsTrigger value="tournament" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Tournament
            </TabsTrigger>
            <TabsTrigger value="stage" className="flex items-center gap-2" disabled={!selectedStageId}>
              <Target className="h-4 w-4" />
              Stage
            </TabsTrigger>
          </TabsList>

          {/* Live Rankings Tab */}
          <TabsContent value="live" className="space-y-4">
            <RealTimeRankingTable
              tournamentId={selectedTournamentId}
              stageId={selectedStageId || undefined}
              config={{
                autoUpdate: true,
                showLiveIndicator: true,
                highlightDuration: 3000,
                animationDuration: 500,
              }}
              onRankingUpdate={handleRankingUpdate}
              onError={handleError}
              showFilters={true}
              showStats={true}
              highlightAdvancing={8} // Highlight top 8 teams
            />
          </TabsContent>

          {/* Tournament Rankings Tab */}
          <TabsContent value="tournament" className="space-y-4">
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
          <TabsContent value="stage" className="space-y-4">
            {selectedStageId ? (
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
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Target className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Stage Selected</h3>
                  <p className="text-gray-500">
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
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tournament Selected</h3>
            <p className="text-gray-500">
              Please select a tournament to view rankings
            </p>
          </CardContent>
        </Card>
      )}

      {/* Feature Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Real-time Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 animate-pulse" />
              <div>
                <h4 className="font-semibold">Live Updates</h4>
                <p className="text-sm text-gray-500">
                  Rankings update automatically when match scores are submitted
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <BarChart3 className="h-5 w-5 text-blue-500 mt-1" />
              <div>
                <h4 className="font-semibold">Smooth Animations</h4>
                <p className="text-sm text-gray-500">
                  Visual indicators for ranking changes and updates
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Trophy className="h-5 w-5 text-yellow-500 mt-1" />
              <div>
                <h4 className="font-semibold">Advanced Sorting</h4>
                <p className="text-sm text-gray-500">
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
