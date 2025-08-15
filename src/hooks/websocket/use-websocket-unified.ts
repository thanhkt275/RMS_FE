/**
 * Unified WebSocket Hook
 * Single Responsibility: Provide unified WebSocket interface with centralized architecture
 * Replaces all existing WebSocket hooks with cross-tab synchronization and backward compatibility
 */

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import {
  WebSocketManager,
  CrossTabSynchronizer,
  ConnectionStateManager,
  NetworkStateMonitor,
  ConnectionRecoveryManager,
  ConnectionOwnershipManager
} from '@/services/centralized-websocket';
import { getMemoryManager } from '@/services/centralized-websocket/core/memory-manager';
import {
  CentralizedConnectionState,
  CentralizedEmitOptions,
  SynchronizedMessage,
  SyncStats,
  NetworkState,
  ConnectionHealth,
  RecoveryStrategy
} from '@/services/centralized-websocket/interfaces/websocket-manager.interface';
import { WebSocketEventData } from '@/types/websocket';
import { EventCallback } from '@/services/unified-websocket/event-manager';
import { UserRole } from '@/types/types';
import { ConnectionState } from '@/services/unified-websocket/connection-manager';

/**
 * Unified WebSocket hook options
 */
export interface UseWebSocketOptions {
  // Connection settings
  url?: string;
  autoConnect?: boolean;
  
  // Room management
  tournamentId?: string;
  fieldId?: string;
  matchId?: string;
  
  // User context
  userRole?: UserRole | string;
  userId?: string;
  
  // Event subscriptions
  events?: string[];
  
  // Behavior options
  reconnectOnFocus?: boolean;
  enableHeartbeat?: boolean;
  enableCrossTabSync?: boolean;
  
  // Recovery options
  recoveryStrategy?: RecoveryStrategy;
  maxRetries?: number;
  
  // Debug options
  debug?: boolean;
  
  // Legacy compatibility
  legacyMode?: boolean;
}

/**
 * Cross-tab synchronization data
 */
export interface CrossTabSyncData {
  isEnabled: boolean;
  isLeader: boolean;
  tabCount: number;
  syncStats: SyncStats;
  lastSyncTime: number;
}

/**
 * Connection health information
 */
export interface ConnectionHealthInfo {
  isHealthy: boolean;
  latency: number;
  successRate: number;
  lastCheck: number;
  networkState: NetworkState;
}

/**
 * Unified WebSocket hook return type
 */
export interface UseWebSocketReturn {
  // Connection state
  isConnected: boolean;
  isLeader: boolean;
  connectionState: CentralizedConnectionState;
  
  // Connection management
  connect: (url?: string) => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  
  // Event handling
  emit: (event: string, data: WebSocketEventData, options?: CentralizedEmitOptions) => void;
  subscribe: <T = WebSocketEventData>(
    event: string, 
    callback: EventCallback<T>
  ) => () => void;
  
  // Room management
  joinRoom: (roomId: string, roomType?: 'tournament' | 'field' | 'match') => Promise<void>;
  leaveRoom: (roomId: string, roomType?: 'tournament' | 'field' | 'match') => Promise<void>;
  
  // Specialized emitters (backward compatibility)
  sendScoreUpdate: (data: any) => void;
  sendTimerUpdate: (data: any) => void;
  sendMatchUpdate: (data: any) => void;
  sendDisplayModeChange: (data: any) => void;
  sendAnnouncement: (data: any) => void;
  
  // Cross-tab synchronization
  crossTabSync: CrossTabSyncData;
  syncData: (data: any) => void;
  
  // Health and monitoring
  connectionHealth: ConnectionHealthInfo;
  getStats: () => any;
  
  // Recovery management
  setRecoveryStrategy: (strategy: RecoveryStrategy) => void;
  triggerRecovery: () => Promise<boolean>;
  
  // Error handling
  onError: (callback: (error: Error) => void) => () => void;
  
  // Legacy compatibility methods
  joinTournament: (tournamentId: string) => void;
  leaveTournament: (tournamentId: string) => void;
  joinFieldRoom: (fieldId: string) => void;
  leaveFieldRoom: (fieldId: string) => void;
}

/**
 * Unified WebSocket hook with centralized architecture and cross-tab synchronization
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url,
    autoConnect = true,
    tournamentId,
    fieldId,
    matchId,
    userRole = UserRole.COMMON,
    userId,
    events = [],
    reconnectOnFocus = true,
    enableHeartbeat = true,
    enableCrossTabSync = true,
    recoveryStrategy = 'exponential',
    maxRetries = 5,
    debug = false,
    legacyMode = false
  } = options;

  // State management
  // CentralizedConnectionState shape is defined in the manager interfaces. Keep initial state minimal.
  const [connectionState, setConnectionState] = useState<CentralizedConnectionState>({
    isConnected: false,
    isLeader: false,
    tabId: '',
    connectionStatus: ConnectionState.DISCONNECTED,
    lastHeartbeat: 0,
    leaderTabId: null
  });

  // Stable default URL for connections (do not store on connectionState which is managed by the manager)
  const defaultUrl = url || process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

  const [crossTabSync, setCrossTabSync] = useState<CrossTabSyncData>({
    isEnabled: enableCrossTabSync,
    isLeader: false,
    tabCount: 1,
    syncStats: {
      messagesSent: 0,
      messagesReceived: 0,
      messagesDropped: 0,
      messagesRetried: 0,
      averageLatency: 0,
      lastSyncTime: 0,
      activeConnections: 0,
      fallbackActive: false
    },
    lastSyncTime: 0
  });

  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealthInfo>({
    isHealthy: true,
    latency: 0,
    successRate: 1.0,
    lastCheck: Date.now(),
    networkState: {
  isOnline: (typeof navigator !== 'undefined') ? navigator.onLine : true,
      connectionType: 'unknown',
      lastChange: Date.now()
    }
  });

  // Refs for stable references
  const managerRef = useRef<WebSocketManager | null>(null);
  const synchronizerRef = useRef<CrossTabSynchronizer | null>(null);
  const networkMonitorRef = useRef<NetworkStateMonitor | null>(null);
  const recoveryManagerRef = useRef<ConnectionRecoveryManager | null>(null);
  const ownershipManagerRef = useRef<ConnectionOwnershipManager | null>(null);
  
  const roomsRef = useRef<Set<string>>(new Set());
  const subscriptionsRef = useRef<Map<string, () => void>>(new Map());
  const errorCallbacksRef = useRef<Set<(error: Error) => void>>(new Set());

  // Initialize managers
  useEffect(() => {
    const initializeManagers = async () => {
      try {
        // Initialize Memory Manager first
        const memoryManager = getMemoryManager();
        memoryManager.start();

        // Initialize WebSocket Manager
        managerRef.current = WebSocketManager.getInstance({
          url: defaultUrl,
          heartbeatInterval: enableHeartbeat ? 30000 : 0,
          reconnectAttempts: maxRetries,
          debug
        });

        // Initialize Cross-Tab Synchronizer if enabled
        if (enableCrossTabSync) {
          const communicator = (managerRef.current as any).crossTabCommunicator;
          if (communicator) {
            synchronizerRef.current = new CrossTabSynchronizer(communicator);
            await synchronizerRef.current.start();
          }
        }

        // Initialize Network Monitor
        networkMonitorRef.current = new NetworkStateMonitor();
        networkMonitorRef.current.startMonitoring();

        // Initialize Recovery Manager
        if (managerRef.current && networkMonitorRef.current) {
          recoveryManagerRef.current = new ConnectionRecoveryManager(
            networkMonitorRef.current,
            async () => {
              if (managerRef.current) {
                await managerRef.current.connect();
                return managerRef.current.isConnected();
              }
              return false;
            },
            async () => {
              return managerRef.current?.isConnected() || false;
            }
          );
          
          recoveryManagerRef.current.setRecoveryStrategy(recoveryStrategy);
          recoveryManagerRef.current.startHealthMonitoring();
        }

        // Initialize Connection Ownership Manager
        if (managerRef.current && synchronizerRef.current) {
          const tabCoordinator = (managerRef.current as any).tabCoordinator;
          const stateManager = new ConnectionStateManager(synchronizerRef.current);
          
          if (tabCoordinator) {
            ownershipManagerRef.current = new ConnectionOwnershipManager(
              tabCoordinator,
              stateManager,
              synchronizerRef.current
            );
            
            ownershipManagerRef.current.setConnectionFunctions(
              async () => {
                if (managerRef.current) {
                  await managerRef.current.connect();
                }
              },
              async () => {
                if (managerRef.current) {
                  managerRef.current.disconnect();
                }
              }
            );
          }
        }

        if (debug) {
          console.log('[useWebSocket] Managers initialized successfully');
        }

      } catch (error) {
        console.error('[useWebSocket] Failed to initialize managers:', error);
        errorCallbacksRef.current.forEach(callback => {
          try {
            callback(error as Error);
          } catch (callbackError) {
            console.error('[useWebSocket] Error in error callback:', callbackError);
          }
        });
      }
    };

    initializeManagers();

    // Cleanup on unmount
    return () => {
      // Stop all managers
      synchronizerRef.current?.stop();
      networkMonitorRef.current?.destroy();
      recoveryManagerRef.current?.destroy();
      ownershipManagerRef.current?.destroy();
      
      // Clear subscriptions
      subscriptionsRef.current.forEach(unsubscribe => unsubscribe());
      subscriptionsRef.current.clear();
      
      // Clear rooms
      roomsRef.current.clear();
      
      // Clear error callbacks
      errorCallbacksRef.current.clear();
    };
  }, []);

  // Connection state monitoring
  useEffect(() => {
    if (!managerRef.current) return;

  const unsubscribe = managerRef.current.onConnectionStatusChange((state) => {
      setConnectionState(state);
      
      if (debug) {
        console.log('[useWebSocket] Connection state changed:', state);
      }
    });

    return unsubscribe;
  }, [debug]);

  // Cross-tab sync monitoring
  useEffect(() => {
    if (!synchronizerRef.current || !enableCrossTabSync) return;

    const updateSyncStats = () => {
      if (synchronizerRef.current) {
        const stats = synchronizerRef.current.getStats();
        const isLeader = synchronizerRef.current.getSequenceNumber() > 0;
        
        setCrossTabSync(prev => ({
          ...prev,
          isLeader,
          syncStats: stats,
          lastSyncTime: stats.lastSyncTime
        }));
      }
    };

    const interval = setInterval(updateSyncStats, 5000); // Update every 5 seconds
    updateSyncStats(); // Initial update

    return () => clearInterval(interval);
  }, [enableCrossTabSync]);

  // Network and health monitoring
  useEffect(() => {
    if (!networkMonitorRef.current || !recoveryManagerRef.current) return;

    const unsubscribeNetwork = networkMonitorRef.current.onNetworkChange((networkState) => {
      setConnectionHealth(prev => ({
        ...prev,
        networkState
      }));
    });

    const unsubscribeHealth = recoveryManagerRef.current.onHealthChange((health) => {
      setConnectionHealth(prev => ({
        ...prev,
        isHealthy: health.isHealthy,
        latency: health.averageLatency,
        successRate: health.successRate,
        lastCheck: health.lastHealthCheck
      }));
    });

    return () => {
      unsubscribeNetwork();
      unsubscribeHealth();
    };
  }, []);

  // Connection management functions
  const connect = useCallback(async (connectUrl?: string) => {
    if (!managerRef.current) {
      throw new Error('WebSocket manager not initialized');
    }

    try {
      const targetUrl = connectUrl || defaultUrl;
      await managerRef.current.connect(targetUrl);

      if (debug) {
        console.log('[useWebSocket] Connected successfully');
      }
    } catch (error) {
      console.error('[useWebSocket] Connection failed:', error);

      // Trigger recovery if available
      if (recoveryManagerRef.current) {
        recoveryManagerRef.current.startRecovery('network', error as Error);
      }

      throw error;
    }
  }, [defaultUrl, debug]);

  const disconnect = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.disconnect();

      if (debug) {
        console.log('[useWebSocket] Disconnected');
      }
    }
  }, [debug]);

  const reconnect = useCallback(async () => {
    disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
    await connect();
  }, [connect, disconnect]);

  // Event handling functions
  const emit = useCallback((event: string, data: WebSocketEventData, options?: CentralizedEmitOptions) => {
    if (!managerRef.current) {
      console.warn('[useWebSocket] Cannot emit - manager not initialized');
      return;
    }

    try {
      // Add context data
      const contextData = {
        ...data,
        tournamentId: options?.tournamentId || tournamentId,
        fieldId: options?.fieldId || fieldId,
  matchId: matchId,
        userRole,
        userId,
        timestamp: Date.now()
      };

      managerRef.current.emit(event, contextData, options);

      // Broadcast to other tabs if cross-tab sync is enabled
      if (enableCrossTabSync && synchronizerRef.current) {
        synchronizerRef.current.broadcast({
          type: 'WEBSOCKET_EVENT',
          tabId: connectionState.tabId,
          messageId: `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          priority: 'normal',
          data: {
            event,
            data: contextData,
            options
          }
        }).catch(error => {
          console.error('[useWebSocket] Failed to broadcast event:', error);
        });
      }

      if (debug) {
        console.log('[useWebSocket] Emitted event:', event, contextData);
      }
    } catch (error) {
      console.error('[useWebSocket] Failed to emit event:', error);
      errorCallbacksRef.current.forEach(callback => callback(error as Error));
    }
  }, [connectionState.tabId, tournamentId, fieldId, matchId, userRole, userId, enableCrossTabSync, debug]);

  const subscribe = useCallback(<T = WebSocketEventData>(
    event: string,
    callback: EventCallback<T>
  ): (() => void) => {
    if (!managerRef.current) {
      console.warn('[useWebSocket] Cannot subscribe - manager not initialized');
      return () => {};
    }

    try {
      // Subscribe to WebSocket manager
      const unsubscribeManager = managerRef.current.subscribe(event, callback);

      // Subscribe to cross-tab sync if enabled
      let unsubscribeSync: (() => void) | null = null;
      if (enableCrossTabSync && synchronizerRef.current) {
        unsubscribeSync = synchronizerRef.current.onMessage((message: SynchronizedMessage) => {
          if (message.type === 'WEBSOCKET_EVENT' &&
              message.data?.event === event &&
              message.tabId !== connectionState.tabId) {
            try {
              callback(message.data.data as T);
            } catch (error) {
              console.error('[useWebSocket] Error in cross-tab event callback:', error);
            }
          }
        });
      }

      // Combined unsubscribe function
      const combinedUnsubscribe = () => {
        unsubscribeManager();
        if (unsubscribeSync) {
          unsubscribeSync();
        }
        subscriptionsRef.current.delete(event);
      };

      subscriptionsRef.current.set(event, combinedUnsubscribe);

      if (debug) {
        console.log('[useWebSocket] Subscribed to event:', event);
      }

      return combinedUnsubscribe;
    } catch (error) {
      console.error('[useWebSocket] Failed to subscribe to event:', error);
      errorCallbacksRef.current.forEach(callback => callback(error as Error));
      return () => {};
    }
  }, [connectionState.tabId, enableCrossTabSync, debug]);

  // Room management functions
  const joinRoom = useCallback(async (roomId: string, roomType: 'tournament' | 'field' | 'match' = 'tournament') => {
    if (!managerRef.current) {
      console.warn('[useWebSocket] Cannot join room - manager not initialized');
      return;
    }

    try {
      // Determine event name and data based on room type
      let eventName: string;
      let eventData: any;

      switch (roomType) {
        case 'tournament':
          eventName = 'join_tournament';
          eventData = { tournamentId: roomId };
          break;
        case 'field':
          eventName = 'joinFieldRoom';
          eventData = { fieldId: roomId.replace('field:', '') };
          break;
        case 'match':
          eventName = 'join_match';
          eventData = { matchId: roomId };
          break;
        default:
          throw new Error(`Unknown room type: ${roomType}`);
      }

      // Emit join event
      managerRef.current.emit(eventName, eventData);
      roomsRef.current.add(roomId);

      // Broadcast room join to other tabs
      if (enableCrossTabSync && synchronizerRef.current) {
        synchronizerRef.current.broadcast({
          type: 'WEBSOCKET_EVENT',
          tabId: connectionState.tabId,
          messageId: `room-join-${Date.now()}`,
          priority: 'normal',
          data: {
            action: 'join_room',
            roomId,
            roomType
          }
        }).catch(error => {
          console.error('[useWebSocket] Failed to broadcast room join:', error);
        });
      }

      if (debug) {
        console.log(`[useWebSocket] Joined room: ${roomId} (${roomType})`);
      }
    } catch (error) {
      console.error(`[useWebSocket] Failed to join room ${roomId}:`, error);
      errorCallbacksRef.current.forEach(callback => callback(error as Error));
    }
  }, [connectionState.tabId, enableCrossTabSync, debug]);

  const leaveRoom = useCallback(async (roomId: string, roomType: 'tournament' | 'field' | 'match' = 'tournament') => {
    if (!managerRef.current) {
      console.warn('[useWebSocket] Cannot leave room - manager not initialized');
      return;
    }

    try {
      // Determine event name and data based on room type
      let eventName: string;
      let eventData: any;

      switch (roomType) {
        case 'tournament':
          eventName = 'leave_tournament';
          eventData = { tournamentId: roomId };
          break;
        case 'field':
          eventName = 'leaveFieldRoom';
          eventData = { fieldId: roomId.replace('field:', '') };
          break;
        case 'match':
          eventName = 'leave_match';
          eventData = { matchId: roomId };
          break;
        default:
          throw new Error(`Unknown room type: ${roomType}`);
      }

      // Emit leave event
      managerRef.current.emit(eventName, eventData);
      roomsRef.current.delete(roomId);

      // Broadcast room leave to other tabs
      if (enableCrossTabSync && synchronizerRef.current) {
        synchronizerRef.current.broadcast({
          type: 'WEBSOCKET_EVENT',
          tabId: connectionState.tabId,
          messageId: `room-leave-${Date.now()}`,
          priority: 'normal',
          data: {
            action: 'leave_room',
            roomId,
            roomType
          }
        }).catch(error => {
          console.error('[useWebSocket] Failed to broadcast room leave:', error);
        });
      }

      if (debug) {
        console.log(`[useWebSocket] Left room: ${roomId} (${roomType})`);
      }
    } catch (error) {
      console.error(`[useWebSocket] Failed to leave room ${roomId}:`, error);
      errorCallbacksRef.current.forEach(callback => callback(error as Error));
    }
  }, [connectionState.tabId, enableCrossTabSync, debug]);

  // Specialized emitters for backward compatibility
  const sendScoreUpdate = useCallback((data: any) => {
    emit('score_update', data);
  }, [emit]);

  const sendTimerUpdate = useCallback((data: any) => {
    emit('timer_update', data);
  }, [emit]);

  const sendMatchUpdate = useCallback((data: any) => {
    emit('match_update', data);
  }, [emit]);

  const sendDisplayModeChange = useCallback((data: any) => {
    emit('display_mode_change', data);
  }, [emit]);

  const sendAnnouncement = useCallback((data: any) => {
    emit('announcement', data);
  }, [emit]);

  // Cross-tab synchronization functions
  const syncData = useCallback((data: any) => {
    if (!enableCrossTabSync || !synchronizerRef.current) {
      console.warn('[useWebSocket] Cross-tab sync not enabled');
      return;
    }

    try {
      synchronizerRef.current.broadcast({
        type: 'WEBSOCKET_EVENT',
        tabId: connectionState.tabId,
        messageId: `sync-${Date.now()}`,
        priority: 'normal',
        data: {
          action: 'sync_data',
          data,
          timestamp: Date.now()
        }
      }).catch(error => {
        console.error('[useWebSocket] Failed to sync data:', error);
      });
    } catch (error) {
      console.error('[useWebSocket] Failed to sync data:', error);
    }
  }, [connectionState.tabId, enableCrossTabSync]);

  // Health and monitoring functions
  const getStats = useCallback(() => {
    const managerStats = managerRef.current?.getStats() || {};
    const syncStats = synchronizerRef.current?.getStats() || {};
    const networkState = networkMonitorRef.current?.getNetworkState() || {};
    const recoveryStats = recoveryManagerRef.current?.getRecoveryStats() || {};

    return {
      connection: managerStats,
      sync: syncStats,
      network: networkState,
      recovery: recoveryStats,
      rooms: Array.from(roomsRef.current),
      subscriptions: Array.from(subscriptionsRef.current.keys())
    };
  }, []);

  // Recovery management functions
  const setRecoveryStrategy = useCallback((strategy: RecoveryStrategy) => {
    if (recoveryManagerRef.current) {
      recoveryManagerRef.current.setRecoveryStrategy(strategy);

      if (debug) {
        console.log('[useWebSocket] Recovery strategy set to:', strategy);
      }
    }
  }, [debug]);

  const triggerRecovery = useCallback(async (): Promise<boolean> => {
    if (!recoveryManagerRef.current) {
      console.warn('[useWebSocket] Recovery manager not available');
      return false;
    }

    try {
      const success = await recoveryManagerRef.current.startRecovery('client');

      if (debug) {
        console.log('[useWebSocket] Manual recovery result:', success);
      }

      return success;
    } catch (error) {
      console.error('[useWebSocket] Manual recovery failed:', error);
      return false;
    }
  }, [debug]);

  // Error handling
  const onError = useCallback((callback: (error: Error) => void): (() => void) => {
    errorCallbacksRef.current.add(callback);

    return () => {
      errorCallbacksRef.current.delete(callback);
    };
  }, []);

  // Legacy compatibility methods
  const joinTournament = useCallback((tournamentId: string) => {
    if (legacyMode && debug) {
      console.warn('[useWebSocket] Using legacy method joinTournament. Consider using joinRoom instead.');
    }
    joinRoom(tournamentId, 'tournament');
  }, [joinRoom, legacyMode, debug]);

  const leaveTournament = useCallback((tournamentId: string) => {
    if (legacyMode && debug) {
      console.warn('[useWebSocket] Using legacy method leaveTournament. Consider using leaveRoom instead.');
    }
    leaveRoom(tournamentId, 'tournament');
  }, [leaveRoom, legacyMode, debug]);

  const joinFieldRoom = useCallback((fieldId: string) => {
    if (legacyMode && debug) {
      console.warn('[useWebSocket] Using legacy method joinFieldRoom. Consider using joinRoom instead.');
    }
    joinRoom(fieldId, 'field');
  }, [joinRoom, legacyMode, debug]);

  const leaveFieldRoom = useCallback((fieldId: string) => {
    if (legacyMode && debug) {
      console.warn('[useWebSocket] Using legacy method leaveFieldRoom. Consider using leaveRoom instead.');
    }
    leaveRoom(fieldId, 'field');
  }, [leaveRoom, legacyMode, debug]);

  // Auto-connect and room management
  useEffect(() => {
    if (autoConnect && managerRef.current && !connectionState.isConnected) {
      connect().catch(error => {
        console.error('[useWebSocket] Auto-connect failed:', error);
      });
    }
  }, [autoConnect, connectionState.isConnected, connect]);

  // Auto-join rooms when connected
  useEffect(() => {
    if (connectionState.isConnected) {
      const joinPromises: Promise<void>[] = [];

      if (tournamentId) {
        joinPromises.push(joinRoom(tournamentId, 'tournament'));
      }
      if (fieldId) {
        joinPromises.push(joinRoom(fieldId, 'field'));
      }
      if (matchId) {
        joinPromises.push(joinRoom(matchId, 'match'));
      }

      Promise.all(joinPromises).catch(error => {
        console.error('[useWebSocket] Failed to join rooms:', error);
      });
    }
  }, [connectionState.isConnected, tournamentId, fieldId, matchId, joinRoom]);

  // Auto-subscribe to specified events
  useEffect(() => {
    if (events.length > 0 && connectionState.isConnected) {
      const unsubscribeFunctions: (() => void)[] = [];

      events.forEach(event => {
        const unsubscribe = subscribe(event, (data) => {
          if (debug) {
            console.log(`[useWebSocket] Received event ${event}:`, data);
          }
        });
        unsubscribeFunctions.push(unsubscribe);
      });

      return () => {
        unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
      };
    }
  }, [events, connectionState.isConnected, subscribe, debug]);

  // Focus reconnection
  useEffect(() => {
    if (!reconnectOnFocus) return;

    const handleFocus = () => {
      if (!connectionState.isConnected && managerRef.current) {
        if (debug) {
          console.log('[useWebSocket] Window focused, attempting reconnection');
        }
        connect().catch(error => {
          console.error('[useWebSocket] Focus reconnection failed:', error);
        });
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [reconnectOnFocus, connectionState.isConnected, connect, debug]);

  // Return the unified interface
  return {
    // Connection state
    isConnected: connectionState.isConnected,
    isLeader: connectionState.isLeader,
    connectionState,

    // Connection management
    connect,
    disconnect,
    reconnect,

    // Event handling
    emit,
    subscribe,

    // Room management
    joinRoom,
    leaveRoom,

    // Specialized emitters
    sendScoreUpdate,
    sendTimerUpdate,
    sendMatchUpdate,
    sendDisplayModeChange,
    sendAnnouncement,

    // Cross-tab synchronization
    crossTabSync,
    syncData,

    // Health and monitoring
    connectionHealth,
    getStats,

    // Recovery management
    setRecoveryStrategy,
    triggerRecovery,

    // Error handling
    onError,

    // Legacy compatibility
    joinTournament,
    leaveTournament,
    joinFieldRoom,
    leaveFieldRoom
  };
}
