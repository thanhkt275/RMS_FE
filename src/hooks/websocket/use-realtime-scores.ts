import { useState, useEffect, useCallback } from 'react';
import { unifiedWebSocketService } from '@/lib/unified-websocket';

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
  lastUpdateTime: number;
  source: 'websocket' | 'none';
  fallbackMode: boolean;
}

/**
 * Simplified realtime scores hook using unified WebSocket service
 * Removed complex fallback logic which is now handled by the unified service
 */
export function useRealtimeScores(matchId: string) {
  // State management
  const [realtimeScores, setRealtimeScores] = useState<IScoreState>({
    red: { auto: 0, drive: 0, total: 0, penalty: 0 },
    blue: { auto: 0, drive: 0, total: 0, penalty: 0 }
  });

  const [connectionState, setConnectionState] = useState<IConnectionState>({
    isConnected: false,
    lastUpdateTime: 0,
    source: 'none',
    fallbackMode: false
  });

  // Stable callback for updating connection state
  const updateConnectionState = useCallback((updates: Partial<IConnectionState>) => {
    setConnectionState(prev => ({ ...prev, ...updates }));
  }, []);
  // Stable callback for handling score updates
  const handleScoreUpdate = useCallback((data: any) => {
    console.log("🟢 [WebSocket Service] Real-time score update received:", data, "for matchId:", matchId);

    if (data.matchId === matchId) {
      console.log("✅ Score update matches current matchId - applying update");

      // Update scores
      setRealtimeScores({
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
      });

      updateConnectionState({
        lastUpdateTime: Date.now(),
        source: 'websocket'
      });
    } else {
      console.log("❌ Score update ignored - matchId mismatch:", {
        receivedMatchId: data.matchId,
        expectedMatchId: matchId
      });
    }
  }, [matchId, updateConnectionState]);

  // Stable callback for handling connection changes
  const handleConnectionChange = useCallback((status: any) => {
    if (status.connected) {
      console.log('WebSocket connected');
      updateConnectionState({
        isConnected: true,
        fallbackMode: false,
        source: 'websocket'
      });
    } else {
      console.log('WebSocket disconnected');
      updateConnectionState({
        isConnected: false,
        source: 'none'
      });
    }
  }, [updateConnectionState]);

  // Initialize connection tracking
  useEffect(() => {
    console.log('🚀 Initializing useRealtimeScores for matchId:', matchId);

    // Check initial connection status
    const isCurrentlyConnected = unifiedWebSocketService.isConnected();
    console.log('🔍 Initial WebSocket connection status:', isCurrentlyConnected);

    updateConnectionState({
      isConnected: isCurrentlyConnected,
      fallbackMode: false,
      source: isCurrentlyConnected ? 'websocket' : 'none'
    });
  }, [matchId, updateConnectionState]);

  // Handle WebSocket score updates
  useEffect(() => {
    if (!matchId) return;

    // Set up WebSocket listeners
    console.log("🔔 Setting up WebSocket score update subscription for matchId:", matchId);
    const unsubscribeScoreUpdate = unifiedWebSocketService.on('score_update', handleScoreUpdate);
    const unsubscribeConnect = unifiedWebSocketService.onConnectionStatus(handleConnectionChange);

    return () => {
      console.log("🧹 Cleaning up WebSocket subscriptions for matchId:", matchId);
      unsubscribeScoreUpdate?.();
      unsubscribeConnect?.();
    };
  }, [matchId, handleScoreUpdate, handleConnectionChange]);

  // Return clean interface
  return {
    realtimeScores,
    lastUpdateTime: connectionState.lastUpdateTime,
    isConnected: connectionState.isConnected,
    fallbackMode: connectionState.fallbackMode,
    source: connectionState.source,
    // Helper methods for debugging/testing
    forceReconnect: () => unifiedWebSocketService.connect(),
    getCurrentStatus: () => ({
      ...connectionState,
      matchId,
      fallbackActive: false
    })
  };
}
