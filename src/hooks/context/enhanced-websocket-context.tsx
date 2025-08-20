/**
 * Enhanced WebSocket Context Provider for RMS System
 * Provides enhanced WebSocket service to React components with comprehensive state management
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import EnhancedWebSocketService from '@/lib/enhanced-websocket.service';
import {
  WebSocketConnectionState,
  ConnectionMetrics,
  MatchSession,
  ActiveUser,
  WebSocketError,
  EnhancedWebSocketConfig,
} from '@/types/enhanced-websocket';

interface EnhancedWebSocketContextValue {
  // Service instance
  service: EnhancedWebSocketService;
  
  // Connection state
  connectionState: WebSocketConnectionState;
  metrics: ConnectionMetrics;
  isConnected: boolean;
  isConnecting: boolean;
  
  // User management
  activeUsers: ActiveUser[];
  currentUser?: ActiveUser;
  
  // Error handling
  lastError?: WebSocketError;
  
  // Connection methods
  connect: (config?: Partial<EnhancedWebSocketConfig>) => void;
  disconnect: () => void;
  reconnect: () => void;
  
  // Configuration
  updateConfig: (config: Partial<EnhancedWebSocketConfig>) => void;
  
  // Debug mode
  enableDebugMode: () => void;
  disableDebugMode: () => void;
}

const EnhancedWebSocketContext = createContext<EnhancedWebSocketContextValue | null>(null);

interface EnhancedWebSocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  config?: Partial<EnhancedWebSocketConfig>;
  userId?: string;
  username?: string;
  role?: string;
  onError?: (error: WebSocketError) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function EnhancedWebSocketProvider({
  children,
  autoConnect = true,
  config = {},
  userId,
  username,
  role,
  onError,
  onConnected,
  onDisconnected,
}: EnhancedWebSocketProviderProps) {
  // Get singleton service instance
  const service = EnhancedWebSocketService.getInstance();
  
  // State management
  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>(() =>
    service.getConnectionState()
  );
  const [metrics, setMetrics] = useState<ConnectionMetrics>(() => service.getMetrics());
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [currentUser, setCurrentUser] = useState<ActiveUser | undefined>();
  const [lastError, setLastError] = useState<WebSocketError | undefined>();
  
  // Derived state
  const isConnected = connectionState.connected;
  const isConnecting = connectionState.reconnecting;
  
  // Connection methods
  const connect = useCallback((userConfig?: Partial<EnhancedWebSocketConfig>) => {
    service.connect({ ...config, ...userConfig });
  }, [config]);
  
  const disconnect = useCallback(() => {
    service.disconnect();
  }, []);
  
  const reconnect = useCallback(() => {
    service.reconnect();
  }, []);
  
  const updateConfig = useCallback((newConfig: Partial<EnhancedWebSocketConfig>) => {
    service.updateConfig(newConfig);
  }, []);
  
  const enableDebugMode = useCallback(() => {
    service.enableDebugMode();
  }, []);
  
  const disableDebugMode = useCallback(() => {
    service.disableDebugMode();
  }, []);
  
  // Setup effects
  useEffect(() => {
    // Set user information if provided
    if (userId) {
      service.setUser(userId, username, role);
    }
    
    // Subscribe to connection state changes
    const unsubscribeConnection = service.subscribe('connection:status', (state) => {
      setConnectionState(state);
      
      // Call callbacks
      if (state.connected && onConnected) {
        onConnected();
      } else if (!state.connected && onDisconnected) {
        onDisconnected();
      }
    });
    
    // Subscribe to error events
    const unsubscribeError = service.onError((error) => {
      setLastError(error);
      if (onError) {
        onError(error);
      }
    });
    
    // Subscribe to user events
    const unsubscribeUserJoined = service.subscribe('user:joined', (user) => {
      setActiveUsers(prev => {
        const filtered = prev.filter(u => u.userId !== user.userId);
        return [...filtered, user];
      });
    });
    
    const unsubscribeUserLeft = service.subscribe('user:left', (user) => {
      setActiveUsers(prev => prev.filter(u => u.userId !== user.userId));
    });
    
    const unsubscribeUserActivity = service.subscribe('user:activity', (activity) => {
      // Update active users with latest activity
      setActiveUsers(prev => prev.map(user => 
        user.userId === activity.userId 
          ? { ...user, lastSeen: activity.timestamp }
          : user
      ));
    });
    
    // Auto-connect if requested
    if (autoConnect) {
      connect();
    }
    
    // Update metrics periodically
    const metricsInterval = setInterval(() => {
      setMetrics(service.getMetrics());
    }, 5000);
    
    // Cleanup function
    return () => {
      unsubscribeConnection();
      unsubscribeError();
      unsubscribeUserJoined();
      unsubscribeUserLeft();
      unsubscribeUserActivity();
      clearInterval(metricsInterval);
    };
  }, [autoConnect, connect, userId, username, role, onError, onConnected, onDisconnected]);
  
  // Update current user when user list changes
  useEffect(() => {
    if (userId) {
      const user = activeUsers.find(u => u.userId === userId);
      setCurrentUser(user);
    }
  }, [activeUsers, userId]);
  
  // Clear error after 10 seconds
  useEffect(() => {
    if (lastError) {
      const timeout = setTimeout(() => {
        setLastError(undefined);
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  }, [lastError]);
  
  const contextValue: EnhancedWebSocketContextValue = {
    service,
    connectionState,
    metrics,
    isConnected,
    isConnecting,
    activeUsers,
    currentUser,
    lastError,
    connect,
    disconnect,
    reconnect,
    updateConfig,
    enableDebugMode,
    disableDebugMode,
  };
  
  return (
    <EnhancedWebSocketContext.Provider value={contextValue}>
      {children}
    </EnhancedWebSocketContext.Provider>
  );
}

export function useEnhancedWebSocketContext(): EnhancedWebSocketContextValue {
  const context = useContext(EnhancedWebSocketContext);
  
  if (!context) {
    throw new Error(
      'useEnhancedWebSocketContext must be used within an EnhancedWebSocketProvider'
    );
  }
  
  return context;
}

// Optional HOC for component injection
export function withEnhancedWebSocket<P extends object>(
  Component: React.ComponentType<P & { websocket: EnhancedWebSocketContextValue }>
) {
  return function WebSocketEnhancedComponent(props: P) {
    const websocket = useEnhancedWebSocketContext();
    
    return <Component {...props} websocket={websocket} />;
  };
}

export default EnhancedWebSocketProvider;