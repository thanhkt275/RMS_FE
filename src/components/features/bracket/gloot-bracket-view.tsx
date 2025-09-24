"use client";

import React, { useMemo } from 'react';
import { SingleEliminationBracket, DoubleEliminationBracket, SVGViewer, createTheme } from '@g-loot/react-tournament-brackets';
import type { StageBracketResponse } from '@/types/match.types';
import { toGlootMatches } from '@/lib/bracket/gloot-transform';
import { getBracketDisplayConfig, analyzeBracket, validateBracketConsistency } from '@/lib/bracket/bracket-utils';
import { useBracketViewport as useResponsiveBracketViewport, useAdaptiveBracketTheme } from '@/lib/bracket/bracket-hooks';
import { GlootMatchCard } from './gloot-match-card';
import type { Match as GlootMatch } from '@g-loot/react-tournament-brackets';

interface GlootBracketViewProps {
  bracket: StageBracketResponse;
}

const svgBackground = '#f1f5f9';

function shouldUseCenterFinalLayout(bracket: StageBracketResponse): boolean {
  // For elimination brackets, estimate teams from first round matches
  if (bracket.structure.type === 'elimination') {
    const firstRoundMatches = bracket.structure.rounds[0]?.matches.length || 0;
    const estimatedTeams = firstRoundMatches * bracket.teamsPerAlliance * 2;
    console.log('Center-final check:', { firstRoundMatches, teamsPerAlliance: bracket.teamsPerAlliance, estimatedTeams });
    return estimatedTeams >= 16; // Use >= instead of > to trigger at exactly 16 teams
  }
  
  // For other bracket types, count actual teams with data
  const matchesWithTeams = bracket.matches.filter(m => 
    m.alliances?.some(a => a.teamAlliances.length > 0)
  );
  const estimatedTeams = matchesWithTeams.length * bracket.teamsPerAlliance * 2;
  
  return estimatedTeams >= 16;
}

// Custom center-final bracket component
function CenterFinalBracket({ matches, bracket, viewport, bracketOptions }: {
  matches: any[];
  bracket: StageBracketResponse;
  viewport: any;
  bracketOptions: any;
}) {
  const { structure } = bracket;
  
  if (structure.type !== 'elimination') return null;
  
  // Group matches by round
  const roundMap = new Map<string, number>();
  structure.rounds.forEach((round, index) => {
    round.matches.forEach(matchId => {
      roundMap.set(matchId, index);
    });
  });
  
  const matchesByRound = new Map<number, any[]>();
  matches.forEach(match => {
    const roundIndex = roundMap.get(match.id) ?? 0;
    if (!matchesByRound.has(roundIndex)) {
      matchesByRound.set(roundIndex, []);
    }
    matchesByRound.get(roundIndex)!.push(match);
  });
  
  const totalRounds = structure.rounds.length;
  const finalRoundIndex = totalRounds - 1;
  
  // Determine layout parameters
  const containerWidth = viewport.width - 48;
  const matchCardWidth = 280;
  const matchCardHeight = 100;
  const verticalSpacing = 20;
  const roundSpacing = Math.max(60, (containerWidth / 2 - matchCardWidth) / Math.max(totalRounds - 1, 1));
  
  // Split matches into left and right sides for the first round
  const firstRoundMatches = matchesByRound.get(0) || [];
  const leftSideCount = Math.ceil(firstRoundMatches.length / 2);
  const leftSideMatches = firstRoundMatches.slice(0, leftSideCount);
  const rightSideMatches = firstRoundMatches.slice(leftSideCount);
  
  // Create match positioning data
  const matchPositions = new Map<string, { x: number; y: number; side: 'left' | 'right' | 'center' }>();
  
  // Calculate maximum matches in any round for vertical centering
  const maxMatchesInRound = Math.max(...Array.from(matchesByRound.values()).map(matches => matches.length));
  const totalHeight = Math.max(500, maxMatchesInRound * (matchCardHeight + verticalSpacing));
  
  // Position matches for each round
  Array.from(matchesByRound.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([roundIndex, roundMatches]) => {
      roundMatches.forEach((match, matchIndex) => {
        let x: number;
        let side: 'left' | 'right' | 'center';
        
        if (roundIndex === finalRoundIndex) {
          // Final match - center
          x = containerWidth / 2 - matchCardWidth / 2;
          side = 'center';
        } else if (roundIndex === 0) {
          // First round - split evenly
          if (matchIndex < leftSideCount) {
            x = roundIndex * roundSpacing;
            side = 'left';
          } else {
            x = containerWidth - (roundIndex + 1) * roundSpacing - matchCardWidth;
            side = 'right';
          }
        } else {
          // Intermediate rounds - determine side based on source matches
          const sourceMatches = getSourceMatchIds(match, matches);
          const leftSources = sourceMatches.filter(id => {
            const pos = matchPositions.get(id);
            return pos?.side === 'left';
          }).length;
          const rightSources = sourceMatches.filter(id => {
            const pos = matchPositions.get(id);
            return pos?.side === 'right';
          }).length;
          
          if (leftSources > rightSources || (leftSources === rightSources && matchIndex % 2 === 0)) {
            x = roundIndex * roundSpacing;
            side = 'left';
          } else {
            x = containerWidth - (roundIndex + 1) * roundSpacing - matchCardWidth;
            side = 'right';
          }
        }
        
        // Vertical centering for the round
        const roundHeight = roundMatches.length * (matchCardHeight + verticalSpacing) - verticalSpacing;
        const startY = (totalHeight - roundHeight) / 2;
        const y = startY + matchIndex * (matchCardHeight + verticalSpacing);
        
        matchPositions.set(match.id, { x, y, side });
      });
    });

  return (
    <div className="relative w-full overflow-x-auto" style={{ minHeight: `${totalHeight}px` }}>
      {/* Render matches */}
      {matches.map((match) => {
        const position = matchPositions.get(match.id);
        if (!position) return null;
        
        const roundIndex = roundMap.get(match.id) ?? 0;
        const roundLabel = structure.rounds[roundIndex]?.label || `Round ${roundIndex + 1}`;
        
        return (
          <div
            key={match.id}
            className="absolute"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              width: `${matchCardWidth}px`,
              height: `${matchCardHeight}px`,
            }}
          >
            {/* Round label */}
            <div className="absolute -top-6 left-0 right-0 text-center text-xs font-medium text-slate-600">
              {roundIndex === finalRoundIndex ? 'Final' : roundLabel}
            </div>
            
            {/* Match card */}
            <GlootMatchCard
              match={match}
              topParty={match.participants[0]}
              bottomParty={match.participants[1]}
              topWon={match.participants[0]?.isWinner}
              bottomWon={match.participants[1]?.isWinner}
            />
          </div>
        );
      })}
      
      {/* Draw connection lines */}
      <svg
        className="absolute top-0 left-0 pointer-events-none"
        style={{ width: `${containerWidth}px`, height: `${totalHeight}px` }}
      >
        {Array.from(matchesByRound.entries())
          .filter(([roundIndex]) => roundIndex < finalRoundIndex)
          .map(([roundIndex, roundMatches]) => 
            roundMatches.map((match) => {
              const sourcePos = matchPositions.get(match.id);
              const targetMatch = matches.find(m => m.id === match.nextMatchId);
              const targetPos = targetMatch ? matchPositions.get(targetMatch.id) : null;
              
              if (!sourcePos || !targetPos) return null;
              
              const sourceX = sourcePos.x + matchCardWidth / 2;
              const sourceY = sourcePos.y + matchCardHeight / 2;
              const targetX = targetPos.x + matchCardWidth / 2;
              const targetY = targetPos.y + matchCardHeight / 2;
              
              // Draw connection line
              return (
                <g key={`${match.id}-connection`}>
                  <line
                    x1={sourceX}
                    y1={sourceY}
                    x2={targetX}
                    y2={targetY}
                    stroke="#818cf8"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                </g>
              );
            })
          )}
        
        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#818cf8"
            />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

// Helper function to get source match IDs for a given match
function getSourceMatchIds(match: any, allMatches: any[]): string[] {
  return allMatches
    .filter(m => m.nextMatchId === match.id)
    .map(m => m.id);
}

function useBracketMatches(bracket: StageBracketResponse) {
  return useMemo(() => toGlootMatches(bracket), [bracket]);
}

function useBracketType(bracket: StageBracketResponse): 'single' | 'double' | 'unsupported' {
  return useMemo(() => {
    if (bracket.structure.type !== 'elimination') {
      return 'unsupported';
    }

    // Use bracket analysis for more accurate detection
    const stats = analyzeBracket(bracket);
    return stats.hasDoubleElimination ? 'double' : 'single';
  }, [bracket]);
}

export function GlootBracketView({ bracket }: GlootBracketViewProps) {
  const matches = useBracketMatches(bracket);
  const bracketType = useBracketType(bracket);
  const viewport = useResponsiveBracketViewport(bracket);
  const useCenterLayout = shouldUseCenterFinalLayout(bracket);
  
  // Get optimized display configuration
  const displayConfig = getBracketDisplayConfig(bracket);
  
  // Create adaptive theme
  const rmsBracketTheme = createTheme(useAdaptiveBracketTheme(bracket, viewport.deviceType));

  // Validate bracket data in development
  if (process.env.NODE_ENV === 'development') {
    const validation = validateBracketConsistency(bracket);
    if (!validation.isValid) {
      console.warn('Bracket consistency issues:', validation.issues);
    }
  }

  // Enhanced options for different alliance sizes using display config
  const bracketOptions = useMemo(() => {
    const stats = analyzeBracket(bracket);
    // Calculate dynamic spacing to better fill the available width
    const availableWidth = viewport.width - 48;
    const estimatedMatchWidth = 280;
    const dynamicSpacing = Math.max(40, Math.min(120, (availableWidth - (estimatedMatchWidth * stats.roundCount)) / Math.max(stats.roundCount - 1, 1)));
    
    return {
      style: {
        roundHeader: {
          backgroundColor: '#1e293b',
          fontColor: '#f8fafc',
          height: viewport.deviceType === 'mobile' ? 32 : 36,
          fontSize: viewport.deviceType === 'mobile' ? 12 : 14,
          fontFamily: 'var(--font-sans, Inter, sans-serif)',
        },
        connectorColor: '#818cf8',
        connectorColorHighlight: '#f97316',
        spaceBetweenColumns: viewport.deviceType === 'mobile' ? 32 : dynamicSpacing,
        spaceBetweenRows: 10, // Reduced from displayConfig for compact view
        boxHeight: 100, // Increased height to accommodate content properly
      },
    };
  }, [viewport.deviceType, viewport.width, bracket]);

  // Calculate bracket width to fill the screen
  const bracketWidth = useMemo(() => {
    // Always use the full available width minus some padding
    return Math.max(viewport.width - 48, 800);
  }, [viewport.width]);

  // Handle different bracket types
  const BracketComponent = bracketType === 'double' ? DoubleEliminationBracket : SingleEliminationBracket;

  // Show unsupported message for Swiss brackets
  if (bracketType === 'unsupported') {
    return (
      <div className="flex items-center justify-center h-64 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
        <div className="text-center space-y-2">
          <div className="text-2xl">📊</div>
          <div className="text-sm font-medium text-slate-600">
            Enhanced bracket view not available for {bracket.stageType} stages
          </div>
          <div className="text-xs text-slate-500">
            Use the table view to see match details
          </div>
        </div>
      </div>
    );
  }

  // Prepare matches for double elimination if needed
  const bracketMatches = bracketType === 'double' && Array.isArray(matches)
    ? transformToDoubleElimination(matches)
    : matches;

  const stats = analyzeBracket(bracket);

  return (
    <div className="relative">
      {/* Compact bracket metadata display */}
      <div className="absolute top-1 right-1 z-10 flex gap-1 flex-wrap">
        {displayConfig.metadata.showAllianceSize && (
          <div className="bg-white/85 backdrop-blur-sm rounded px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200/50 shadow-sm">
            {bracket.teamsPerAlliance}v{bracket.teamsPerAlliance}
          </div>
        )}
        {displayConfig.metadata.showBracketType && (
          <div className="bg-orange-50/85 backdrop-blur-sm rounded px-2 py-0.5 text-xs font-medium text-orange-700 border border-orange-200/50 shadow-sm">
            Double
          </div>
        )}
        {stats.completedMatches < stats.totalMatches && (
          <div className="bg-blue-50/85 backdrop-blur-sm rounded px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200/50 shadow-sm">
            {stats.completedMatches}/{stats.totalMatches}
          </div>
        )}
      </div>
      
      <div className="w-full min-h-[500px]">
        {useCenterLayout ? (
          <CenterFinalBracket
            matches={matches}
            bracket={bracket}
            viewport={viewport}
            bracketOptions={bracketOptions}
          />
        ) : (
          <BracketComponent
            theme={rmsBracketTheme}
            matches={bracketMatches}
            matchComponent={GlootMatchCard}
            options={bracketOptions}
            svgWrapper={({ children, ...svgProps }: { children: React.ReactNode; [key: string]: any }) => (
              <div className="w-full overflow-x-auto">
                <SVGViewer 
                  width={bracketWidth} 
                  height={viewport.height}
                  background={svgBackground} 
                  SVGBackground={svgBackground} 
                  {...svgProps}
                  style={{ width: '100%', minWidth: '100%' }}
                >
                  {children}
                </SVGViewer>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}

// Helper function to transform matches for double elimination bracket
function transformToDoubleElimination(matches: any[]): { upper: any[]; lower: any[] } {
  const upper: any[] = [];
  const lower: any[] = [];

  matches.forEach((match) => {
    // Simple heuristic: matches with loser advancement go to upper bracket
    // matches that are fed by losers go to lower bracket
    if (match.nextLooserMatchId) {
      upper.push(match);
    } else {
      // Check if this match is fed by a loser match
      const isFedByLoser = matches.some(m => m.nextLooserMatchId === match.id);
      if (isFedByLoser) {
        lower.push(match);
      } else {
        upper.push(match);
      }
    }
  });

  return { upper, lower };
}

function useBracketViewport(): [number, number] {
  const initial: [number, number] = typeof window === 'undefined'
    ? [1280, 720]
    : [window.innerWidth, window.innerHeight];

  const [dimensions, setDimensions] = React.useState<[number, number]>(initial);

  React.useEffect(() => {
    const handleResize = () => {
      setDimensions([window.innerWidth, window.innerHeight]);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return dimensions;
}

export default GlootBracketView;
