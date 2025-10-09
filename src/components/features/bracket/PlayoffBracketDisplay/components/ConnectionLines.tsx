import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { ConnectionLinesProps } from '../types/bracket.types';

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
      {connections.map((connection, index) => (
        <g key={`connection-${connection.toMatch}-${index}`} className="connection-line">
          <path
            d={connection.path.d}
            stroke={connection.path.stroke}
            strokeWidth={connection.path.strokeWidth}
            fill={connection.path.fill}
            style={{
              // Add debugging styles in development
              ...(process.env.NODE_ENV === 'development' && {
                strokeDasharray: index % 2 === 0 ? 'none' : '5,5', // Alternate solid/dashed for debugging
              })
            }}
          />
          <polygon
            points={connection.arrow.points}
            fill={connection.arrow.fill}
            stroke="none"
          />
        </g>
      ))}
    </svg>
  );
});

ConnectionLines.displayName = 'ConnectionLines';

export default ConnectionLines;
