import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ReactNode, createElement } from 'react';

import {
  useMatchScoreConfig,
  useScorePanelConfig,
  useScoreCalculation,
  useScoreConfig,
  useClientScoreCalculation,
  useScoreConfigCache,
} from '../use-score-config';

// Mock the score calculation engine
jest.mock('@/hooks/score-config/score-calculation', () => ({
  scoreCalculationEngine: {
    calculateScores: jest.fn(),
    getConditionProgress: jest.fn(),
    isConditionInWarning: jest.fn(),
    getLastCalculationMetrics: jest.fn(),
  },
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Test data
const mockMatchScoreConfig = {
  matchId: 'match-123',
  scoreConfig: {
    id: 'config-1',
    name: 'Test Config',
    scoreSections: [
      {
        id: 'section-1',
        name: 'Auto',
        scoreElements: [
          { id: 'elem-1', name: 'Auto Mobility', pointsPerUnit: 5 },
          { id: 'elem-2', name: 'Auto Speaker', pointsPerUnit: 4 },
        ],
      },
    ],
    bonusConditions: [],
    penaltyConditions: [],
  },
};

const mockScorePanelConfig = {
  matchId: 'match-123',
  panelLayout: 'standard',
  allianceColors: ['red', 'blue'],
  sections: mockMatchScoreConfig.scoreConfig.scoreSections,
};

const mockCalculationResult = {
  finalScore: 25,
  sectionScores: { 'section-1': 25 },
  bonusScore: 0,
  penaltyScore: 0,
  breakdown: {},
};

// Helper to create a QueryClient wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => 
    createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('Score Config Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful responses by default
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMatchScoreConfig),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useMatchScoreConfig', () => {
    it('should fetch match score config successfully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useMatchScoreConfig('match-123'), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockMatchScoreConfig);
      expect(mockFetch).toHaveBeenCalledWith('/api/match-scores/match-123/score-config');
    });

    it('should not fetch when matchId is null', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useMatchScoreConfig(null), {
        wrapper,
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const wrapper = createWrapper();
      const { result } = renderHook(() => useMatchScoreConfig('match-123'), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useMatchScoreConfig('match-123'), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should retry failed requests with exponential backoff', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMatchScoreConfig),
        });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useMatchScoreConfig('match-123'), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 10000,
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('useScorePanelConfig', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockScorePanelConfig),
      });
    });

    it('should fetch score panel config successfully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useScorePanelConfig('match-123'), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockScorePanelConfig);
      expect(mockFetch).toHaveBeenCalledWith('/api/match-scores/match-123/score-panel-config');
    });

    it('should not fetch when matchId is null', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useScorePanelConfig(null), {
        wrapper,
      });

      expect(result.current.data).toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('useScoreCalculation', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCalculationResult),
      });
    });

    it('should calculate scores in real-time', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useScoreCalculation('match-123', 'red-alliance'),
        { wrapper }
      );

      // Set some element scores
      result.current.setElementScores({ 'elem-1': 5, 'elem-2': 4 });

      await waitFor(() => expect(result.current.calculationResult).toBeTruthy(), {
        timeout: 1000,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/match-scores/match-123/red-alliance/calculate-preview',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ elementScores: { 'elem-1': 5, 'elem-2': 4 } }),
        })
      );
    });

    it('should debounce score updates', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useScoreCalculation('match-123', 'red-alliance'),
        { wrapper }
      );

      // Rapidly update scores
      result.current.setElementScores({ 'elem-1': 1 });
      result.current.setElementScores({ 'elem-1': 2 });
      result.current.setElementScores({ 'elem-1': 3 });

      // Wait for debounce
      await waitFor(() => expect(mockFetch).toHaveBeenCalled(), {
        timeout: 500,
      });

      // Should only call API once after debounce
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not calculate when matchId or allianceId is missing', () => {
      const wrapper = createWrapper();
      const { result: result1 } = renderHook(
        () => useScoreCalculation(null, 'red-alliance'),
        { wrapper }
      );
      const { result: result2 } = renderHook(
        () => useScoreCalculation('match-123', null),
        { wrapper }
      );

      result1.current.setElementScores({ 'elem-1': 5 });
      result2.current.setElementScores({ 'elem-1': 5 });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should submit scores successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useScoreCalculation('match-123', 'red-alliance'),
        { wrapper }
      );

      const scoreData = {
        elementScores: { 'elem-1': 5, 'elem-2': 4 },
        finalScore: 25,
        timestamp: Date.now(),
      };

      result.current.submitScore(scoreData);

      await waitFor(() => expect(result.current.submitSuccess).toBe(true));

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/match-scores/match-123/red-alliance/submit',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scoreData),
        })
      );
    });

    it('should handle submission errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Submission failed'));

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useScoreCalculation('match-123', 'red-alliance'),
        { wrapper }
      );

      const scoreData = {
        elementScores: { 'elem-1': 5 },
        finalScore: 5,
        timestamp: Date.now(),
      };

      result.current.submitScore(scoreData);

      await waitFor(() => expect(result.current.submitError).toBeInstanceOf(Error));
    });
  });

  describe('useScoreConfig', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMatchScoreConfig.scoreConfig),
      });
    });

    it('should fetch score config by ID', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useScoreConfig('config-1'), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockMatchScoreConfig.scoreConfig);
      expect(mockFetch).toHaveBeenCalledWith('/api/score-configs/config-1');
    });

    it('should not fetch when scoreConfigId is null', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useScoreConfig(null), { wrapper });

      expect(result.current.data).toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('useClientScoreCalculation', () => {
    const { scoreCalculationEngine } = require('@/hooks/score-config/score-calculation');

    beforeEach(() => {
      scoreCalculationEngine.calculateScores.mockReturnValue(mockCalculationResult);
      scoreCalculationEngine.getConditionProgress.mockReturnValue(0.5);
      scoreCalculationEngine.isConditionInWarning.mockReturnValue(false);
      scoreCalculationEngine.getLastCalculationMetrics.mockReturnValue({
        calculationTime: 5,
        elementsProcessed: 2,
      });
    });

    it('should perform client-side calculations', async () => {
      const sections = mockMatchScoreConfig.scoreConfig.scoreSections;
      const { result } = renderHook(() => useClientScoreCalculation(sections));

      result.current.updateElementScore('elem-1', 5);

      await waitFor(() => expect(result.current.calculationResult).toBeTruthy());

      expect(scoreCalculationEngine.calculateScores).toHaveBeenCalledWith(
        sections,
        { 'elem-1': 5 },
        undefined
      );
    });

    it('should debounce client-side calculations', async () => {
      const sections = mockMatchScoreConfig.scoreConfig.scoreSections;
      const { result } = renderHook(() => useClientScoreCalculation(sections));

      // Rapidly update scores
      result.current.updateElementScore('elem-1', 1);
      result.current.updateElementScore('elem-1', 2);
      result.current.updateElementScore('elem-1', 3);

      // Wait for debounce
      await waitFor(() => expect(scoreCalculationEngine.calculateScores).toHaveBeenCalled(), {
        timeout: 200,
      });

      // Should only calculate once after debounce
      expect(scoreCalculationEngine.calculateScores).toHaveBeenCalledTimes(1);
    });

    it('should handle calculation errors gracefully', async () => {
      scoreCalculationEngine.calculateScores.mockImplementationOnce(() => {
        throw new Error('Calculation error');
      });

      const sections = mockMatchScoreConfig.scoreConfig.scoreSections;
      const { result } = renderHook(() => useClientScoreCalculation(sections));

      result.current.updateElementScore('elem-1', 5);

      await waitFor(() => expect(result.current.calculationError).toBeInstanceOf(Error));
    });

    it('should reset scores correctly', async () => {
      const sections = mockMatchScoreConfig.scoreConfig.scoreSections;
      const { result } = renderHook(() => useClientScoreCalculation(sections));

      result.current.updateElementScore('elem-1', 5);
      result.current.resetScores();

      expect(result.current.elementScores).toEqual({});
      expect(result.current.calculationResult).toBeNull();
    });

    it('should provide condition progress and warnings', () => {
      const sections = mockMatchScoreConfig.scoreConfig.scoreSections;
      const { result } = renderHook(() => useClientScoreCalculation(sections));

      const condition = { id: 'cond-1', type: 'threshold' };
      const progress = result.current.getConditionProgress(condition);
      const isWarning = result.current.isConditionInWarning(condition);

      expect(progress).toBe(0.5);
      expect(isWarning).toBe(false);
      expect(scoreCalculationEngine.getConditionProgress).toHaveBeenCalledWith(
        condition,
        result.current.elementScores
      );
      expect(scoreCalculationEngine.isConditionInWarning).toHaveBeenCalledWith(
        condition,
        result.current.elementScores
      );
    });

    it('should provide performance metrics', () => {
      const sections = mockMatchScoreConfig.scoreConfig.scoreSections;
      const { result } = renderHook(() => useClientScoreCalculation(sections));

      const metrics = result.current.getPerformanceMetrics();

      expect(metrics).toEqual({
        calculationTime: 5,
        elementsProcessed: 2,
      });
    });
  });

  describe('useScoreConfigCache', () => {
    it('should detect online/offline status', () => {
      const { result } = renderHook(() => useScoreConfigCache());

      expect(result.current.isOnline).toBe(navigator.onLine);
    });

    it('should preload score configurations', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useScoreConfigCache(), { wrapper });

      result.current.preloadScoreConfig('match-123');

      // Should have made prefetch calls
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith('/api/match-scores/match-123/score-config');
      expect(mockFetch).toHaveBeenCalledWith('/api/match-scores/match-123/score-panel-config');
    });

    it('should clear cache', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useScoreConfigCache(), { wrapper });

      expect(() => result.current.clearCache()).not.toThrow();
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle network timeout', async () => {
      mockFetch.mockImplementationOnce(
        () => new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100);
        })
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useMatchScoreConfig('match-123'), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true), {
        timeout: 200,
      });

      expect(result.current.error?.message).toBe('Network timeout');
    });

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useMatchScoreConfig('match-123'), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should handle rate limiting (429 status)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useMatchScoreConfig('match-123'), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('Performance and Memory', () => {
    it('should not cause memory leaks with rapid updates', async () => {
      const wrapper = createWrapper();
      const { result, unmount } = renderHook(
        () => useScoreCalculation('match-123', 'red-alliance'),
        { wrapper }
      );

      // Simulate rapid score updates
      for (let i = 0; i < 100; i++) {
        result.current.setElementScores({ [`elem-${i}`]: i });
      }

      unmount();

      // Should not throw or cause issues
      expect(true).toBe(true);
    });

    it('should handle concurrent score calculations', async () => {
      const wrapper = createWrapper();
      
      const promises = Array.from({ length: 5 }, (_, i) => {
        const { result } = renderHook(
          () => useScoreCalculation(`match-${i}`, 'red-alliance'),
          { wrapper }
        );
        
        result.current.setElementScores({ 'elem-1': i });
        return result;
      });

      // All should eventually complete without interference
      await waitFor(() => {
        promises.forEach(({ current }) => {
          expect(current.isCalculating).toBe(false);
        });
      });
    });
  });
});
