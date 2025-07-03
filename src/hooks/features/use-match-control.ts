import { useState, useEffect, useCallback } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { QueryKeys } from '@/lib/query-keys';
import type {
  Match,
  MatchScores,
  ScoreUpdate,
  TimerState,
} from '@/lib/types';

// ---  Service Layer for Match Control ---
class MatchControlService {
  static async fetchMatches(): Promise<Match[]> {
    return apiClient.get<Match[]>('/matches');
  }

  static async fetchMatchById(matchId: string): Promise<Match> {
    return apiClient.get<Match>(`/matches/${matchId}`);
  }

  static async fetchMatchScores(matchId: string): Promise<MatchScores | null> {
    const allScores = await apiClient.get<MatchScores[]>('/match-scores');
    const matchScore = allScores.find((score) => score.matchId === matchId);
    if (!matchScore) return null;
    return apiClient.get<MatchScores>(`/match-scores/${matchScore.id}`);
  }

  static async updateMatchStatus({ id, status, timestamp }: { id: string; status: string; timestamp?: Date }) {
    const payload: any = { status };
    if (timestamp) payload[status === 'IN_PROGRESS' ? 'startTime' : 'endTime'] = timestamp.toISOString();
    return apiClient.patch(`/matches/${id}`, payload);
  }

  static async updateOrCreateScores({ id, matchId, scoreUpdates }: { id?: string; matchId: string; scoreUpdates: ScoreUpdate }) {
    if (id) {
      try {
        return await apiClient.patch(`/match-scores/${id}`, scoreUpdates);
      } catch (error: any) {
        if (error?.response?.status !== 404) throw error;
      }
    }
    return apiClient.post('/match-scores', {
      matchId,
      ...scoreUpdates,
      redTotalScore: (scoreUpdates.redAutoScore || 0) + (scoreUpdates.redDriveScore || 0),
      blueTotalScore: (scoreUpdates.blueAutoScore || 0) + (scoreUpdates.blueDriveScore || 0),
    });
  }
}
// --- End Service Layer ---

export function useScheduledMatches() {
  return useQuery({
    queryKey: QueryKeys.matches.all(),
    queryFn: async () => {
      const matches = await MatchControlService.fetchMatches();
      return matches.filter((m: Match) => m.status === 'PENDING');
    },
    staleTime: 30 * 1000,
    refetchInterval: 15 * 1000,
  });
}

export function useActiveMatch(matchId: string | null) {
  return useQuery({
    queryKey: QueryKeys.matches.byId(matchId ?? ''),
    queryFn: () => (matchId ? MatchControlService.fetchMatchById(matchId) : null),
    enabled: !!matchId,
    staleTime: 5 * 1000,
    refetchInterval: matchId ? 5 * 1000 : false,
  });
}

export function useMatchControl() {
  const queryClient = useQueryClient();
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState<TimerState>({ duration: 150, remaining: 150, isRunning: false });

  // Fetch all matches
  const matchesQuery = useQuery({
    queryKey: QueryKeys.matches.all(),
    queryFn: MatchControlService.fetchMatches,
    staleTime: 30 * 1000,
    refetchInterval: 15 * 1000,
  });

  // Fetch current match details
  const currentMatchQuery = useQuery({
    queryKey: QueryKeys.matches.byId(currentMatchId ?? ''),
    queryFn: () => (currentMatchId ? MatchControlService.fetchMatchById(currentMatchId) : null),
    enabled: !!currentMatchId,
    staleTime: 5 * 1000,
    refetchInterval: currentMatchId ? 5 * 1000 : false,
  });

  // Fetch current match scores
  const matchScoresQuery = useQuery({
    queryKey: QueryKeys.matchScores.byMatch(currentMatchId ?? ''),
    queryFn: () => (currentMatchId ? MatchControlService.fetchMatchScores(currentMatchId) : null),
    enabled: !!currentMatchId,
    staleTime: 2 * 1000,
    refetchInterval: currentMatchId ? 2 * 1000 : false,
  });

  // Mutations
  const updateMatchStatusMutation = useMutation({
    mutationFn: MatchControlService.updateMatchStatus,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.matches.byId(data.id) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.matches.all() });
    },
    onError: (error) => {
      console.error('Failed to update match status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update match status');
    },
  });

  const updateScoresMutation = useMutation({
    mutationFn: ({ id, scoreUpdates }: { id?: string; scoreUpdates: ScoreUpdate }) =>
      MatchControlService.updateOrCreateScores({ id, matchId: currentMatchId!, scoreUpdates }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.matchScores.byMatch(data.matchId) });
    },
    onError: (error) => {
      console.error('Failed to update scores:', error);
      setError(error instanceof Error ? error.message : 'Failed to update scores');
    },
  });

  // Find and load the next pending match
  const loadNextMatch = useCallback(() => {
    const matches = matchesQuery.data || [];
    const nextMatch = matches.find((match: Match) => match.status === 'PENDING');
    if (nextMatch) {
      setCurrentMatchId(nextMatch.id);
      setTimer({ duration: 150, remaining: 150, isRunning: false });
      return nextMatch;
    } else {
      setError('No pending matches found');
      return null;
    }
  }, [matchesQuery.data]);

  // Load a specific match by ID
  const loadMatchById = useCallback((matchId: string) => {
    setCurrentMatchId(matchId);
    setTimer({ duration: 150, remaining: 150, isRunning: false });
  }, []);

  // Start the match
  const startMatch = useCallback(() => {
    if (!currentMatchId) {
      setError('No match selected');
      return;
    }
    updateMatchStatusMutation.mutate({ id: currentMatchId, status: 'IN_PROGRESS', timestamp: new Date() });
    setTimer((prev) => ({ ...prev, isRunning: true }));
  }, [currentMatchId, updateMatchStatusMutation]);

  // Stop/finish the match
  const stopMatch = useCallback(() => {
    if (!currentMatchId) {
      setError('No match selected');
      return;
    }
    updateMatchStatusMutation.mutate({ id: currentMatchId, status: 'COMPLETED' });
    setTimer((prev) => ({ ...prev, isRunning: false }));
  }, [currentMatchId, updateMatchStatusMutation]);

  // Update match scores
  const updateScores = useCallback(
    (scoreUpdates: ScoreUpdate) => {
      if (!currentMatchId) {
        setError('No match selected');
        return;
      }
      const scoreId = matchScoresQuery.data?.id;
      updateScoresMutation.mutate({ id: scoreId, scoreUpdates });
    },
    [currentMatchId, matchScoresQuery.data, updateScoresMutation]
  );

  // Helper to increment a specific score field
  const incrementScore = useCallback(
    (field: keyof ScoreUpdate, amount: number = 1) => {
      const currentMatchScores = matchScoresQuery.data;
      let currentValue = 0;
      if (currentMatchScores) {
        currentValue = (currentMatchScores[field as keyof MatchScores] as number) || 0;
      }
      const update = { [field]: currentValue + amount } as ScoreUpdate;
      updateScores(update);
    },
    [matchScoresQuery.data, updateScores]
  );

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer.isRunning && timer.remaining > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          const newRemaining = prev.remaining - 1;
          if (newRemaining <= 0 && currentMatchQuery.data?.status === 'IN_PROGRESS') {
            stopMatch();
          }
          return {
            ...prev,
            remaining: Math.max(0, newRemaining),
            isRunning: newRemaining > 0 ? prev.isRunning : false,
          };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer.isRunning, timer.remaining, currentMatchQuery.data, stopMatch]);

  // Format the timer as MM:SS
  const formattedTime = useCallback(() => {
    const minutes = Math.floor(timer.remaining / 60);
    const seconds = timer.remaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timer.remaining]);

  // Timer control functions
  const resetTimer = useCallback(() => {
    setTimer({ duration: 150, remaining: 150, isRunning: false });
  }, []);
  const pauseTimer = useCallback(() => {
    setTimer((prev) => ({ ...prev, isRunning: false }));
  }, []);
  const resumeTimer = useCallback(() => {
    setTimer((prev) => ({ ...prev, isRunning: true }));
  }, []);

  return {
    matches: matchesQuery.data || [],
    currentMatch: currentMatchQuery.data,
    matchScores: matchScoresQuery.data,
    isLoading: matchesQuery.isLoading || currentMatchQuery.isLoading,
    isMatchesLoading: matchesQuery.isLoading,
    isCurrentMatchLoading: currentMatchQuery.isLoading,
    isScoresLoading: matchScoresQuery.isLoading,
    error,
    loadNextMatch,
    loadMatchById,
    startMatch,
    stopMatch,
    updateScores,
    incrementScore,
    timer: {
      ...timer,
      formatted: formattedTime(),
      reset: resetTimer,
      pause: pauseTimer,
      resume: resumeTimer,
    },
  };
}