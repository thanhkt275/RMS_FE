
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from '@/websockets/simplified/useWebSocket';
import { useScoringState } from '../scoring/use-scoring-state';
import { usePersistence } from '../scoring/use-persistence';
import { useUserActivity } from '../scoring/use-user-activity';
import { useDataSync } from '../scoring/use-data-sync';
import { GameElement, ScoringConfig, Alliance, ScoreType } from '../scoring/types/index';
import { ScoreData, UserRole } from '@/types/types';

interface UseScoringControlProps extends ScoringConfig {
  userRole?: UserRole;
}

interface ScoringControlReturn {
  // Score states
  redAutoScore: number;
  redDriveScore: number;
  blueAutoScore: number;
  blueDriveScore: number;
  redTotalScore: number;
  blueTotalScore: number;
  redPenalty: number;
  bluePenalty: number;
  
  // Game elements
  redGameElements: GameElement[];
  blueGameElements: GameElement[];
  
  // Team counts and multipliers
  redTeamCount: number;
  blueTeamCount: number;
  redMultiplier: number;
  blueMultiplier: number;
  
  // Score details
  scoreDetails: any;
  
  // UI states
  isAddingRedElement: boolean;
  isAddingBlueElement: boolean;
  
  // Setters
  setRedAutoScore: (score: number) => void;
  setRedDriveScore: (score: number) => void;
  setBlueAutoScore: (score: number) => void;
  setBlueDriveScore: (score: number) => void;
  setRedTotalScore: (score: number) => void;
  setBlueTotalScore: (score: number) => void;
  setRedPenalty: (penalty: number) => void;
  setBluePenalty: (penalty: number) => void;
  setRedGameElements: (elements: GameElement[]) => void;
  setBlueGameElements: (elements: GameElement[]) => void;
  setRedTeamCount: (count: number) => void;
  setBlueTeamCount: (count: number) => void;
  setRedMultiplier: (multiplier: number) => void;
  setBlueMultiplier: (multiplier: number) => void;
  setScoreDetails: (details: any) => void;
  setIsAddingRedElement: (adding: boolean) => void;
  setIsAddingBlueElement: (adding: boolean) => void;
  
  // Actions
  sendRealtimeUpdate: () => void;
  saveScores: () => Promise<void>;
  
  // Query states
  isLoadingScores: boolean;
  matchScores: any;
}

export function useScoringControl({
  tournamentId,
  selectedMatchId,
  selectedFieldId,
  userRole = UserRole.HEAD_REFEREE, // Default to HEAD_REFEREE for control-match scenarios
}: UseScoringControlProps): ScoringControlReturn {
  const queryClient = useQueryClient();

  // Initialize simplified WebSocket with unique instance ID
  const { info, on, off, sendScoreUpdate, setUserRole, setRoomContext } = useWebSocket({
    autoConnect: true,
    tournamentId: tournamentId || 'all',
    fieldId: selectedFieldId || undefined,
    role: userRole,
    instanceId: 'control-scoring', // Unique instance ID
  });
  const isConnected = info.state === 'connected';
  // Keep role/room context in sync if props change
  useEffect(() => {
    setUserRole(userRole);
  }, [userRole, setUserRole]);
  useEffect(() => {
    void setRoomContext({ tournamentId: tournamentId || 'all', fieldId: selectedFieldId || undefined });
  }, [tournamentId, selectedFieldId, setRoomContext]);

  // Core state management
  const { state, stateService } = useScoringState();

  // User activity tracking
  const userActivityService = useUserActivity();
  
  // Data persistence
  const { saveScores, matchScores } = usePersistence({
    selectedMatchId,
    tournamentId,
    selectedFieldId,
  });
  
  // Data synchronization
  const { isLoadingScores } = useDataSync({
    selectedMatchId,
    stateService,
    isUserActive: userActivityService.isUserActive(),
  });

  // Queue for score updates during connection loss
  const [scoreUpdateQueue, setScoreUpdateQueue] = useState<ScoreData[]>([]);
  const previousMatchIdRef = useRef<string | null>(null);

  // Stable callback for handling score updates
  const handleScoreUpdate = useCallback((data: ScoreData) => {
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
      if (!userActivityService.isUserActive()) {
        // Update query cache with real-time data
        queryClient.setQueryData(['match-scores', selectedMatchId], (oldData: any) => ({
          ...oldData,
          ...data,
        }));
      } else {
        console.log("🚫 Skipping cache update (user actively typing)");
      }
    }
  }, [selectedMatchId, selectedFieldId, userActivityService, queryClient]);

  // Subscribe to WebSocket score updates with simplified service
  useEffect(() => {
    if (!selectedMatchId) return;
    const handler = (data: any) => handleScoreUpdate(data as ScoreData);
    const sub = on('score_update' as any, handler as any);
    return () => {
      off('score_update' as any, handler as any);
      sub?.unsubscribe?.();
    };
  }, [selectedMatchId, handleScoreUpdate]);

  // Process queued score updates when connection is restored
  useEffect(() => {
    if (isConnected && scoreUpdateQueue.length > 0) {
      console.log(`Processing ${scoreUpdateQueue.length} queued score updates`);

      // Send all queued updates
      scoreUpdateQueue.forEach(queuedUpdate => {
        sendScoreUpdate(queuedUpdate as any);
      });

      // Clear the queue
      setScoreUpdateQueue([]);
    }
  }, [scoreUpdateQueue, isConnected, sendScoreUpdate]);

  // Broadcast scores when match changes (but not when state changes)
  useEffect(() => {
    if (matchScores && selectedMatchId && previousMatchIdRef.current !== selectedMatchId) {
      previousMatchIdRef.current = selectedMatchId;
      
      // Use matchScores data instead of internal state to prevent loops
      const scoreData: ScoreData = {
        matchId: selectedMatchId,
        tournamentId,
        fieldId: selectedFieldId || undefined,
        redAutoScore: matchScores.redAutoScore || 0,
        redDriveScore: matchScores.redDriveScore || 0,
        redTotalScore: matchScores.redTotalScore || 0,
        blueAutoScore: matchScores.blueAutoScore || 0,
        blueDriveScore: matchScores.blueDriveScore || 0,
        blueTotalScore: matchScores.blueTotalScore || 0,
        redGameElements: matchScores.redGameElements || [],
        blueGameElements: matchScores.blueGameElements || [],
        redTeamCount: matchScores.redTeamCount || 0,
        redMultiplier: matchScores.redMultiplier || 1.0,
        blueTeamCount: matchScores.blueTeamCount || 0,
        blueMultiplier: matchScores.blueMultiplier || 1.0,
        scoreDetails: matchScores.scoreDetails || {},
      };
      
      console.log("📡 Broadcasting scores for NEW match:", selectedMatchId, scoreData);
      sendScoreUpdate(scoreData as any);
    }
  }, [selectedMatchId, matchScores, tournamentId, selectedFieldId]);

  // Score setter functions with activity tracking
  const createScoreSetter = useCallback((alliance: Alliance, scoreType: ScoreType) => {
    return (value: number) => {
      userActivityService.markUserActive();
      stateService.updateScore(alliance, scoreType, value);
    };
  }, [userActivityService, stateService]);

  const createSimpleSetter = useCallback((updateFn: (value: any) => void) => {
    return (value: any) => {
      userActivityService.markUserActive();
      updateFn(value);
    };
  }, [userActivityService]);

  // Send real-time update with debouncing and queuing
  const handleSendRealtimeUpdate = useCallback(() => {
    if (!selectedMatchId) return;

    const scoreData: ScoreData = {
      matchId: selectedMatchId,
      tournamentId,
      fieldId: selectedFieldId || undefined,
      redAutoScore: state.redAlliance.autoScore,
      redDriveScore: state.redAlliance.driveScore,
      redTotalScore: state.redAlliance.totalScore,
      blueAutoScore: state.blueAlliance.autoScore,
      blueDriveScore: state.blueAlliance.driveScore,
      blueTotalScore: state.blueAlliance.totalScore,
      redGameElements: state.redAlliance.gameElements,
      blueGameElements: state.blueAlliance.gameElements,
      redTeamCount: state.redAlliance.teamCount,
      redMultiplier: state.redAlliance.multiplier,
      blueTeamCount: state.blueAlliance.teamCount,
      blueMultiplier: state.blueAlliance.multiplier,
      scoreDetails: state.scoreDetails,
    };

    console.log("📊 Sending real-time score update:", scoreData);

    if (isConnected) {
      // Send immediately with automatic debouncing (200ms max latency)
      sendScoreUpdate(scoreData as any);
    } else {
      // Queue for later when connection is restored
      console.log("📦 Queueing score update (connection lost)");
      setScoreUpdateQueue(prev => [...prev, scoreData]);
    }
  }, [selectedMatchId, tournamentId, selectedFieldId, state, isConnected, sendScoreUpdate]);

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

  return {
    // Score states
    redAutoScore: state.redAlliance.autoScore,
    redDriveScore: state.redAlliance.driveScore,
    blueAutoScore: state.blueAlliance.autoScore,
    blueDriveScore: state.blueAlliance.driveScore,
    redTotalScore: state.redAlliance.totalScore,
    blueTotalScore: state.blueAlliance.totalScore,
    redPenalty: state.redAlliance.penalty,
    bluePenalty: state.blueAlliance.penalty,
    
    // Game elements
    redGameElements: state.redAlliance.gameElements,
    blueGameElements: state.blueAlliance.gameElements,
    
    // Team counts and multipliers
    redTeamCount: state.redAlliance.teamCount,
    blueTeamCount: state.blueAlliance.teamCount,
    redMultiplier: state.redAlliance.multiplier,
    blueMultiplier: state.blueAlliance.multiplier,
    
    // Score details
    scoreDetails: state.scoreDetails,
    
    // UI states
    isAddingRedElement: state.isAddingRedElement,
    isAddingBlueElement: state.isAddingBlueElement,
    
    // Setters
    setRedAutoScore: createScoreSetter('red', 'auto'),
    setRedDriveScore: createScoreSetter('red', 'drive'),
    setBlueAutoScore: createScoreSetter('blue', 'auto'),
    setBlueDriveScore: createScoreSetter('blue', 'drive'),
    setRedTotalScore: createScoreSetter('red', 'total'),
    setBlueTotalScore: createScoreSetter('blue', 'total'),
    setRedPenalty: createScoreSetter('red', 'penalty'),
    setBluePenalty: createScoreSetter('blue', 'penalty'),
    setRedGameElements: createSimpleSetter((elements: GameElement[]) => 
      stateService.updateGameElements('red', elements)
    ),
    setBlueGameElements: createSimpleSetter((elements: GameElement[]) => 
      stateService.updateGameElements('blue', elements)
    ),
    setRedTeamCount: createSimpleSetter((count: number) => 
      stateService.updateTeamCount('red', count)
    ),
    setBlueTeamCount: createSimpleSetter((count: number) => 
      stateService.updateTeamCount('blue', count)
    ),
    setRedMultiplier: createSimpleSetter((multiplier: number) => 
      stateService.updateMultiplier('red', multiplier)
    ),
    setBlueMultiplier: createSimpleSetter((multiplier: number) => 
      stateService.updateMultiplier('blue', multiplier)
    ),
    setScoreDetails: createSimpleSetter((details: any) => 
      stateService.updateScoreDetails(details)
    ),
    setIsAddingRedElement: createSimpleSetter((adding: boolean) => 
      stateService.updateUIState('isAddingRedElement', adding)
    ),
    setIsAddingBlueElement: createSimpleSetter((adding: boolean) => 
      stateService.updateUIState('isAddingBlueElement', adding)
    ),
    
    // Actions
    sendRealtimeUpdate: handleSendRealtimeUpdate,
    saveScores: handleSaveScores,
    
    // Query states
    isLoadingScores,
    matchScores,
  };
}
