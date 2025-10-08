import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { ConnectionLinesProps } from '../types/bracket.types';
import { FIGMA_DESIGN } from '../utils/constants';

/**
 * ConnectionLines component renders SVG paths connecting parent matches to child matches
 * Uses exact Figma specifications for styling and positioning
 */
const ConnectionLines: React.FC<ConnectionLinesProps> = memo(({
  connections,
  className,
}) => {
  if (!connections || connections.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('ConnectionLines: No connections to render');
    }
    return null;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('ConnectionLines: Rendering', connections.length, 'connections');
    connections.forEach((conn, i) => {
      console.log(`Connection ${i}:`, {
        from: conn.fromMatches,
        to: conn.toMatch,
        path: conn.path.d,
      });
    });
  }

  return (
    <svg
      className={cn(
        'absolute inset-0 pointer-events-none',
        'w-full h-full',
        className
      )}
      style={{
        zIndex: 1, // Behind match cards but above background
      }}
    >
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
            fill={FIGMA_DESIGN.COLORS.CONNECTION_LINE}
          />
        </marker>
      </defs>
      {connections.map((connection, index) => (
        <path
          key={`connection-${connection.toMatch}-${index}`}
          d={connection.path.d}
          stroke={connection.path.stroke}
          strokeWidth={connection.path.strokeWidth}
          fill={connection.path.fill}
          markerEnd="url(#arrowhead)"
          className="connection-line"
          style={{
            // Add debugging styles in development
            ...(process.env.NODE_ENV === 'development' && {
              strokeDasharray: index % 2 === 0 ? 'none' : '5,5', // Alternate solid/dashed for debugging
            })
          }}
        />
      ))}
    </svg>
  );
});

ConnectionLines.displayName = 'ConnectionLines';

export default ConnectionLines;