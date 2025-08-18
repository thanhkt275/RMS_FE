/**
 * Real-time scoring hook using the unified WebSocket service
 */
import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from '@/websockets/simplified/useWebSocket';
import { CacheService } from './services/cache.service';
import { DataTransformationService } from './services/data-transformation.service';
import { MatchScoreData } from './types/index';
import { UserRole } from '@/types/types';

interface UseRealtimeProps {
  selectedMatchId: string;
  selectedFieldId: string | null;
  tournamentId: string;
  isUserActive: boolean;
}

export function useRealtime({ selectedMatchId, selectedFieldId, tournamentId, isUserActive }: UseRealtimeProps) {
  const queryClient = useQueryClient();
  const previousMatchIdRef = useRef<string | null>(null);
  
  // Simplified WebSocket hook
  const { emit, on, off, setRoomContext } = useWebSocket({ autoConnect: true, tournamentId, role: UserRole.COMMON });
  useEffect(() => {
    void setRoomContext({ tournamentId, fieldId: selectedFieldId || undefined });
  }, [tournamentId, selectedFieldId, setRoomContext]);
  const cacheService = useMemo(() => new CacheService(queryClient), [queryClient]);
  const transformationService = useMemo(() => new DataTransformationService(), []);

  // Subscribe to WebSocket score updates
  useEffect(() => {
    if (!selectedMatchId) return;

    const handleScoreUpdate = (data: {
      matchId: string;
      fieldId?: string;
      redAutoScore?: number;
      redDriveScore?: number;
      redTotalScore?: number;
      blueAutoScore?: number;
      blueDriveScore?: number;
      blueTotalScore?: number;
      [key: string]: any;
    }) => {
      console.log("Score update received in control-match:", data, "selectedFieldId:", selectedFieldId);
      
      // Accept updates if no field filtering or field matches
      const shouldAccept = 
        !selectedFieldId || // No field selected in control
        !data.fieldId || // No fieldId in update (tournament-wide)
        data.fieldId === selectedFieldId; // Exact field match
      
      if (!shouldAccept) {
        console.log(`Ignoring score update for different field: ${data.fieldId} (expected: ${selectedFieldId})`);
        return;
      }

      if (data.matchId === selectedMatchId) {
        console.log("Score update received for selected match:", data);
        
        // Only update cache if user is not actively typing
        if (!isUserActive) {
          cacheService.updateScoreCache(selectedMatchId, data);
        } else {
          console.log("🚫 Skipping cache update (user actively typing)");
        }
      }
    };

    const sub = on('scoreUpdateRealtime' as any, handleScoreUpdate as any);
    return () => {
      off('scoreUpdateRealtime' as any, handleScoreUpdate as any);
      sub?.unsubscribe?.();
    };
  }, [selectedMatchId, selectedFieldId, isUserActive, on, off, cacheService]);

  const sendRealtimeUpdate = useCallback((scoreData: MatchScoreData) => {
    if (!selectedMatchId) return;

    const realtimeData = transformationService.transformToRealtimeFormat(scoreData, {
      matchId: selectedMatchId,
      fieldId: selectedFieldId || undefined,
      tournamentId,
    });

    console.log("📊 Real-time update calculations:", realtimeData);
    console.log("Sending real-time score update (no DB persist):", realtimeData);
    
    // Emit scoreUpdateRealtime event
    emit('scoreUpdateRealtime' as any, realtimeData as any);
  }, [selectedMatchId, selectedFieldId, tournamentId, emit, transformationService]);

  const broadcastForNewMatch = useCallback((scoreData: MatchScoreData) => {
    // Only broadcast if the match ID actually changed
    if (!selectedMatchId || previousMatchIdRef.current === selectedMatchId) {
      return;
    }
    
    previousMatchIdRef.current = selectedMatchId;
    
    const realtimeData = transformationService.transformToRealtimeFormat(scoreData, {
      matchId: selectedMatchId,
      fieldId: selectedFieldId || undefined,
      tournamentId,
    });
    
    console.log("📡 Broadcasting scores for NEW match:", selectedMatchId, realtimeData);
    emit('scoreUpdateRealtime' as any, realtimeData as any);
  }, [selectedMatchId, selectedFieldId, tournamentId, emit, transformationService]);

  return {
    sendRealtimeUpdate,
    broadcastForNewMatch,
  };
}
