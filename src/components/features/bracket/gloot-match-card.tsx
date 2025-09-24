"use client";

import type { CSSProperties, MouseEvent } from 'react';
import type { MatchComponentProps, Participant } from '@g-loot/react-tournament-brackets';

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '6px',
  fontSize: '11px',
  letterSpacing: '0.01em',
  flexShrink: 0,
};

function getRowBackground(color: 'RED' | 'BLUE', isWinner: boolean | undefined) {
  if (color === 'RED') {
    return isWinner ? 'rgba(248, 113, 113, 0.28)' : 'rgba(248, 113, 113, 0.12)';
  }
  return isWinner ? 'rgba(96, 165, 250, 0.28)' : 'rgba(96, 165, 250, 0.12)';
}

function renderAllianceLine(party: Participant, fallbackScore: string) {
  const color = party.allianceColor === 'RED' ? 'var(--red-600, #dc2626)' : 'var(--blue-600, #2563eb)';
  const background = getRowBackground(party.allianceColor ?? 'RED', party.isWinner);

  // Get team names only - compact display
  const teams: string[] = Array.isArray(party.teams)
    ? party.teams
        .filter((team: any) => team && (team.teamNumber || team.teamName || team.displayName))
        .sort((a: any, b: any) => (a.stationPosition || 0) - (b.stationPosition || 0))
        .map((team: any) => team.teamNumber || team.displayName || team.teamName)
        .slice(0, 2) // Limit to 2 teams for compact display
    : [];

  const teamDisplay = teams.length > 0 ? teams.join(' • ') : party.name || 'TBD';

  return (
    <div
      key={party.id}
      style={{
        ...rowStyle,
        borderRadius: '4px',
        background,
        border: party.isWinner ? `1px solid ${color}` : '1px solid transparent',
        minHeight: '26px',
        padding: '4px 6px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <span style={{
        fontWeight: 600,
        color,
        fontSize: '11px',
        textTransform: 'uppercase',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: 1,
        minWidth: 0,
      }}>
        {teamDisplay}
      </span>
      <span style={{
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 700,
        color: '#0f172a',
        fontSize: '12px',
        flexShrink: 0,
        minWidth: '24px',
        textAlign: 'right',
      }}>
        {party.resultText ?? fallbackScore}
      </span>
    </div>
  );
}

export function GlootMatchCard({ match, topParty, bottomParty, onMatchClick, topWon, bottomWon }: MatchComponentProps) {
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Open match detail page in new tab
    const matchId = match.id;
    if (matchId) {
      window.open(`/matches/${matchId}`, '_blank', 'noopener,noreferrer');
    }
    
    // Call the original callback if it exists
    if (onMatchClick && typeof onMatchClick === 'function') {
      onMatchClick({ match, topWon, bottomWon, event: event as unknown as MouseEvent<HTMLAnchorElement> });
    }
  };

  return (
    <div
      role="button"
      onClick={handleClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: '100%',
        height: '100%',
        minHeight: '70px',
        borderRadius: '6px',
        padding: '8px 6px',
        background: 'linear-gradient(135deg, #f1f5f9 0%, #f8fafc 100%)',
        border: '1px solid rgba(148, 163, 184, 0.3)',
        boxShadow: '0 2px 4px -2px rgba(15, 23, 42, 0.1)',
        transition: 'all 120ms ease',
        cursor: 'pointer',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 8px -2px rgba(15, 23, 42, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 4px -2px rgba(15, 23, 42, 0.1)';
      }}
    >
      {/* Match header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        fontSize: '18px', 
        color: '#64748b', 
        fontWeight: 600,
        marginBottom: '0px',
        flexShrink: 0,
        height: '16px',
      }}>
        <span>Match {match.matchNumber || match.id}</span>
      </div>
      
      {/* Alliances */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '3px', 
        flex: 1,
        minHeight: 0,
        width: '100%',
      }}>
        {renderAllianceLine(topParty, '—')}
        {renderAllianceLine(bottomParty, '—')}
      </div>
    </div>
  );
}

export default GlootMatchCard;
