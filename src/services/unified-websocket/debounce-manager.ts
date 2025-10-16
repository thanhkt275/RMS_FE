import { WebSocketEventData } from '@/types/websocket';
import { trackWebSocketEmission } from '@/utils/websocket-optimizer';

export interface DebounceConfig {
  delay: number;
  maxCalls?: number;
  windowMs?: number;
}

export interface RateLimit {
  maxCalls: number;
  windowMs: number;
  calls: number[];
}

/**
 * DebounceManager handles debouncing and rate limiting for WebSocket events
 * Implements sliding window rate limiting and event deduplication
 */
export class DebounceManager {
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private rateLimits: Map<string, RateLimit> = new Map();
  private eventHashes: Map<string, string> = new Map();
  private pendingEvents: Map<string, WebSocketEventData> = new Map();

  // Default configurations for different event types
  private readonly defaultConfigs: Map<string, DebounceConfig> = new Map([
    ['score_update', { delay: 200, maxCalls: 10, windowMs: 1000 }], // Max 10/second
    ['timer_update', { delay: 1000, maxCalls: 1, windowMs: 1000 }], // Max 1/second
    ['match_update', { delay: 100, maxCalls: 5, windowMs: 1000 }], // Max 5/second
  ]);

  /**
   * Debounce a function call with configurable delay
   */
  debounce<T extends WebSocketEventData>(
    key: string,
    fn: (data: T) => void,
    data: T,
    config?: DebounceConfig
  ): void {
    const effectiveConfig = config || this.getConfigForEvent(key);
    const eventType = key.split(':')[0]; // Extract event type from key
    
    // Store the latest data (ensures latest data is preserved)
    this.pendingEvents.set(key, data);

    // Clear existing timer
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      const latestData = this.pendingEvents.get(key);
      if (latestData) {
        // Check rate limiting before executing
        if (this.isRateLimited(key, effectiveConfig)) {
          console.warn(`[DebounceManager] Rate limit exceeded for key: ${key}`);
          trackWebSocketEmission(eventType, true, 'rateLimit');
          return;
        }

        // Check for event deduplication
        if (this.isDuplicateEvent(key, latestData)) {
          console.log(`[DebounceManager] Duplicate event ignored for key: ${key}`);
          trackWebSocketEmission(eventType, true, 'duplicate');
          return;
        }

        // Execute the function with latest data
        try {
          fn(latestData as T);
          this.updateEventHash(key, latestData);
          this.recordRateLimitCall(key, effectiveConfig);
          trackWebSocketEmission(eventType, false); // Track successful emission
        } catch (error) {
          console.error(`[DebounceManager] Error executing debounced function for key ${key}:`, error);
        }

        // Clean up
        this.pendingEvents.delete(key);
        this.debounceTimers.delete(key);
      }
    }, effectiveConfig.delay);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Apply rate limiting using sliding window algorithm
   */
  rateLimit(key: string, fn: () => void, config: DebounceConfig): boolean {
    if (this.isRateLimited(key, config)) {
      console.warn(`[DebounceManager] Rate limit exceeded for key: ${key}`);
      return false;
    }

    try {
      fn();
      this.recordRateLimitCall(key, config);
      return true;
    } catch (error) {
      console.error(`[DebounceManager] Error executing rate-limited function for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if an event should be debounced based on event type
   */
  shouldDebounce(eventType: string): boolean {
    return this.defaultConfigs.has(eventType);
  }

  /**
   * Get configuration for a specific event type
   */
  getConfigForEvent(eventType: string): DebounceConfig {
    return this.defaultConfigs.get(eventType) || { delay: 100 };
  }

  /**
   * Set custom configuration for an event type
   */
  setConfig(eventType: string, config: DebounceConfig): void {
    this.defaultConfigs.set(eventType, config);
  }

  /**
   * Check if rate limit is exceeded using sliding window
   */
  private isRateLimited(key: string, config: DebounceConfig): boolean {
    if (!config.maxCalls || !config.windowMs) {
      return false; // No rate limiting configured
    }

    const rateLimit = this.rateLimits.get(key);
    if (!rateLimit) {
      return false; // No previous calls
    }

    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Remove old calls outside the window
    rateLimit.calls = rateLimit.calls.filter(timestamp => timestamp > windowStart);

    // Check if we're at the limit
    return rateLimit.calls.length >= config.maxCalls;
  }

  /**
   * Record a rate limit call
   */
  private recordRateLimitCall(key: string, config: DebounceConfig): void {
    if (!config.maxCalls || !config.windowMs) {
      return; // No rate limiting configured
    }

    const now = Date.now();
    let rateLimit = this.rateLimits.get(key);

    if (!rateLimit) {
      rateLimit = {
        maxCalls: config.maxCalls,
        windowMs: config.windowMs,
        calls: []
      };
      this.rateLimits.set(key, rateLimit);
    }

    rateLimit.calls.push(now);

    // Clean up old calls
    const windowStart = now - config.windowMs;
    rateLimit.calls = rateLimit.calls.filter(timestamp => timestamp > windowStart);
  }

  /**
   * Check if event data has actually changed compared to previous event
   */
  private isDuplicateEvent(key: string, data: WebSocketEventData): boolean {
    const currentHash = this.generateDataHash(data);
    const lastHash = this.eventHashes.get(key);

    if (lastHash === currentHash) {
      console.log(`[DebounceManager] Duplicate data detected for key: ${key}`);
      return true;
    }

    return false;
  }

  /**
   * Update the stored hash for an event
   */
  private updateEventHash(key: string, data: WebSocketEventData): void {
    const hash = this.generateDataHash(data);
    this.eventHashes.set(key, hash);
  }

  /**
   * Generate a hash for event data for deduplication
   * Only includes relevant fields that indicate actual changes
   */
  private generateDataHash(data: WebSocketEventData): string {
    try {
      // Extract only the meaningful fields for comparison, excluding timestamps and metadata
      const relevantData = {
        matchId: data.matchId,
        tournamentId: data.tournamentId,
        fieldId: data.fieldId,
        status: (data as any).status,
        currentPeriod: (data as any).currentPeriod,
        scope: (data as any).scope, // Include scope to differentiate referee vs audience broadcasts
        // Include score data if present
        redAutoScore: (data as any).redAutoScore,
        blueAutoScore: (data as any).blueAutoScore,
        redDriveScore: (data as any).redDriveScore,
        blueDriveScore: (data as any).blueDriveScore,
        redTotalScore: (data as any).redTotalScore,
        blueTotalScore: (data as any).blueTotalScore,
        // Include timer data if present
        remaining: (data as any).remaining,
        isRunning: (data as any).isRunning,
        duration: (data as any).duration
      };
      
      // Remove undefined values to ensure consistent hashing
      const cleanData = Object.fromEntries(
        Object.entries(relevantData).filter(([_, value]) => value !== undefined)
      );
      
      const sortedData = this.sortObjectKeys(cleanData);
      return JSON.stringify(sortedData);
    } catch (error) {
      console.error('[DebounceManager] Error generating data hash:', error);
      return Math.random().toString(); // Fallback to prevent deduplication on error
    }
  }

  /**
   * Sort object keys recursively for consistent hashing
   * Handles circular references by tracking visited objects
   */
  private sortObjectKeys(obj: unknown, visited = new WeakSet()): unknown {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Handle circular references
    if (visited.has(obj as object)) {
      return '[Circular]';
    }

    if (Array.isArray(obj)) {
      visited.add(obj);
      const result = obj.map(item => this.sortObjectKeys(item, visited));
      visited.delete(obj);
      return result;
    }

    visited.add(obj as object);
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    
    for (const key of keys) {
      sorted[key] = this.sortObjectKeys((obj as Record<string, unknown>)[key], visited);
    }

    visited.delete(obj as object);
    return sorted;
  }

  /**
   * Cancel a pending debounced call
   */
  cancel(key: string): void {
    const timer = this.debounceTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(key);
      this.pendingEvents.delete(key);
      console.log(`[DebounceManager] Cancelled debounced call for key: ${key}`);
    }
  }

  /**
   * Cancel all pending debounced calls
   */
  cancelAll(): void {
    console.log('[DebounceManager] Cancelling all pending debounced calls');
    
    this.debounceTimers.forEach((timer, key) => {
      clearTimeout(timer);
      console.log(`[DebounceManager] Cancelled timer for key: ${key}`);
    });

    this.debounceTimers.clear();
    this.pendingEvents.clear();
  }

  /**
   * Get statistics about current debounce state
   */
  getStats(): {
    pendingCalls: number;
    rateLimitedKeys: string[];
    eventTypes: string[];
  } {
    const rateLimitedKeys: string[] = [];
    
    this.rateLimits.forEach((rateLimit, key) => {
      const now = Date.now();
      const windowStart = now - rateLimit.windowMs;
      const activeCalls = rateLimit.calls.filter(timestamp => timestamp > windowStart);
      
      if (activeCalls.length >= rateLimit.maxCalls) {
        rateLimitedKeys.push(key);
      }
    });

    return {
      pendingCalls: this.debounceTimers.size,
      rateLimitedKeys,
      eventTypes: Array.from(this.defaultConfigs.keys())
    };
  }

  /**
   * Clear all stored data (useful for cleanup)
   */
  cleanup(): void {
    console.log('[DebounceManager] Cleaning up all data');
    
    this.cancelAll();
    this.rateLimits.clear();
    this.eventHashes.clear();
  }
}