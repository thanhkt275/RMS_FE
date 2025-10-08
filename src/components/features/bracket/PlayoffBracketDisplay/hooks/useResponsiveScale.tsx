import { useMemo } from 'react';
import { UseResponsiveScaleReturn, ScalingParams, ScaledDimensions } from '../types/bracket.types';
import { 
  calculateResponsiveScaling, 
  ensureViewportFit, 
  validateReadability,
  getOptimalScalingStrategy,
  enforceMinimumUsability
} from '../utils/bracketCalculations';
import { FIGMA_DESIGN, SCALING_CONSTANTS } from '../utils/constants';

const useResponsiveScale = (
  scalingParams: ScalingParams
): UseResponsiveScaleReturn => {
  // Memoize base bracket dimensions calculation
  const baseBracketDimensions = useMemo(() => {
    const { totalRounds, maxMatchesInRound } = scalingParams;
    
    if (totalRounds <= 0 || maxMatchesInRound <= 0) {
      return { width: 0, height: 0 };
    }

    const baseBracketWidth = totalRounds * FIGMA_DESIGN.MATCH_CARD.WIDTH + 
                            (totalRounds - 1) * FIGMA_DESIGN.SPACING.ROUND_GAP;
    const baseBracketHeight = maxMatchesInRound * FIGMA_DESIGN.MATCH_CARD.HEIGHT + 
                             (maxMatchesInRound - 1) * FIGMA_DESIGN.SPACING.MATCH_VERTICAL_GAP;

    return { width: baseBracketWidth, height: baseBracketHeight };
  }, [scalingParams.totalRounds, scalingParams.maxMatchesInRound]);

  const result = useMemo(() => {
    const { containerWidth, containerHeight, totalRounds, maxMatchesInRound } = scalingParams;

    // Handle edge cases
    if (totalRounds <= 0 || maxMatchesInRound <= 0) {
      return {
        scaledDimensions: {
          matchWidth: FIGMA_DESIGN.MATCH_CARD.WIDTH,
          matchHeight: FIGMA_DESIGN.MATCH_CARD.HEIGHT,
          roundGap: FIGMA_DESIGN.SPACING.ROUND_GAP,
          verticalGap: FIGMA_DESIGN.SPACING.MATCH_VERTICAL_GAP,
          scaleFactor: 1,
        },
        scaleFactor: 1,
        isScaled: false,
      };
    }

    // Handle invalid container dimensions
    if (containerWidth <= 0 || containerHeight <= 0) {
      return {
        scaledDimensions: {
          matchWidth: FIGMA_DESIGN.MATCH_CARD.WIDTH,
          matchHeight: FIGMA_DESIGN.MATCH_CARD.HEIGHT,
          roundGap: FIGMA_DESIGN.SPACING.ROUND_GAP,
          verticalGap: FIGMA_DESIGN.SPACING.MATCH_VERTICAL_GAP,
          scaleFactor: 1,
        },
        scaleFactor: 1,
        isScaled: false,
      };
    }

    // Use pre-calculated base bracket dimensions
    const { width: baseBracketWidth, height: baseBracketHeight } = baseBracketDimensions;

    // Get optimal scaling strategy based on screen size and content
    const scalingStrategy = getOptimalScalingStrategy(
      containerWidth,
      containerHeight,
      baseBracketWidth,
      baseBracketHeight
    );

    // Validate readability at calculated scale
    const readabilityCheck = validateReadability(scalingStrategy.scaleFactor);

    // Ensure minimum usability (match cards not too small)
    const usabilityCheck = enforceMinimumUsability(
      FIGMA_DESIGN.MATCH_CARD.WIDTH * readabilityCheck.adjustedScale,
      FIGMA_DESIGN.MATCH_CARD.HEIGHT * readabilityCheck.adjustedScale,
      readabilityCheck.adjustedScale
    );

    // Use the final adjusted scale factor
    const finalScaleFactor = usabilityCheck.adjustedScale;

    // Calculate responsive scaling with validated scale factor
    const { scaledDimensions: bracketDimensions } = calculateResponsiveScaling(
      containerWidth,
      containerHeight,
      totalRounds,
      maxMatchesInRound
    );

    // Override with our calculated scale factor for better viewport fitting
    const scaledDimensions: ScaledDimensions = {
      matchWidth: FIGMA_DESIGN.MATCH_CARD.WIDTH * finalScaleFactor,
      matchHeight: FIGMA_DESIGN.MATCH_CARD.HEIGHT * finalScaleFactor,
      roundGap: FIGMA_DESIGN.SPACING.ROUND_GAP * finalScaleFactor,
      verticalGap: FIGMA_DESIGN.SPACING.MATCH_VERTICAL_GAP * finalScaleFactor,
      scaleFactor: finalScaleFactor,
    };

    // Determine if scaling was applied
    const isScaled = Math.abs(finalScaleFactor - 1.0) > 0.01;

    return {
      scaledDimensions,
      scaleFactor: finalScaleFactor,
      isScaled,
    };
  }, [scalingParams.containerWidth, scalingParams.containerHeight, baseBracketDimensions]);

  return result;
};

/**
 * Ensures that scaled dimensions maintain minimum readability requirements
 * Adjusts scale factor if text would become too small to read
 */
const ensureMinimumReadability = (dimensions: ScaledDimensions): ScaledDimensions => {
  const { MIN_READABLE_FONT_SIZE } = SCALING_CONSTANTS;
  const { TEAM_TEXT } = FIGMA_DESIGN.TYPOGRAPHY;

  // Calculate the effective font size after scaling
  const effectiveFontSize = TEAM_TEXT.FONT_SIZE * dimensions.scaleFactor;

  // If font size would be too small, adjust the scale factor
  if (effectiveFontSize < MIN_READABLE_FONT_SIZE) {
    const minScaleFactor = MIN_READABLE_FONT_SIZE / TEAM_TEXT.FONT_SIZE;
    
    // Recalculate dimensions with minimum scale factor
    const adjustedScaleFactor = Math.max(minScaleFactor, SCALING_CONSTANTS.MIN_SCALE_FACTOR);
    
    return {
      matchWidth: FIGMA_DESIGN.MATCH_CARD.WIDTH * adjustedScaleFactor,
      matchHeight: FIGMA_DESIGN.MATCH_CARD.HEIGHT * adjustedScaleFactor,
      roundGap: FIGMA_DESIGN.SPACING.ROUND_GAP * adjustedScaleFactor,
      verticalGap: FIGMA_DESIGN.SPACING.MATCH_VERTICAL_GAP * adjustedScaleFactor,
      scaleFactor: adjustedScaleFactor,
    };
  }

  return dimensions;
};

/**
 * Calculates the optimal scale factor for fitting content within viewport
 * Takes into account both width and height constraints
 */
export const calculateOptimalScale = (
  requiredWidth: number,
  requiredHeight: number,
  availableWidth: number,
  availableHeight: number
): number => {
  const { MIN_SCALE_FACTOR, MAX_SCALE_FACTOR, VIEWPORT_PADDING } = SCALING_CONSTANTS;

  // Account for viewport padding
  const usableWidth = availableWidth - (VIEWPORT_PADDING * 2);
  const usableHeight = availableHeight - (VIEWPORT_PADDING * 2);

  // Calculate scale factors for both dimensions
  const widthScale = usableWidth / requiredWidth;
  const heightScale = usableHeight / requiredHeight;

  // Use the more restrictive scale factor
  let optimalScale = Math.min(widthScale, heightScale);

  // Clamp to acceptable range
  optimalScale = Math.max(MIN_SCALE_FACTOR, Math.min(MAX_SCALE_FACTOR, optimalScale));

  return optimalScale;
};

/**
 * Determines if content needs scaling based on container constraints
 * Returns true if content would overflow without scaling
 */
export const needsScaling = (
  contentWidth: number,
  contentHeight: number,
  containerWidth: number,
  containerHeight: number
): boolean => {
  const { VIEWPORT_PADDING } = SCALING_CONSTANTS;

  const availableWidth = containerWidth - (VIEWPORT_PADDING * 2);
  const availableHeight = containerHeight - (VIEWPORT_PADDING * 2);

  return contentWidth > availableWidth || contentHeight > availableHeight;
};

/**
 * Calculates the maximum scale factor that maintains readability
 * Ensures text doesn't become too large or too small
 */
export const getMaxReadableScale = (): number => {
  const { MAX_SCALE_FACTOR } = SCALING_CONSTANTS;
  const { TEAM_TEXT } = FIGMA_DESIGN.TYPOGRAPHY;

  // Prevent text from becoming too large (arbitrary upper limit)
  const maxFontSize = 24; // Maximum reasonable font size for team names
  const maxScaleForText = maxFontSize / TEAM_TEXT.FONT_SIZE;

  return Math.min(MAX_SCALE_FACTOR, maxScaleForText);
};

export default useResponsiveScale;