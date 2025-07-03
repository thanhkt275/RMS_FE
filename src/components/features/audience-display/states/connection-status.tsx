import React from 'react';

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
      <div className="flex items-center gap-3 bg-black/90 text-white px-4 py-3 rounded-lg backdrop-blur-sm border border-gray-600 shadow-lg">
        <div className={`w-3 h-3 rounded-full ${status.color} ${status.status === 'connected' ? 'animate-pulse' : ''}`} />
        <div className="flex flex-col min-w-[140px]">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{status.text}</span>
            <span className="text-xs">{status.icon}</span>
          </div>
          <span className="text-xs text-gray-300">{status.description}</span>
          
          {/* Enhanced status information */}
          <div className="flex items-center gap-2 mt-1">
            {lastUpdateTime > 0 && (
              <span className="text-xs text-gray-400">
                Updated: {new Date(lastUpdateTime).toLocaleTimeString()}
              </span>
            )}
            {source !== 'none' && (
              <span className={`text-xs px-1 py-0.5 rounded text-black font-medium ${
                source === 'websocket' ? 'bg-green-400' : 
                source === 'database' ? 'bg-orange-400' : 'bg-gray-400'
              }`}>
                {source.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
