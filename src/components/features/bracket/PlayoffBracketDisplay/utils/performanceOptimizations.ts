import { useMemo, useCallback, useRef } from 'react';
import { Match } from '@/types/match.types';
import { MatchPosition, ScaledDimensions } from '../types/bracket.types';

/**
 * Performance optimization utilities for the bracket display component
 */

/**
 * Memoized match position finder to avoid repeated array searches
 */
export const useMatchPositionFinder = (positions: MatchPosition[]) => {
  return useMemo(() => {
    const positionMap = new Map<string, MatchPosition>();
    positions.forEach(pos => positionMap.set(pos.matchId, pos));
    
    return (matchId: string): MatchPosition | undefined => {
      return positionMap.get(matchId);
    };
  }, [positions]);
};

/**
 * Memoized round calculations to avoid repeated computations
 */
export const useRoundCalculations = (
  rounds: Match[][],
  scaledDimensions: ScaledDimensions
) => {
  return useMemo(() => {
    return rounds.map((roundMatches, roundIndex) => ({
      roundIndex,
      isFinalRound: roundIndex === rounds.length - 1,
      roundX: roundIndex * (scaledDimensions.matchWidth + scaledDimensions.roundGap),
      matchCount: roundMatches.length,
    }));
  }, [rounds, scaledDimensions.matchWidth, scaledDimensions.roundGap]);
};

/**
 * Debounced callback for expensive operations
 */
export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay, ...deps]
  );
};

/**
 * Memoized style calculations to prevent inline object creation
 */
export const useStyleCalculations = (
  scaleFactor: number,
  offsetX: number,
  offsetY: number
) => {
  return useMemo(() => ({
    transform: `scale(${scaleFactor}) translate(${offsetX / scaleFactor}px, ${offsetY / scaleFactor}px)`,
    transformOrigin: 'top left' as const,
  }), [scaleFactor, offsetX, offsetY]);
};

/**
 * Memoized match dimensions to prevent repeated calculations
 */
export const useMatchDimensions = (scaledDimensions: ScaledDimensions) => {
  return useMemo(() => ({
    width: scaledDimensions.matchWidth,
    height: scaledDimensions.matchHeight,
  }), [scaledDimensions.matchWidth, scaledDimensions.matchHeight]);
};

/**
 * Performance monitoring hook for development
 */
export const usePerformanceMonitor = (componentName: string, enabled = process.env.NODE_ENV === 'development') => {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  
  if (enabled) {
    renderCountRef.current += 1;
    const currentTime = Date.now();
    const timeSinceLastRender = currentTime - lastRenderTimeRef.current;
    
    if (renderCountRef.current % 10 === 0) {
      console.log(`[Performance] ${componentName}: ${renderCountRef.current} renders, last render took ${timeSinceLastRender}ms`);
    }
    
    lastRenderTimeRef.current = currentTime;
  }
  
  return {
    renderCount: renderCountRef.current,
    timeSinceLastRender: Date.now() - lastRenderTimeRef.current,
  };
};

/**
 * Shallow comparison utility for React.memo
 */
export const shallowEqual = <T extends Record<string, any>>(objA: T, objB: T): boolean => {
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  
  if (keysA.length !== keysB.length) {
    return false;
  }
  
  for (const key of keysA) {
    if (objA[key] !== objB[key]) {
      return false;
    }
  }
  
  return true;
};

/**
 * Custom comparison function for match arrays
 */
export const compareMatchArrays = (prevMatches: Match[], nextMatches: Match[]): boolean => {
  if (prevMatches.length !== nextMatches.length) {
    return false;
  }
  
  for (let i = 0; i < prevMatches.length; i++) {
    const prev = prevMatches[i];
    const next = nextMatches[i];
    
    // Compare essential match properties that affect rendering
    if (
      prev.id !== next.id ||
      prev.status !== next.status ||
      prev.winningAlliance !== next.winningAlliance ||
      prev.matchNumber !== next.matchNumber
    ) {
      return false;
    }
  }
  
  return true;
};

/**
 * Memoization helper for expensive calculations
 */
export const useMemoizedCalculation = <T>(
  calculation: () => T,
  deps: React.DependencyList,
  debugName?: string
): T => {
  return useMemo(() => {
    const startTime = performance.now();
    const result = calculation();
    const endTime = performance.now();
    
    if (debugName && process.env.NODE_ENV === 'development') {
      console.log(`[Memoized Calculation] ${debugName} took ${endTime - startTime}ms`);
    }
    
    return result;
  }, deps);
};

/**
 * Memoized match data processing to avoid repeated expensive operations
 */
export const useMemoizedMatchProcessing = (matches: Match[]) => {
  return useMemo(() => {
    if (!Array.isArray(matches) || matches.length === 0) {
      return {
        processedMatches: [],
        matchMap: new Map(),
        roundMap: new Map(),
        maxRound: 0,
        totalMatches: 0,
      };
    }

    // Create match lookup map for O(1) access
    const matchMap = new Map<string, Match>();
    matches.forEach(match => matchMap.set(match.id, match));

    // Group matches by round for efficient round-based operations
    const roundMap = new Map<number, Match[]>();
    let maxRound = 0;

    matches.forEach(match => {
      if (match.roundNumber !== null && match.roundNumber !== undefined) {
        const roundNum = match.roundNumber;
        maxRound = Math.max(maxRound, roundNum);
        
        if (!roundMap.has(roundNum)) {
          roundMap.set(roundNum, []);
        }
        roundMap.get(roundNum)!.push(match);
      }
    });

    return {
      processedMatches: matches,
      matchMap,
      roundMap,
      maxRound,
      totalMatches: matches.length,
    };
  }, [matches]);
};

/**
 * Memoized bracket structure calculations
 */
export const useMemoizedBracketStructure = (
  rounds: Match[][],
  containerDimensions: { width: number; height: number }
) => {
  return useMemo(() => {
    if (!rounds || rounds.length === 0) {
      return {
        totalRounds: 0,
        maxMatchesInRound: 0,
        roundSizes: [],
        bracketShape: 'empty' as const,
        isValidBracket: false,
      };
    }

    const totalRounds = rounds.length;
    const roundSizes = rounds.map(round => round.length);
    const maxMatchesInRound = Math.max(...roundSizes);
    
    // Determine bracket shape for optimization hints
    let bracketShape: 'single-elimination' | 'double-elimination' | 'round-robin' | 'custom' = 'custom';
    
    // Check for single elimination pattern (each round has half the matches of previous)
    if (rounds.length > 1) {
      const isSingleElimination = rounds.every((round, index) => {
        if (index === 0) return true;
        const expectedMatches = Math.ceil(rounds[index - 1].length / 2);
        return round.length === expectedMatches || round.length === expectedMatches - 1;
      });
      
      if (isSingleElimination) {
        bracketShape = 'single-elimination';
      }
    }

    const isValidBracket = totalRounds > 0 && maxMatchesInRound > 0;

    return {
      totalRounds,
      maxMatchesInRound,
      roundSizes,
      bracketShape,
      isValidBracket,
    };
  }, [rounds, containerDimensions.width, containerDimensions.height]);
};

/**
 * Memoized connection calculations for bracket lines
 */
export const useMemoizedConnections = (
  rounds: Match[][],
  positions: MatchPosition[],
  dimensions: { roundGap: number }
) => {
  return useMemo(() => {
    if (rounds.length < 2 || positions.length === 0) {
      return {
        connections: [],
        connectionMap: new Map(),
        totalConnections: 0,
      };
    }

    // Create position lookup map
    const positionMap = new Map<string, MatchPosition>();
    positions.forEach(pos => positionMap.set(pos.matchId, pos));

    const connections: Array<{
      fromMatches: [string, string];
      toMatch: string;
      path: string;
      roundIndex: number;
    }> = [];

    const connectionMap = new Map<string, MatchPosition[]>();

    // Generate connections between consecutive rounds
    for (let roundIndex = 0; roundIndex < rounds.length - 1; roundIndex++) {
      const currentRound = rounds[roundIndex];
      const nextRound = rounds[roundIndex + 1];

      for (let nextMatchIndex = 0; nextMatchIndex < nextRound.length; nextMatchIndex++) {
        const targetMatch = nextRound[nextMatchIndex];
        const targetPosition = positionMap.get(targetMatch.id);
        
        if (!targetPosition) continue;

        const sourceMatch1Index = nextMatchIndex * 2;
        const sourceMatch2Index = nextMatchIndex * 2 + 1;

        if (sourceMatch1Index < currentRound.length && sourceMatch2Index < currentRound.length) {
          const sourceMatch1 = currentRound[sourceMatch1Index];
          const sourceMatch2 = currentRound[sourceMatch2Index];
          
          const sourcePosition1 = positionMap.get(sourceMatch1.id);
          const sourcePosition2 = positionMap.get(sourceMatch2.id);

          if (sourcePosition1 && sourcePosition2) {
            // Store connection data
            connectionMap.set(targetMatch.id, [sourcePosition1, sourcePosition2]);
            
            connections.push({
              fromMatches: [sourceMatch1.id, sourceMatch2.id],
              toMatch: targetMatch.id,
              path: '', // Path will be calculated when needed
              roundIndex,
            });
          }
        }
      }
    }

    return {
      connections,
      connectionMap,
      totalConnections: connections.length,
    };
  }, [rounds, positions, dimensions.roundGap]);
};

/**
 * Memoized scaling calculations to prevent repeated expensive computations
 */
export const useMemoizedScaling = (
  containerDimensions: { width: number; height: number },
  bracketDimensions: { width: number; height: number },
  minScale: number = 0.3
) => {
  return useMemo(() => {
    const { width: containerWidth, height: containerHeight } = containerDimensions;
    const { width: bracketWidth, height: bracketHeight } = bracketDimensions;

    if (containerWidth <= 0 || containerHeight <= 0 || bracketWidth <= 0 || bracketHeight <= 0) {
      return {
        scaleFactor: 1,
        offsetX: 0,
        offsetY: 0,
        fitsWithoutScaling: true,
        scalingReason: 'invalid-dimensions',
      };
    }

    const VIEWPORT_PADDING = 20;
    const availableWidth = containerWidth - VIEWPORT_PADDING * 2;
    const availableHeight = containerHeight - VIEWPORT_PADDING * 2;

    const fitsWithoutScaling = bracketWidth <= availableWidth && bracketHeight <= availableHeight;
    
    let scaleFactor = 1;
    let scalingReason = 'no-scaling-needed';

    if (!fitsWithoutScaling) {
      const widthScale = availableWidth / bracketWidth;
      const heightScale = availableHeight / bracketHeight;
      
      scaleFactor = Math.min(widthScale, heightScale);
      scaleFactor = Math.max(scaleFactor, minScale);
      
      if (widthScale < heightScale) {
        scalingReason = 'width-constrained';
      } else {
        scalingReason = 'height-constrained';
      }
    }

    const finalWidth = bracketWidth * scaleFactor;
    const finalHeight = bracketHeight * scaleFactor;

    const offsetX = Math.max(VIEWPORT_PADDING, (containerWidth - finalWidth) / 2);
    const offsetY = VIEWPORT_PADDING;

    return {
      scaleFactor,
      offsetX,
      offsetY,
      fitsWithoutScaling,
      scalingReason,
      finalDimensions: { width: finalWidth, height: finalHeight },
      availableDimensions: { width: availableWidth, height: availableHeight },
    };
  }, [containerDimensions.width, containerDimensions.height, bracketDimensions.width, bracketDimensions.height, minScale]);
};

/**
 * Memoized team data extraction and formatting
 */
export const useMemoizedTeamData = (matches: Match[]) => {
  return useMemo(() => {
    const teamMap = new Map<string, { number?: string; name: string; displayName: string }>();
    const matchTeamMap = new Map<string, { red: string[]; blue: string[] }>();

    matches.forEach(match => {
      const teams = { red: [] as string[], blue: [] as string[] };

      if (match.alliances) {
        match.alliances.forEach(alliance => {
          const allianceTeams: string[] = [];
          
          if (alliance.teamAlliances) {
            alliance.teamAlliances.forEach(teamAlliance => {
              if (teamAlliance.team) {
                const team = teamAlliance.team;
                const displayName = team.teamNumber && team.name 
                  ? `${team.teamNumber} ${team.name}`
                  : team.teamNumber || team.name || 'TBD';
                
                allianceTeams.push(displayName);
                
                // Store team data for lookup
                if (team.id) {
                  teamMap.set(team.id, {
                    number: team.teamNumber,
                    name: team.name,
                    displayName,
                  });
                }
              } else {
                allianceTeams.push('TBD');
              }
            });
          }

          if (allianceTeams.length === 0) {
            allianceTeams.push('TBD');
          }

          if (alliance.color === 'RED') {
            teams.red = allianceTeams;
          } else if (alliance.color === 'BLUE') {
            teams.blue = allianceTeams;
          }
        });
      }

      matchTeamMap.set(match.id, teams);
    });

    return {
      teamMap,
      matchTeamMap,
      totalTeams: teamMap.size,
    };
  }, [matches]);
};
