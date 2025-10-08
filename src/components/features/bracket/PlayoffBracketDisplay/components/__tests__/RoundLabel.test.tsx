import React from 'react';
import { render, screen } from '@testing-library/react';
import RoundLabel from '../RoundLabel';

describe('RoundLabel', () => {
  it('should render "Final" for final round', () => {
    render(
      <RoundLabel
        roundIndex={2}
        totalRounds={3}
        isFinal={true}
      />
    );
    
    expect(screen.getByText('Final')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveAttribute('aria-label', 'Tournament Final');
  });

  it('should render "Semifinals" for semifinal round', () => {
    render(
      <RoundLabel
        roundIndex={1}
        totalRounds={3}
        isFinal={false}
      />
    );
    
    expect(screen.getByText('Semifinals')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveAttribute('aria-label', 'Tournament Semifinals');
  });

  it('should render "Quarterfinals" for quarterfinal round', () => {
    render(
      <RoundLabel
        roundIndex={0}
        totalRounds={3}
        isFinal={false}
      />
    );
    
    expect(screen.getByText('Quarterfinals')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveAttribute('aria-label', 'Tournament Quarterfinals');
  });

  it('should render "Round X" for early rounds', () => {
    render(
      <RoundLabel
        roundIndex={0}
        totalRounds={5}
        isFinal={false}
      />
    );
    
    expect(screen.getByText('Round 1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveAttribute('aria-label', 'Tournament Round 1');
  });

  it('should apply custom className when provided', () => {
    const { container } = render(
      <RoundLabel
        roundIndex={0}
        totalRounds={3}
        isFinal={false}
        className="custom-class"
      />
    );
    
    expect(container.firstChild).toHaveClass('round-label', 'custom-class');
  });

  it('should have correct Figma typography styles', () => {
    render(
      <RoundLabel
        roundIndex={0}
        totalRounds={3}
        isFinal={false}
      />
    );
    
    const roundLabel = screen.getByRole('heading', { level: 3 });
    const styles = window.getComputedStyle(roundLabel);
    
    expect(styles.fontFamily).toContain('Inter');
    expect(styles.fontSize).toBe('20px');
    expect(styles.fontWeight).toBe('800');
    expect(styles.color).toBe('rgb(100, 116, 139)'); // #64748B
    expect(styles.textAlign).toBe('center');
  });
});