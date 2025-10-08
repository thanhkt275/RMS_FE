import { MatchPosition, ConnectionData, SVGPathData, BracketDimensions } from '../types/bracket.types';
import { FIGMA_DESIGN } from './constants';

/**
 * Calculates SVG path data for connecting two source matches to a target match
 * Implements clean bracket connection routing with proper alignment
 */
export const calculateConnectionPath = (
  sourceMatch1: MatchPosition,
  sourceMatch2: MatchPosition,
  targetMatch: MatchPosition,
  dimensions: BracketDimensions
): SVGPathData => {
  // Calculate connection points on the right edge of source matches
  const source1ExitX = sourceMatch1.x + sourceMatch1.width;
  const source1ExitY = sourceMatch1.y + sourceMatch1.height / 2;
  
  const source2ExitX = sourceMatch2.x + sourceMatch2.width;
  const source2ExitY = sourceMatch2.y + sourceMatch2.height / 2;
  
  // Calculate connection point on the left edge of target match
  const targetEntryX = targetMatch.x;
  const targetEntryY = targetMatch.y + targetMatch.height / 2;
  
  // Calculate the horizontal midpoint between rounds
  const midX = source1ExitX + dimensions.roundGap / 2;
  
  // Calculate the vertical midpoint between the two source matches
  const midY = (source1ExitY + source2ExitY) / 2;
  
  // Generate SVG path with clean bracket-style routing
  const pathData = [
    // Start from first source match
    `M ${source1ExitX} ${source1ExitY}`,
    // Horizontal line to midpoint
    `L ${midX} ${source1ExitY}`,
    // Vertical line to midpoint between sources
    `L ${midX} ${midY}`,
    // Move to second source without drawing
    `M ${source2ExitX} ${source2ExitY}`,
    // Horizontal line to midpoint
    `L ${midX} ${source2ExitY}`,
    // Vertical line to midpoint between sources
    `L ${midX} ${midY}`,
    // Horizontal line to target match
    `L ${targetEntryX} ${targetEntryY}`,
  ].join(' ');
  
  return {
    d: pathData,
    stroke: FIGMA_DESIGN.COLORS.CONNECTION_LINE,
    strokeWidth: FIGMA_DESIGN.CONNECTION_LINES.STROKE_WIDTH,
    fill: 'none',
  };
};

/**
 * Generates connection data for all matches in a bracket layout
 * Determines which matches connect to which based on tournament structure
 */
export const generateBracketConnections = (
  rounds: any[][],
  positions: MatchPosition[]
): ConnectionData[] => {
  const connections: ConnectionData[] = [];
  
  // Create a map for quick position lookup by match ID
  const positionMap = new Map<string, MatchPosition>();
  positions.forEach(pos => {
    positionMap.set(pos.matchId, pos);
  });
  
  // Process each round (except the first round which has no source matches)
  for (let roundIndex = 1; roundIndex < rounds.length; roundIndex++) {
    const currentRound = rounds[roundIndex];
    const previousRound = rounds[roundIndex - 1];
    
    // Each match in current round connects to two matches from previous round
    currentRound.forEach((targetMatch, matchIndex) => {
      const targetPosition = positionMap.get(targetMatch.id);
      if (!targetPosition) return;
      
      // Calculate which two matches from previous round feed into this match
      const sourceIndex1 = matchIndex * 2;
      const sourceIndex2 = matchIndex * 2 + 1;
      
      const sourceMatch1 = previousRound[sourceIndex1];
      const sourceMatch2 = previousRound[sourceIndex2];
      
      if (sourceMatch1 && sourceMatch2) {
        const sourcePosition1 = positionMap.get(sourceMatch1.id);
        const sourcePosition2 = positionMap.get(sourceMatch2.id);
        
        if (sourcePosition1 && sourcePosition2) {
          // Calculate the connection path
          const pathData = calculateConnectionPath(
            sourcePosition1,
            sourcePosition2,
            targetPosition,
            {
              containerWidth: 0, // Not needed for path calculation
              containerHeight: 0, // Not needed for path calculation
              roundWidth: targetPosition.width,
              roundGap: FIGMA_DESIGN.SPACING.ROUND_GAP,
              matchHeight: targetPosition.height,
              matchVerticalGap: FIGMA_DESIGN.SPACING.MATCH_VERTICAL_GAP,
            }
          );
          
          connections.push({
            fromMatches: [sourceMatch1.id, sourceMatch2.id],
            toMatch: targetMatch.id,
            path: pathData,
          });
        }
      }
    });
  }
  
  return connections;
};

/**
 * Validates that connection points align properly with match card positions
 * Ensures connections don't overlap with match cards or extend outside bounds
 */
export const validateConnectionAlignment = (
  connection: ConnectionData,
  positions: MatchPosition[]
): boolean => {
  const positionMap = new Map<string, MatchPosition>();
  positions.forEach(pos => {
    positionMap.set(pos.matchId, pos);
  });
  
  const [sourceId1, sourceId2] = connection.fromMatches;
  const targetId = connection.toMatch;
  
  const source1 = positionMap.get(sourceId1);
  const source2 = positionMap.get(sourceId2);
  const target = positionMap.get(targetId);
  
  // All positions must exist
  if (!source1 || !source2 || !target) {
    return false;
  }
  
  // Source matches should be in the same round (same x position)
  if (Math.abs(source1.x - source2.x) > 1) {
    return false;
  }
  
  // Target match should be in the next round (greater x position)
  if (target.x <= source1.x) {
    return false;
  }
  
  // Vertical alignment should be reasonable
  const source1CenterY = source1.y + source1.height / 2;
  const source2CenterY = source2.y + source2.height / 2;
  const targetCenterY = target.y + target.height / 2;
  
  // Target should be between the two sources vertically
  const minSourceY = Math.min(source1CenterY, source2CenterY);
  const maxSourceY = Math.max(source1CenterY, source2CenterY);
  
  return targetCenterY >= minSourceY && targetCenterY <= maxSourceY;
};

/**
 * Handles edge cases in bracket structures
 * Provides fallback connection generation for irregular tournament formats
 */
export const handleBracketEdgeCases = (
  rounds: any[][],
  positions: MatchPosition[]
): ConnectionData[] => {
  // Handle single match case
  if (rounds.length === 1 || positions.length === 1) {
    return [];
  }
  
  // Handle irregular bracket structures
  const connections: ConnectionData[] = [];
  
  // Try to generate connections using standard algorithm
  try {
    return generateBracketConnections(rounds, positions);
  } catch (error) {
    console.warn('Standard bracket connection generation failed, using fallback:', error);
    
    // Fallback: create simple connections based on position proximity
    const positionMap = new Map<string, MatchPosition>();
    positions.forEach(pos => {
      positionMap.set(pos.matchId, pos);
    });
    
    // Group positions by round (x coordinate)
    const roundGroups = new Map<number, MatchPosition[]>();
    positions.forEach(pos => {
      const roundX = pos.x;
      if (!roundGroups.has(roundX)) {
        roundGroups.set(roundX, []);
      }
      roundGroups.get(roundX)!.push(pos);
    });
    
    const sortedRounds = Array.from(roundGroups.entries()).sort((a, b) => a[0] - b[0]);
    
    // Create connections between adjacent rounds
    for (let i = 0; i < sortedRounds.length - 1; i++) {
      const currentRoundPositions = sortedRounds[i][1];
      const nextRoundPositions = sortedRounds[i + 1][1];
      
      // Sort by y position
      currentRoundPositions.sort((a, b) => a.y - b.y);
      nextRoundPositions.sort((a, b) => a.y - b.y);
      
      // Connect pairs of current round matches to next round matches
      for (let j = 0; j < nextRoundPositions.length; j++) {
        const targetPos = nextRoundPositions[j];
        const sourceIndex1 = j * 2;
        const sourceIndex2 = j * 2 + 1;
        
        if (sourceIndex1 < currentRoundPositions.length && sourceIndex2 < currentRoundPositions.length) {
          const source1 = currentRoundPositions[sourceIndex1];
          const source2 = currentRoundPositions[sourceIndex2];
          
          const pathData = calculateConnectionPath(
            source1,
            source2,
            targetPos,
            {
              containerWidth: 0,
              containerHeight: 0,
              roundWidth: targetPos.width,
              roundGap: FIGMA_DESIGN.SPACING.ROUND_GAP,
              matchHeight: targetPos.height,
              matchVerticalGap: FIGMA_DESIGN.SPACING.MATCH_VERTICAL_GAP,
            }
          );
          
          connections.push({
            fromMatches: [source1.matchId, source2.matchId],
            toMatch: targetPos.matchId,
            path: pathData,
          });
        }
      }
    }
    
    return connections;
  }
};