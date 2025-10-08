import React, { memo } from 'react';
import { TeamDisplayProps } from '../types/bracket.types';
import { FIGMA_DESIGN } from '../utils/constants';
import '../styles/bracket.css';

const TeamDisplay: React.FC<TeamDisplayProps> = memo(({
  teams,
  isWinner,
  isTBD,
  isFinal,
  alliance,
}) => {
  // Format team display text - join multiple teams with comma
  const formatTeamText = (teamList: string[]): string => {
    if (teamList.length === 0) return 'TBD';
    return teamList.join(', ');
  };

  const teamText = formatTeamText(teams);
  
  // Determine text color based on match type and TBD state
  const getTextColor = (): string => {
    if (isTBD) {
      return FIGMA_DESIGN.COLORS.GRAY_TEXT;
    }
    return isFinal ? FIGMA_DESIGN.COLORS.FINAL_TEXT : FIGMA_DESIGN.COLORS.REGULAR_TEXT;
  };

  // Determine font weight based on winner status
  const getFontWeight = (): number => {
    return isWinner ? 600 : FIGMA_DESIGN.TYPOGRAPHY.TEAM_TEXT.FONT_WEIGHT;
  };

  // Generate CSS classes for styling
  const getClassNames = (): string => {
    const baseClass = 'team-area';
    const classes = [baseClass];
    
    // Add alliance-specific class
    classes.push(`${baseClass}--${alliance.toLowerCase()}`);
    
    // Add winner class if applicable
    if (isWinner) {
      classes.push(`${baseClass}--winner`);
    }
    
    // Add TBD class if applicable
    if (isTBD) {
      classes.push(`${baseClass}--tbd`);
    }
    
    return classes.join(' ');
  };

  // Generate ARIA label for accessibility
  const getAriaLabel = (): string => {
    const allianceName = alliance.charAt(0) + alliance.slice(1).toLowerCase();
    const statusText = isWinner ? ' (Winner)' : '';
    const tbdText = isTBD ? ' (To Be Determined)' : '';
    return `${allianceName} alliance: ${teamText}${statusText}${tbdText}`;
  };

  return (
    <div
      className={getClassNames()}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 8px',
        fontFamily: FIGMA_DESIGN.TYPOGRAPHY.TEAM_TEXT.FONT_FAMILY,
        fontSize: `${FIGMA_DESIGN.TYPOGRAPHY.TEAM_TEXT.FONT_SIZE}px`,
        fontWeight: getFontWeight(),
        lineHeight: FIGMA_DESIGN.TYPOGRAPHY.TEAM_TEXT.LINE_HEIGHT,
        textAlign: 'center' as const,
        color: getTextColor(),
        fontStyle: isTBD ? 'italic' : 'normal',
        wordBreak: 'break-word' as const,
        hyphens: 'auto' as const,
        // Add border for red alliance (top team in match card)
        ...(alliance === 'RED' && {
          borderBottom: `1px solid ${FIGMA_DESIGN.COLORS.DIVIDER}`,
        }),
      }}
      aria-label={getAriaLabel()}
      role="group"
    >
      <span 
        className="team-text"
        title={teamText} // Tooltip for truncated text
        style={{
          display: 'block',
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {teamText}
      </span>
    </div>
  );
});

TeamDisplay.displayName = 'TeamDisplay';

export default TeamDisplay;