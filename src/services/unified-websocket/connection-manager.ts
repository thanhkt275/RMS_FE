import { io, Socket } from 'socket.io-client';

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  FAILED = 'FAILED'
}

export interface ConnectionStatus {
  state: ConnectionState;
  connected: boolean;
  ready: boolean; // Indicates if connection is fully ready for operations
  reconnectAttempts: number;
  lastConnected?: Date;
  lastError?: string;
}

export type ConnectionStatusCallback = (status: ConnectionStatus) => void;

/**
 * ConnectionManager handles WebSocket connection lifecycle with robust error recovery
 * Implements exponential backoff reconnection with max 5 attempts
 */
export class ConnectionManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private ready = false; // Track if connection is fully ready
  private statusCallbacks: Set<ConnectionStatusCallback> = new Set();
  private currentUrl?: string;

  /**
   * Connect to WebSocket server with automatic reconnection
   */
  async connect(url?: string): Promise<void> {
    const targetUrl = url || process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';
    this.currentUrl = targetUrl;

    if (this.socket?.connected) {
      console.log('[ConnectionManager] Already connected');
      return;
    }

    this.updateConnectionState(ConnectionState.CONNECTING);

    try {
      this.socket = io(targetUrl, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: false, // We handle reconnection manually
        timeout: 10000,
        forceNew: true
      });

      this.setupSocketEventHandlers();
      
      // Wait for connection to establish
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket!.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.socket!.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

    } catch (error: unknown) {
      console.error('[ConnectionManager] Connection failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateConnectionState(ConnectionState.FAILED, errorMessage);
      this.handleReconnection();
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.clearReconnectTimeout();
    this.ready = false; // Mark as not ready when disconnecting
    
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.reconnectAttempts = 0;
    this.updateConnectionState(ConnectionState.DISCONNECTED);
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Check if connection is ready for operations (connected + ready)
   */
  isReady(): boolean {
    return this.isConnected() && this.ready;
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return {
      state: this.connectionState,
      connected: this.isConnected(),
      ready: this.ready,
      reconnectAttempts: this.reconnectAttempts,
      lastConnected: this.connectionState === ConnectionState.CONNECTED ? new Date() : undefined
    };
  }

  /**
   * Get the underlying socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionStatus(callback: ConnectionStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    // Immediately call with current status
    callback(this.getConnectionStatus());
    
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Force reconnection (resets attempt counter)
   */
  forceReconnect(): void {
    this.reconnectAttempts = 0;
    this.disconnect();
    if (this.currentUrl) {
      this.connect(this.currentUrl);
    }
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[ConnectionManager] Connected successfully');
      this.reconnectAttempts = 0;
      this.clearReconnectTimeout();
      this.updateConnectionState(ConnectionState.CONNECTED);
      
      // Add a small delay to ensure socket is fully ready before marking as ready
      setTimeout(() => {
        this.ready = true;
        console.log('[ConnectionManager] Connection is now ready for operations');
        this.updateConnectionState(ConnectionState.CONNECTED); // Trigger status update with ready=true
        this.syncStateOnReconnect();
      }, 200); // 200ms delay to ensure socket is fully ready
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[ConnectionManager] Disconnected: ${reason}`);
      this.ready = false; // Mark as not ready when disconnected
      this.updateConnectionState(ConnectionState.DISCONNECTED);
      
      // Only attempt reconnection if it wasn't a manual disconnect
      if (reason !== 'io client disconnect') {
        this.handleReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[ConnectionManager] Connection error:', error);
      this.updateConnectionState(ConnectionState.FAILED, error.message);
      this.handleReconnection();
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('[ConnectionManager] Reconnection error:', error);
      this.updateConnectionState(ConnectionState.FAILED, error.message);
    });
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[ConnectionManager] Max reconnection attempts reached');
      this.updateConnectionState(ConnectionState.FAILED, 'Max reconnection attempts reached');
      return;
    }

    this.updateConnectionState(ConnectionState.RECONNECTING);
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 16000);
    
    console.log(`[ConnectionManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      if (this.currentUrl) {
        this.connect(this.currentUrl).catch((error) => {
          console.error('[ConnectionManager] Reconnection failed:', error);
        });
      }
    }, delay);
  }

  /**
   * Sync state after reconnection
   */
  private syncStateOnReconnect(): void {
    // This will be implemented by the unified service
    // to resync tournament rooms, field rooms, and current state
    console.log('[ConnectionManager] State resync after reconnection');
  }

  /**
   * Update connection state and notify callbacks
   */
  private updateConnectionState(state: ConnectionState, error?: string): void {
    this.connectionState = state;
    const status = this.getConnectionStatus();
    if (error) {
      (status).lastError = error;
    }
    
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('[ConnectionManager] Error in status callback:', error);
      }
    });
  }

  /**
   * Clear reconnection timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}