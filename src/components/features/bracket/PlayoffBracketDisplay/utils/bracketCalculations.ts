import { Match } from '@/types/match.types';
import { MatchPosition, BracketDimensions, SVGPathData } from '../types/bracket.types';
import { FIGMA_DESIGN, SCALING_CONSTANTS } from './constants';

// Cache for expensive calculations to avoid repeated computations
const calculationCache = new Map<string, any>();

/**
 * Clears the calculation cache to prevent memory leaks
 * Should be called when component unmounts or when matches change significantly
 */
export const clearCalculationCache = (): void => {
  calculationCache.clear();
};

/**
 * Gets current cache size for debugging
 */
export const getCacheSize = (): number => {
  return calculationCache.size;
};

/**
 * Memoized version of organizeMatchesIntoRounds with caching
 */
export const organizeMatchesIntoRounds = (matches: Match[]): Match[][] => {
  if (!matches || matches.length === 0) {
    return [];
  }

  // Create cache key based on match IDs and round numbers
  const cacheKey = matches
    .map(m => `${m.id}-${m.roundNumber}-${m.bracketSlot || 0}`)
    .sort()
    .join('|');

  // Check cache first
  if (calculationCache.has(cacheKey)) {
    return calculationCache.get(cacheKey);
  }

  // Filter out matches without round numbers and sort by round number
  const validMatches = matches
    .filter(match => match.roundNumber !== null && match.roundNumber !== undefined)
    .sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0));

  if (validMatches.length === 0) {
    const result: Match[][] = [];
    calculationCache.set(cacheKey, result);
    return result;
  }

  // Group matches by round number
  const roundsMap = new Map<number, Match[]>();
  
  validMatches.forEach(match => {
    const roundNum = match.roundNumber!;
    if (!roundsMap.has(roundNum)) {
      roundsMap.set(roundNum, []);
    }
    roundsMap.get(roundNum)!.push(match);
  });

  // Convert to array and sort each round by match number or bracket slot
  const rounds: Match[][] = [];
  const sortedRoundNumbers = Array.from(roundsMap.keys()).sort((a, b) => a - b);

  sortedRoundNumbers.forEach(roundNum => {
    const roundMatches = roundsMap.get(roundNum)!;
    // Sort matches within round by bracket slot or match number
    roundMatches.sort((a, b) => {
      const aSlot = a.bracketSlot || 0;
      const bSlot = b.bracketSlot || 0;
      if (aSlot !== bSlot) {
        return aSlot - bSlot;
      }
      // Fallback to match number if bracket slots are equal
      const aNum = typeof a.matchNumber === 'string' ? parseInt(a.matchNumber) : a.matchNumber;
      const bNum = typeof b.matchNumber === 'string' ? parseInt(b.matchNumber) : b.matchNumber;
      return aNum - bNum;
    });
    rounds.push(roundMatches);
  });

  // Cache the result
  calculationCache.set(cacheKey, rounds);
  
  // Limit cache size to prevent memory leaks
  if (calculationCache.size > 100) {
    const firstKey = calculationCache.keys().next().value;
    if (firstKey) {
      calculationCache.delete(firstKey);
    }
  }

  return rounds;
};

/**
 * Calculates positions for all matches in the bracket layout
 * Uses tournament bracket positioning algorithm with memoization
 */
export const calculateMatchPositions = (
  rounds: Match[][],
  dimensions: BracketDimensions
): MatchPosition[] => {
  if (!rounds || rounds.length === 0) {
    return [];
  }

  // Create cache key for position calculations
  const roundsKey = rounds.map(round => 
    round.map(match => match.id).join(',')
  ).join('|');
  const dimensionsKey = `${dimensions.roundWidth}-${dimensions.roundGap}-${dimensions.matchHeight}-${dimensions.matchVerticalGap}-${dimensions.containerHeight}`;
  const cacheKey = `positions-${roundsKey}-${dimensionsKey}`;

  // Check cache first
  if (calculationCache.has(cacheKey)) {
    return calculationCache.get(cacheKey);
  }

  const positions: MatchPosition[] = [];
  const { roundWidth, roundGap, matchHeight, matchVerticalGap } = dimensions;

  rounds.forEach((roundMatches, roundIndex) => {
    if (roundMatches.length === 0) return;

    // Calculate total height needed for this round
    const totalMatchHeight = roundMatches.length * matchHeight;
    const totalGapHeight = (roundMatches.length - 1) * matchVerticalGap;
    const totalRoundHeight = totalMatchHeight + totalGapHeight;

    // Center the round vertically in the container
    const roundStartY = (dimensions.containerHeight - totalRoundHeight) / 2;

    roundMatches.forEach((match, matchIndex) => {
      const x = roundIndex * (roundWidth + roundGap);
      const y = roundStartY + matchIndex * (matchHeight + matchVerticalGap);

      positions.push({
        matchId: match.id,
        x,
        y,
        width: roundWidth,
        height: matchHeight,
        roundIndex,
        matchIndex,
      });
    });
  });

  // Cache the result
  calculationCache.set(cacheKey, positions);
  
  // Limit cache size
  if (calculationCache.size > 100) {
    const firstKey = calculationCache.keys().next().value;
    if (firstKey) {
      calculationCache.delete(firstKey);
    }
  }

  return positions;
};

/**
 * Calculates responsive scaling to fit bracket within container
 * Ensures readability while maximizing use of available space with memoization
 */
export const calculateResponsiveScaling = (
  containerWidth: number,
  containerHeight: number,
  totalRounds: number,
  maxMatchesInRound: number
): { scaleFactor: number; scaledDimensions: BracketDimensions } => {
  // Create cache key for scaling calculations
  const cacheKey = `scaling-${containerWidth}-${containerHeight}-${totalRounds}-${maxMatchesInRound}`;
  
  // Check cache first
  if (calculationCache.has(cacheKey)) {
    return calculationCache.get(cacheKey);
  }

  const { MATCH_CARD, SPACING } = FIGMA_DESIGN;
  const { MIN_SCALE_FACTOR, MAX_SCALE_FACTOR, VIEWPORT_PADDING } = SCALING_CONSTANTS;

  // Calculate required dimensions at 1:1 scale
  const requiredWidth = totalRounds * MATCH_CARD.WIDTH + (totalRounds - 1) * SPACING.ROUND_GAP;
  const requiredHeight = maxMatchesInRound * MATCH_CARD.HEIGHT + (maxMatchesInRound - 1) * SPACING.MATCH_VERTICAL_GAP;

  // Account for viewport padding and round labels
  const roundLabelHeight = 40; // Space for round labels
  const availableWidth = Math.max(100, containerWidth - (VIEWPORT_PADDING * 2));
  const availableHeight = Math.max(100, containerHeight - (VIEWPORT_PADDING * 2) - roundLabelHeight);

  // Calculate scale factors needed for width and height
  const widthScale = availableWidth / requiredWidth;
  const heightScale = availableHeight / requiredHeight;

  // Use the more restrictive scale factor to ensure everything fits
  let scaleFactor = Math.min(widthScale, heightScale);

  // Ensure minimum readability by checking font size
  const minFontScale = SCALING_CONSTANTS.MIN_READABLE_FONT_SIZE / FIGMA_DESIGN.TYPOGRAPHY.TEAM_TEXT.FONT_SIZE;
  
  // If content is too large, prioritize fitting over ideal font size
  if (scaleFactor < minFontScale) {
    // Check if we can fit with minimum readable scale
    const minScaleWidth = requiredWidth * minFontScale;
    const minScaleHeight = requiredHeight * minFontScale;
    
    if (minScaleWidth <= availableWidth && minScaleHeight <= availableHeight) {
      scaleFactor = minFontScale;
    } else {
      // Content is too large even at minimum readable scale
      // Use the calculated scale but warn about readability
      scaleFactor = Math.max(scaleFactor, MIN_SCALE_FACTOR);
    }
  }

  // Clamp to absolute min/max scale factors
  scaleFactor = Math.max(MIN_SCALE_FACTOR, Math.min(MAX_SCALE_FACTOR, scaleFactor));

  // Calculate scaled dimensions
  const scaledDimensions: BracketDimensions = {
    containerWidth: availableWidth,
    containerHeight: availableHeight,
    roundWidth: MATCH_CARD.WIDTH * scaleFactor,
    roundGap: SPACING.ROUND_GAP * scaleFactor,
    matchHeight: MATCH_CARD.HEIGHT * scaleFactor,
    matchVerticalGap: SPACING.MATCH_VERTICAL_GAP * scaleFactor,
  };

  const result = {
    scaleFactor,
    scaledDimensions,
  };

  // Cache the result
  calculationCache.set(cacheKey, result);
  
  // Limit cache size
  if (calculationCache.size > 100) {
    const firstKey = calculationCache.keys().next().value;
    if (firstKey) {
      calculationCache.delete(firstKey);
    }
  }

  return result;
};

/**
 * Generates SVG path for connecting matches in bracket
 * Creates clean L-shaped connections between parent and child matches
 */
export const generateConnectionPath = (
  source1: MatchPosition,
  source2: MatchPosition,
  target: MatchPosition,
  roundGap: number
): SVGPathData => {
  // Calculate connection points on the right edge of source matches
  const source1Right = source1.x + source1.width;
  const source1CenterY = source1.y + source1.height / 2;
  
  const source2Right = source2.x + source2.width;
  const source2CenterY = source2.y + source2.height / 2;
  
  // Calculate connection point on the left edge of target match
  const targetLeft = target.x;
  const targetCenterY = target.y + target.height / 2;

  // Calculate the vertical midpoint between the two source matches
  const verticalMidY = (source1CenterY + source2CenterY) / 2;
  
  // Calculate the horizontal position for the vertical connector
  // This should be halfway between the source matches and the target match
  const horizontalMidX = source1Right + roundGap / 2;

  // Create the bracket connection path:
  // 1. From source1 to vertical line
  // 2. Vertical line connecting both sources
  // 3. From source2 to vertical line  
  // 4. From vertical line to target
  const pathCommands = [
    // Line from first source match to vertical connector
    `M ${source1Right} ${source1CenterY}`,
    `L ${horizontalMidX} ${source1CenterY}`,
    
    // Vertical line from first source to second source
    `L ${horizontalMidX} ${source2CenterY}`,
    
    // Line from vertical connector to second source match
    `L ${source2Right} ${source2CenterY}`,
    
    // Move to the midpoint on the vertical connector
    `M ${horizontalMidX} ${verticalMidY}`,
    
    // Line from vertical connector to target match
    `L ${targetLeft} ${targetCenterY}`,
  ];

  return {
    d: pathCommands.join(' '),
    stroke: FIGMA_DESIGN.COLORS.CONNECTION_LINE,
    strokeWidth: FIGMA_DESIGN.CONNECTION_LINES.STROKE_WIDTH,
    fill: 'none',
  };
};

/**
 * Determines the maximum number of matches in any round
 * Used for layout calculations
 */
export const getMaxMatchesInRound = (rounds: Match[][]): number => {
  if (!rounds || rounds.length === 0) {
    return 0;
  }
  return Math.max(...rounds.map(round => round.length));
};

/**
 * Calculates the total bracket dimensions needed
 * Returns minimum container size required
 */
export const calculateBracketDimensions = (rounds: Match[][]): BracketDimensions => {
  const { MATCH_CARD, SPACING } = FIGMA_DESIGN;
  
  if (!rounds || rounds.length === 0) {
    return {
      containerWidth: MATCH_CARD.WIDTH,
      containerHeight: MATCH_CARD.HEIGHT,
      roundWidth: MATCH_CARD.WIDTH,
      roundGap: SPACING.ROUND_GAP,
      matchHeight: MATCH_CARD.HEIGHT,
      matchVerticalGap: SPACING.MATCH_VERTICAL_GAP,
    };
  }

  const totalRounds = rounds.length;
  const maxMatchesInRound = getMaxMatchesInRound(rounds);

  const containerWidth = totalRounds * MATCH_CARD.WIDTH + (totalRounds - 1) * SPACING.ROUND_GAP;
  const containerHeight = maxMatchesInRound * MATCH_CARD.HEIGHT + (maxMatchesInRound - 1) * SPACING.MATCH_VERTICAL_GAP;

  return {
    containerWidth,
    containerHeight,
    roundWidth: MATCH_CARD.WIDTH,
    roundGap: SPACING.ROUND_GAP,
    matchHeight: MATCH_CARD.HEIGHT,
    matchVerticalGap: SPACING.MATCH_VERTICAL_GAP,
  };
};

/**
 * Ensures bracket content fits within viewport without scrolling
 * Calculates optimal scale and positioning to maximize visibility
 */
export const ensureViewportFit = (
  bracketDimensions: { width: number; height: number },
  containerDimensions: { width: number; height: number },
  minScale: number = SCALING_CONSTANTS.MIN_SCALE_FACTOR
): { scaleFactor: number; offsetX: number; offsetY: number; fitsWithoutScaling: boolean } => {
  const { VIEWPORT_PADDING } = SCALING_CONSTANTS;
  
  // Account for padding and UI elements
  const roundLabelHeight = 40;
  const availableWidth = containerDimensions.width - (VIEWPORT_PADDING * 2);
  const availableHeight = containerDimensions.height - (VIEWPORT_PADDING * 2) - roundLabelHeight;

  // Check if content fits without scaling
  const fitsWithoutScaling = bracketDimensions.width <= availableWidth && 
                            bracketDimensions.height <= availableHeight;

  let scaleFactor = 1;
  
  if (!fitsWithoutScaling) {
    // Calculate required scale factors
    const widthScale = availableWidth / bracketDimensions.width;
    const heightScale = availableHeight / bracketDimensions.height;
    
    // Use the more restrictive scale factor
    scaleFactor = Math.min(widthScale, heightScale);
    
    // Ensure minimum scale for readability
    scaleFactor = Math.max(scaleFactor, minScale);
  }

  // Calculate final dimensions after scaling
  const finalWidth = bracketDimensions.width * scaleFactor;
  const finalHeight = bracketDimensions.height * scaleFactor;

  // Center the content
  const offsetX = Math.max(VIEWPORT_PADDING, (containerDimensions.width - finalWidth) / 2);
  const offsetY = Math.max(VIEWPORT_PADDING + roundLabelHeight, 
                          (containerDimensions.height - finalHeight - roundLabelHeight) / 2 + roundLabelHeight);

  return {
    scaleFactor,
    offsetX,
    offsetY,
    fitsWithoutScaling,
  };
};

/**
 * Validates that scaled content maintains minimum readability standards
 * Returns adjusted scale factor if needed
 */
export const validateReadability = (
  scaleFactor: number,
  originalFontSize: number = FIGMA_DESIGN.TYPOGRAPHY.TEAM_TEXT.FONT_SIZE
): { adjustedScale: number; isReadable: boolean } => {
  const { MIN_READABLE_FONT_SIZE } = SCALING_CONSTANTS;
  const effectiveFontSize = originalFontSize * scaleFactor;
  
  const isReadable = effectiveFontSize >= MIN_READABLE_FONT_SIZE;
  const minRequiredScale = MIN_READABLE_FONT_SIZE / originalFontSize;
  
  const adjustedScale = isReadable ? scaleFactor : Math.max(scaleFactor, minRequiredScale);
  
  return {
    adjustedScale,
    isReadable,
  };
};

/**
 * Determines optimal scaling strategy based on screen size and content
 * Provides different approaches for mobile, tablet, and desktop
 */
export const getOptimalScalingStrategy = (
  containerWidth: number,
  containerHeight: number,
  contentWidth: number,
  contentHeight: number
): {
  strategy: 'fit-width' | 'fit-height' | 'fit-both' | 'no-scaling';
  scaleFactor: number;
  reasoning: string;
} => {
  const { MOBILE_BREAKPOINT, TABLET_BREAKPOINT, VIEWPORT_PADDING } = SCALING_CONSTANTS;
  
  const availableWidth = containerWidth - (VIEWPORT_PADDING * 2);
  const availableHeight = containerHeight - (VIEWPORT_PADDING * 2) - 40; // Account for round labels

  // Check if content fits without scaling
  if (contentWidth <= availableWidth && contentHeight <= availableHeight) {
    return {
      strategy: 'no-scaling',
      scaleFactor: 1,
      reasoning: 'Content fits naturally within viewport',
    };
  }

  const widthScale = availableWidth / contentWidth;
  const heightScale = availableHeight / contentHeight;

  // Mobile strategy: prioritize fitting width, allow some vertical scrolling if necessary
  if (containerWidth <= MOBILE_BREAKPOINT) {
    if (widthScale < heightScale) {
      return {
        strategy: 'fit-width',
        scaleFactor: Math.max(widthScale, SCALING_CONSTANTS.MIN_SCALE_FACTOR),
        reasoning: 'Mobile: prioritizing width fit for better touch interaction',
      };
    }
  }

  // Tablet strategy: balance between width and height
  if (containerWidth <= TABLET_BREAKPOINT) {
    const balancedScale = Math.min(widthScale, heightScale);
    return {
      strategy: 'fit-both',
      scaleFactor: Math.max(balancedScale, SCALING_CONSTANTS.MIN_SCALE_FACTOR),
      reasoning: 'Tablet: balancing width and height constraints',
    };
  }

  // Desktop strategy: fit everything within viewport
  const restrictiveScale = Math.min(widthScale, heightScale);
  return {
    strategy: 'fit-both',
    scaleFactor: Math.max(restrictiveScale, SCALING_CONSTANTS.MIN_SCALE_FACTOR),
    reasoning: 'Desktop: ensuring complete viewport fit without scrolling',
  };
};

/**
 * Calculates minimum dimensions that maintain usability
 * Ensures match cards don't become too small to interact with
 */
export const enforceMinimumUsability = (
  scaledWidth: number,
  scaledHeight: number,
  scaleFactor: number
): { adjustedScale: number; meetsMinimum: boolean } => {
  const { MIN_MATCH_WIDTH, MIN_MATCH_HEIGHT } = SCALING_CONSTANTS;
  
  const meetsWidthMinimum = scaledWidth >= MIN_MATCH_WIDTH;
  const meetsHeightMinimum = scaledHeight >= MIN_MATCH_HEIGHT;
  const meetsMinimum = meetsWidthMinimum && meetsHeightMinimum;

  if (meetsMinimum) {
    return { adjustedScale: scaleFactor, meetsMinimum: true };
  }

  // Calculate required scale to meet minimum dimensions
  const widthScaleNeeded = MIN_MATCH_WIDTH / FIGMA_DESIGN.MATCH_CARD.WIDTH;
  const heightScaleNeeded = MIN_MATCH_HEIGHT / FIGMA_DESIGN.MATCH_CARD.HEIGHT;
  const minRequiredScale = Math.max(widthScaleNeeded, heightScaleNeeded);

  return {
    adjustedScale: Math.max(scaleFactor, minRequiredScale),
    meetsMinimum: false,
  };
};

/**
 * Handles extreme overflow scenarios where content cannot fit even at minimum scale
 * Provides fallback strategies for very constrained viewports
 */
export const handleExtremeOverflow = (
  contentDimensions: { width: number; height: number },
  containerDimensions: { width: number; height: number },
  minScale: number
): {
  strategy: 'allow-horizontal-scroll' | 'allow-vertical-scroll' | 'allow-both-scroll' | 'fit-anyway';
  scaleFactor: number;
  allowOverflow: { horizontal: boolean; vertical: boolean };
} => {
  const { VIEWPORT_PADDING } = SCALING_CONSTANTS;
  
  const availableWidth = containerDimensions.width - (VIEWPORT_PADDING * 2);
  const availableHeight = containerDimensions.height - (VIEWPORT_PADDING * 2) - 40;

  const minScaledWidth = contentDimensions.width * minScale;
  const minScaledHeight = contentDimensions.height * minScale;

  const horizontalOverflow = minScaledWidth > availableWidth;
  const verticalOverflow = minScaledHeight > availableHeight;

  // If content fits at minimum scale, no overflow needed
  if (!horizontalOverflow && !verticalOverflow) {
    return {
      strategy: 'fit-anyway',
      scaleFactor: minScale,
      allowOverflow: { horizontal: false, vertical: false },
    };
  }

  // Prefer horizontal scrolling over vertical for better UX
  if (horizontalOverflow && !verticalOverflow) {
    return {
      strategy: 'allow-horizontal-scroll',
      scaleFactor: minScale,
      allowOverflow: { horizontal: true, vertical: false },
    };
  }

  if (!horizontalOverflow && verticalOverflow) {
    return {
      strategy: 'allow-vertical-scroll',
      scaleFactor: minScale,
      allowOverflow: { horizontal: false, vertical: true },
    };
  }

  // Both dimensions overflow - allow both scrolling
  return {
    strategy: 'allow-both-scroll',
    scaleFactor: minScale,
    allowOverflow: { horizontal: true, vertical: true },
  };
};