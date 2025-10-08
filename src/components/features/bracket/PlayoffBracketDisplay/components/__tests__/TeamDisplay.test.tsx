import React from 'react';
import { render, screen } from '@testing-library/react';
import TeamDisplay from '../TeamDisplay';
import { TeamDisplayProps } from '../../types/bracket.types';

const defaultProps: TeamDisplayProps = {
  teams: ['1001 Team Alpha', '1002 Team Beta'],
  isWinner: false,
  isTBD: false,
  isFinal: false,
  alliance: 'RED',
};

describe('TeamDisplay', () => {
  it('renders team names correctly', () => {
    render(<TeamDisplay {...defaultProps} />);
    
    expect(screen.getByText('1001 Team Alpha, 1002 Team Beta')).toBeInTheDocument();
  });

  it('displays TBD when teams array is empty', () => {
    render(<TeamDisplay {...defaultProps} teams={[]} isTBD={true} />);
    
    expect(screen.getByText('TBD')).toBeInTheDocument();
  });

  it('applies winner styling when isWinner is true', () => {
    render(<TeamDisplay {...defaultProps} isWinner={true} />);
    
    const teamArea = screen.getByLabelText(/Red alliance:/);
    expect(teamArea).toHaveClass('team-area--winner');
  });

  it('applies TBD styling when isTBD is true', () => {
    render(<TeamDisplay {...defaultProps} teams={[]} isTBD={true} />);
    
    const teamArea = screen.getByLabelText(/Red alliance:/);
    expect(teamArea).toHaveClass('team-area--tbd');
  });

  it('applies final match text color when isFinal is true', () => {
    render(<TeamDisplay {...defaultProps} isFinal={true} />);
    
    const teamArea = screen.getByLabelText(/Red alliance:/);
    expect(teamArea).toHaveStyle({ color: '#DC2626' });
  });

  it('applies correct alliance class', () => {
    render(<TeamDisplay {...defaultProps} alliance="BLUE" />);
    
    const teamArea = screen.getByLabelText(/Blue alliance:/);
    expect(teamArea).toHaveClass('team-area--blue');
  });

  it('adds border for RED alliance', () => {
    render(<TeamDisplay {...defaultProps} alliance="RED" />);
    
    const teamArea = screen.getByLabelText(/Red alliance:/);
    expect(teamArea).toHaveStyle({ borderBottom: '1px solid #CBD5E1' });
  });

  it('does not add border for BLUE alliance', () => {
    render(<TeamDisplay {...defaultProps} alliance="BLUE" />);
    
    const teamArea = screen.getByLabelText(/Blue alliance:/);
    expect(teamArea).not.toHaveStyle({ borderBottom: '1px solid #CBD5E1' });
  });

  it('provides proper accessibility labels', () => {
    render(<TeamDisplay {...defaultProps} isWinner={true} />);
    
    expect(screen.getByLabelText('Red alliance: 1001 Team Alpha, 1002 Team Beta (Winner)')).toBeInTheDocument();
  });

  it('includes TBD in accessibility label when applicable', () => {
    render(<TeamDisplay {...defaultProps} teams={[]} isTBD={true} />);
    
    expect(screen.getByLabelText('Red alliance: TBD (To Be Determined)')).toBeInTheDocument();
  });

  it('handles single team correctly', () => {
    render(<TeamDisplay {...defaultProps} teams={['100 Solo Team']} />);
    
    expect(screen.getByText('100 Solo Team')).toBeInTheDocument();
  });

  it('adds title attribute for text truncation tooltip', () => {
    render(<TeamDisplay {...defaultProps} />);
    
    const teamText = screen.getByText('1001 Team Alpha, 1002 Team Beta');
    expect(teamText).toHaveAttribute('title', '1001 Team Alpha, 1002 Team Beta');
  });
});