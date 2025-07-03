'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import websocketService, { IWebSocketService } from '@/lib/websocket';

interface WebSocketContextType {
  service: IWebSocketService;
  isConnected: boolean;
  connectionAttempts: number;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  url?: string;
}

export function WebSocketProvider({ 
  children, 
  autoConnect = true, 
  url 
}: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  useEffect(() => {

    const handleConnectionStatus = (status: { connected: boolean; reconnectAttempts?: number }) => {
      setIsConnected(status.connected);
      setConnectionAttempts(status.reconnectAttempts || 0);
    };

    const unsubscribe = websocketService.onConnectionStatus(handleConnectionStatus);
    
    // Initialize connection
    setIsConnected(websocketService.isConnected());
    if (autoConnect && !websocketService.isConnected()) {
      websocketService.connect(url);
    }

    return () => {
      unsubscribe();
    };
  }, [autoConnect, url]);

  const contextValue: WebSocketContextType = {
    service: websocketService,
    isConnected,
    connectionAttempts,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext(): WebSocketContextType {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

// Re-export for backward compatibility
export { websocketService };
