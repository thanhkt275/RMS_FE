import React, { memo } from 'react';
import { RoundLabelProps } from '../types/bracket.types';
import { FIGMA_DESIGN, ROUND_LABELS } from '../utils/constants';

const RoundLabel: React.FC<RoundLabelProps> = memo(({
  roundIndex,
  totalRounds,
  isFinal,
  className,
}) => {
  // Generate appropriate round label based on position and tournament structure
  const generateRoundLabel = (): string => {
    if (isFinal) {
      return ROUND_LABELS.FINAL;
    }
    
    // Calculate rounds from the end to determine special names
    const roundsFromEnd = totalRounds - roundIndex;
    
    switch (roundsFromEnd) {
      case 2:
        return ROUND_LABELS.SEMIFINAL;
      case 3:
        return ROUND_LABELS.QUARTERFINAL;
      default:
        // For earlier rounds, use "Round X" format
        return `${ROUND_LABELS.ROUND_PREFIX} ${roundIndex + 1}`;
    }
  };

  const roundLabel = generateRoundLabel();

  return (
    <div 
      className={`round-label ${className || ''}`}
      style={{
        fontFamily: FIGMA_DESIGN.TYPOGRAPHY.ROUND_LABEL.FONT_FAMILY,
        fontSize: `${FIGMA_DESIGN.TYPOGRAPHY.ROUND_LABEL.FONT_SIZE}px`,
        fontWeight: FIGMA_DESIGN.TYPOGRAPHY.ROUND_LABEL.FONT_WEIGHT,
        lineHeight: FIGMA_DESIGN.TYPOGRAPHY.ROUND_LABEL.LINE_HEIGHT,
        color: FIGMA_DESIGN.COLORS.GRAY_TEXT,
        marginBottom: `${FIGMA_DESIGN.SPACING.ROUND_LABEL_MARGIN}px`,
        textAlign: 'center',
        userSelect: 'none',
      }}
      role="heading"
      aria-level={3}
      aria-label={`Tournament ${roundLabel}`}
    >
      {roundLabel}
    </div>
  );
});

RoundLabel.displayName = 'RoundLabel';

export default RoundLabel;