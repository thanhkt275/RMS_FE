import { useState, useEffect, useCallback } from 'react';
import { unifiedWebSocketService } from '@/services/unified-websocket/unified-websocket-service';

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

  // Helper setters for state updates
  const setLastUpdateTime = useCallback((time: number) => {
    setConnectionState(prev => ({ ...prev, lastUpdateTime: time }));
  }, []);

  const setSource = useCallback((source: 'websocket' | 'none') => {
    setConnectionState(prev => ({ ...prev, source }));
  }, []);

  const setIsConnected = useCallback((isConnected: boolean) => {
    setConnectionState(prev => ({ ...prev, isConnected }));
  }, []);
  
  const setFallbackMode = useCallback((fallbackMode: boolean) => {
    setConnectionState(prev => ({ ...prev, fallbackMode }));
  }, []);
  // Initialize connection tracking
  useEffect(() => {
    console.log('🚀 Initializing useRealtimeScores for matchId:', matchId);

    // Check initial connection status
    const isCurrentlyConnected = unifiedWebSocketService.isConnected();
    console.log('🔍 Initial WebSocket connection status:', isCurrentlyConnected);

    setIsConnected(isCurrentlyConnected);
    setFallbackMode(false);
    setSource(isCurrentlyConnected ? 'websocket' : 'none');
  }, [matchId, setIsConnected, setFallbackMode, setSource]);

  // Handle WebSocket score updates
  useEffect(() => {
    if (!matchId) return;

    const handleScoreUpdate = (data: any) => {
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
        
        setLastUpdateTime(Date.now());
        setSource('websocket');
      } else {
        console.log("❌ Score update ignored - matchId mismatch:", {
          receivedMatchId: data.matchId,
          expectedMatchId: matchId
        });
      }
    };

    const handleConnect = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setFallbackMode(false);
      setSource('websocket');
    };

    const handleDisconnect = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setSource('none');
    };

    // Set up WebSocket listeners
    console.log("🔔 Setting up WebSocket score update subscription for matchId:", matchId);
    const unsubscribeScoreUpdate = unifiedWebSocketService.on('score_update', handleScoreUpdate);
    const unsubscribeConnect = unifiedWebSocketService.onConnectionStatus((status) => {
      if (status.connected) {
        handleConnect();
      } else {
        handleDisconnect();
      }
    });

    return () => {
      unsubscribeScoreUpdate?.();
      unsubscribeConnect?.();
    };
  }, [matchId, setIsConnected, setFallbackMode, setSource, setLastUpdateTime]);

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
      fallbackActive: fallbackManagerRef.current?.isFallbackActive() || false
    })
  };
}
