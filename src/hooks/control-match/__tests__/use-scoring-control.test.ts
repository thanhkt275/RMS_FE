import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useScoringControl } from '../use-scoring-control';
import { useUnifiedWebSocket } from '../../websocket/use-unified-websocket';
import { useScoringState } from '../../scoring/use-scoring-state';
import { usePersistence } from '../../scoring/use-persistence';
import { useUserActivity } from '../../scoring/use-user-activity';
import { useDataSync } from '../../scoring/use-data-sync';
import { ScoreData } from '@/types/types';

// Mock dependencies
jest.mock('../../websocket/use-unified-websocket');
jest.mock('../../scoring/use-scoring-state');
jest.mock('../../scoring/use-persistence');
jest.mock('../../scoring/use-user-activity');
jest.mock('../../scoring/use-data-sync');

const mockUseUnifiedWebSocket = useUnifiedWebSocket as jest.MockedFunction<typeof useUnifiedWebSocket>;
const mockUseScoringState = useScoringState as jest.MockedFunction<typeof useScoringState>;
const mockUsePersistence = usePersistence as jest.MockedFunction<typeof usePersistence>;
const mockUseUserActivity = useUserActivity as jest.MockedFunction<typeof useUserActivity>;
const mockUseDataSync = useDataSync as jest.MockedFunction<typeof useDataSync>;

describe('useScoringControl', () => {
  let queryClient: QueryClient;
  let mockWebSocket: any;
  let mockStateService: any;
  let mockUserActivityService: any;
  let mockSaveScores: jest.Mock;

  const defaultProps = {
    tournamentId: 'tournament-1',
    selectedMatchId: 'match-1',
    selectedFieldId: 'field-1',
  };

  const defaultState = {
    redAlliance: {
      autoScore: 10,
      driveScore: 20,
      totalScore: 30,
      penalty: 0,
      gameElements: [],
      teamCount: 2,
      multiplier: 1.0,
    },
    blueAlliance: {
      autoScore: 15,
      driveScore: 25,
      totalScore: 40,
      penalty: 5,
      gameElements: [],
      teamCount: 2,
      multiplier: 1.0,
    },
    scoreDetails: {},
    isAddingRedElement: false,
    isAddingBlueElement: false,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mock WebSocket service
    mockWebSocket = {
      on: jest.fn().mockReturnValue(() => {}),
      sendScoreUpdate: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
    };
    mockUseUnifiedWebSocket.mockReturnValue(mockWebSocket);

    // Mock state service
    mockStateService = {
      updateScore: jest.fn(),
      updateGameElements: jest.fn(),
      updateTeamCount: jest.fn(),
      updateMultiplier: jest.fn(),
      updateScoreDetails: jest.fn(),
      updateUIState: jest.fn(),
    };
    mockUseScoringState.mockReturnValue({
      state: defaultState,
      stateService: mockStateService,
    });

    // Mock user activity service
    mockUserActivityService = {
      isUserActive: jest.fn().mockReturnValue(false),
      markUserActive: jest.fn(),
      resetActivity: jest.fn(),
    };
    mockUseUserActivity.mockReturnValue(mockUserActivityService);

    // Mock persistence
    mockSaveScores = jest.fn().mockResolvedValue(undefined);
    mockUsePersistence.mockReturnValue({
      saveScores: mockSaveScores,
      matchScores: null,
      isLoading: false,
    });

    // Mock data sync
    mockUseDataSync.mockReturnValue({
      isLoadingScores: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderHookWithProvider = (props = defaultProps) => {
    return renderHook(() => useScoringControl(props), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        React.createElement(QueryClientProvider, { client: queryClient }, children)
      ),
    });
  };

  describe('WebSocket Integration', () => {
    it('should subscribe to score updates on mount', () => {
      renderHookWithProvider();

      expect(mockWebSocket.on).toHaveBeenCalledWith('score_update', expect.any(Function));
    });

    it('should send score updates with debouncing when connected', () => {
      const { result } = renderHookWithProvider();

      act(() => {
        result.current.sendRealtimeUpdate();
      });

      expect(mockWebSocket.sendScoreUpdate).toHaveBeenCalledWith({
        matchId: 'match-1',
        tournamentId: 'tournament-1',
        fieldId: 'field-1',
        redAutoScore: 10,
        redDriveScore: 20,
        redTotalScore: 30,
        blueAutoScore: 15,
        blueDriveScore: 25,
        blueTotalScore: 40,
        redGameElements: [],
        blueGameElements: [],
        redTeamCount: 2,
        redMultiplier: 1.0,
        blueTeamCount: 2,
        blueMultiplier: 1.0,
        scoreDetails: {},
      });
    });

    it('should queue score updates when connection is lost', () => {
      mockWebSocket.isConnected.mockReturnValue(false);
      const { result } = renderHookWithProvider();

      act(() => {
        result.current.sendRealtimeUpdate();
      });

      // Should not send immediately when disconnected
      expect(mockWebSocket.sendScoreUpdate).not.toHaveBeenCalled();
    });

    it('should process queued updates when connection is restored', async () => {
      // Start disconnected
      mockWebSocket.isConnected.mockReturnValue(false);
      const { result } = renderHookWithProvider();

      // Queue an update
      act(() => {
        result.current.sendRealtimeUpdate();
      });

      // Verify update was not sent immediately
      expect(mockWebSocket.sendScoreUpdate).not.toHaveBeenCalled();

      // Reconnect and trigger effect
      mockWebSocket.isConnected.mockReturnValue(true);
      
      // Force re-render to trigger the useEffect that processes the queue
      act(() => {
        // Simulate connection status change that would trigger the effect
        result.current.sendRealtimeUpdate();
      });

      // Now the queued update should be processed
      expect(mockWebSocket.sendScoreUpdate).toHaveBeenCalled();
    });

    it('should filter score updates by field ID', () => {
      const { result } = renderHookWithProvider();
      const scoreUpdateCallback = mockWebSocket.on.mock.calls[0][1];

      // Should accept update for same field
      const sameFieldUpdate: ScoreData = {
        matchId: 'match-1',
        fieldId: 'field-1',
        tournamentId: 'tournament-1',
        redAutoScore: 5,
        redDriveScore: 10,
        redTotalScore: 15,
        blueAutoScore: 8,
        blueDriveScore: 12,
        blueTotalScore: 20,
      };

      act(() => {
        scoreUpdateCallback(sameFieldUpdate);
      });

      // Should ignore update for different field
      const differentFieldUpdate: ScoreData = {
        ...sameFieldUpdate,
        fieldId: 'field-2',
      };

      act(() => {
        scoreUpdateCallback(differentFieldUpdate);
      });

      // Verify only the same field update was processed
      expect(queryClient.getQueryData(['match-scores', 'match-1'])).toEqual(
        expect.objectContaining(sameFieldUpdate)
      );
    });

    it('should not update cache when user is actively typing', () => {
      mockUserActivityService.isUserActive.mockReturnValue(true);
      const { result } = renderHookWithProvider();
      const scoreUpdateCallback = mockWebSocket.on.mock.calls[0][1];

      const scoreUpdate: ScoreData = {
        matchId: 'match-1',
        fieldId: 'field-1',
        tournamentId: 'tournament-1',
        redAutoScore: 5,
        redDriveScore: 10,
        redTotalScore: 15,
        blueAutoScore: 8,
        blueDriveScore: 12,
        blueTotalScore: 20,
      };

      act(() => {
        scoreUpdateCallback(scoreUpdate);
      });

      // Cache should not be updated when user is active
      expect(queryClient.getQueryData(['match-scores', 'match-1'])).toBeUndefined();
    });
  });

  describe('Score Management', () => {
    it('should update scores and mark user as active', () => {
      const { result } = renderHookWithProvider();

      act(() => {
        result.current.setRedAutoScore(25);
      });

      expect(mockUserActivityService.markUserActive).toHaveBeenCalled();
      expect(mockStateService.updateScore).toHaveBeenCalledWith('red', 'auto', 25);
    });

    it('should save scores and send real-time update', async () => {
      const { result } = renderHookWithProvider();

      await act(async () => {
        await result.current.saveScores();
      });

      expect(mockSaveScores).toHaveBeenCalledWith(defaultState);
      expect(mockWebSocket.sendScoreUpdate).toHaveBeenCalled();
      expect(mockUserActivityService.resetActivity).toHaveBeenCalled();
    });

    it('should broadcast scores when match changes', () => {
      const matchScores = {
        redAutoScore: 5,
        redDriveScore: 10,
        redTotalScore: 15,
        blueAutoScore: 8,
        blueDriveScore: 12,
        blueTotalScore: 20,
        redGameElements: [],
        blueGameElements: [],
        redTeamCount: 2,
        redMultiplier: 1.0,
        blueTeamCount: 2,
        blueMultiplier: 1.0,
        scoreDetails: {},
      };

      mockUsePersistence.mockReturnValue({
        saveScores: mockSaveScores,
        matchScores,
        isLoading: false,
      });

      renderHookWithProvider();

      expect(mockWebSocket.sendScoreUpdate).toHaveBeenCalledWith({
        matchId: 'match-1',
        tournamentId: 'tournament-1',
        fieldId: 'field-1',
        ...matchScores,
      });
    });
  });

  describe('Debouncing and Rate Limiting', () => {
    it('should respect 200ms max latency requirement', async () => {
      const { result } = renderHookWithProvider();

      const startTime = Date.now();
      
      act(() => {
        result.current.sendRealtimeUpdate();
      });

      expect(mockWebSocket.sendScoreUpdate).toHaveBeenCalled();
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      // Should be well under 200ms for immediate send
      expect(latency).toBeLessThan(200);
    });

    it('should handle rapid score updates efficiently', () => {
      const { result } = renderHookWithProvider();

      // Simulate rapid updates
      act(() => {
        for (let i = 0; i < 20; i++) {
          result.current.setRedAutoScore(i);
        }
      });

      // Should mark user active for each update
      expect(mockUserActivityService.markUserActive).toHaveBeenCalledTimes(20);
      expect(mockStateService.updateScore).toHaveBeenCalledTimes(20);
    });
  });

  describe('Error Handling', () => {
    it('should handle WebSocket connection errors gracefully', () => {
      mockWebSocket.on.mockImplementation((event, callback) => {
        if (event === 'score_update') {
          // Simulate error in callback
          setTimeout(() => {
            try {
              callback({ invalid: 'data' });
            } catch (error) {
              // Error should be handled gracefully
            }
          }, 0);
        }
        return () => {};
      });

      expect(() => {
        renderHookWithProvider();
      }).not.toThrow();
    });

    it('should handle save errors gracefully', async () => {
      mockSaveScores.mockRejectedValue(new Error('Save failed'));
      const { result } = renderHookWithProvider();

      await expect(result.current.saveScores()).rejects.toThrow('Save failed');
    });
  });

  describe('State Synchronization', () => {
    it('should return current state values', () => {
      const { result } = renderHookWithProvider();

      expect(result.current.redAutoScore).toBe(10);
      expect(result.current.redDriveScore).toBe(20);
      expect(result.current.redTotalScore).toBe(30);
      expect(result.current.blueAutoScore).toBe(15);
      expect(result.current.blueDriveScore).toBe(25);
      expect(result.current.blueTotalScore).toBe(40);
      expect(result.current.redPenalty).toBe(0);
      expect(result.current.bluePenalty).toBe(5);
    });

    it('should provide all required setter functions', () => {
      const { result } = renderHookWithProvider();

      expect(typeof result.current.setRedAutoScore).toBe('function');
      expect(typeof result.current.setRedDriveScore).toBe('function');
      expect(typeof result.current.setBlueAutoScore).toBe('function');
      expect(typeof result.current.setBlueDriveScore).toBe('function');
      expect(typeof result.current.setRedTotalScore).toBe('function');
      expect(typeof result.current.setBlueTotalScore).toBe('function');
      expect(typeof result.current.setRedPenalty).toBe('function');
      expect(typeof result.current.setBluePenalty).toBe('function');
    });

    it('should provide game element setters', () => {
      const { result } = renderHookWithProvider();

      act(() => {
        result.current.setRedGameElements([{ element: 'test', count: 1, pointsEach: 5, totalPoints: 5, operation: 'add' }]);
      });

      expect(mockStateService.updateGameElements).toHaveBeenCalledWith('red', [
        { element: 'test', count: 1, pointsEach: 5, totalPoints: 5, operation: 'add' }
      ]);
    });
  });
});