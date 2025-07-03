import { useState, useEffect, useCallback, useRef } from 'react';
import { webSocketService } from '@/lib/websocket';
import { apiClient } from '@/lib/api-client';
import type { BaseScoreData } from '@/types/websocket';


interface IScoreState {
  red: {
    auto: number;
    drive: number;
    total: number;
    penalty: number;
  };
  blue: {
    auto: number;
    drive: number;
    total: number;
    penalty: number;
  };
}

interface IConnectionState {
  isConnected: boolean;
  fallbackMode: boolean;
  lastUpdateTime: number;
  source: 'websocket' | 'database' | 'none';
}

interface IFallbackManager {
  enableFallback(): void;
  disableFallback(): void;
  startPolling(matchId: string): void;
  stopPolling(): void;
  isFallbackActive(): boolean;
}

interface IScoreUpdater {
  updateScores(data: BaseScoreData): void;
  updateFromDatabase(data: any): void;
  resetScores(): void;
}


class FallbackManager implements IFallbackManager {
  private fallbackActive = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly pollingIntervalMs = 2000; // 2 seconds

  constructor(
    private onScoreUpdate: (data: any, source: 'database') => void,
    private onError: (error: Error) => void
  ) { }
  enableFallback(): void {
    this.fallbackActive = true;
    console.warn('🔄 Switching to database fallback mode');
  }

  disableFallback(): void {
    this.fallbackActive = false;
    this.stopPolling();
    console.log('✅ Switched back to real-time mode');
  }
  startPolling(matchId: string): void {
    if (!this.fallbackActive || !matchId) {
      console.log('⏭️ Skipping polling start - fallback inactive or no matchId');
      return;
    }

    //  Don't start polling if real-time mode is working
    // Database polling should only happen when WebSocket completely fails
    console.log('🔄 Fallback mode detected, but prioritizing real-time scores over database polling');
    console.warn('Database fallback polling is disabled to prevent overriding real-time scores');
    return;

    this.stopPolling(); // Ensure no duplicate intervals

    console.log(`🔁 Starting database polling for match ${matchId} (interval: ${this.pollingIntervalMs}ms)`);

    this.pollingInterval = setInterval(async () => {
      if (!this.fallbackActive) {
        console.log('⏹️ Stopping polling - fallback no longer active');
        this.stopPolling();
        return;
      }

      try {
        console.log('📊 Polling database for match scores:', matchId);

        // Fetch scores from database using API client
        const data = await apiClient.get(`/match-scores/match/${matchId}`);
        this.onScoreUpdate(data, 'database');

      } catch (error) {
        console.error('💥 Database fallback failed:', error);
        this.onError(error as Error);
      }
    }, this.pollingIntervalMs);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('Database polling stopped');
    }
  }

  isFallbackActive(): boolean {
    return this.fallbackActive;
  }

  cleanup(): void {
    this.stopPolling();
    this.fallbackActive = false;
  }
}



class ScoreUpdater implements IScoreUpdater {
  private lastRealtimeUpdate: number = 0;

  constructor(
    private setScores: (scores: IScoreState) => void,
    private setLastUpdateTime: (time: number) => void,
    private setSource: (source: 'websocket' | 'database' | 'none') => void
  ) { } updateScores(data: BaseScoreData): void {
    const scores: IScoreState = {
      red: {
        auto: data.redAutoScore || 0,
        drive: data.redDriveScore || 0,
        total: data.redTotalScore || 0,
        penalty: data.redPenalty || 0
      },
      blue: {
        auto: data.blueAutoScore || 0,
        drive: data.blueDriveScore || 0,
        total: data.blueTotalScore || 0,
        penalty: data.bluePenalty || 0
      }
    };

    this.setScores(scores);
    this.setLastUpdateTime(Date.now());
    this.setSource('websocket');
    this.lastRealtimeUpdate = Date.now(); // Track real-time updates

    console.log('Real-time scores updated:', scores);
  }
  updateFromDatabase(data: any): void {
    //  Only update from database if no recent real-time updates
    const timeSinceLastUpdate = Date.now() - (this.lastRealtimeUpdate || 0);
    const REALTIME_PRIORITY_WINDOW = 5000; // 5 seconds

    if (timeSinceLastUpdate < REALTIME_PRIORITY_WINDOW) {
      console.log('🚫 Ignoring database update - recent real-time update detected');
      return;
    } const scores: IScoreState = {
      red: {
        auto: data.redAutoScore || 0,
        drive: data.redDriveScore || 0,
        total: data.redTotalScore || 0,
        penalty: data.redPenalty || 0
      },
      blue: {
        auto: data.blueAutoScore || 0,
        drive: data.blueDriveScore || 0,
        total: data.blueTotalScore || 0,
        penalty: data.bluePenalty || 0
      }
    };

    this.setScores(scores);
    this.setLastUpdateTime(Date.now());
    this.setSource('database');

    console.log('Database scores updated:', scores);
  }
  resetScores(): void {
    this.setScores({
      red: { auto: 0, drive: 0, total: 0, penalty: 0 },
      blue: { auto: 0, drive: 0, total: 0, penalty: 0 }
    });
    this.setLastUpdateTime(0);
    this.setSource('none');
  }
}



export function useRealtimeScores(matchId: string) {  // State management
  const [realtimeScores, setRealtimeScores] = useState<IScoreState>({
    red: { auto: 0, drive: 0, total: 0, penalty: 0 },
    blue: { auto: 0, drive: 0, total: 0, penalty: 0 }
  });

  const [connectionState, setConnectionState] = useState<IConnectionState>({
    isConnected: false,
    fallbackMode: false,
    lastUpdateTime: 0,
    source: 'none'
  });

  // Refs for managers to prevent recreation on every render
  const fallbackManagerRef = useRef<FallbackManager | null>(null);
  const scoreUpdaterRef = useRef<ScoreUpdater | null>(null);

  // Helper setters for state updates
  const setLastUpdateTime = useCallback((time: number) => {
    setConnectionState(prev => ({ ...prev, lastUpdateTime: time }));
  }, []);

  const setSource = useCallback((source: 'websocket' | 'database' | 'none') => {
    setConnectionState(prev => ({ ...prev, source }));
  }, []);

  const setFallbackMode = useCallback((fallbackMode: boolean) => {
    setConnectionState(prev => ({ ...prev, fallbackMode }));
  }, []);

  const setIsConnected = useCallback((isConnected: boolean) => {
    setConnectionState(prev => ({ ...prev, isConnected }));
  }, []);
  // Initialize managers once
  useEffect(() => {
    console.log('🚀 Initializing useRealtimeScores for matchId:', matchId);

    const handleDatabaseUpdate = (data: any, source: 'database') => {
      scoreUpdaterRef.current?.updateFromDatabase(data);
    };

    const handleError = (error: Error) => {
      console.error('Fallback manager error:', error);
    };

    fallbackManagerRef.current = new FallbackManager(handleDatabaseUpdate, handleError);
    scoreUpdaterRef.current = new ScoreUpdater(setRealtimeScores, setLastUpdateTime, setSource);

    // Check initial connection status
    const isCurrentlyConnected = webSocketService.isConnected();
    console.log('🔍 Initial WebSocket connection status:', isCurrentlyConnected);

    if (isCurrentlyConnected) {
      console.log('✅ WebSocket connected on initialization - ensuring fallback is disabled');
      setIsConnected(true);
      setFallbackMode(false);
    } else {
      console.log('❌ WebSocket not connected on initialization');
      setIsConnected(false);
      // Don't automatically enable fallback - let the connection attempts handle it
    }

    return () => {
      console.log('🧹 Cleaning up useRealtimeScores managers');
      fallbackManagerRef.current?.cleanup();
    };
  }, []); // Empty dependency array - initialize once

  // === STEP 12: Graceful Degradation Implementation ===
  // Handle fallback mode changes
  useEffect(() => {
    if (!fallbackManagerRef.current) return; const handleFallback = (reason: string) => {
      console.log('Fallback mode change:', reason);

      if (reason === 'websocket_failure') {
        console.log('WebSocket failure detected, but keeping real-time mode active');
        console.log('Database fallback is disabled to prevent score conflicts');
        //  Don't enable fallback for transient failures
        // Only enable if WebSocket is completely unavailable for extended period
        return;
      } else if (reason === 'reconnected') {
        console.log('WebSocket reconnected - ensuring fallback is disabled');
        fallbackManagerRef.current?.disableFallback();
        setFallbackMode(false);
        setIsConnected(true);
      }
    };

    const unsubscribeFallback = webSocketService.onFallbackMode(handleFallback);

    return unsubscribeFallback;
  }, [matchId, setFallbackMode, setIsConnected]);

  // Handle database polling when matchId changes
  useEffect(() => {
    if (connectionState.fallbackMode && matchId && fallbackManagerRef.current) {
      fallbackManagerRef.current.startPolling(matchId);
    }
  }, [matchId, connectionState.fallbackMode]);
  // Handle WebSocket score updates
  useEffect(() => {
    if (!matchId || !scoreUpdaterRef.current) return; const handleScoreUpdate = (data: BaseScoreData) => {
      console.log("🟢 [New WebSocket Service] Real-time score update received:", data, "for matchId:", matchId);

      if (data.matchId === matchId) {
        console.log("✅ Score update matches current matchId - applying update");
        scoreUpdaterRef.current?.updateScores(data);
      } else {
        console.log("❌ Score update ignored - matchId mismatch:", {
          receivedMatchId: data.matchId,
          expectedMatchId: matchId
        });
      }
    };

    const handleConnect = () => {
      console.log('WebSocket connected - disabling fallback mode');
      setIsConnected(true);

      // Immediately disable fallback when WebSocket connects
      if (fallbackManagerRef.current) {
        fallbackManagerRef.current.disableFallback();
        setFallbackMode(false);
      }
    };

    const handleDisconnect = () => {
      console.log('WebSocket disconnected - connection status updated');
      setIsConnected(false);
      // Don't immediately enable fallback - let the fallback event handle it
    };    // Set up WebSocket listeners
    console.log("🔔 Setting up WebSocket score update subscription for matchId:", matchId);
    const unsubscribeScoreUpdate = webSocketService.onScoreUpdate(handleScoreUpdate);
    const unsubscribeConnect = webSocketService.on('connect', handleConnect);
    const unsubscribeDisconnect = webSocketService.on('disconnect', handleDisconnect);

    // Check initial connection status and disable fallback if connected
    const isCurrentlyConnected = webSocketService.isConnected();
    setIsConnected(isCurrentlyConnected);

    if (isCurrentlyConnected && fallbackManagerRef.current) {
      console.log('WebSocket already connected on mount - disabling fallback');
      fallbackManagerRef.current.disableFallback();
      setFallbackMode(false);
    }

    return () => {
      unsubscribeScoreUpdate?.();
      unsubscribeConnect?.();
      unsubscribeDisconnect?.();
    };
  }, [matchId, setIsConnected, setFallbackMode]);

  // Cleanup on unmount or matchId change
  useEffect(() => {
    return () => {
      fallbackManagerRef.current?.cleanup();
    };
  }, [matchId]);

  // Return clean interface
  return {
    realtimeScores,
    lastUpdateTime: connectionState.lastUpdateTime,
    isConnected: connectionState.isConnected,
    fallbackMode: connectionState.fallbackMode,
    source: connectionState.source,
    // Helper methods for debugging/testing
    forceReconnect: () => webSocketService.forceReconnect(),
    getCurrentStatus: () => ({
      ...connectionState,
      matchId,
      fallbackActive: fallbackManagerRef.current?.isFallbackActive() || false
    })
  };
}
