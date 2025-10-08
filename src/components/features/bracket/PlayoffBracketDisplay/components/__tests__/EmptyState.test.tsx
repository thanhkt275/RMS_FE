import React from 'react';
import { render, screen } from '@testing-library/react';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
  it('should render with default message', () => {
    render(<EmptyState />);
    
    expect(screen.getByText('No matches available')).toBeInTheDocument();
    expect(screen.getByText('The tournament bracket will appear here when matches are scheduled.')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    const customMessage = 'Tournament not started yet';
    render(<EmptyState message={customMessage} />);
    
    expect(screen.getByText(customMessage)).toBeInTheDocument();
    expect(screen.getByText('The tournament bracket will appear here when matches are scheduled.')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const customClass = 'custom-empty-state';
    const { container } = render(<EmptyState className={customClass} />);
    
    expect(container.firstChild).toHaveClass(customClass);
  });

  it('should have proper accessibility structure', () => {
    render(<EmptyState />);
    
    // Check that the main heading is present
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('No matches available');
  });
});