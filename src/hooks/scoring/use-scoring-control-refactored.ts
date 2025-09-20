import { useCallback, useEffect } from "react";
import { useScoringState } from "./use-scoring-state";
import { usePersistence } from "./use-persistence";
import { useRealtime } from "./use-realtime";
import { useUserActivity } from "./use-user-activity";
import { useDataSync } from "./use-data-sync";
import { ScoringConfig, GameElement, Alliance, ScoreType, MatchScoreDetails, AllianceScoreDetails } from './types/index';
import { convertScoreDetailsPayload, createEmptyScoreDetails } from './utils/score-details';

const EMPTY_DETAILS: MatchScoreDetails = createEmptyScoreDetails();

const cloneDetails = (details: MatchScoreDetails): MatchScoreDetails => ({
  red: { ...details.red },
  blue: { ...details.blue },
  breakdown: details.breakdown
    ? {
        red: { ...details.breakdown.red },
        blue: { ...details.breakdown.blue },
      }
    : {
        red: { flagsPoints: 0, flagHitsPoints: 0, fieldControlPoints: 0, totalPoints: 0 },
        blue: { flagsPoints: 0, flagHitsPoints: 0, fieldControlPoints: 0, totalPoints: 0 },
      },
});

const ensureScoreDetails = (details?: unknown): MatchScoreDetails =>
  cloneDetails(convertScoreDetailsPayload(details as any));

interface UseScoringControlProps extends ScoringConfig {}

export function useScoringControl({
  tournamentId,
  selectedMatchId,
  selectedFieldId,
}: UseScoringControlProps) {
  // Core state management
  const { state, stateService } = useScoringState();
  
  // User activity tracking
  const userActivityService = useUserActivity();
  
  // Data persistence
  const { saveScores, matchScores, isLoading: isPersisting } = usePersistence({
    selectedMatchId,
    tournamentId,
    selectedFieldId,
  });
  
  // Real-time communication
  const { sendRealtimeUpdate, broadcastForNewMatch } = useRealtime({
    selectedMatchId,
    selectedFieldId,
    tournamentId,
    isUserActive: userActivityService.isUserActive(),
  });
  
  // Data synchronization
  const { isLoadingScores } = useDataSync({
    selectedMatchId,
    stateService,
    isUserActive: userActivityService.isUserActive(),
  });  // Broadcast scores when match changes (but not when state changes)
  useEffect(() => {
    if (matchScores && selectedMatchId) {
      // Only broadcast when match changes, not when internal state changes
      // Use matchScores data instead of internal state to prevent loops
      const scoreDataFromAPI = {
        redAlliance: {
          autoScore: matchScores.redAutoScore || 0,
          driveScore: matchScores.redDriveScore || 0,
          totalScore: matchScores.redTotalScore || 0,
          gameElements: [],
          teamCount: matchScores.redTeamCount || 0,
          multiplier: matchScores.redMultiplier || 1.0,
          penalty: matchScores.redPenalties || 0,
        },
        blueAlliance: {
          autoScore: matchScores.blueAutoScore || 0,
          driveScore: matchScores.blueDriveScore || 0,
          totalScore: matchScores.blueTotalScore || 0,
          gameElements: [],
          teamCount: matchScores.blueTeamCount || 0,
          multiplier: matchScores.blueMultiplier || 1.0,
          penalty: matchScores.bluePenalties || 0,
        },
        scoreDetails: ensureScoreDetails(matchScores.scoreDetails),
        isAddingRedElement: false,
        isAddingBlueElement: false,
      };
      
      broadcastForNewMatch(scoreDataFromAPI);
    }
  }, [selectedMatchId, matchScores, broadcastForNewMatch]); // Removed 'state' dependency

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

  // Action functions
  const handleSendRealtimeUpdate = useCallback(() => {
    sendRealtimeUpdate(state);
  }, [sendRealtimeUpdate, state]);

  const handleSaveScores = useCallback(async () => {
    await saveScores(state);
    
    // Send real-time update after successful save
    console.log("📡 Sending real-time update after successful save");
    sendRealtimeUpdate(state);
    
    // Reset user activity state
    userActivityService.resetActivity();
    
    console.log("✅ Scores saved successfully with totals updated and real-time update sent");
  }, [saveScores, sendRealtimeUpdate, state, userActivityService]);

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
