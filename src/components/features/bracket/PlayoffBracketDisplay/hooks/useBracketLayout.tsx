import { useMemo, useState, useEffect, useCallback } from 'react';
import { Match } from '@/types/match.types';
import { UseBracketLayoutReturn, BracketDimensions, MatchPosition, ConnectionData } from '../types/bracket.types';
import {
  organizeMatchesIntoRounds,
  calculateMatchPositions,
  calculateBracketDimensions,
  generateConnectionPath,
} from '../utils/bracketCalculations';
import {
  sortMatchesForDisplay,
  validateMatchForDisplay,
} from '../utils/matchHelpers';
import {
  validateMatches,
  validateAndFixBracketStructure,
  handleLayoutEdgeCases,
  createFallbackMatch,
} from '../utils/validation';

const useBracketLayout = (
  matches: Match[],
  containerDimensions: { width: number; height: number }
): UseBracketLayoutReturn => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Memoize expensive match processing operations
  const processedMatches = useMemo(() => {
    if (!Array.isArray(matches)) return [];
    
    try {
      const cleanedMatches = validateAndFixBracketStructure(matches);
      return cleanedMatches.filter(match => {
        try {
          return validateMatchForDisplay(match);
        } catch (error) {
          console.warn('Error validating match for display:', error);
          return false;
        }
      });
    } catch (error) {
      console.warn('Error processing matches:', error);
      return [];
    }
  }, [matches]);

  // Memoize match sorting to avoid repeated calculations
  const sortedMatches = useMemo(() => {
    if (processedMatches.length === 0) return [];
    
    try {
      return sortMatchesForDisplay(processedMatches);
    } catch (error) {
      console.warn('Error sorting matches, using original order:', error);
      return processedMatches;
    }
  }, [processedMatches]);

  // Memoize rounds organization to avoid repeated expensive calculations
  const organizedRounds = useMemo(() => {
    if (sortedMatches.length === 0) return [];
    
    try {
      return organizeMatchesIntoRounds(sortedMatches);
    } catch (error) {
      console.warn('Error organizing matches into rounds:', error);
      return [sortedMatches]; // Fallback to single round
    }
  }, [sortedMatches]);

  const [baseDimensions, setBaseDimensions] = useState<BracketDimensions>(getDefaultDimensions());

  const layout = useMemo(() => {
    setIsLoading(true);
    setError(null);

    try {
      // Early validation of input data
      if (!Array.isArray(matches)) {
        throw new Error('Matches must be an array');
      }

      // Validate container dimensions
      if (containerDimensions.width < 0 || containerDimensions.height < 0) {
        throw new Error('Container dimensions must be positive');
      }

      // Comprehensive match validation
      const matchValidation = validateMatches(matches);
      
      // Log warnings in development
      if (process.env.NODE_ENV === 'development' && matchValidation.warnings.length > 0) {
        console.warn('Bracket layout warnings:', matchValidation.warnings);
      }

      // Handle critical validation errors
      if (!matchValidation.isValid) {
        throw new Error(`Match validation failed: ${matchValidation.errors.join(', ')}`);
      }

      // Use pre-processed and sorted matches
      if (sortedMatches.length === 0) {
        setIsLoading(false);
        return createEmptyLayout(containerDimensions);
      }

      // Use pre-organized rounds
      let rounds = organizedRounds;
      
      if (rounds.length === 0) {
        throw new Error('Unable to organize matches into rounds');
      }

      // Handle layout edge cases
      const edgeCaseResult = handleLayoutEdgeCases(rounds, containerDimensions);
      
      if (!edgeCaseResult.isValid) {
        throw new Error(`Layout validation failed: ${edgeCaseResult.warnings.join(', ')}`);
      }

      // Log edge case warnings
      if (process.env.NODE_ENV === 'development' && edgeCaseResult.warnings.length > 0) {
        console.warn('Layout edge case warnings:', edgeCaseResult.warnings);
      }

      rounds = edgeCaseResult.rounds;

      // Calculate base dimensions with error handling
      let baseDimensions: BracketDimensions;
      try {
        baseDimensions = calculateBracketDimensions(rounds);
      } catch (error) {
        console.warn('Error calculating bracket dimensions, using defaults:', error);
        baseDimensions = getDefaultDimensions();
      }
      
      // Use container dimensions if provided, otherwise use calculated dimensions
      const dimensions: BracketDimensions = {
        containerWidth: containerDimensions.width || baseDimensions.containerWidth,
        containerHeight: containerDimensions.height || baseDimensions.containerHeight,
        roundWidth: baseDimensions.roundWidth,
        roundGap: baseDimensions.roundGap,
        matchHeight: baseDimensions.matchHeight,
        matchVerticalGap: baseDimensions.matchVerticalGap,
      };

      setBaseDimensions(dimensions);

      // Calculate match positions with error handling
      let positions: MatchPosition[];
      try {
        positions = calculateMatchPositions(rounds, dimensions);
      } catch (error) {
        console.warn('Error calculating match positions:', error);
        positions = createFallbackPositions(rounds, dimensions);
      }

      // Generate connection data for bracket lines with error handling
      let connections: ConnectionData[];
      try {
        connections = generateConnections(rounds, positions, dimensions);
      } catch (error) {
        console.warn('Error generating connections:', error);
        connections = [];
      }

      setIsLoading(false);
      return {
        rounds,
        positions,
        dimensions,
        connections,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred during layout calculation';
      console.error('Bracket layout error:', err);
      setError(errorMessage);
      setIsLoading(false);
      
      // Return fallback layout
      return createEmptyLayout(containerDimensions);
    }
  }, [organizedRounds, containerDimensions.width, containerDimensions.height]);

  return {
    layout,
    baseDimensions,
    isLoading,
    error,
  };
};

/**
 * Creates an empty layout for fallback scenarios
 */
const createEmptyLayout = (containerDimensions: { width: number; height: number }) => {
  return {
    rounds: [],
    positions: [],
    dimensions: {
      containerWidth: containerDimensions.width,
      containerHeight: containerDimensions.height,
      roundWidth: 213.33,
      roundGap: 133.33,
      matchHeight: 67.5,
      matchVerticalGap: 67.5,
    } as BracketDimensions,
    connections: [],
  };
};

/**
 * Gets default bracket dimensions
 */
const getDefaultDimensions = (): BracketDimensions => {
  return {
    containerWidth: 800,
    containerHeight: 600,
    roundWidth: 213.33,
    roundGap: 133.33,
    matchHeight: 67.5,
    matchVerticalGap: 67.5,
  };
};

/**
 * Creates fallback positions when calculation fails
 */
const createFallbackPositions = (rounds: Match[][], dimensions: BracketDimensions): MatchPosition[] => {
  const positions: MatchPosition[] = [];
  
  rounds.forEach((round, roundIndex) => {
    round.forEach((match, matchIndex) => {
      positions.push({
        matchId: match.id,
        x: roundIndex * (dimensions.roundWidth + dimensions.roundGap),
        y: matchIndex * (dimensions.matchHeight + dimensions.matchVerticalGap),
        width: dimensions.roundWidth,
        height: dimensions.matchHeight,
        roundIndex,
        matchIndex,
      });
    });
  });
  
  return positions;
};

/**
 * Generates connection data for bracket lines between matches
 * Creates connections from parent matches to child matches in elimination brackets
 */
const generateConnections = (
  rounds: Match[][],
  positions: MatchPosition[],
  dimensions: BracketDimensions
): ConnectionData[] => {
  const connections: ConnectionData[] = [];
  
  if (rounds.length < 2) {
    return connections; // No connections needed for single round
  }

  // Create a map for quick position lookup
  const positionMap = new Map<string, MatchPosition>();
  positions.forEach(pos => positionMap.set(pos.matchId, pos));

  // Generate connections between consecutive rounds
  for (let roundIndex = 0; roundIndex < rounds.length - 1; roundIndex++) {
    const currentRound = rounds[roundIndex];
    const nextRound = rounds[roundIndex + 1];

    // In single elimination, every 2 matches in current round feed into 1 match in next round
    for (let nextMatchIndex = 0; nextMatchIndex < nextRound.length; nextMatchIndex++) {
      const targetMatch = nextRound[nextMatchIndex];
      const targetPosition = positionMap.get(targetMatch.id);
      
      if (!targetPosition) continue;

      // Find the two source matches that feed into this target match
      const sourceMatch1Index = nextMatchIndex * 2;
      const sourceMatch2Index = nextMatchIndex * 2 + 1;

      if (sourceMatch1Index < currentRound.length && sourceMatch2Index < currentRound.length) {
        const sourceMatch1 = currentRound[sourceMatch1Index];
        const sourceMatch2 = currentRound[sourceMatch2Index];
        
        const sourcePosition1 = positionMap.get(sourceMatch1.id);
        const sourcePosition2 = positionMap.get(sourceMatch2.id);

        if (sourcePosition1 && sourcePosition2) {
          const connectionPath = generateConnectionPath(
            sourcePosition1,
            sourcePosition2,
            targetPosition,
            dimensions.roundGap
          );

          connections.push({
            fromMatches: [sourceMatch1.id, sourceMatch2.id],
            toMatch: targetMatch.id,
            path: connectionPath,
          });
        }
      }
    }
  }

  return connections;
};

export default useBracketLayout;