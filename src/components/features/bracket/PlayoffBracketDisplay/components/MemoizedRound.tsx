import React, { memo } from 'react';
import { Match } from '@/types/match.types';
import { MatchPosition, ScaledDimensions } from '../types/bracket.types';
import { MatchCard, RoundLabel, ErrorBoundary } from './';
import { FIGMA_DESIGN } from '../utils/constants';
import { useMatchDimensions, usePerformanceMonitor } from '../utils/performanceOptimizations';

interface MemoizedRoundProps {
  roundMatches: Match[];
  roundIndex: number;
  totalRounds: number;
  isFinalRound: boolean;
  roundX: number;
  positions: MatchPosition[];
  scaledDimensions: ScaledDimensions;
}

const MemoizedRound: React.FC<MemoizedRoundProps> = memo(({
  roundMatches,
  roundIndex,
  totalRounds,
  isFinalRound,
  roundX,
  positions,
  scaledDimensions,
}) => {
  // Performance monitoring in development
  usePerformanceMonitor(`MemoizedRound-${roundIndex}`);
  
  // Memoized dimensions to prevent inline object creation
  const matchDimensions = useMatchDimensions(scaledDimensions);
  return (
    <ErrorBoundary
      key={`round-${roundIndex}`}
      fallback={
        <div
          className="absolute flex items-center justify-center"
          style={{
            left: roundX,
            top: 0,
            width: scaledDimensions.matchWidth,
            height: scaledDimensions.matchHeight,
            backgroundColor: FIGMA_DESIGN.COLORS.CARD_BACKGROUND,
            border: `2px solid ${FIGMA_DESIGN.COLORS.GRAY_TEXT}`,
            borderRadius: FIGMA_DESIGN.MATCH_CARD.BORDER_RADIUS,
          }}
        >
          <span style={{ color: FIGMA_DESIGN.COLORS.GRAY_TEXT, fontSize: '12px' }}>
            Round {roundIndex + 1} Error
          </span>
        </div>
      }
    >
      <div
        className="absolute"
        style={{
          left: roundX,
          top: 0,
          width: scaledDimensions.matchWidth,
        }}
      >
        {/* Round label */}
        <ErrorBoundary
          fallback={
            <div className="mb-4 text-center">
              <span style={{ 
                color: FIGMA_DESIGN.COLORS.GRAY_TEXT,
                fontSize: `${FIGMA_DESIGN.TYPOGRAPHY.ROUND_LABEL.FONT_SIZE}px`,
                fontFamily: FIGMA_DESIGN.TYPOGRAPHY.ROUND_LABEL.FONT_FAMILY,
              }}>
                Round {roundIndex + 1}
              </span>
            </div>
          }
        >
          <RoundLabel
            roundIndex={roundIndex}
            totalRounds={totalRounds}
            isFinal={isFinalRound}
            className="mb-4"
          />
        </ErrorBoundary>

        {/* Matches in this round */}
        {roundMatches.map((match, matchIndex) => {
          try {
            const matchPosition = positions.find(pos => pos.matchId === match.id);
            if (!matchPosition) {
              console.warn(`No position found for match ${match.id}`);
              return null;
            }

            // Use the calculated Y position from MatchPosition instead of recalculating
            const matchY = matchPosition.y;

            return (
              <ErrorBoundary
                key={match.id}
                fallback={
                  <div
                    className="absolute flex items-center justify-center"
                    style={{
                      top: matchY,
                      left: 0,
                      width: scaledDimensions.matchWidth,
                      height: scaledDimensions.matchHeight,
                      backgroundColor: FIGMA_DESIGN.COLORS.CARD_BACKGROUND,
                      border: `2px solid #EF4444`,
                      borderRadius: FIGMA_DESIGN.MATCH_CARD.BORDER_RADIUS,
                    }}
                  >
                    <span style={{ color: '#EF4444', fontSize: '12px' }}>
                      Match Error
                    </span>
                  </div>
                }
              >
                <div
                  className="absolute"
                  style={{
                    top: matchY,
                    left: 0,
                  }}
                >
                  <MatchCard
                    match={match}
                    isFinal={isFinalRound}
                    dimensions={matchDimensions}
                  />
                </div>
              </ErrorBoundary>
            );
          } catch (matchError) {
            console.warn(`Error rendering match ${match.id}:`, matchError);
            return null;
          }
        })}
      </div>
    </ErrorBoundary>
  );
});

MemoizedRound.displayName = 'MemoizedRound';

export default MemoizedRound;