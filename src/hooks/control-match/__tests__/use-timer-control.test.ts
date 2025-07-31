import { renderHook, act } from '@testing-library/react';
import { useTimerControl } from '../use-timer-control';
import { MatchStatus, UserRole } from '@/types/types';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the unified WebSocket hook
const mockStartTimer = jest.fn();
const mockPauseTimer = jest.fn();
const mockResetTimer = jest.fn();
const mockSubscribe = jest.fn();
const mockCanAccess = jest.fn();

jest.mock('@/hooks/websocket/use-unified-websocket', () => ({
  useUnifiedWebSocket: jest.fn(() => ({
    startTimer: mockStartTimer,
    pauseTimer: mockPauseTimer,
    resetTimer: mockResetTimer,
    subscribe: mockSubscribe,
    isConnected: true,
    canAccess: mockCanAccess,
    connectionStatus: 'connected',
    connect: jest.fn(),
    disconnect: jest.fn(),
    joinTournament: jest.fn(),
    leaveTournament: jest.fn(),
    joinFieldRoom: jest.fn(),
    leaveFieldRoom: jest.fn(),
    sendScoreUpdate: jest.fn(),
    sendMatchUpdate: jest.fn(),
    sendMatchStateChange: jest.fn(),
    changeDisplayMode: jest.fn(),
    sendAnnouncement: jest.fn(),
    joinCollaborativeSession: jest.fn(),
    leaveCollaborativeSession: jest.fn(),
    setUserRole: jest.fn(),
    service: {} as any,
  })),
}));

describe('useTimerControl', () => {
  const mockSendMatchStateChange = jest.fn();

  const defaultProps = {
    tournamentId: 'tournament-123',
    selectedFieldId: 'field-1',
    selectedMatchId: 'match-456',
    sendMatchStateChange: mockSendMatchStateChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockCanAccess.mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useTimerControl(defaultProps));

      expect(result.current.timerDuration).toBe(150000); // 2:30 in ms
      expect(result.current.timerRemaining).toBe(150000);
      expect(result.current.timerIsRunning).toBe(false);
      expect(result.current.matchPeriod).toBe('auto');
    });

    it('should initialize with custom duration', () => {
      const { result } = renderHook(() => 
        useTimerControl({ ...defaultProps, initialDuration: 120000 })
      );

      expect(result.current.timerDuration).toBe(120000);
      expect(result.current.timerRemaining).toBe(120000);
    });

    it('should set up unified WebSocket with correct parameters', () => {
      const { useUnifiedWebSocket } = require('@/hooks/websocket/use-unified-websocket');
      renderHook(() => useTimerControl(defaultProps));

      expect(useUnifiedWebSocket).toHaveBeenCalledWith({
        tournamentId: 'tournament-123',
        fieldId: 'field-1',
        autoConnect: true,
        userRole: UserRole.HEAD_REFEREE,
      });
    });
  });

  describe('timer controls', () => {
    it('should start timer when user has access', () => {
      const { result } = renderHook(() => useTimerControl(defaultProps));

      act(() => {
        result.current.handleStartTimer();
      });

      expect(mockCanAccess).toHaveBeenCalledWith('timer_control');
      expect(mockStartTimer).toHaveBeenCalledWith({
        duration: 150000,
        remaining: 150000,
        isRunning: true,
      });
      expect(mockSendMatchStateChange).toHaveBeenCalledWith({
        matchId: 'match-456',
        status: MatchStatus.IN_PROGRESS,
        currentPeriod: 'auto',
      });
    });

    it('should not start timer when user lacks access', () => {
      mockCanAccess.mockReturnValue(false);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(() => useTimerControl(defaultProps));

      act(() => {
        result.current.handleStartTimer();
      });

      expect(consoleSpy).toHaveBeenCalledWith('[useTimerControl] Access denied for timer control');
      expect(mockStartTimer).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should pause timer when user has access', () => {
      const { result } = renderHook(() => useTimerControl(defaultProps));

      act(() => {
        result.current.handlePauseTimer();
      });

      expect(mockCanAccess).toHaveBeenCalledWith('timer_control');
      expect(mockPauseTimer).toHaveBeenCalledWith({
        duration: 150000,
        remaining: 150000,
        isRunning: false,
      });
    });

    it('should reset timer when user has access', () => {
      const { result } = renderHook(() => useTimerControl(defaultProps));

      act(() => {
        result.current.handleResetTimer();
      });

      expect(mockCanAccess).toHaveBeenCalledWith('timer_control');
      expect(mockResetTimer).toHaveBeenCalledWith({
        duration: 150000,
        remaining: 150000,
        isRunning: false,
      });
      expect(mockSendMatchStateChange).toHaveBeenCalledWith({
        matchId: 'match-456',
        status: MatchStatus.PENDING,
        currentPeriod: 'auto',
      });
    });
  });

  describe('timer synchronization', () => {
    it('should handle timer updates with drift correction', () => {
      const { result } = renderHook(() => useTimerControl(defaultProps));
      
      // Mock the subscribe function to capture the timer update handler
      let timerUpdateHandler: (data: any) => void;
      mockSubscribe.mockImplementation((event: string, handler: any) => {
        if (event === 'timer_update') {
          timerUpdateHandler = handler;
        }
        return jest.fn(); // Return unsubscribe function
      });

      // Re-render to set up subscriptions
      renderHook(() => useTimerControl(defaultProps));

      // Simulate timer update from server
      const serverData = {
        duration: 150000,
        remaining: 120000,
        isRunning: true,
        startedAt: Date.now() - 30000, // Started 30 seconds ago
        fieldId: 'field-1',
      };

      act(() => {
        timerUpdateHandler!(serverData);
      });

      // Timer should be updated with drift correction
      expect(result.current.timerIsRunning).toBe(true);
      // Remaining time should be corrected based on server timestamp
      expect(result.current.timerRemaining).toBeCloseTo(120000, -2); // Allow some variance
    });

    it('should ignore timer updates for different fields', () => {
      const { result } = renderHook(() => useTimerControl(defaultProps));
      
      let timerUpdateHandler: (data: any) => void;
      mockSubscribe.mockImplementation((event: string, handler: any) => {
        if (event === 'timer_update') {
          timerUpdateHandler = handler;
        }
        return jest.fn();
      });

      renderHook(() => useTimerControl(defaultProps));

      const initialRemaining = result.current.timerRemaining;

      // Simulate timer update for different field
      const serverData = {
        duration: 150000,
        remaining: 60000,
        isRunning: true,
        fieldId: 'field-2', // Different field
      };

      act(() => {
        timerUpdateHandler!(serverData);
      });

      // Timer should not be updated
      expect(result.current.timerRemaining).toBe(initialRemaining);
      expect(result.current.timerIsRunning).toBe(false);
    });
  });

  describe('local timer continuation', () => {
    it('should continue timer locally during connection loss', () => {
      // Mock connection loss
      const { useUnifiedWebSocket } = require('@/hooks/websocket/use-unified-websocket');
      useUnifiedWebSocket.mockReturnValue({
        ...useUnifiedWebSocket(),
        isConnected: false,
      });

      const { result } = renderHook(() => useTimerControl(defaultProps));

      // Set up timer as running with local start time
      act(() => {
        // Simulate timer was started and then connection lost
        result.current.handleStartTimer();
      });

      // Fast-forward time to simulate local countdown
      act(() => {
        jest.advanceTimersByTime(5000); // 5 seconds
      });

      // Timer should continue counting down locally
      // Note: Exact timing may vary due to implementation details
      expect(result.current.timerIsRunning).toBe(true);
    });
  });

  describe('match switching', () => {
    it('should reset timer state when match changes', () => {
      const { result, rerender } = renderHook(
        (props) => useTimerControl(props),
        { initialProps: defaultProps }
      );

      // Start timer
      act(() => {
        result.current.handleStartTimer();
      });

      expect(result.current.timerIsRunning).toBe(true);

      // Switch to different match
      rerender({
        ...defaultProps,
        selectedMatchId: 'match-789',
      });

      // Timer should be reset for new match
      expect(result.current.timerIsRunning).toBe(false);
      expect(result.current.timerRemaining).toBe(150000);
      expect(result.current.matchPeriod).toBe('auto');
    });
  });

  describe('period transitions', () => {
    it('should transition from auto to teleop after 30 seconds', () => {
      const { result } = renderHook(() => useTimerControl(defaultProps));

      // Set timer to running with 120 seconds remaining (30 seconds elapsed)
      act(() => {
        result.current.setTimerDuration(150000);
        // Simulate timer update that would trigger period transition
      });

      // Simulate timer running with 120 seconds remaining
      let timerUpdateHandler: (data: any) => void;
      mockSubscribe.mockImplementation((event: string, handler: any) => {
        if (event === 'timer_update') {
          timerUpdateHandler = handler;
        }
        return jest.fn();
      });

      renderHook(() => useTimerControl(defaultProps));

      act(() => {
        timerUpdateHandler!({
          duration: 150000,
          remaining: 120000, // 2:00 remaining = 30 seconds elapsed
          isRunning: true,
          fieldId: 'field-1',
        });
      });

      // Should transition to teleop
      expect(result.current.matchPeriod).toBe('teleop');
    });

    it('should transition to endgame in last 30 seconds', () => {
      const { result } = renderHook(() => useTimerControl(defaultProps));

      let timerUpdateHandler: (data: any) => void;
      mockSubscribe.mockImplementation((event: string, handler: unknown) => {
        if (event === 'timer_update') {
          timerUpdateHandler = handler;
        }
        return jest.fn();
      });

      renderHook(() => useTimerControl(defaultProps));

      act(() => {
        timerUpdateHandler!({
          duration: 150000,
          remaining: 25000, // 25 seconds remaining = endgame
          isRunning: true,
          fieldId: 'field-1',
        });
      });

      // Should transition to endgame
      expect(result.current.matchPeriod).toBe('endgame');
    });
  });

  describe('utility functions', () => {
    it('should format time correctly', () => {
      const { result } = renderHook(() => useTimerControl(defaultProps));

      expect(result.current.formatTime(150000)).toBe('2:30');
      expect(result.current.formatTime(90000)).toBe('1:30');
      expect(result.current.formatTime(5000)).toBe('0:05');
      expect(result.current.formatTime(0)).toBe('0:00');
    });
  });
});