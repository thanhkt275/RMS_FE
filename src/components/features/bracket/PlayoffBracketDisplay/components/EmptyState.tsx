import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { EmptyStateProps } from '../types/bracket.types';
import { FIGMA_DESIGN } from '../utils/constants';

export type EmptyStateType = 'no-matches' | 'error' | 'loading' | 'invalid-data' | 'container-too-small';

export interface EnhancedEmptyStateProps extends EmptyStateProps {
  type?: EmptyStateType;
  details?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

const EmptyState: React.FC<EnhancedEmptyStateProps> = memo(({
  message,
  type = 'no-matches',
  details,
  onRetry,
  showRetry = false,
  className,
}) => {
  // Get appropriate message and icon based on type
  const getStateConfig = () => {
    switch (type) {
      case 'error':
        return {
          message: message || 'Error loading bracket',
          description: details || 'Something went wrong while loading the tournament bracket.',
          icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          ),
          iconColor: '#EF4444',
          iconBg: '#FEF2F2',
        };
      
      case 'loading':
        return {
          message: message || 'Loading bracket...',
          description: 'Please wait while the tournament bracket is being prepared.',
          icon: (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
          ),
          iconColor: FIGMA_DESIGN.COLORS.REGULAR_BORDER,
          iconBg: '#EBF4FF',
        };
      
      case 'invalid-data':
        return {
          message: message || 'Invalid tournament data',
          description: details || 'The tournament data contains errors and cannot be displayed properly.',
          icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <path d="M12 9v4"/>
              <path d="m12 17 .01 0"/>
            </svg>
          ),
          iconColor: '#F59E0B',
          iconBg: '#FFFBEB',
        };
      
      case 'container-too-small':
        return {
          message: message || 'Container too small',
          description: details || 'The container is too small to display the tournament bracket properly.',
          icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="18" x="3" y="3" rx="2"/>
              <path d="M9 9h6v6H9z"/>
            </svg>
          ),
          iconColor: '#8B5CF6',
          iconBg: '#F3E8FF',
        };
      
      default: // 'no-matches'
        return {
          message: message || 'No matches available',
          description: 'The tournament bracket will appear here when matches are scheduled.',
          icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m0 8v3a2 2 0 0 0 2 2h3" />
              <path d="M16 3h3a2 2 0 0 1 2 2v3m0 8v3a2 2 0 0 1-2 2h-3" />
            </svg>
          ),
          iconColor: FIGMA_DESIGN.COLORS.GRAY_TEXT,
          iconBg: 'transparent',
        };
    }
  };

  const config = getStateConfig();

  return (
    <div 
      className={cn(
        'flex items-center justify-center',
        'w-full h-full min-h-[400px]',
        className
      )}
      style={{ backgroundColor: FIGMA_DESIGN.COLORS.BACKGROUND }}
      role="status"
      aria-live="polite"
    >
      <div className="text-center space-y-4 max-w-md px-4">
        {/* Icon */}
        <div 
          className="mx-auto w-16 h-16 flex items-center justify-center rounded-lg border-2"
          style={{ 
            borderColor: config.iconColor,
            backgroundColor: config.iconBg,
            color: config.iconColor,
            borderStyle: type === 'no-matches' ? 'dashed' : 'solid',
          }}
        >
          {config.icon}
        </div>
        
        {/* Message text */}
        <div className="space-y-2">
          <h3 
            className="font-bold"
            style={{
              fontFamily: FIGMA_DESIGN.TYPOGRAPHY.ROUND_LABEL.FONT_FAMILY,
              fontSize: `${FIGMA_DESIGN.TYPOGRAPHY.ROUND_LABEL.FONT_SIZE}px`,
              fontWeight: FIGMA_DESIGN.TYPOGRAPHY.ROUND_LABEL.FONT_WEIGHT,
              color: type === 'error' ? '#EF4444' : FIGMA_DESIGN.COLORS.GRAY_TEXT,
              lineHeight: FIGMA_DESIGN.TYPOGRAPHY.ROUND_LABEL.LINE_HEIGHT,
            }}
          >
            {config.message}
          </h3>
          
          <p 
            className="opacity-75"
            style={{
              fontFamily: FIGMA_DESIGN.TYPOGRAPHY.TEAM_TEXT.FONT_FAMILY,
              fontSize: `${FIGMA_DESIGN.TYPOGRAPHY.TEAM_TEXT.FONT_SIZE}px`,
              fontWeight: FIGMA_DESIGN.TYPOGRAPHY.TEAM_TEXT.FONT_WEIGHT,
              color: FIGMA_DESIGN.COLORS.GRAY_TEXT,
              lineHeight: FIGMA_DESIGN.TYPOGRAPHY.TEAM_TEXT.LINE_HEIGHT,
            }}
          >
            {config.description}
          </p>

          {/* Show additional details if provided */}
          {details && type !== 'invalid-data' && (
            <p 
              className="text-xs opacity-60 mt-2"
              style={{
                fontFamily: FIGMA_DESIGN.TYPOGRAPHY.TEAM_TEXT.FONT_FAMILY,
                color: FIGMA_DESIGN.COLORS.GRAY_TEXT,
              }}
            >
              {details}
            </p>
          )}
        </div>

        {/* Retry button */}
        {(showRetry || onRetry) && type !== 'loading' && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded font-medium transition-colors"
            style={{
              backgroundColor: FIGMA_DESIGN.COLORS.REGULAR_BORDER,
              color: 'white',
              fontFamily: FIGMA_DESIGN.TYPOGRAPHY.TEAM_TEXT.FONT_FAMILY,
              fontSize: `${FIGMA_DESIGN.TYPOGRAPHY.TEAM_TEXT.FONT_SIZE}px`,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#1D4ED8';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = FIGMA_DESIGN.COLORS.REGULAR_BORDER;
            }}
            aria-label="Retry loading bracket"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;