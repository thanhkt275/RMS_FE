/**
 * Centralized WebSocket Manager
 * Single Responsibility: Manage single WebSocket connection across browser tabs
 * Coordinates with backend centralized connection management
 */

import { io, Socket } from 'socket.io-client';
import { 
  IWebSocketManager,
  CentralizedConnectionState,
  CentralizedEmitOptions,
  WebSocketManagerConfig,
  CentralizedWebSocketError
} from '../interfaces/websocket-manager.interface';
import { CrossTabCommunicator } from './cross-tab-communicator';
import { TabCoordinator } from './tab-coordinator';
import { EventCallback, EventOptions } from '@/services/unified-websocket/event-manager';
import { WebSocketEventData } from '@/types/websocket';
import { getMemoryManager, createCleanupTarget } from './memory-manager';

import { ConnectionState } from '@/services/unified-websocket/connection-manager';


/**
 * Main WebSocket Manager implementing centralized architecture
 */
export class WebSocketManager implements IWebSocketManager {
  private static instance: WebSocketManager | null = null;
  
  // Core components
  private socket: Socket | null = null;
  private crossTabCommunicator: CrossTabCommunicator;
  private tabCoordinator: TabCoordinator;
  
  // State management
  private connectionState: CentralizedConnectionState;
  private subscriptions = new Map<string, Set<{ id: string; callback: EventCallback<any>; options?: EventOptions }>>();
  private connectionStatusCallbacks = new Set<(state: CentralizedConnectionState) => void>();
  private errorCallbacks = new Set<(error: Error) => void>();
  
  // Configuration
  private readonly config: WebSocketManagerConfig;
  private readonly sessionId: string;
  
  // Connection management
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  // Metrics
  private stats = {
    messagesReceived: 0,
    messagesSent: 0,
    reconnections: 0,
    errors: 0,
    startTime: Date.now(),
    lastActivity: Date.now()
  };

  // Memory management
  private cleanupUnregister: (() => void) | null = null;
  private isDestroyed = false;

  private constructor(config: WebSocketManagerConfig = {}) {
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 2000,
      connectionTimeout: 15000,
      channelName: 'websocket-sync',
      heartbeatInterval: 30000,
      leaderElectionTimeout: 2000,
      enableLocalStorageFallback: true,
      enableSharedWorkerFallback: false,
      debug: false,
      logLevel: 'INFO',
      ...config
    };

    this.sessionId = this.generateSessionId();
    
    // Initialize connection state
    this.connectionState = {
      isConnected: false,
      isLeader: false,
      tabId: this.generateTabId(),
      connectionStatus: ConnectionState.DISCONNECTED,
      lastHeartbeat: 0,
      leaderTabId: null
    };

    // Initialize cross-tab communication
    this.crossTabCommunicator = new CrossTabCommunicator(this.config.channelName);
    
    // Initialize tab coordination
    this.tabCoordinator = new TabCoordinator(this.crossTabCommunicator, {
      heartbeatInterval: this.config.heartbeatInterval,
      leaderElectionTimeout: this.config.leaderElectionTimeout
    });

    this.setupTabCoordination();
    this.setupCrossTabCommunication();
    this.setupBeforeUnloadHandler();
    this.registerForCleanup();

    // Start leader election
    this.electLeaderAndConnect();
  }

  /**
   * Register for centralized cleanup
   */
  private registerForCleanup(): void {
    const memoryManager = getMemoryManager();
    this.cleanupUnregister = memoryManager.registerCleanupTarget(
      createCleanupTarget(
        `WebSocketManager-${this.sessionId}`,
        () => this.performCleanup(),
        {
          priority: 'critical',
          getMemoryUsage: () => this.getMemoryUsage()
        }
      )
    );
  }

  /**
   * Perform cleanup operations
   */
  private performCleanup(): void {
    if (this.isDestroyed) return;

    // Clean up stale subscriptions
    for (const [event, subscriptions] of this.subscriptions) {
      const staleSubscriptions: string[] = [];

      subscriptions.forEach(({ id, callback }) => {
        // Basic check for stale callbacks
        if (typeof callback !== 'function') {
          staleSubscriptions.push(id);
        }
      });

      staleSubscriptions.forEach(id => {
        const subscription = Array.from(subscriptions).find(sub => sub.id === id);
        if (subscription) {
          subscriptions.delete(subscription);
        }
      });

      // Remove empty event subscriptions
      if (subscriptions.size === 0) {
        this.subscriptions.delete(event);
      }
    }

    // Clean up stale callbacks
    const staleConnectionCallbacks: Array<(state: CentralizedConnectionState) => void> = [];
    this.connectionStatusCallbacks.forEach(callback => {
      if (typeof callback !== 'function') {
        staleConnectionCallbacks.push(callback);
      }
    });
    staleConnectionCallbacks.forEach(callback => {
      this.connectionStatusCallbacks.delete(callback);
    });

    const staleErrorCallbacks: Array<(error: Error) => void> = [];
    this.errorCallbacks.forEach(callback => {
      if (typeof callback !== 'function') {
        staleErrorCallbacks.push(callback);
      }
    });
    staleErrorCallbacks.forEach(callback => {
      this.errorCallbacks.delete(callback);
    });
  }

  /**
   * Get estimated memory usage
   */
  private getMemoryUsage(): number {
    let subscriptionSize = 0;
    for (const subscriptions of this.subscriptions.values()) {
      subscriptionSize += subscriptions.size * 200; // rough estimate per subscription
    }

    return (
      subscriptionSize +
      this.connectionStatusCallbacks.size * 100 +
      this.errorCallbacks.size * 100 +
      1000 // base overhead
    );
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: WebSocketManagerConfig): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager(config);
    }
    return WebSocketManager.instance;
  }

  /**
   * Setup tab coordination
   */
  private setupTabCoordination(): void {
    this.tabCoordinator.onLeaderChange((newLeaderId, oldLeaderId) => {
      const wasLeader = this.connectionState.isLeader;
      const isNowLeader = newLeaderId === this.connectionState.tabId;
      
      this.connectionState.isLeader = isNowLeader;
      this.connectionState.leaderTabId = newLeaderId;
      
      if (!wasLeader && isNowLeader) {
        // Became leader - establish WebSocket connection
        this.establishWebSocketConnection();
      } else if (wasLeader && !isNowLeader) {
        // Lost leadership - close WebSocket connection
        this.closeWebSocketConnection();
      }
      
      this.notifyConnectionStatusChange();
    });
  }

  /**
   * Setup cross-tab communication
   */
  private setupCrossTabCommunication(): void {
    this.crossTabCommunicator.onMessage((message) => {
      if (message.type === 'WEBSOCKET_EVENT') {
        this.handleCrossTabWebSocketEvent(message.data);
      }
    });
  }

  /**
   * Handle WebSocket events from other tabs
   */
  private handleCrossTabWebSocketEvent(eventData: any): void {
    const { event, data, timestamp } = eventData;
    
    // Update stats
    this.stats.messagesReceived++;
    this.stats.lastActivity = Date.now();
    
    // Distribute to local subscribers
    this.distributeEventToSubscribers(event, data);
  }

  /**
   * Elect leader and connect if necessary
   */
  private async electLeaderAndConnect(): Promise<void> {
    try {
      const isLeader = await this.tabCoordinator.electLeader();
      
      this.connectionState.isLeader = isLeader;
      this.connectionState.leaderTabId = isLeader ? this.connectionState.tabId : this.tabCoordinator.getLeaderTabId();
      
      if (isLeader) {
        await this.establishWebSocketConnection();
      }
      
      this.notifyConnectionStatusChange();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.handleError(new Error(`Leader election failed: ${errorMessage}`));
    }
  }

  /**
   * Establish WebSocket connection (only for leader tab)
   */
  private async establishWebSocketConnection(): Promise<void> {
    if (!this.connectionState.isLeader) {
      throw new Error('Only leader tab can establish WebSocket connection');
    }

    if (this.socket?.connected) {
      return; // Already connected
    }

    try {
      this.connectionState.connectionStatus = ConnectionState.CONNECTING;
      this.notifyConnectionStatusChange();

      const url = this.config.url || process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
      
      this.socket = io(url, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: false, // We handle reconnection manually
        timeout: this.config.connectionTimeout,
        forceNew: true
      });

      await this.setupSocketListeners();
      
      // Send session metadata to backend
      this.socket.emit('session_metadata', {
        sessionId: this.sessionId,
        tabId: this.connectionState.tabId,
        isLeader: true,
        timestamp: Date.now()
      });

      this.connectionState.isConnected = true;
      this.connectionState.connectionStatus = ConnectionState.CONNECTED;
      this.connectionState.lastHeartbeat = Date.now();
      
      this.startHeartbeat();
      this.notifyConnectionStatusChange();
      
      console.log(`[WebSocketManager] Leader tab connected: ${this.connectionState.tabId}`);
      
    } catch (error) {
      this.connectionState.connectionStatus = ConnectionState.FAILED;
      this.handleError(error as Error);
      this.scheduleReconnect();
    }
  }

  /**
   * Setup Socket.IO event listeners
   */
  private async setupSocketListeners(): Promise<void> {
    if (!this.socket) return;

    return new Promise((resolve, reject) => {
      const connectTimeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout);

      this.socket!.on('connect', () => {
        clearTimeout(connectTimeout);
        console.log('[WebSocketManager] Socket connected');
        resolve();
      });

      this.socket!.on('disconnect', (reason) => {
        console.log(`[WebSocketManager] Socket disconnected: ${reason}`);
        this.handleDisconnection(reason);
      });

      this.socket!.on('connect_error', (error) => {
        clearTimeout(connectTimeout);
        console.error('[WebSocketManager] Connection error:', error);
        reject(error);
      });

      // Listen for all events and broadcast to other tabs
      this.socket!.onAny((event: string, data: any) => {
        if (event.startsWith('connect') || event.startsWith('disconnect')) {
          return; // Skip connection events
        }

        // Update stats
        this.stats.messagesReceived++;
        this.stats.lastActivity = Date.now();

        // Broadcast to all tabs in this browser session
        this.crossTabCommunicator.broadcast({
          type: 'WEBSOCKET_EVENT',
          tabId: this.connectionState.tabId,
          timestamp: Date.now(),
          messageId: `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          data: { event, data }
        });

        // Also distribute to local subscribers
        this.distributeEventToSubscribers(event, data);
      });
    });
  }

  /**
   * Distribute event to local subscribers
   */
  private distributeEventToSubscribers(event: string, data: WebSocketEventData): void {
    const eventSubscriptions = this.subscriptions.get(event);
    if (!eventSubscriptions) return;

    eventSubscriptions.forEach(({ callback, options }) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[WebSocketManager] Error in event callback for ${event}:`, error);
        this.handleError(error as Error);
      }
    });
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(reason: string): void {
    this.connectionState.isConnected = false;
    this.connectionState.connectionStatus = ConnectionState.DISCONNECTED;
    this.stopHeartbeat();
    this.notifyConnectionStatusChange();

    // Only leader should attempt reconnection
    if (this.connectionState.isLeader) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.reconnectAttempts!) {
      this.handleError(new Error('Max reconnection attempts reached'));
      return;
    }

    const delay = this.config.reconnectDelay! * Math.pow(2, this.reconnectAttempts); // Exponential backoff
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.stats.reconnections++;
      console.log(`[WebSocketManager] Reconnection attempt ${this.reconnectAttempts}/${this.config.reconnectAttempts}`);
      this.establishWebSocketConnection();
    }, delay);
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat', {
          sessionId: this.sessionId,
          tabId: this.connectionState.tabId,
          timestamp: Date.now()
        });
        this.connectionState.lastHeartbeat = Date.now();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Close WebSocket connection
   */
  private closeWebSocketConnection(): void {
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionState.isConnected = false;
    this.connectionState.connectionStatus = ConnectionState.DISCONNECTED;
    this.reconnectAttempts = 0;
  }

  /**
   * Setup beforeunload handler
   */
  private setupBeforeUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      this.tabCoordinator.onTabClosing();
      this.crossTabCommunicator.close();
      this.closeWebSocketConnection();
    });
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    this.stats.errors++;
    
    const centralizedError: CentralizedWebSocketError = {
      ...error,
      type: 'CONNECTION',
      tabId: this.connectionState.tabId,
      timestamp: Date.now(),
      context: {
        isLeader: this.connectionState.isLeader,
        connectionStatus: this.connectionState.connectionStatus,
        reconnectAttempts: this.reconnectAttempts
      }
    };

    this.errorCallbacks.forEach(callback => {
      try {
        callback(centralizedError);
      } catch (callbackError) {
        console.error('[WebSocketManager] Error in error callback:', callbackError);
      }
    });
  }

  /**
   * Notify connection status change
   */
  private notifyConnectionStatusChange(): void {
    this.connectionStatusCallbacks.forEach(callback => {
      try {
        callback({ ...this.connectionState });
      } catch (error) {
        console.error('[WebSocketManager] Error in connection status callback:', error);
      }
    });
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique tab ID
   */
  private generateTabId(): string {
    return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public interface implementation
  async connect(url?: string): Promise<void> {
    if (url) {
      this.config.url = url;
    }
    
    if (!this.connectionState.isLeader) {
      // Non-leader tabs don't establish connections
      return;
    }
    
    await this.establishWebSocketConnection();
  }

  disconnect(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    this.closeWebSocketConnection();
    this.tabCoordinator.onTabClosing();
    this.crossTabCommunicator.close();

    // Clear all subscriptions and callbacks
    this.subscriptions.clear();
    this.connectionStatusCallbacks.clear();
    this.errorCallbacks.clear();

    // Unregister from memory manager
    if (this.cleanupUnregister) {
      this.cleanupUnregister();
      this.cleanupUnregister = null;
    }

    // Clear singleton instance
    WebSocketManager.instance = null;
  }

  isConnected(): boolean {
    return this.connectionState.isConnected;
  }

  getConnectionState(): CentralizedConnectionState {
    return { ...this.connectionState };
  }

  emit(event: string, data: WebSocketEventData, options?: CentralizedEmitOptions): void {
    if (!this.connectionState.isLeader || !this.socket?.connected) {
      console.warn('[WebSocketManager] Cannot emit - not leader or not connected');
      return;
    }

    try {
      this.socket.emit(event, data);
      this.stats.messagesSent++;
      this.stats.lastActivity = Date.now();
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  subscribe<T = WebSocketEventData>(
    event: string, 
    callback: EventCallback<T>, 
    options?: EventOptions
  ): () => void {
    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set());
    }
    
    const subscription = { id: subscriptionId, callback, options };
    this.subscriptions.get(event)!.add(subscription);
    
    // Return unsubscribe function
    return () => {
      const eventSubscriptions = this.subscriptions.get(event);
      if (eventSubscriptions) {
        eventSubscriptions.delete(subscription);
        if (eventSubscriptions.size === 0) {
          this.subscriptions.delete(event);
        }
      }
    };
  }

  unsubscribe(event: string): void {
    this.subscriptions.delete(event);
  }

  isLeader(): boolean {
    return this.connectionState.isLeader;
  }

  getTabId(): string {
    return this.connectionState.tabId;
  }

  getLeaderTabId(): string | null {
    return this.connectionState.leaderTabId;
  }

  getStats(): Record<string, any> {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      subscriptions: this.subscriptions.size,
      crossTabStats: this.crossTabCommunicator.getStats(),
      connectionState: this.connectionState
    };
  }

  onConnectionStatusChange(callback: (state: CentralizedConnectionState) => void): () => void {
    this.connectionStatusCallbacks.add(callback);
    return () => this.connectionStatusCallbacks.delete(callback);
  }

  onError(callback: (error: Error) => void): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }
}
