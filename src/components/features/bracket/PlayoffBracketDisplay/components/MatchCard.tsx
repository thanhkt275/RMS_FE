import React, { memo } from 'react';
import { MatchCardProps } from '../types/bracket.types';
import { FIGMA_DESIGN } from '../utils/constants';
import { extractTeamInformation, detectWinner, isMatchTBD } from '../utils/matchHelpers';
import { validateMatch, createSafeMatchData } from '../utils/validation';
import TeamDisplay from './TeamDisplay';
import '../styles/bracket.css';

const MatchCard: React.FC<MatchCardProps> = memo(({
  match,
  isFinal,
  dimensions,
  sourceMatches,
}) => {
  // Validate match data and create safe fallbacks
  const validation = validateMatch(match);
  const safeMatchData = createSafeMatchData(match);
  
  // Use safe match data if original is invalid
  const safeMatch = safeMatchData.isValid ? match : safeMatchData.match;
  const isDataCorrupted = !safeMatchData.isValid;

  // Extract team information and match state with error handling
  let teams, winners, isTBDMatch;
  
  try {
    teams = safeMatchData.isValid ? extractTeamInformation(match) : safeMatchData.displayTeams;
    winners = detectWinner(safeMatch);
    isTBDMatch = {
      red: isMatchTBD(teams.red),
      blue: isMatchTBD(teams.blue),
    };
  } catch (error) {
    console.warn('Error processing match data:', error);
    // Fallback to safe defaults
    teams = { red: ['TBD'], blue: ['TBD'] };
    winners = { red: false, blue: false };
    isTBDMatch = { red: true, blue: true };
  }

  // Determine styling based on match type
  const borderColor = isFinal ? FIGMA_DESIGN.COLORS.FINAL_BORDER : FIGMA_DESIGN.COLORS.REGULAR_BORDER;
  const borderWidth = isFinal ? FIGMA_DESIGN.COLORS.FINAL_BORDER_WIDTH : FIGMA_DESIGN.COLORS.REGULAR_BORDER_WIDTH;
  
  // Add visual indicator for corrupted data
  const actualBorderColor = isDataCorrupted ? '#F59E0B' : borderColor;
  const actualBorderWidth = isDataCorrupted ? Math.max(borderWidth, 2) : borderWidth;

  // Format team display text for ARIA label
  const formatTeamText = (teamList: string[]): string => {
    if (!teamList || teamList.length === 0) return 'TBD';
    return teamList.join(', ');
  };

  const redTeamText = formatTeamText(teams.red);
  const blueTeamText = formatTeamText(teams.blue);
  
  // Create accessible match description
  const matchDescription = isDataCorrupted 
    ? `Match ${safeMatch.matchNumber} (data issues): ${redTeamText} vs ${blueTeamText}`
    : `Match ${safeMatch.matchNumber}: ${redTeamText} vs ${blueTeamText}`;

  return (
    <div
      className={`match-card ${isFinal ? 'match-card--final' : ''} ${isDataCorrupted ? 'match-card--corrupted' : ''}`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        backgroundColor: FIGMA_DESIGN.COLORS.CARD_BACKGROUND,
        border: `${actualBorderWidth}px solid ${actualBorderColor}`,
        borderRadius: FIGMA_DESIGN.MATCH_CARD.BORDER_RADIUS,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
      role="group"
      aria-label={matchDescription}
      title={isDataCorrupted ? 'This match has data issues and is showing fallback information' : undefined}
    >
      {/* Data corruption indicator */}
      {isDataCorrupted && (
        <div
          className="absolute top-1 right-1 w-3 h-3 rounded-full"
          style={{ backgroundColor: '#F59E0B' }}
          title="Data issues detected"
          aria-label="Warning: Match data may be incomplete or corrupted"
        >
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="white" 
            className="w-full h-full p-0.5"
          >
            <path d="M12 2L2 22h20L12 2zm0 3.5L19.5 20h-15L12 5.5zM11 14v2h2v-2h-2zm0-6v4h2V8h-2z"/>
          </svg>
        </div>
      )}

      {/* Red Alliance Team Display */}
      <TeamDisplay
        teams={teams.red}
        isWinner={winners.red}
        isTBD={isTBDMatch.red}
        isFinal={isFinal}
        alliance="RED"
      />

      {/* Blue Alliance Team Display */}
      <TeamDisplay
        teams={teams.blue}
        isWinner={winners.blue}
        isTBD={isTBDMatch.blue}
        isFinal={isFinal}
        alliance="BLUE"
      />

      {/* Development mode: Show validation warnings */}
      {process.env.NODE_ENV === 'development' && !validation.isValid && (
        <div
          className="absolute bottom-0 left-0 right-0 text-xs p-1 text-white"
          style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.9)',
            fontSize: '8px',
            lineHeight: '1.2',
          }}
        >
          Validation errors: {validation.errors.slice(0, 2).join(', ')}
          {validation.errors.length > 2 && '...'}
        </div>
      )}
    </div>
  );
});

MatchCard.displayName = 'MatchCard';

export default MatchCard;