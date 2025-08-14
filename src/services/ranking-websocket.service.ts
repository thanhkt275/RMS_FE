/**
 * Enhanced WebSocket Service for Real-time Rankings
 * 
 * Optimized WebSocket implementation specifically for ranking updates
 * with intelligent batching, deduplication, and fallback mechanisms.
 */

import { unifiedWebSocketService } from '@/lib/unified-websocket';
import { RealTimeRanking, RankingUpdateEvent } from '@/types/ranking.types';
import { rankingCacheService } from './ranking-cache.service';

export interface RankingSubscription {
  tournamentId: string;
  stageId?: string;
  callback: (rankings: RealTimeRanking[]) => void;
  onError?: (error: Error) => void;
  lastUpdate?: number;
}

export interface BatchUpdateConfig {
  batchSize: number;
  batchDelay: number; // milliseconds
  maxBatchAge: number; // milliseconds
}

export interface RankingWebSocketMetrics {
  totalUpdates: number;
  batchedUpdates: number;
  duplicatesFiltered: number;
  averageLatency: number;
  connectionUptime: number;
  lastUpdateTime?: number;
}

/**
 * Specialized WebSocket service for ranking updates
 */
export class RankingWebSocketService {
  private subscriptions = new Map<string, RankingSubscription>();
  private updateQueue = new Map<string, RankingUpdateEvent[]>();
  private batchTimers = new Map<string, NodeJS.Timeout>();
  private lastUpdateHashes = new Map<string, string>();
  private metrics: RankingWebSocketMetrics = {
    totalUpdates: 0,
    batchedUpdates: 0,
    duplicatesFiltered: 0,
    averageLatency: 0,
    connectionUptime: 0,
  };
  private latencyMeasurements: number[] = [];
  private connectionStartTime = Date.now();

  private config: BatchUpdateConfig = {
    batchSize: 10,
    batchDelay: 100, // 100ms batching
    maxBatchAge: 500, // 500ms max age
  };

  constructor() {
    this.setupWebSocketHandlers();
    this.startMetricsCollection();
  }

  /**
   * Subscribe to ranking updates for a tournament/stage
   */
  subscribe(
    tournamentId: string,
    stageId: string | undefined,
    callback: (rankings: RealTimeRanking[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const subscriptionKey = this.getSubscriptionKey(tournamentId, stageId);
    
    const subscription: RankingSubscription = {
      tournamentId,
      stageId,
      callback,
      onError,
      lastUpdate: Date.now(),
    };

    this.subscriptions.set(subscriptionKey, subscription);

    // Join tournament room if not already connected
    this.ensureRoomConnection(tournamentId);

    console.log(`[RankingWebSocket] Subscribed to rankings: ${subscriptionKey}`);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscriptionKey);
    };
  }

  /**
   * Unsubscribe from ranking updates
   */
  private unsubscribe(subscriptionKey: string): void {
    this.subscriptions.delete(subscriptionKey);
    
    // Clear any pending batch updates
    const timer = this.batchTimers.get(subscriptionKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(subscriptionKey);
    }
    
    this.updateQueue.delete(subscriptionKey);
    console.log(`[RankingWebSocket] Unsubscribed from rankings: ${subscriptionKey}`);
  }

  /**
   * Manually trigger ranking update (fallback mechanism)
   */
  async triggerUpdate(tournamentId: string, stageId?: string): Promise<void> {
    try {
      // Emit request for ranking update
      unifiedWebSocketService.emit('request_ranking_update', {
        tournamentId,
        stageId,
        timestamp: Date.now(),
      });

      console.log(`[RankingWebSocket] Triggered manual ranking update for tournament: ${tournamentId}`);
    } catch (error) {
      console.error('[RankingWebSocket] Error triggering manual update:', error);
      throw error;
    }
  }

  /**
   * Get current WebSocket connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    subscriptions: number;
    queuedUpdates: number;
    metrics: RankingWebSocketMetrics;
  } {
    return {
      connected: unifiedWebSocketService.isConnected(),
      subscriptions: this.subscriptions.size,
      queuedUpdates: Array.from(this.updateQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
      metrics: this.getMetrics(),
    };
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    // Handle ranking updates
    unifiedWebSocketService.on('ranking_update', (event: RankingUpdateEvent) => {
      this.handleRankingUpdate(event);
    });

    // Handle ranking recalculation events
    unifiedWebSocketService.on('ranking_recalculation_completed', (event: any) => {
      this.handleRecalculationCompleted(event);
    });

    // Handle connection status changes
    unifiedWebSocketService.onConnectionStatus((status) => {
      if (status.connected) {
        this.onReconnected();
      } else {
        this.onDisconnected();
      }
    });
  }

  /**
   * Handle incoming ranking update events
   */
  private handleRankingUpdate(event: RankingUpdateEvent): void {
    const startTime = Date.now();
    this.metrics.totalUpdates++;

    // Filter for relevant subscriptions
    const relevantSubscriptions = Array.from(this.subscriptions.entries()).filter(
      ([_, subscription]) => 
        subscription.tournamentId === event.tournamentId &&
        (!subscription.stageId || subscription.stageId === event.stageId)
    );

    if (relevantSubscriptions.length === 0) {
      return; // No relevant subscriptions
    }

    // Check for duplicate updates
    const updateHash = this.generateUpdateHash(event);
    const lastHash = this.lastUpdateHashes.get(event.tournamentId + (event.stageId || ''));
    
    if (updateHash === lastHash) {
      this.metrics.duplicatesFiltered++;
      console.log(`[RankingWebSocket] Filtered duplicate update for tournament: ${event.tournamentId}`);
      return;
    }

    this.lastUpdateHashes.set(event.tournamentId + (event.stageId || ''), updateHash);

    // Process updates with batching
    relevantSubscriptions.forEach(([subscriptionKey, subscription]) => {
      this.queueUpdate(subscriptionKey, event, subscription);
    });

    // Record latency
    const latency = Date.now() - (event.timestamp || startTime);
    this.recordLatency(latency);

    // Invalidate cache
    rankingCacheService.invalidateByMatchUpdate(event.tournamentId, event.stageId);
  }

  /**
   * Queue update for batching
   */
  private queueUpdate(
    subscriptionKey: string,
    event: RankingUpdateEvent,
    subscription: RankingSubscription
  ): void {
    if (!this.updateQueue.has(subscriptionKey)) {
      this.updateQueue.set(subscriptionKey, []);
    }

    const queue = this.updateQueue.get(subscriptionKey)!;
    queue.push(event);

    // Check if we should process immediately
    const shouldProcessNow = 
      queue.length >= this.config.batchSize ||
      this.isHighPriorityUpdate(event) ||
      !this.batchTimers.has(subscriptionKey);

    if (shouldProcessNow) {
      this.processBatch(subscriptionKey, subscription);
    } else {
      // Schedule batch processing
      this.scheduleBatchProcessing(subscriptionKey, subscription);
    }
  }

  /**
   * Process batched updates
   */
  private processBatch(subscriptionKey: string, subscription: RankingSubscription): void {
    const queue = this.updateQueue.get(subscriptionKey);
    if (!queue || queue.length === 0) return;

    // Clear timer if exists
    const timer = this.batchTimers.get(subscriptionKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(subscriptionKey);
    }

    // Get the latest update (most recent rankings)
    const latestUpdate = queue[queue.length - 1];
    
    try {
      subscription.callback(latestUpdate.rankings);
      subscription.lastUpdate = Date.now();
      this.metrics.batchedUpdates++;
      
      console.log(`[RankingWebSocket] Processed batch of ${queue.length} updates for: ${subscriptionKey}`);
    } catch (error) {
      console.error(`[RankingWebSocket] Error processing batch for ${subscriptionKey}:`, error);
      subscription.onError?.(error as Error);
    }

    // Clear the queue
    this.updateQueue.set(subscriptionKey, []);
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatchProcessing(subscriptionKey: string, subscription: RankingSubscription): void {
    if (this.batchTimers.has(subscriptionKey)) return; // Already scheduled

    const timer = setTimeout(() => {
      this.processBatch(subscriptionKey, subscription);
    }, this.config.batchDelay);

    this.batchTimers.set(subscriptionKey, timer);
  }

  /**
   * Check if update is high priority (should bypass batching)
   */
  private isHighPriorityUpdate(event: RankingUpdateEvent): boolean {
    // Process immediately for:
    // - Tournament completion
    // - Stage advancement
    // - Manual recalculation
    return event.updateType === 'full' || 
           event.triggerMatchId !== undefined;
  }

  /**
   * Handle recalculation completed events
   */
  private handleRecalculationCompleted(event: any): void {
    console.log(`[RankingWebSocket] Ranking recalculation completed for tournament: ${event.tournamentId}`);
    
    // Trigger fresh data fetch for all relevant subscriptions
    this.subscriptions.forEach((subscription, key) => {
      if (subscription.tournamentId === event.tournamentId) {
        this.triggerUpdate(subscription.tournamentId, subscription.stageId);
      }
    });
  }

  /**
   * Handle reconnection
   */
  private onReconnected(): void {
    console.log('[RankingWebSocket] Reconnected - rejoining tournament rooms');
    
    // Rejoin all tournament rooms
    const tournamentIds = new Set(
      Array.from(this.subscriptions.values()).map(sub => sub.tournamentId)
    );
    
    tournamentIds.forEach(tournamentId => {
      this.ensureRoomConnection(tournamentId);
    });

    this.connectionStartTime = Date.now();
  }

  /**
   * Handle disconnection
   */
  private onDisconnected(): void {
    console.log('[RankingWebSocket] Disconnected - clearing batch timers');
    
    // Clear all batch timers
    this.batchTimers.forEach(timer => clearTimeout(timer));
    this.batchTimers.clear();
  }

  /**
   * Ensure connection to tournament room
   */
  private ensureRoomConnection(tournamentId: string): void {
    if (unifiedWebSocketService.isConnected()) {
      unifiedWebSocketService.joinTournament(tournamentId);
    }
  }

  /**
   * Generate subscription key
   */
  private getSubscriptionKey(tournamentId: string, stageId?: string): string {
    return stageId ? `${tournamentId}:${stageId}` : tournamentId;
  }

  /**
   * Generate hash for update deduplication
   */
  private generateUpdateHash(event: RankingUpdateEvent): string {
    const hashData = {
      tournamentId: event.tournamentId,
      stageId: event.stageId,
      timestamp: event.timestamp,
      rankingsCount: event.rankings.length,
      topRankings: event.rankings.slice(0, 3).map(r => ({ 
        teamId: r.teamId, 
        rank: r.rank, 
        rankingPoints: r.rankingPoints 
      })),
    };
    
    return btoa(JSON.stringify(hashData)).slice(0, 12);
  }

  /**
   * Record latency measurement
   */
  private recordLatency(latency: number): void {
    this.latencyMeasurements.push(latency);
    
    // Keep only last 50 measurements
    if (this.latencyMeasurements.length > 50) {
      this.latencyMeasurements.shift();
    }

    this.metrics.averageLatency = 
      this.latencyMeasurements.reduce((sum, l) => sum + l, 0) / this.latencyMeasurements.length;
  }

  /**
   * Get current metrics
   */
  private getMetrics(): RankingWebSocketMetrics {
    return {
      ...this.metrics,
      connectionUptime: Date.now() - this.connectionStartTime,
      lastUpdateTime: Math.max(...Array.from(this.subscriptions.values()).map(s => s.lastUpdate || 0)),
    };
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      const status = this.getConnectionStatus();
      console.log('[RankingWebSocket] Metrics:', status.metrics);
    }, 60000); // Every minute
  }
}

// Singleton instance
export const rankingWebSocketService = new RankingWebSocketService();
