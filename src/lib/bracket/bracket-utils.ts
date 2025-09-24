import type { StageBracketResponse, BracketMatch } from '@/types/match.types';

/**
 * Bracket utilities for handling different tournament formats and alliance sizes
 */

export interface BracketStats {
  totalMatches: number;
  completedMatches: number;
  teamsPerAlliance: number;
  maxTeamsInMatch: number;
  hasDoubleElimination: boolean;
  roundCount: number;
}

export function analyzeBracket(bracket: StageBracketResponse): BracketStats {
  const { matches, teamsPerAlliance, structure } = bracket;
  
  const completedMatches = matches.filter(m => m.status === 'COMPLETED').length;
  const maxTeamsInMatch = Math.max(
    ...matches.map(m => 
      (m.alliances?.reduce((sum, alliance) => sum + alliance.teamAlliances.length, 0) || 0)
    ),
    0
  );
  
  const hasDoubleElimination = structure.type === 'elimination' && 
    matches.some(m => m.loserFeedsIntoMatchId);
    
  const roundCount = structure.type === 'elimination' 
    ? structure.rounds.length
    : structure.type === 'swiss'
    ? structure.rounds.length  
    : Math.max(...matches.map(m => m.roundNumber || 1));

  return {
    totalMatches: matches.length,
    completedMatches,
    teamsPerAlliance,
    maxTeamsInMatch,
    hasDoubleElimination,
    roundCount,
  };
}

export function validateBracketConsistency(bracket: StageBracketResponse): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const { matches, teamsPerAlliance } = bracket;

  // Check alliance size consistency
  matches.forEach((match, index) => {
    if (!match.alliances || match.alliances.length !== 2) {
      issues.push(`Match ${match.matchNumber || index} does not have exactly 2 alliances`);
      return;
    }

    match.alliances.forEach((alliance, allianceIndex) => {
      const teamCount = alliance.teamAlliances.length;
      if (teamCount > 0 && teamCount !== teamsPerAlliance) {
        issues.push(
          `Match ${match.matchNumber || index}, ${alliance.color} alliance has ${teamCount} teams, expected ${teamsPerAlliance}`
        );
      }

      // Check station positions
      const stations = alliance.teamAlliances.map(t => t.stationPosition).sort((a, b) => a - b);
      const expectedStations = Array.from({ length: teamCount }, (_, i) => i + 1);
      if (JSON.stringify(stations) !== JSON.stringify(expectedStations)) {
        issues.push(
          `Match ${match.matchNumber || index}, ${alliance.color} alliance has invalid station positions: ${stations.join(', ')}`
        );
      }
    });
  });

  // Check advancement links
  if (bracket.structure.type === 'elimination') {
    matches.forEach((match, index) => {
      if (match.feedsIntoMatchId) {
        const nextMatch = matches.find(m => m.id === match.feedsIntoMatchId);
        if (!nextMatch) {
          issues.push(`Match ${match.matchNumber || index} advances to non-existent match ${match.feedsIntoMatchId}`);
        }
      }
      
      if (match.loserFeedsIntoMatchId) {
        const loserMatch = matches.find(m => m.id === match.loserFeedsIntoMatchId);
        if (!loserMatch) {
          issues.push(`Match ${match.matchNumber || index} loser advances to non-existent match ${match.loserFeedsIntoMatchId}`);
        }
      }
    });
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

export function getBracketDisplayConfig(bracket: StageBracketResponse) {
  const stats = analyzeBracket(bracket);
  const { teamsPerAlliance, hasDoubleElimination, roundCount } = stats;

  // Calculate optimal dimensions for compact bracket
  const baseWidth = 600; // Smaller base width for compact view
  const baseHeight = 400; // Smaller base height
  
  const widthMultiplier = hasDoubleElimination ? 1.3 : 1.0;
  const heightMultiplier = Math.max(1.0, teamsPerAlliance / 3); // Less height scaling
  
  const optimalWidth = Math.round(baseWidth * widthMultiplier);
  const optimalHeight = Math.round(baseHeight * heightMultiplier);

  // Match card sizing - compact
  const matchCardHeight = 70; // Fixed compact height
  const spaceBetweenRows = 20; // Compact spacing

  return {
    dimensions: {
      width: optimalWidth,
      height: optimalHeight,
    },
    style: {
      matchCardHeight,
      spaceBetweenRows,
      spaceBetweenColumns: hasDoubleElimination ? 40 : 32, // Compact columns
    },
    metadata: {
      showAllianceSize: teamsPerAlliance > 2,
      showBracketType: hasDoubleElimination,
      roundCount,
      compactMode: true, // Always compact for better navigation UX
    },
  };
}

export function formatMatchTitle(match: BracketMatch, bracket: StageBracketResponse): string {
  const baseTitle = `Match ${match.matchNumber || match.id}`;
  
  if (bracket.structure.type === 'elimination' && match.roundNumber) {
    const round = bracket.structure.rounds.find(r => r.roundNumber === match.roundNumber);
    if (round?.label) {
      return `${round.label} - ${baseTitle}`;
    }
  }
  
  if (match.recordBucket) {
    return `${match.recordBucket} - ${baseTitle}`;
  }
  
  return baseTitle;
}