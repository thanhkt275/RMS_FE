import React from 'react';
import { render, screen } from '@testing-library/react';
import MatchCard from '../MatchCard';
import { Match } from '@/types/match.types';
import { MatchCardProps } from '../../types/bracket.types';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';

// Mock match data for testing
const createMockMatch = (overrides: Partial<Match> = {}): Match => ({
  id: 'match-1',
  matchNumber: '1',
  status: 'COMPLETED',
  scheduledTime: '2024-01-01T10:00:00Z',
  winningAlliance: 'RED',
  redScore: 100,
  blueScore: 80,
  alliances: [
    {
      color: 'RED',
      teamAlliances: [
        {
          teamId: 'team-1',
          team: {
            id: 'team-1',
            name: 'Team Alpha',
            teamNumber: '1001',
          },
        },
        {
          teamId: 'team-2',
          team: {
            id: 'team-2',
            name: 'Team Beta',
            teamNumber: '1002',
          },
        },
      ],
    },
    {
      color: 'BLUE',
      teamAlliances: [
        {
          teamId: 'team-3',
          team: {
            id: 'team-3',
            name: 'Team Gamma',
            teamNumber: '1003',
          },
        },
        {
          teamId: 'team-4',
          team: {
            id: 'team-4',
            name: 'Team Delta',
            teamNumber: '1004',
          },
        },
      ],
    },
  ],
  roundNumber: 1,
  ...overrides,
});

const defaultProps: MatchCardProps = {
  match: createMockMatch(),
  isFinal: false,
  dimensions: {
    width: 213.33,
    height: 67.5,
  },
};

describe('MatchCard', () => {
  it('renders match card with team information', () => {
    render(<MatchCard {...defaultProps} />);
    
    // Check if team names are displayed
    expect(screen.getByText('1001 Team Alpha, 1002 Team Beta')).toBeInTheDocument();
    expect(screen.getByText('1003 Team Gamma, 1004 Team Delta')).toBeInTheDocument();
  });

  it('highlights winning team correctly', () => {
    render(<MatchCard {...defaultProps} />);
    
    // Red alliance should be highlighted as winner
    const redTeamArea = screen.getByLabelText(/Red alliance:/);
    expect(redTeamArea).toHaveClass('team-area--winner');
    
    // Blue alliance should not be highlighted
    const blueTeamArea = screen.getByLabelText(/Blue alliance:/);
    expect(blueTeamArea).not.toHaveClass('team-area--winner');
  });

  it('displays TBD for matches without teams', () => {
    const tbdMatch = createMockMatch({
      alliances: [],
      status: 'PENDING',
      winningAlliance: null,
    });

    render(<MatchCard {...defaultProps} match={tbdMatch} />);
    
    // Both alliances should show TBD
    expect(screen.getAllByText('TBD')).toHaveLength(2);
  });

  it('applies final match styling when isFinal is true', () => {
    render(<MatchCard {...defaultProps} isFinal={true} />);
    
    const matchCard = screen.getByLabelText(/Match 1:/);
    expect(matchCard).toHaveClass('match-card--final');
  });

  it('handles pending matches correctly', () => {
    const pendingMatch = createMockMatch({
      status: 'PENDING',
      winningAlliance: null,
      redScore: undefined,
      blueScore: undefined,
    });

    render(<MatchCard {...defaultProps} match={pendingMatch} />);
    
    // Teams should still be displayed but no winner highlighting
    expect(screen.getByText('1001 Team Alpha, 1002 Team Beta')).toBeInTheDocument();
    expect(screen.getByText('1003 Team Gamma, 1004 Team Delta')).toBeInTheDocument();
    
    // No winner classes should be applied
    const teamAreas = screen.getAllByText(/Team/);
    teamAreas.forEach(area => {
      expect(area.closest('.team-area')).not.toHaveClass('team-area--winner');
    });
  });

  it('provides proper accessibility labels', () => {
    render(<MatchCard {...defaultProps} />);
    
    // Check main match label
    expect(screen.getByLabelText(/Match 1:/)).toBeInTheDocument();
    
    // Check alliance labels
    expect(screen.getByLabelText(/Red alliance:/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Blue alliance:/)).toBeInTheDocument();
  });

  it('handles matches with single teams per alliance', () => {
    const singleTeamMatch = createMockMatch({
      alliances: [
        {
          color: 'RED',
          teamAlliances: [
            {
              teamId: 'team-1',
              team: {
                id: 'team-1',
                name: 'Solo Red',
                teamNumber: '100',
              },
            },
          ],
        },
        {
          color: 'BLUE',
          teamAlliances: [
            {
              teamId: 'team-2',
              team: {
                id: 'team-2',
                name: 'Solo Blue',
                teamNumber: '200',
              },
            },
          ],
        },
      ],
    });

    render(<MatchCard {...defaultProps} match={singleTeamMatch} />);
    
    expect(screen.getByText('100 Solo Red')).toBeInTheDocument();
    expect(screen.getByText('200 Solo Blue')).toBeInTheDocument();
  });
});