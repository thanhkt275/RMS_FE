import { Match } from '@/types/match.types';

/**
 * Validation utilities for bracket data and edge case handling
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SafeMatchData {
  match: Match;
  displayTeams: {
    red: string[];
    blue: string[];
  };
  isValid: boolean;
  fallbackData?: Partial<Match>;
}

/**
 * Validates a single match for bracket display
 */
export const validateMatch = (match: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if match exists
  if (!match) {
    errors.push('Match is null or undefined');
    return { isValid: false, errors, warnings };
  }

  // Check required fields
  if (!match.id) {
    errors.push('Match missing required field: id');
  }

  if (!match.matchNumber && match.matchNumber !== 0) {
    warnings.push('Match missing matchNumber');
  }

  // Validate match status
  const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
  if (match.status && !validStatuses.includes(match.status)) {
    warnings.push(`Invalid match status: ${match.status}`);
  }

  // Validate alliances structure
  if (match.alliances) {
    if (!Array.isArray(match.alliances)) {
      errors.push('Match alliances must be an array');
    } else {
      match.alliances.forEach((alliance: any, index: number) => {
        if (!alliance) {
          warnings.push(`Alliance ${index} is null or undefined`);
          return;
        }

        if (!alliance.color || !['RED', 'BLUE'].includes(alliance.color)) {
          warnings.push(`Alliance ${index} has invalid color: ${alliance.color}`);
        }

        if (!alliance.teamAlliances || !Array.isArray(alliance.teamAlliances)) {
          warnings.push(`Alliance ${index} missing or invalid teamAlliances`);
        }
      });
    }
  }

  // Validate winning alliance
  if (match.winningAlliance && !['RED', 'BLUE', 'TIE'].includes(match.winningAlliance)) {
    warnings.push(`Invalid winningAlliance: ${match.winningAlliance}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validates an array of matches for bracket display
 */
export const validateMatches = (matches: any[]): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(matches)) {
    errors.push('Matches must be an array');
    return { isValid: false, errors, warnings };
  }

  if (matches.length === 0) {
    warnings.push('No matches provided');
    return { isValid: true, errors, warnings };
  }

  // Check for duplicate match IDs
  const matchIds = new Set<string>();
  const duplicateIds: string[] = [];

  matches.forEach((match, index) => {
    const validation = validateMatch(match);
    
    // Collect errors and warnings with context
    validation.errors.forEach(error => {
      errors.push(`Match ${index}: ${error}`);
    });
    validation.warnings.forEach(warning => {
      warnings.push(`Match ${index}: ${warning}`);
    });

    // Check for duplicate IDs
    if (match?.id) {
      if (matchIds.has(match.id)) {
        duplicateIds.push(match.id);
      } else {
        matchIds.add(match.id);
      }
    }
  });

  // Report duplicate IDs
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate match IDs found: ${duplicateIds.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Creates safe match data with fallbacks for missing or invalid data
 */
export const createSafeMatchData = (match: any): SafeMatchData => {
  const validation = validateMatch(match);
  
  // Create fallback match data
  const fallbackMatch: Match = {
    id: match?.id || `fallback-${Date.now()}-${Math.random()}`,
    matchNumber: match?.matchNumber || 'TBD',
    scheduledTime: match?.scheduledTime || new Date().toISOString(),
    status: match?.status || 'PENDING',
    winningAlliance: match?.winningAlliance || null,
    redScore: match?.redScore || 0,
    blueScore: match?.blueScore || 0,
    alliances: match?.alliances || [],
    roundNumber: match?.roundNumber || null,
    stage: match?.stage || undefined,
  };

  // Extract team information safely
  const displayTeams = extractSafeTeamInformation(match);

  return {
    match: validation.isValid ? match : fallbackMatch,
    displayTeams,
    isValid: validation.isValid,
    fallbackData: validation.isValid ? undefined : fallbackMatch,
  };
};

/**
 * Safely extracts team information from a match with fallbacks
 */
export const extractSafeTeamInformation = (match: any): { red: string[]; blue: string[] } => {
  const defaultTeams = { red: ['TBD'], blue: ['TBD'] };

  if (!match || !match.alliances || !Array.isArray(match.alliances)) {
    return defaultTeams;
  }

  const teams = { red: [] as string[], blue: [] as string[] };

  try {
    match.alliances.forEach((alliance: any) => {
      if (!alliance || !alliance.color) return;

      const color = alliance.color.toLowerCase();
      if (color !== 'red' && color !== 'blue') return;

      const teamList: string[] = [];

      if (alliance.teamAlliances && Array.isArray(alliance.teamAlliances)) {
        alliance.teamAlliances.forEach((teamAlliance: any) => {
          if (!teamAlliance) return;

          let teamName = 'TBD';
          
          // Try to get team name from various possible structures
          if (teamAlliance.team?.name) {
            const teamNumber = teamAlliance.team.teamNumber || '';
            teamName = teamNumber ? `${teamNumber} ${teamAlliance.team.name}` : teamAlliance.team.name;
          } else if (teamAlliance.team?.teamNumber) {
            teamName = `Team ${teamAlliance.team.teamNumber}`;
          } else if (teamAlliance.teamId) {
            teamName = `Team ${teamAlliance.teamId}`;
          }

          teamList.push(teamName);
        });
      }

      // Assign teams to the correct alliance
      if (color === 'red') {
        teams.red = teamList.length > 0 ? teamList : ['TBD'];
      } else if (color === 'blue') {
        teams.blue = teamList.length > 0 ? teamList : ['TBD'];
      }
    });

    // Ensure both alliances have at least one team
    if (teams.red.length === 0) teams.red = ['TBD'];
    if (teams.blue.length === 0) teams.blue = ['TBD'];

    return teams;
  } catch (error) {
    console.warn('Error extracting team information:', error);
    return defaultTeams;
  }
};

/**
 * Validates bracket structure and fixes common issues
 */
export const validateAndFixBracketStructure = (matches: Match[]): Match[] => {
  if (!Array.isArray(matches) || matches.length === 0) {
    return [];
  }

  try {
    // Filter out invalid matches
    const validMatches = matches.filter(match => {
      const validation = validateMatch(match);
      if (!validation.isValid) {
        console.warn(`Filtering out invalid match:`, validation.errors);
        return false;
      }
      return true;
    });

    // Sort matches by round number and match number for consistent display
    return validMatches.sort((a, b) => {
      // Primary sort: round number (nulls last)
      const roundA = a.roundNumber ?? Number.MAX_SAFE_INTEGER;
      const roundB = b.roundNumber ?? Number.MAX_SAFE_INTEGER;
      
      if (roundA !== roundB) {
        return roundA - roundB;
      }

      // Secondary sort: match number
      const matchNumA = typeof a.matchNumber === 'number' ? a.matchNumber : 
                       typeof a.matchNumber === 'string' ? parseInt(a.matchNumber, 10) || 0 : 0;
      const matchNumB = typeof b.matchNumber === 'number' ? b.matchNumber : 
                       typeof b.matchNumber === 'string' ? parseInt(b.matchNumber, 10) || 0 : 0;
      
      return matchNumA - matchNumB;
    });
  } catch (error) {
    console.error('Error validating bracket structure:', error);
    return [];
  }
};

/**
 * Handles edge cases in bracket layout calculations
 */
export const handleLayoutEdgeCases = (
  rounds: Match[][],
  containerDimensions: { width: number; height: number }
): { rounds: Match[][]; isValid: boolean; warnings: string[] } => {
  const warnings: string[] = [];
  let processedRounds = [...rounds];

  // Handle empty rounds
  if (processedRounds.length === 0) {
    warnings.push('No rounds available for display');
    return { rounds: [], isValid: false, warnings };
  }

  // Handle rounds with no matches
  processedRounds = processedRounds.filter(round => round.length > 0);
  if (processedRounds.length === 0) {
    warnings.push('All rounds are empty');
    return { rounds: [], isValid: false, warnings };
  }

  // Handle single match tournaments
  if (processedRounds.length === 1 && processedRounds[0].length === 1) {
    warnings.push('Single match tournament detected');
  }

  // Handle very large tournaments
  const totalMatches = processedRounds.reduce((sum, round) => sum + round.length, 0);
  if (totalMatches > 100) {
    warnings.push(`Large tournament detected (${totalMatches} matches) - performance may be affected`);
  }

  // Handle container size constraints
  if (containerDimensions.width < 200 || containerDimensions.height < 100) {
    warnings.push('Container dimensions are very small - display may be compromised');
  }

  return {
    rounds: processedRounds,
    isValid: true,
    warnings,
  };
};

/**
 * Creates a fallback match for error recovery
 */
export const createFallbackMatch = (id?: string): Match => {
  return {
    id: id || `fallback-${Date.now()}-${Math.random()}`,
    matchNumber: 'TBD',
    scheduledTime: new Date().toISOString(),
    status: 'PENDING',
    winningAlliance: null,
    redScore: 0,
    blueScore: 0,
    alliances: [
      {
        color: 'RED',
        teamAlliances: [{ teamId: 'tbd', team: { id: 'tbd', name: 'TBD' } }],
      },
      {
        color: 'BLUE',
        teamAlliances: [{ teamId: 'tbd', team: { id: 'tbd', name: 'TBD' } }],
      },
    ],
    roundNumber: null,
  };
};