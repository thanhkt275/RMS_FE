
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUnifiedWebSocket } from '../websocket/use-unified-websocket';
import { useScoringState } from '../scoring/use-scoring-state';
import { usePersistence } from '../scoring/use-persistence';
import { useUserActivity } from '../scoring/use-user-activity';
import { useDataSync } from '../scoring/use-data-sync';
import {
  ScoringConfig,
  AllianceScoreDetails,
  AllianceScoreBreakdown,
  MatchScoreDetails,
} from '../scoring/types/index';
import { ScoreData, UserRole } from '@/types/types';

interface UseScoringControlProps extends ScoringConfig {
  userRole?: UserRole;
}

interface ScoringControlReturn {
  redAutoScore: number;
  redDriveScore: number;
  blueAutoScore: number;
  blueDriveScore: number;
  redTotalScore: number;
  blueTotalScore: number;
  redFlagsSecured: number;
  redSuccessfulFlagHits: number;
  redOpponentFieldAmmo: number;
  blueFlagsSecured: number;
  blueSuccessfulFlagHits: number;
  blueOpponentFieldAmmo: number;
  redBreakdown: AllianceScoreBreakdown;
  blueBreakdown: AllianceScoreBreakdown;
  scoreDetails: MatchScoreDetails;
  setRedFlagsSecured: (value: number) => void;
  setRedSuccessfulFlagHits: (value: number) => void;
  setRedOpponentFieldAmmo: (value: number) => void;
  setBlueFlagsSecured: (value: number) => void;
  setBlueSuccessfulFlagHits: (value: number) => void;
  setBlueOpponentFieldAmmo: (value: number) => void;
  sendRealtimeUpdate: () => void;
  saveScores: () => Promise<void>;
  isLoadingScores: boolean;
  matchScores: any;
  hasScoringPermission: boolean;
}

const EMPTY_DETAILS: AllianceScoreDetails = Object.freeze({
  flagsSecured: 0,
  successfulFlagHits: 0,
  opponentFieldAmmo: 0,
});

const EMPTY_BREAKDOWN: AllianceScoreBreakdown = Object.freeze({
  flagsPoints: 0,
  flagHitsPoints: 0,
  fieldControlPoints: 0,
  totalPoints: 0,
});

export function useScoringControl({
  tournamentId,
  selectedMatchId,
  selectedFieldId,
  userRole = UserRole.HEAD_REFEREE, // Default to HEAD_REFEREE for control-match scenarios
}: UseScoringControlProps): ScoringControlReturn {
  const queryClient = useQueryClient();
  const unifiedWebSocket = useUnifiedWebSocket({
    tournamentId: tournamentId || "all", // Ensure we always have a tournament ID
    fieldId: selectedFieldId || undefined,
    autoConnect: true,
    userRole, // Pass the user role to enable proper permissions
  });
  
  // Core state management
  const { state, stateService } = useScoringState();
  
  // User activity tracking
  const userActivityService = useUserActivity();
  
  // Data persistence
  const { saveScores, matchScores: persistedMatchScores } = usePersistence({
    selectedMatchId,
    tournamentId,
    selectedFieldId,
  });
  
  // Data synchronization
  const { isLoadingScores, matchScores: syncedMatchScores } = useDataSync({
    selectedMatchId,
    stateService,
    isUserActive: userActivityService.isUserActive(),
    autoSync: false,
  });

  // Queue for score updates during connection loss
  const [scoreUpdateQueue, setScoreUpdateQueue] = useState<ScoreData[]>([]);
  const lastSyncedMatchIdRef = useRef<string | null>(null);

  const hasScoringPermission =
    userRole === UserRole.ADMIN ||
    userRole === UserRole.HEAD_REFEREE ||
    userRole === UserRole.ALLIANCE_REFEREE;

  // Subscribe to WebSocket score updates with unified service
  useEffect(() => {
    if (!selectedMatchId) return;

    const handleScoreUpdate = (data: ScoreData) => {
      console.log('📥 [use-scoring-control] Received score_update:', {
        matchId: data.matchId,
        selectedMatchId,
        fieldId: data.fieldId,
        selectedFieldId,
        isUserActive: userActivityService.isUserActive()
      });

      // Accept updates if no field filtering or field matches
      const shouldAccept = 
        !selectedFieldId || // No field selected in control
        !data.fieldId || // No fieldId in update (tournament-wide)
        data.fieldId === selectedFieldId; // Exact field match
      
      if (!shouldAccept) {
        console.log('⏭️ [use-scoring-control] Skipping update - field mismatch');
        return;
      }

      if (data.matchId === selectedMatchId) {
        // Only update if user is not actively typing
        if (!userActivityService.isUserActive()) {
          console.log('✅ [use-scoring-control] Updating scoring panel state from WebSocket');
          
          // Update the scoring panel state (this is what displays in the UI)
          stateService.syncWithApiData(data);
          
          // Also update query cache for consistency
          queryClient.setQueryData(['match-scores', selectedMatchId], (oldData: any) => ({
            ...oldData,
            ...data,
          }));
        } else {
          console.log('⏸️ [use-scoring-control] User is typing - deferring update');
        }
      }
    };

    const unsubscribe = unifiedWebSocket.subscribe('score_update', handleScoreUpdate);
    return unsubscribe;
  }, [selectedMatchId, selectedFieldId, userActivityService, queryClient, unifiedWebSocket, stateService]);

  // Process queued score updates when connection is restored
  useEffect(() => {
    if (!hasScoringPermission) {
      if (scoreUpdateQueue.length > 0) setScoreUpdateQueue([]);
      return;
    }

    if (unifiedWebSocket.isConnected && scoreUpdateQueue.length > 0) {
      console.log(`Processing ${scoreUpdateQueue.length} queued score updates`);
      
      // Send all queued updates
      scoreUpdateQueue.forEach(queuedUpdate => {
        unifiedWebSocket.sendScoreUpdate(queuedUpdate);
      });
      
      // Clear the queue
      setScoreUpdateQueue([]);
    }
  }, [hasScoringPermission, unifiedWebSocket, scoreUpdateQueue]);

  // Populate scoring state when switching matches, without auto-broadcasting updates
  useEffect(() => {
    if (!selectedMatchId) {
      lastSyncedMatchIdRef.current = null;
      stateService.reset();
      return;
    }

    if (syncedMatchScores === undefined) {
      // Data still loading; wait until we know whether persisted scores exist
      return;
    }

    if (lastSyncedMatchIdRef.current === selectedMatchId) {
      return;
    }

    if (syncedMatchScores) {
      console.log("🔄 Loading persisted scores into control panel:", {
        matchId: selectedMatchId,
        redTotal: syncedMatchScores.redTotalScore,
        blueTotal: syncedMatchScores.blueTotalScore,
      });
      stateService.syncWithApiData(syncedMatchScores);
    } else {
      console.log("ℹ️ No persisted scores found for match. Resetting control panel state.", selectedMatchId);
      stateService.reset();
    }

    lastSyncedMatchIdRef.current = selectedMatchId;
  }, [selectedMatchId, syncedMatchScores, stateService]);

  const getAllianceDetails = useCallback(
    (alliance: 'red' | 'blue'): AllianceScoreDetails =>
      state.scoreDetails?.[alliance] ?? EMPTY_DETAILS,
    [state.scoreDetails],
  );

  const createAllianceDetailSetter = useCallback(
    (alliance: 'red' | 'blue', key: keyof AllianceScoreDetails) => {
      return (value: number) => {
        if (!hasScoringPermission) return;

        userActivityService.markUserActive();

        const numericValue = Number(value ?? 0);
        if (!Number.isFinite(numericValue)) return;
        const sanitised = Math.max(0, Math.floor(numericValue));

        const currentAllianceDetails = getAllianceDetails(alliance);
        if (currentAllianceDetails[key] === sanitised) {
          return;
        }

        const updatedDetails: MatchScoreDetails = {
          red: alliance === 'red'
            ? { ...currentAllianceDetails, [key]: sanitised }
            : { ...getAllianceDetails('red') },
          blue: alliance === 'blue'
            ? { ...currentAllianceDetails, [key]: sanitised }
            : { ...getAllianceDetails('blue') },
        };

        stateService.updateScoreDetails(updatedDetails);
      };
    },
    [getAllianceDetails, hasScoringPermission, stateService, userActivityService],
  );

  // Send real-time update with debouncing and queuing
  const handleSendRealtimeUpdate = useCallback(() => {
    if (!selectedMatchId || !hasScoringPermission) return;

    const latestState = stateService.getState();

    const scoreData: ScoreData = {
      matchId: selectedMatchId,
      tournamentId,
      fieldId: selectedFieldId || undefined,
      redAutoScore: latestState.redAlliance.autoScore,
      redDriveScore: latestState.redAlliance.driveScore,
      redTotalScore: latestState.redAlliance.totalScore,
      blueAutoScore: latestState.blueAlliance.autoScore,
      blueDriveScore: latestState.blueAlliance.driveScore,
      blueTotalScore: latestState.blueAlliance.totalScore,
      scoreDetails: latestState.scoreDetails,
    };

    console.log("📊 Sending real-time score update:", scoreData);
    console.log("📊 Score breakdown details:", {
      redBreakdown: latestState.scoreDetails?.breakdown?.red,
      blueBreakdown: latestState.scoreDetails?.breakdown?.blue,
      hasBreakdown: !!latestState.scoreDetails?.breakdown
    });

    if (unifiedWebSocket.isConnected) {
      // Send immediately with automatic debouncing (200ms max latency)
      unifiedWebSocket.sendScoreUpdate(scoreData);
    } else {
      // Queue for later when connection is restored
      console.log("📦 Queueing score update (connection lost)");
      setScoreUpdateQueue(prev => [...prev, scoreData]);
    }
  }, [selectedMatchId, tournamentId, selectedFieldId, stateService, unifiedWebSocket, hasScoringPermission]);

  // Manual updates only: no automatic broadcast on field edits

  // Save scores with real-time update
  const handleSaveScores = useCallback(async () => {
    await saveScores(state);
    
    // Send real-time update after successful save
    console.log("📡 Sending real-time update after successful save");
    handleSendRealtimeUpdate();
    
    // Reset user activity state
    userActivityService.resetActivity();
    
    console.log("✅ Scores saved successfully with totals updated and real-time update sent");
  }, [saveScores, state, handleSendRealtimeUpdate, userActivityService]);

  const redDetails = state.scoreDetails?.red ?? EMPTY_DETAILS;
  const blueDetails = state.scoreDetails?.blue ?? EMPTY_DETAILS;
  const redBreakdown = state.scoreDetails?.breakdown?.red ?? EMPTY_BREAKDOWN;
  const blueBreakdown = state.scoreDetails?.breakdown?.blue ?? EMPTY_BREAKDOWN;

  const setRedFlagsSecured = createAllianceDetailSetter('red', 'flagsSecured');
  const setRedSuccessfulFlagHits = createAllianceDetailSetter('red', 'successfulFlagHits');
  const setRedOpponentFieldAmmo = createAllianceDetailSetter('red', 'opponentFieldAmmo');
  const setBlueFlagsSecured = createAllianceDetailSetter('blue', 'flagsSecured');
  const setBlueSuccessfulFlagHits = createAllianceDetailSetter('blue', 'successfulFlagHits');
  const setBlueOpponentFieldAmmo = createAllianceDetailSetter('blue', 'opponentFieldAmmo');

  return {
    redAutoScore: state.redAlliance.autoScore,
    redDriveScore: state.redAlliance.driveScore,
    blueAutoScore: state.blueAlliance.autoScore,
    blueDriveScore: state.blueAlliance.driveScore,
    redTotalScore: state.redAlliance.totalScore,
    blueTotalScore: state.blueAlliance.totalScore,
    redFlagsSecured: redDetails.flagsSecured,
    redSuccessfulFlagHits: redDetails.successfulFlagHits,
    redOpponentFieldAmmo: redDetails.opponentFieldAmmo,
    blueFlagsSecured: blueDetails.flagsSecured,
    blueSuccessfulFlagHits: blueDetails.successfulFlagHits,
    blueOpponentFieldAmmo: blueDetails.opponentFieldAmmo,
    redBreakdown,
    blueBreakdown,
    scoreDetails: state.scoreDetails as MatchScoreDetails,
    setRedFlagsSecured,
    setRedSuccessfulFlagHits,
    setRedOpponentFieldAmmo,
    setBlueFlagsSecured,
    setBlueSuccessfulFlagHits,
    setBlueOpponentFieldAmmo,
    sendRealtimeUpdate: handleSendRealtimeUpdate,
    saveScores: handleSaveScores,
    isLoadingScores,
    matchScores: persistedMatchScores,
    hasScoringPermission,
  };
}
