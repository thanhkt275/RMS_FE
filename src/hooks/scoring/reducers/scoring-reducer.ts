import {
  MatchScoreData,
  GameElement,
  Alliance,
  ScoreType,
  MatchScoreDetails,
  AllianceScoreDetails,
  AllianceScoreBreakdown,
} from '../types/index';

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

const SCORE_VALUES = {
  flagsSecured: 20,
  successfulFlagHits: 10,
  opponentFieldAmmo: 5,
} as const;

const createAllianceDetails = (overrides?: Partial<AllianceScoreDetails>): AllianceScoreDetails => ({
  flagsSecured: Math.max(0, Math.floor(overrides?.flagsSecured ?? 0)),
  successfulFlagHits: Math.max(0, Math.floor(overrides?.successfulFlagHits ?? 0)),
  opponentFieldAmmo: Math.max(0, Math.floor(overrides?.opponentFieldAmmo ?? 0)),
});

const createBreakdown = (details: AllianceScoreDetails): AllianceScoreBreakdown => {
  const flagsPoints = details.flagsSecured * SCORE_VALUES.flagsSecured;
  const flagHitsPoints = details.successfulFlagHits * SCORE_VALUES.successfulFlagHits;
  const fieldControlPoints = details.opponentFieldAmmo * SCORE_VALUES.opponentFieldAmmo;

  return {
    flagsPoints,
    flagHitsPoints,
    fieldControlPoints,
    totalPoints: flagsPoints + flagHitsPoints + fieldControlPoints,
  };
};

const hasAllianceDetails = (details: AllianceScoreDetails): boolean =>
  details.flagsSecured > 0 ||
  details.successfulFlagHits > 0 ||
  details.opponentFieldAmmo > 0;

const normaliseScoreDetails = (
  details?: Partial<MatchScoreDetails> | null,
): MatchScoreDetails => ({
  red: createAllianceDetails(details?.red),
  blue: createAllianceDetails(details?.blue),
  breakdown: details?.breakdown, // Preserve existing breakdown if present
});

const mergeScoreDetails = (
  current: MatchScoreDetails,
  updates?: Partial<MatchScoreDetails>,
): MatchScoreDetails => {
  if (!updates) {
    return normaliseScoreDetails(current);
  }

  return normaliseScoreDetails({
    red: { ...current.red, ...updates.red },
    blue: { ...current.blue, ...updates.blue },
    breakdown: updates.breakdown || current.breakdown, // Preserve or update breakdown
  });
};

const detailsChanged = (current: MatchScoreDetails, next: MatchScoreDetails): boolean =>
  current.red.flagsSecured !== next.red.flagsSecured ||
  current.red.successfulFlagHits !== next.red.successfulFlagHits ||
  current.red.opponentFieldAmmo !== next.red.opponentFieldAmmo ||
  current.blue.flagsSecured !== next.blue.flagsSecured ||
  current.blue.successfulFlagHits !== next.blue.successfulFlagHits ||
  current.blue.opponentFieldAmmo !== next.blue.opponentFieldAmmo;

const baseInitialState: MatchScoreData = {
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
  scoreDetails: normaliseScoreDetails(),
  isAddingRedElement: false,
  isAddingBlueElement: false,
};

export const initialScoringState: MatchScoreData = calculateTotals(baseInitialState);

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
    }

    case 'SET_SCORE_DETAILS': {
      const mergedDetails = mergeScoreDetails(state.scoreDetails, action.payload);

      if (!detailsChanged(state.scoreDetails, mergedDetails)) {
        return state;
      }

      return calculateTotals({
        ...state,
        scoreDetails: mergedDetails,
      });
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

      const objectToArrayGameElements = (
        gameElements: Record<string, any> | any[] | null | undefined,
      ): GameElement[] => {
        if (!gameElements) return [];
        if (Array.isArray(gameElements)) return gameElements;
        if (typeof gameElements === 'object' && Object.keys(gameElements).length === 0) return [];

        try {
          return Object.entries(gameElements).map(([element, value]) => {
            if (typeof value === 'object' && value !== null && 'count' in value) {
              return {
                element,
                count: Number(value.count || 0),
                pointsEach: Number(value.pointsEach || 1),
                totalPoints: Number(value.totalPoints || value.count || 0),
                operation: value.operation || 'multiply',
              };
            }
            return {
              element,
              count: Number(value),
              pointsEach: 1,
              totalPoints: Number(value),
              operation: 'multiply',
            };
          });
        } catch (error) {
          console.error('Error converting game elements:', error, gameElements);
          return [];
        }
      };

      const mergedDetails = normaliseScoreDetails(apiData.scoreDetails);

      const newState: MatchScoreData = {
        ...state,
        redAlliance: {
          ...state.redAlliance,
          autoScore: apiData.redAutoScore || 0,
          driveScore: apiData.redDriveScore || 0,
          totalScore: apiData.redTotalScore || 0,
          gameElements: objectToArrayGameElements(apiData.redGameElements),
          teamCount: apiData.redTeamCount || 0,
          multiplier: apiData.redMultiplier || 1.0,
          penalty: 0,
        },
        blueAlliance: {
          ...state.blueAlliance,
          autoScore: apiData.blueAutoScore || 0,
          driveScore: apiData.blueDriveScore || 0,
          totalScore: apiData.blueTotalScore || 0,
          gameElements: objectToArrayGameElements(apiData.blueGameElements),
          teamCount: apiData.blueTeamCount || 0,
          multiplier: apiData.blueMultiplier || 1.0,
          penalty: 0,
        },
        scoreDetails: mergedDetails,
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
  const normalisedDetails = normaliseScoreDetails(state.scoreDetails);

  const redBreakdown = createBreakdown(normalisedDetails.red);
  const blueBreakdown = createBreakdown(normalisedDetails.blue);

  const redHasDetails = hasAllianceDetails(normalisedDetails.red);
  const blueHasDetails = hasAllianceDetails(normalisedDetails.blue);

  const redAuto = redHasDetails
    ? redBreakdown.flagsPoints
    : state.redAlliance.autoScore;
  const redDrive = redHasDetails
    ? redBreakdown.flagHitsPoints + redBreakdown.fieldControlPoints
    : state.redAlliance.driveScore;
  const redTotal = redHasDetails
    ? redBreakdown.totalPoints
    : state.redAlliance.totalScore;

  const blueAuto = blueHasDetails
    ? blueBreakdown.flagsPoints
    : state.blueAlliance.autoScore;
  const blueDrive = blueHasDetails
    ? blueBreakdown.flagHitsPoints + blueBreakdown.fieldControlPoints
    : state.blueAlliance.driveScore;
  const blueTotal = blueHasDetails
    ? blueBreakdown.totalPoints
    : state.blueAlliance.totalScore;

  const nextBreakdown = {
    red: redHasDetails
      ? redBreakdown
      : state.scoreDetails?.breakdown?.red ?? redBreakdown,
    blue: blueHasDetails
      ? blueBreakdown
      : state.scoreDetails?.breakdown?.blue ?? blueBreakdown,
  };

  const totalsUnchanged =
    state.redAlliance.autoScore === redAuto &&
    state.redAlliance.driveScore === redDrive &&
    state.redAlliance.totalScore === redTotal &&
    state.blueAlliance.autoScore === blueAuto &&
    state.blueAlliance.driveScore === blueDrive &&
    state.blueAlliance.totalScore === blueTotal;

  const detailsUnchanged = !detailsChanged(state.scoreDetails, normalisedDetails);

  const previousBreakdown = state.scoreDetails?.breakdown;
  const breakdownUnchanged =
    previousBreakdown?.red?.flagsPoints === nextBreakdown.red.flagsPoints &&
    previousBreakdown?.red?.flagHitsPoints === nextBreakdown.red.flagHitsPoints &&
    previousBreakdown?.red?.fieldControlPoints === nextBreakdown.red.fieldControlPoints &&
    previousBreakdown?.blue?.flagsPoints === nextBreakdown.blue.flagsPoints &&
    previousBreakdown?.blue?.flagHitsPoints === nextBreakdown.blue.flagHitsPoints &&
    previousBreakdown?.blue?.fieldControlPoints === nextBreakdown.blue.fieldControlPoints;

  if (totalsUnchanged && detailsUnchanged && breakdownUnchanged) {
    return state;
  }

  return {
    ...state,
    redAlliance: {
      ...state.redAlliance,
      autoScore: redAuto,
      driveScore: redDrive,
      totalScore: redTotal,
      penalty: 0,
    },
    blueAlliance: {
      ...state.blueAlliance,
      autoScore: blueAuto,
      driveScore: blueDrive,
      totalScore: blueTotal,
      penalty: 0,
    },
    scoreDetails: {
      red: normalisedDetails.red,
      blue: normalisedDetails.blue,
      breakdown: nextBreakdown,
    },
  };
}
