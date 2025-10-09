import { Match } from '@/types/match.types';
import { BracketMatchData } from '../types/bracket.types';
import { ROUND_LABELS } from './constants';

// Cache for team information extraction
const teamExtractionCache = new Map<string, { red: string[]; blue: string[] }>();

/**
 * Extracts team information from match alliances with memoization
 * Returns formatted team names for red and blue alliances
 */
export const extractTeamInformation = (match: Match): { red: string[]; blue: string[] } => {
  // Create cache key based on alliance data
  const allianceKey = match.alliances
    ? match.alliances
        .map((alliance) => {
          const teamKey = alliance.teamAlliances
            ?.map((ta) => {
              const team = ta.team;
              const teamNumber = team?.teamNumber ?? ta.team?.teamNumber ?? '';
              const teamName = team?.name ?? ta.team?.name ?? '';
              return `${ta.teamId || 'tbd'}-${teamNumber}-${teamName}`;
            })
            .join(',') || 'empty';

          return `${alliance.color}-${teamKey}`;
        })
        .join('|')
    : 'no-alliances';
  
  const cacheKey = `${match.id}-${allianceKey}`;
  
  // Check cache first
  if (teamExtractionCache.has(cacheKey)) {
    return teamExtractionCache.get(cacheKey)!;
  }

  const result = {
    red: [] as string[],
    blue: [] as string[],
  };

  if (!match.alliances || match.alliances.length === 0) {
    teamExtractionCache.set(cacheKey, result);
    return result;
  }

  match.alliances.forEach(alliance => {
    const teams: string[] = [];
    
    if (alliance.teamAlliances && alliance.teamAlliances.length > 0) {
      alliance.teamAlliances.forEach((teamAlliance) => {
        const teamNumber =
          teamAlliance.team?.teamNumber ?? teamAlliance.team?.teamNumber ?? undefined;
        const teamName =
          teamAlliance.team?.name ?? teamAlliance.team?.name ?? undefined;

        const displayName = formatTeamDisplayName(teamNumber, teamName);
        const resolvedName =
          displayName === 'TBD' && teamAlliance.teamId
            ? `Team ${teamAlliance.teamId}`
            : displayName;
        teams.push(resolvedName);
      });
    }

    // If no teams found, add TBD
    if (teams.length === 0) {
      teams.push('TBD');
    }

    if (alliance.color === 'RED') {
      result.red = teams;
    } else if (alliance.color === 'BLUE') {
      result.blue = teams;
    }
  });

  // Cache the result
  teamExtractionCache.set(cacheKey, result);
  
  // Limit cache size
  if (teamExtractionCache.size > 200) {
    const firstKey = teamExtractionCache.keys().next().value;
    if (firstKey) {
      teamExtractionCache.delete(firstKey);
    }
  }

  return result;
};

/**
 * Detects which alliance won the match based on winning alliance and scores
 * Returns boolean flags for red and blue alliance winners
 */
export const detectWinner = (match: Match): { red: boolean; blue: boolean } => {
  const result = {
    red: false,
    blue: false,
  };

  // Only determine winner for completed matches
  if (match.status !== 'COMPLETED') {
    return result;
  }

  // Check winning alliance first (most reliable)
  if (match.winningAlliance === 'RED') {
    result.red = true;
  } else if (match.winningAlliance === 'BLUE') {
    result.blue = true;
  } else if (match.winningAlliance === 'TIE') {
    // In case of tie, neither team is marked as winner
    return result;
  } else {
    // Fallback to score comparison if winning alliance is not set
    const redScore = match.redScore || 0;
    const blueScore = match.blueScore || 0;
    
    if (redScore > blueScore) {
      result.red = true;
    } else if (blueScore > redScore) {
      result.blue = true;
    }
    // If scores are equal or both zero, no winner is determined
  }

  return result;
};

/**
 * Formats team display name combining team number and name
 * Handles various combinations of available data
 */
export const formatTeamDisplayName = (
  teamNumber?: string,
  teamName?: string
): string => {
  // Handle empty or undefined inputs
  if (!teamNumber && !teamName) {
    return 'TBD';
  }

  // Clean up inputs
  const cleanNumber = teamNumber?.trim();
  const cleanName = teamName?.trim();

  // If both are available, combine them
  const normalizedNumber =
    cleanNumber && !cleanNumber.startsWith('#') ? `#${cleanNumber}` : cleanNumber;

  if (normalizedNumber && cleanName) {
    return `${normalizedNumber} ${cleanName}`;
  }

  // Return whichever is available
  if (normalizedNumber) {
    return normalizedNumber;
  }

  if (cleanName) {
    return cleanName;
  }

  return 'TBD';
};

/**
 * Determines if a match is TBD (To Be Determined) based on team information
 * A match is TBD if it has no teams assigned or all teams are TBD
 */
export const isMatchTBD = (teams: string[]): boolean => {
  return teams.length === 0 || teams.every(team => team === 'TBD' || !team.trim());
};

/**
 * Determines if a match is the final match based on round structure
 * In single elimination, the final is typically the last round with one match
 */
export const isFinalMatch = (match: Match, allMatches: Match[]): boolean => {
  if (!match.roundNumber) {
    return false;
  }

  // Find the highest round number
  const maxRound = Math.max(...allMatches
    .filter(m => m.roundNumber !== null && m.roundNumber !== undefined)
    .map(m => m.roundNumber!));

  // Check if this match is in the final round and if there's only one match in that round
  if (match.roundNumber === maxRound) {
    const finalRoundMatches = allMatches.filter(m => m.roundNumber === maxRound);
    return finalRoundMatches.length === 1;
  }

  return false;
};

// Cache for processed match data to avoid repeated expensive operations
const matchProcessingCache = new Map<string, BracketMatchData>();

/**
 * Processes a match for display in the bracket with memoization
 * Combines all match data processing into a single function
 */
export const processMatchForDisplay = (
  match: Match,
  allMatches: Match[] = []
): BracketMatchData => {
  // Create cache key based on match data that affects display
  const cacheKey = `${match.id}-${match.status}-${match.winningAlliance}-${match.roundNumber}-${allMatches.length}`;
  
  // Check cache first
  if (matchProcessingCache.has(cacheKey)) {
    return matchProcessingCache.get(cacheKey)!;
  }

  const teams = extractTeamInformation(match);
  const winners = detectWinner(match);
  const isFinal = isFinalMatch(match, allMatches);
  
  const result: BracketMatchData = {
    ...match,
    displayTeams: teams,
    isWinner: winners,
    isTBD: {
      red: isMatchTBD(teams.red),
      blue: isMatchTBD(teams.blue),
    },
    roundLabel: generateRoundLabel(match.roundNumber || 0, isFinal, allMatches),
    isFinalMatch: isFinal,
  };

  // Cache the result
  matchProcessingCache.set(cacheKey, result);
  
  // Limit cache size to prevent memory leaks
  if (matchProcessingCache.size > 200) {
    const firstKey = matchProcessingCache.keys().next().value;
    if (firstKey) {
      matchProcessingCache.delete(firstKey);
    }
  }

  return result;
};

/**
 * Clears the match processing cache
 */
export const clearMatchProcessingCache = (): void => {
  matchProcessingCache.clear();
};

/**
 * Gets current match processing cache size for debugging
 */
export const getMatchProcessingCacheSize = (): number => {
  return matchProcessingCache.size;
};

/**
 * Clears all caches used in match helpers
 */
export const clearAllMatchHelperCaches = (): void => {
  matchProcessingCache.clear();
  teamExtractionCache.clear();
};

/**
 * Gets total cache sizes for debugging
 */
export const getAllCacheSizes = (): { matchProcessing: number; teamExtraction: number } => {
  return {
    matchProcessing: matchProcessingCache.size,
    teamExtraction: teamExtractionCache.size,
  };
};

/**
 * Generates appropriate round labels based on tournament structure
 * Handles standard rounds, semifinals, and finals
 */
export const generateRoundLabel = (roundNumber: number, isFinal: boolean, allMatches: Match[] = []): string => {
  if (isFinal) {
    return ROUND_LABELS.FINAL;
  }

  // Calculate total rounds to determine if this is semifinals, quarterfinals, etc.
  const maxRound = allMatches.length > 0 
    ? Math.max(...allMatches
        .filter(m => m.roundNumber !== null && m.roundNumber !== undefined)
        .map(m => m.roundNumber!))
    : roundNumber;

  // Determine special round names based on position from final
  const roundsFromFinal = maxRound - roundNumber;

  switch (roundsFromFinal) {
    case 1:
      return ROUND_LABELS.SEMIFINAL;
    case 2:
      return ROUND_LABELS.QUARTERFINAL;
    default:
      return `${ROUND_LABELS.ROUND_PREFIX} ${roundNumber}`;
  }
};

/**
 * Gets match status display information
 * Returns user-friendly status text and styling information
 */
export const getMatchStatusInfo = (match: Match): {
  status: string;
  isCompleted: boolean;
  isInProgress: boolean;
  isPending: boolean;
} => {
  const isCompleted = match.status === 'COMPLETED';
  const isInProgress = match.status === 'IN_PROGRESS';
  const isPending = match.status === 'PENDING';

  let status = 'Pending';
  if (isCompleted) {
    status = 'Completed';
  } else if (isInProgress) {
    status = 'In Progress';
  }

  return {
    status,
    isCompleted,
    isInProgress,
    isPending,
  };
};

/**
 * Validates match data for display
 * Ensures match has minimum required data for bracket display
 */
export const validateMatchForDisplay = (match: Match): boolean => {
  // Must have an ID and match number
  if (!match.id || (!match.matchNumber && match.matchNumber !== 0)) {
    return false;
  }

  // Must have a valid status
  const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  if (!validStatuses.includes(match.status)) {
    return false;
  }

  return true;
};

/**
 * Sorts matches for consistent display order
 * Sorts by round number, then by bracket slot, then by match number
 */
export const sortMatchesForDisplay = (matches: Match[]): Match[] => {
  return [...matches].sort((a, b) => {
    // First sort by round number
    const aRound = a.roundNumber || 0;
    const bRound = b.roundNumber || 0;
    if (aRound !== bRound) {
      return aRound - bRound;
    }

    // Then by bracket slot
    const aSlot = a.bracketSlot || 0;
    const bSlot = b.bracketSlot || 0;
    if (aSlot !== bSlot) {
      return aSlot - bSlot;
    }

    // Finally by match number
    const aNum = typeof a.matchNumber === 'string' ? parseInt(a.matchNumber) : a.matchNumber;
    const bNum = typeof b.matchNumber === 'string' ? parseInt(b.matchNumber) : b.matchNumber;
    return aNum - bNum;
  });
};
