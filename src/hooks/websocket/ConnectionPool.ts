/**
 * WebSocket Connection Pool for RMS System
 * Manages shared connections to reduce server load and improve performance
 */

import { EventEmitter } from 'events';
import { unifiedWebSocketService } from '@/lib/unified-websocket';

interface ConnectionMetrics {
  subscriberCount: number;
  createdAt: number;
  lastUsed: number;
  totalEvents: number;
  errors: number;
}

interface PooledConnection {
  service: typeof unifiedWebSocketService;
  metrics: ConnectionMetrics;
  subscribers: Set<string>;
  isActive: boolean;
}

export class ConnectionPool extends EventEmitter {
  private static instance: ConnectionPool;
  private connections: Map<string, PooledConnection> = new Map();
  private subscribers: Map<string, Set<string>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 30000; // 30 seconds
  private readonly MAX_IDLE_TIME = 300000; // 5 minutes

  private constructor() {
    super();
    this.startCleanupTimer();
  }

  public static getInstance(): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool();
    }
    return ConnectionPool.instance;
  }

  /**
   * Get or create a shared connection for a tournament
   */
  getConnection(tournamentId: string, subscriberId: string): typeof unifiedWebSocketService {
    const key = this.getConnectionKey(tournamentId);
    
    // Get or create connection
    if (!this.connections.has(key)) {
      this.createConnection(key, tournamentId);
    }

    const connection = this.connections.get(key)!;
    
    // Add subscriber
    connection.subscribers.add(subscriberId);
    connection.metrics.lastUsed = Date.now();
    
    // Track subscriber for this tournament
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(subscriberId);

    console.log(`[ConnectionPool] Connection acquired for tournament ${tournamentId}, subscribers: ${connection.subscribers.size}`);
    
    return connection.service;
  }

  /**
   * Release a connection when subscriber no longer needs it
   */
  releaseConnection(tournamentId: string, subscriberId: string): void {
    const key = this.getConnectionKey(tournamentId);
    const connection = this.connections.get(key);
    
    if (!connection) {
      console.warn(`[ConnectionPool] No connection found for tournament: ${tournamentId}`);
      return;
    }

    // Remove subscriber
    connection.subscribers.delete(subscriberId);
    this.subscribers.get(key)?.delete(subscriberId);

    console.log(`[ConnectionPool] Connection released for tournament ${tournamentId}, remaining subscribers: ${connection.subscribers.size}`);

    // If no more subscribers, mark for cleanup
    if (connection.subscribers.size === 0) {
      connection.isActive = false;
      console.log(`[ConnectionPool] Connection marked for cleanup: ${tournamentId}`);
      
      // Immediate cleanup for unused connections
      setTimeout(() => this.cleanupConnection(key), 5000);
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): Record<string, any> {
    const stats = {
      totalConnections: this.connections.size,
      activeConnections: 0,
      totalSubscribers: 0,
      connections: {} as Record<string, any>
    };

    for (const [key, connection] of this.connections) {
      if (connection.isActive) {
        stats.activeConnections++;
      }
      stats.totalSubscribers += connection.subscribers.size;
      
      stats.connections[key] = {
        subscriberCount: connection.subscribers.size,
        isActive: connection.isActive,
        createdAt: new Date(connection.metrics.createdAt).toISOString(),
        lastUsed: new Date(connection.metrics.lastUsed).toISOString(),
        totalEvents: connection.metrics.totalEvents,
        errors: connection.metrics.errors,
        uptime: Date.now() - connection.metrics.createdAt
      };
    }

    return stats;
  }

  /**
   * Force cleanup of all connections
   */
  cleanup(): void {
    console.log('[ConnectionPool] Performing forced cleanup of all connections');
    
    for (const [key, connection] of this.connections) {
      try {
        connection.service.disconnect();
      } catch (error) {
        console.error(`[ConnectionPool] Error disconnecting ${key}:`, error);
      }
    }

    this.connections.clear();
    this.subscribers.clear();
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get health status of all connections
   */
  getHealthStatus(): Record<string, boolean> {
    const health: Record<string, boolean> = {};
    
    for (const [key, connection] of this.connections) {
      health[key] = connection.service.isConnected() && connection.isActive;
    }
    
    return health;
  }

  // Private methods

  private getConnectionKey(tournamentId: string): string {
    return `tournament:${tournamentId}`;
  }

  private createConnection(key: string, tournamentId: string): void {
    console.log(`[ConnectionPool] Creating new connection for: ${key}`);
    
    const connection: PooledConnection = {
      service: unifiedWebSocketService,
      metrics: {
        subscriberCount: 0,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        totalEvents: 0,
        errors: 0
      },
      subscribers: new Set(),
      isActive: true
    };

    // Set up event tracking
    this.setupConnectionTracking(connection, key);
    
    this.connections.set(key, connection);
    
    // Emit connection created event
    this.emit('connectionCreated', { key, tournamentId });
  }

  private setupConnectionTracking(connection: PooledConnection, key: string): void {
    // Track events for metrics
    const originalEmit = connection.service.emit.bind(connection.service);
    connection.service.emit = (event: string, data: any, options?: any) => {
      connection.metrics.totalEvents++;
      connection.metrics.lastUsed = Date.now();
      return originalEmit(event, data, options);
    };

    // Track connection errors
    connection.service.onError((error) => {
      connection.metrics.errors++;
      console.error(`[ConnectionPool] Error in connection ${key}:`, error);
      this.emit('connectionError', { key, error });
    });
  }

  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL);
  }

  private performCleanup(): void {
    const now = Date.now();
    const toCleanup: string[] = [];

    for (const [key, connection] of this.connections) {
      const idleTime = now - connection.metrics.lastUsed;
      
      if (!connection.isActive || (connection.subscribers.size === 0 && idleTime > this.MAX_IDLE_TIME)) {
        toCleanup.push(key);
      }
    }

    for (const key of toCleanup) {
      this.cleanupConnection(key);
    }

    if (toCleanup.length > 0) {
      console.log(`[ConnectionPool] Cleaned up ${toCleanup.length} idle connections`);
    }
  }

  private cleanupConnection(key: string): void {
    const connection = this.connections.get(key);
    
    if (!connection) return;

    try {
      // Only disconnect if no active subscribers
      if (connection.subscribers.size === 0) {
        connection.service.disconnect();
        this.connections.delete(key);
        this.subscribers.delete(key);
        
        console.log(`[ConnectionPool] Connection cleaned up: ${key}`);
        this.emit('connectionCleaned', { key });
      }
    } catch (error) {
      console.error(`[ConnectionPool] Error cleaning up connection ${key}:`, error);
    }
  }
}

// Export singleton instance
export const connectionPool = ConnectionPool.getInstance();
export default connectionPool;
