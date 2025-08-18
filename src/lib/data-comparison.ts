/**
 * Utility functions for data comparison in change detection
 */

/**
 * Performs a deep comparison of two values to determine if they are equivalent.
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns True if values are deeply equal, false otherwise
 */
export function deepEquals(a: any, b: any): boolean {
  if (a === b) {
    return true;
  }

  if (a == null || b == null) {
    return a === b;
  }

  if (typeof a !== typeof b) {
    return false;
  }

  if (typeof a !== 'object') {
    return a === b;
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }

  if (Array.isArray(a)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEquals(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (!keysB.includes(key)) {
      return false;
    }
    if (!deepEquals(a[key], b[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Performs a shallow comparison of two objects, checking only their direct properties.
 * @param a - First object to compare
 * @param b - Second object to compare
 * @returns True if objects are shallowly equal, false otherwise
 */
export function shallowEquals(a: any, b: any): boolean {
  if (a === b) {
    return true;
  }

  if (a == null || b == null) {
    return a === b;
  }

  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (!keysB.includes(key) || a[key] !== b[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Extracts relevant fields from match data for comparison.
 * This helps avoid comparing irrelevant fields like timestamps.
 * @param data - Match data object
 * @returns Object with only relevant fields for comparison
 */
export function extractRelevantMatchFields(data: any) {
  return {
    id: data.id,
    matchNumber: data.matchNumber,
    status: data.status,
    tournamentId: data.tournamentId,
    fieldId: data.fieldId,
    redTeams: data.redTeams || [],
    blueTeams: data.blueTeams || []
  };
}

/**
 * Extracts relevant fields from score data for comparison.
 * @param data - Score data object
 * @returns Object with only relevant fields for comparison
 */
export function extractRelevantScoreFields(data: any) {
  return {
    matchId: data.matchId,
    redAutoScore: data.redAutoScore,
    redDriveScore: data.redDriveScore,
    redTotalScore: data.redTotalScore,
    blueAutoScore: data.blueAutoScore,
    blueDriveScore: data.blueDriveScore,
    blueTotalScore: data.blueTotalScore,
    redTeamCount: data.redTeamCount,
    blueTeamCount: data.blueTeamCount,
    redMultiplier: data.redMultiplier,
    blueMultiplier: data.blueMultiplier,
    redGameElements: data.redGameElements,
    blueGameElements: data.blueGameElements
  };
}

/**
 * Extracts relevant fields from timer data for comparison.
 * @param data - Timer data object
 * @returns Object with only relevant fields for comparison
 */
export function extractRelevantTimerFields(data: any) {
  return {
    duration: data.duration,
    remaining: data.remaining,
    isRunning: data.isRunning,
    startedAt: data.startedAt,
    pausedAt: data.pausedAt,
    period: data.period,
    timestamp: data.timestamp // Include timestamp to ensure continuous updates are detected
  };
}

/**
 * Extracts relevant fields from match state data for comparison.
 * @param data - Match state data object
 * @returns Object with only relevant fields for comparison
 */
export function extractRelevantMatchStateFields(data: any) {
  return {
    matchId: data.matchId,
    status: data.status,
    currentPeriod: data.currentPeriod
  };
}
