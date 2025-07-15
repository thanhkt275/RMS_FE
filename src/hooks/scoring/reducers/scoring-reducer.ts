import { MatchScoreData, GameElement, Alliance, ScoreType } from '../types/index';

export type ScoringAction =
  | { type: 'SET_SCORE'; payload: { alliance: Alliance; scoreType: ScoreType; value: number } }
  | { type: 'SET_GAME_ELEMENTS'; payload: { alliance: Alliance; elements: GameElement[] } }
  | { type: 'SET_TEAM_COUNT'; payload: { alliance: Alliance; count: number } }
  | { type: 'SET_MULTIPLIER'; payload: { alliance: Alliance; multiplier: number } }
  | { type: 'SET_SCORE_DETAILS'; payload: any }
  | { type: 'SET_UI_STATE'; payload: { key: string; value: boolean } }
  | { type: 'SYNC_API_DATA'; payload: any }
  | { type: 'CALCULATE_TOTALS' }
  | { type: 'RESET' };

export const initialScoringState: MatchScoreData = {
  redAlliance: {
    autoScore: 0,
    driveScore: 0,
    totalScore: 0,
    gameElements: [],
    teamCount: 0,
    multiplier: 1.0,
    penalty: 0,
  },
  blueAlliance: {
    autoScore: 0,
    driveScore: 0,
    totalScore: 0,
    gameElements: [],
    teamCount: 0,
    multiplier: 1.0,
    penalty: 0,
  },
  scoreDetails: {},
  isAddingRedElement: false,
  isAddingBlueElement: false,
};

export function scoringReducer(state: MatchScoreData, action: ScoringAction): MatchScoreData {
  switch (action.type) {    case 'SET_SCORE': {
      const { alliance, scoreType, value } = action.payload;
      const allianceKey = alliance === 'red' ? 'redAlliance' : 'blueAlliance';
      
      // Handle penalty separately since its field name is different
      const scoreKey = scoreType === 'penalty' ? 'penalty' : `${scoreType}Score` as keyof typeof state.redAlliance;
      
      // Check if value is actually different to prevent unnecessary updates
      if (state[allianceKey][scoreKey] === value) {
        return state;
      }
      
      const newState = {
        ...state,
        [allianceKey]: {
          ...state[allianceKey],
          [scoreKey]: value,
        },
      };
      
      // Auto-calculate totals after score update
      return calculateTotals(newState);
    }case 'SET_GAME_ELEMENTS': {
      const { alliance, elements } = action.payload;
      const allianceKey = alliance === 'red' ? 'redAlliance' : 'blueAlliance';
      
      // Check if elements are actually different
      if (JSON.stringify(state[allianceKey].gameElements) === JSON.stringify(elements)) {
        return state;
      }
      
      return {
        ...state,
        [allianceKey]: {
          ...state[allianceKey],
          gameElements: elements,
        },
      };
    }

    case 'SET_TEAM_COUNT': {
      const { alliance, count } = action.payload;
      const allianceKey = alliance === 'red' ? 'redAlliance' : 'blueAlliance';
      
      // Check if count is actually different
      if (state[allianceKey].teamCount === count) {
        return state;
      }
      
      return {
        ...state,
        [allianceKey]: {
          ...state[allianceKey],
          teamCount: count,
        },
      };
    }

    case 'SET_MULTIPLIER': {
      const { alliance, multiplier } = action.payload;
      const allianceKey = alliance === 'red' ? 'redAlliance' : 'blueAlliance';
      
      // Check if multiplier is actually different
      if (state[allianceKey].multiplier === multiplier) {
        return state;
      }
      
      return {
        ...state,
        [allianceKey]: {
          ...state[allianceKey],
          multiplier: multiplier,
        },
      };
    }    case 'SET_SCORE_DETAILS': {
      // Check if score details are actually different
      if (JSON.stringify(state.scoreDetails) === JSON.stringify(action.payload)) {
        return state;
      }
      
      return {
        ...state,
        scoreDetails: action.payload,
      };
    }

    case 'SET_UI_STATE': {
      const { key, value } = action.payload;
      
      // Check if UI state is actually different
      if (state[key as keyof MatchScoreData] === value) {
        return state;
      }
      
      return {
        ...state,
        [key]: value,
      };
    }

    case 'SYNC_API_DATA': {
      const apiData = action.payload;
      if (!apiData) return state;

      // Helper function to convert game elements from object to array
      const objectToArrayGameElements = (
        gameElements: Record<string, any> | any[] | null | undefined
      ): GameElement[] => {
        if (!gameElements) return [];
        if (Array.isArray(gameElements)) return gameElements;
        if (typeof gameElements === "object" && Object.keys(gameElements).length === 0) return [];

        try {
          return Object.entries(gameElements).map(([element, value]) => {
            if (typeof value === "object" && value !== null && "count" in value) {
              return {
                element,
                count: Number(value.count || 0),
                pointsEach: Number(value.pointsEach || 1),
                totalPoints: Number(value.totalPoints || value.count),
                operation: value.operation || "multiply",
              };
            }
            return {
              element,
              count: Number(value),
              pointsEach: 1,
              totalPoints: Number(value),
              operation: "multiply",
            };
          });
        } catch (error) {
          console.error("Error converting game elements:", error, gameElements);
          return [];
        }
      };      const newState = {
        ...state,
        redAlliance: {
          ...state.redAlliance,
          autoScore: apiData.redAutoScore || 0,
          driveScore: apiData.redDriveScore || 0,
          totalScore: apiData.redTotalScore || 0,
          gameElements: objectToArrayGameElements(apiData.redGameElements),
          teamCount: apiData.redTeamCount || 0,
          multiplier: apiData.redMultiplier || 1.0,
          penalty: apiData.redPenalty || 0,
        },
        blueAlliance: {
          ...state.blueAlliance,
          autoScore: apiData.blueAutoScore || 0,
          driveScore: apiData.blueDriveScore || 0,
          totalScore: apiData.blueTotalScore || 0,
          gameElements: objectToArrayGameElements(apiData.blueGameElements),
          teamCount: apiData.blueTeamCount || 0,
          multiplier: apiData.blueMultiplier || 1.0,
          penalty: apiData.bluePenalty || 0,
        },
        scoreDetails: apiData.scoreDetails || {},
      };

      return calculateTotals(newState);
    }

    case 'CALCULATE_TOTALS': {
      return calculateTotals(state);
    }

    case 'RESET': {
      return initialScoringState;
    }

    default:
      return state;
  }
}

function calculateTotals(state: MatchScoreData): MatchScoreData {
  // Calculate base scores and add opponent's penalties
  const redTotal = (state.redAlliance.autoScore || 0) + (state.redAlliance.driveScore || 0) + (state.blueAlliance.penalty || 0);
  const blueTotal = (state.blueAlliance.autoScore || 0) + (state.blueAlliance.driveScore || 0) + (state.redAlliance.penalty || 0);

  // Only update state if totals have actually changed
  const redTotalChanged = state.redAlliance.totalScore !== redTotal;
  const blueTotalChanged = state.blueAlliance.totalScore !== blueTotal;
  
  if (!redTotalChanged && !blueTotalChanged) {
    return state; // No changes needed, return same state reference
  }

  return {
    ...state,
    redAlliance: {
      ...state.redAlliance,
      totalScore: redTotal,
    },
    blueAlliance: {
      ...state.blueAlliance,
      totalScore: blueTotal,
    },
  };
}
