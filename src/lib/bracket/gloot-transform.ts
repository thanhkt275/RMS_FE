import type { StageBracketResponse, BracketMatch, BracketAlliance, BracketAllianceTeam } from '@/types/match.types';
import type { Match as GlootMatch, Participant } from '@g-loot/react-tournament-brackets';

const STATUS_MAP: Record<string, GlootMatch['state']> = {
  COMPLETED: 'DONE',
  IN_PROGRESS: 'SCORE_DONE',
  PENDING: 'NO_PARTY',
  CANCELLED: 'NO_SHOW',
};

function formatAllianceName(alliance: BracketAlliance | undefined, fallback: string, teamsPerAlliance?: number): string {
  if (!alliance || !alliance.teamAlliances.length) {
    return fallback;
  }

  // Sort teams by station position for consistent display
  const sortedTeams = [...alliance.teamAlliances].sort((a, b) => a.stationPosition - b.stationPosition);
  
  const teamParts = sortedTeams
    .map((team) => formatTeamDisplay(team))
    .filter(Boolean);

  if (teamParts.length === 0) {
    return fallback;
  }

  // For larger alliances, truncate and add indicator if needed
  if (teamsPerAlliance && teamsPerAlliance > 2 && teamParts.length > 3) {
    return `${teamParts.slice(0, 3).join(' • ')} +${teamParts.length - 3}`;
  }

  return teamParts.join(' • ');
}

function formatTeamDisplay(team: BracketAllianceTeam): string {
  if (team.teamNumber && team.teamName) {
    return `${team.teamNumber} ${team.teamName}`;
  }
  return team.teamNumber || team.teamName || `Team ${team.teamId}`;
}

function createParticipant(
  match: BracketMatch,
  alliance: BracketAlliance | undefined,
  color: 'RED' | 'BLUE',
  fallbackName: string,
  teamsPerAlliance?: number,
  sourceMatch?: BracketMatch | null,
): Participant {
  const isWinner = match.winningAlliance === color;
  const scoreText = alliance?.score !== undefined ? String(alliance.score) : undefined;

  // Enhanced team data for rendering
  const enhancedTeams = alliance?.teamAlliances?.map(team => ({
    id: team.teamId,
    teamNumber: team.teamNumber,
    teamName: team.teamName,
    stationPosition: team.stationPosition,
    isSurrogate: team.isSurrogate,
    displayName: formatTeamDisplay(team),
  })) || [];

  // Generate display name: use source match info if no teams, otherwise format alliance name
  let displayName: string;
  if (!alliance || !alliance.teamAlliances.length) {
    if (sourceMatch) {
      displayName = `Winner of Match ${sourceMatch.matchNumber || sourceMatch.id}`;
    } else {
      displayName = fallbackName;
    }
  } else {
    displayName = formatAllianceName(alliance, fallbackName, teamsPerAlliance);
  }

  return {
    id: alliance?.id ?? `${match.id}-${color.toLowerCase()}`,
    name: displayName,
    isWinner,
    status: match.status === 'COMPLETED' ? 'PLAYED' : null,
    resultText: scoreText ?? null,
    allianceColor: color,
    teams: enhancedTeams,
    score: alliance?.score,
    autoScore: alliance?.autoScore,
    driveScore: alliance?.driveScore,
    teamCount: alliance?.teamAlliances?.length || 0,
  };
}

export function toGlootMatches(bracket: StageBracketResponse): GlootMatch[] {
  const roundLabelMap = new Map<string, string>();
  const matchMap = new Map<string, BracketMatch>();
  const { teamsPerAlliance } = bracket;

  // Build match lookup map
  bracket.matches.forEach(match => {
    matchMap.set(match.id, match);
  });

  // Helper function to find source matches that feed into a given match
  const findSourceMatches = (targetMatchId: string, allianceColor: 'RED' | 'BLUE'): BracketMatch | null => {
    const sourceMatches = bracket.matches.filter(match => match.feedsIntoMatchId === targetMatchId);
    
    if (sourceMatches.length >= 2) {
      // For elimination brackets, typically the first match feeds red alliance, second feeds blue
      const sortedMatches = sourceMatches.sort((a, b) => {
        if (a.matchNumber && b.matchNumber) {
          return Number(a.matchNumber) - Number(b.matchNumber);
        }
        return a.id.localeCompare(b.id);
      });
      
      return allianceColor === 'RED' ? sortedMatches[0] : sortedMatches[1];
    }
    
    return null;
  };

  if (bracket.structure.type === 'elimination') {
    bracket.structure.rounds.forEach((round) => {
      round.matches.forEach((matchId) => {
        roundLabelMap.set(matchId, round.label ?? `Round ${round.roundNumber}`);
      });
    });
  }

  return bracket.matches.map((match) => {
    const redAlliance = match.alliances?.find((alliance) => alliance.color === 'RED');
    const blueAlliance = match.alliances?.find((alliance) => alliance.color === 'BLUE');

    // Check if this match has empty alliances that need source match labeling
    const redSourceMatch = !redAlliance?.teamAlliances?.length ? findSourceMatches(match.id, 'RED') : null;
    const blueSourceMatch = !blueAlliance?.teamAlliances?.length ? findSourceMatches(match.id, 'BLUE') : null;

    const participants: Participant[] = [
      createParticipant(match, redAlliance, 'RED', 'Red Alliance', teamsPerAlliance, redSourceMatch),
      createParticipant(match, blueAlliance, 'BLUE', 'Blue Alliance', teamsPerAlliance, blueSourceMatch),
    ];

    const state = STATUS_MAP[match.status] ?? 'NO_PARTY';
    const startTime = match.startTime ?? match.scheduledTime ?? new Date().toISOString();

    const matchLabel =
      typeof match.matchNumber !== 'undefined'
        ? `Match ${match.matchNumber}`
        : `Match ${String(match.id)}`;

    // Determine if this is a double elimination bracket
    const isDoubleElimination = bracket.structure.type === 'elimination' && 
      bracket.matches.some(m => m.loserFeedsIntoMatchId);

    return {
      id: match.id,
      name: matchLabel,
      nextMatchId: match.feedsIntoMatchId ?? null,
      nextLooserMatchId: isDoubleElimination ? (match.loserFeedsIntoMatchId ?? null) : undefined,
      tournamentRoundText: roundLabelMap.get(match.id) ?? `Round ${match.roundNumber || 1}`,
      startTime,
      state,
      participants,
      matchNumber: match.matchNumber,
      scheduledTime: startTime,
      bracketSlot: match.bracketSlot,
      teamsPerAlliance,
    } as GlootMatch & { 
      bracketSlot?: number | null;
      teamsPerAlliance?: number;
    };
  });
}
