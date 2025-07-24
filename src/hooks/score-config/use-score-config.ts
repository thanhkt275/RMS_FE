"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { 
  ScoreConfig, 
  ScorePanelConfig, 
  MatchScoreConfig,
  ElementScores,
  AllianceScoreData,
  ScoreCalculationResult,
  SectionConfig as ScoreSection
} from "../../types/score-config.types";
import { scoreCalculationEngine } from "./score-calculation";
import { apiClient } from "@/lib/api-client";

// API Service functions (these would be implemented based on backend endpoints)
const scoreConfigApi = {
  // Fetches score configuration for a specific match
  async getMatchScoreConfig(matchId: string): Promise<MatchScoreConfig> {
    return apiClient.get<MatchScoreConfig>(`/match-scores/${matchId}/score-config`);
  },

  // Fetches UI configuration for the score panel
  async getScorePanelConfig(matchId: string): Promise<ScorePanelConfig> {
    return apiClient.get<ScorePanelConfig>(`/match-scores/frontend/score-panel-config`);
  },

  // Calculates score preview without saving
  async calculateScorePreview(
    matchId: string, 
    allianceId: string, 
    elementScores: ElementScores
  ): Promise<ScoreCalculationResult> {
    return apiClient.post<ScoreCalculationResult>(
      `/match-scores/preview-score`,
      { 
        matchId,
        allianceId,
        elementScores 
      }
    );
  },

  // Submits final scores
  async submitMatchScore(
    matchId: string,
    allianceId: string,
    scoreData: AllianceScoreData
  ): Promise<void> {
    await apiClient.post<void>(
      `/match-scores`,
      {
        matchId,
        allianceId,
        ...scoreData
      }
    );
  },

  // Fetches score config by ID (for admin preview)
  async getScoreConfigById(scoreConfigId: string): Promise<ScoreConfig> {
    return apiClient.get<ScoreConfig>(`/score-configs/${scoreConfigId}`);
  },
};

/**
 * Hook for fetching match score configuration
 */
export function useMatchScoreConfig(matchId: string | null) {
  return useQuery({
    queryKey: ['match-score-config', matchId],
    queryFn: () => matchId ? scoreConfigApi.getMatchScoreConfig(matchId) : null,
    enabled: !!matchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook for fetching score panel UI configuration
 */
export function useScorePanelConfig(matchId: string | null) {
  return useQuery({
    queryKey: ['score-panel-config', matchId],
    queryFn: () => matchId ? scoreConfigApi.getScorePanelConfig(matchId) : null,
    enabled: !!matchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook for real-time score calculation and preview
 */
export function useScoreCalculation(matchId: string | null, allianceId: string | null) {
  const queryClient = useQueryClient();
  const [elementScores, setElementScores] = useState<ElementScores>({});
  const [debouncedScores, setDebouncedScores] = useState<ElementScores>({});

  // Debounce score updates to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedScores(elementScores);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [elementScores]);

  // Query for real-time score calculation
  const calculationQuery = useQuery({
    queryKey: ['score-calculation', matchId, allianceId, debouncedScores],
    queryFn: () => {
      if (!matchId || !allianceId) return null;
      return scoreConfigApi.calculateScorePreview(matchId, allianceId, debouncedScores);
    },
    enabled: !!matchId && !!allianceId && Object.keys(debouncedScores).length > 0,
    staleTime: 0, // Always fresh for real-time updates
    gcTime: 1000, // Short cache time for real-time data
  });

  // Mutation for submitting final scores
  const submitScoreMutation = useMutation({
    mutationFn: (scoreData: AllianceScoreData) => {
      if (!matchId || !allianceId) {
        throw new Error('Match ID and Alliance ID are required');
      }
      return scoreConfigApi.submitMatchScore(matchId, allianceId, scoreData);
    },
    onSuccess: () => {
      // Invalidate relevant queries after successful submission
      queryClient.invalidateQueries({ queryKey: ['match-scores'] });
      queryClient.invalidateQueries({ queryKey: ['match-score-config'] });
    },
  });

  return {
    elementScores,
    setElementScores,
    calculationResult: calculationQuery.data,
    isCalculating: calculationQuery.isLoading,
    calculationError: calculationQuery.error,
    submitScore: submitScoreMutation.mutate,
    isSubmitting: submitScoreMutation.isPending,
    submitError: submitScoreMutation.error,
    submitSuccess: submitScoreMutation.isSuccess,
  };
}

/**
 * Hook for score config management (admin use)
 */
export function useScoreConfig(scoreConfigId: string | null) {
  return useQuery({
    queryKey: ['score-config', scoreConfigId],
    queryFn: () => scoreConfigId ? scoreConfigApi.getScoreConfigById(scoreConfigId) : null,
    enabled: !!scoreConfigId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for client-side real-time score calculation with debouncing
 */
export function useClientScoreCalculation(sections: ScoreSection[], formula?: string) {
  const [elementScores, setElementScores] = useState<ElementScores>({});
  const [debouncedScores, setDebouncedScores] = useState<ElementScores>({});
  const [calculationResult, setCalculationResult] = useState<ScoreCalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<Error | null>(null);

  // Debounce score updates for performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedScores(elementScores);
    }, 150); // 150ms debounce - faster than server calls

    return () => clearTimeout(timer);
  }, [elementScores]);

  // Perform client-side calculation when debounced scores change
  useEffect(() => {
    if (sections.length === 0) return;

    setIsCalculating(true);
    setCalculationError(null);

    try {
      // Use requestAnimationFrame for smooth UI updates
      requestAnimationFrame(() => {
        try {
          const result = scoreCalculationEngine.calculateScores(
            sections, 
            debouncedScores, 
            formula
          );
          setCalculationResult(result);
          setCalculationError(null);
        } catch (error) {
          setCalculationError(error instanceof Error ? error : new Error('Calculation failed'));
        } finally {
          setIsCalculating(false);
        }
      });
    } catch (error) {
      setCalculationError(error instanceof Error ? error : new Error('Calculation failed'));
      setIsCalculating(false);
    }
  }, [debouncedScores, sections, formula]);

  // Function to update element scores with immediate feedback
  const updateElementScore = (elementCode: string, value: number) => {
    setElementScores((prev: ElementScores) => ({
      ...prev,
      [elementCode]: value
    }));
  };

  // Function to reset all scores
  const resetScores = () => {
    setElementScores({});
    setDebouncedScores({});
    setCalculationResult(null);
  };

  // Get condition progress for visual feedback
  const getConditionProgress = (condition: any) => {
    return scoreCalculationEngine.getConditionProgress(condition, elementScores);
  };

  // Check if condition is in warning state
  const isConditionInWarning = (condition: any) => {
    return scoreCalculationEngine.isConditionInWarning(condition, elementScores);
  };

  // Get performance metrics
  const getPerformanceMetrics = () => {
    return scoreCalculationEngine.getLastCalculationMetrics();
  };

  return {
    elementScores,
    setElementScores,
    updateElementScore,
    resetScores,
    calculationResult,
    isCalculating,
    calculationError,
    getConditionProgress,
    isConditionInWarning,
    getPerformanceMetrics
  };
}

/**
 * Hook for caching and offline support
 */
export function useScoreConfigCache() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const preloadScoreConfig = (matchId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['match-score-config', matchId],
      queryFn: () => scoreConfigApi.getMatchScoreConfig(matchId),
      staleTime: 5 * 60 * 1000,
    });

    queryClient.prefetchQuery({
      queryKey: ['score-panel-config', matchId],
      queryFn: () => scoreConfigApi.getScorePanelConfig(matchId),
      staleTime: 5 * 60 * 1000,
    });
  };

  return {
    isOnline,
    preloadScoreConfig,
    clearCache: () => queryClient.clear(),
  };
}
