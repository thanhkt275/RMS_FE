import React from 'react';
import { typography, cn } from "../design-system";

interface ConnectionStatusProps {
  isConnected: boolean;
  wsConnected: boolean;
  lastUpdateTime: number;
  connectionError?: string | null;
  fallbackMode?: boolean;
  source?: 'websocket' | 'database' | 'none';
}

export function ConnectionStatus({ 
  isConnected, 
  wsConnected, 
  lastUpdateTime, 
  connectionError,
  fallbackMode = false,
  source = 'none'
}: ConnectionStatusProps) {
  const getConnectionStatus = () => {
    // Priority: Check fallback mode first
    if (fallbackMode) {
      return {
        status: 'fallback',
        color: 'bg-orange-500',
        text: 'Fallback Mode',
        description: 'Using database polling (2s intervals)',
        icon: '⚠️'
      };
    }
    
    // Then check WebSocket connection
    if (isConnected && wsConnected) {
      return {
        status: 'connected',
        color: 'bg-green-500',
        text: 'Live',
        description: 'Real-time updates active',
        icon: '🟢'
      };
    } else if (isConnected && !wsConnected) {
      return {
        status: 'partial',
        color: 'bg-yellow-500',
        text: 'Limited',
        description: 'Basic connection only',
        icon: '🟡'
      };
    } else {
      return {
        status: 'disconnected',
        color: 'bg-red-500',
        text: 'Disconnected',
        description: connectionError || 'No connection',
        icon: '🔴'
      };
    }
  };

  const status = getConnectionStatus();

  return (
    <div className="connection-status fixed top-4 right-4 z-50">
      <div className={cn("flex items-center gap-3 bg-black/90 text-white px-4 py-3 rounded-lg backdrop-blur-sm border border-gray-600 shadow-lg")}>
        <div className={cn("w-3 h-3 rounded-full", status.color, {
          'animate-pulse': status.status === 'connected'
        })} />
        <div className="flex flex-col min-w-[140px]">
          <div className="flex items-center gap-2">
            <span className={cn(typography.body.sm, "font-medium")}>{status.text}</span>
            <span className={typography.body.xs}>{status.icon}</span>
          </div>
          <span className={cn(typography.body.xs, "text-gray-300")}>{status.description}</span>

          {/* Enhanced status information */}
          <div className="flex items-center gap-2 mt-1">
            {lastUpdateTime > 0 && (
              <span className={cn(typography.body.xs, "text-gray-400")}>
                Updated: {new Date(lastUpdateTime).toLocaleTimeString()}
              </span>
            )}
            {source !== 'none' && (
              <span className={cn(typography.body.xs, "px-1 py-0.5 rounded text-black font-medium", {
                'bg-green-400': source === 'websocket',
                'bg-orange-400': source === 'database',
                'bg-gray-400': source !== 'websocket' && source !== 'database'
              })}>
                {source.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
