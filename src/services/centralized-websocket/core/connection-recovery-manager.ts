/**
 * Connection Recovery Manager Implementation
 * Single Responsibility: Handle connection recovery strategies and health monitoring
 * Provides multiple recovery strategies and comprehensive health tracking
 */

import {
  IConnectionRecoveryManager,
  RecoveryStrategy,
  FailureType,
  RecoveryAttempt,
  ConnectionHealth,
  INetworkStateMonitor
} from '../interfaces/websocket-manager.interface';

/**
 * Recovery configuration for different strategies
 */
interface RecoveryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterRange: number;
}

/**
 * Default recovery configurations
 */
const RECOVERY_CONFIGS: Record<RecoveryStrategy, RecoveryConfig> = {
  immediate: {
    maxAttempts: 3,
    baseDelay: 0,
    maxDelay: 1000,
    backoffMultiplier: 1,
    jitterRange: 100
  },
  exponential: {
    maxAttempts: 10,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitterRange: 500
  },
  linear: {
    maxAttempts: 8,
    baseDelay: 2000,
    maxDelay: 16000,
    backoffMultiplier: 1,
    jitterRange: 300
  },
  'circuit-breaker': {
    maxAttempts: 5,
    baseDelay: 5000,
    maxDelay: 60000,
    backoffMultiplier: 1.5,
    jitterRange: 1000
  }
};

/**
 * Connection recovery manager with multiple strategies
 */
export class ConnectionRecoveryManager implements IConnectionRecoveryManager {
  private currentStrategy: RecoveryStrategy = 'exponential';
  private _isRecovering = false;
  private recoveryTimeout: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  // Recovery tracking
  private recoveryAttempts: RecoveryAttempt[] = [];
  private currentAttemptNumber = 0;
  
  // Health monitoring
  private connectionHealth: ConnectionHealth = {
    isHealthy: true,
    lastSuccessfulPing: Date.now(),
    averageLatency: 0,
    failureCount: 0,
    successRate: 1.0,
    lastHealthCheck: Date.now()
  };
  
  private latencyHistory: number[] = [];
  private healthCheckHistory: boolean[] = [];
  private readonly maxHistorySize = 20;
  
  // Event callbacks
  private recoveryStartCallbacks = new Set<(attempt: RecoveryAttempt) => void>();
  private recoverySuccessCallbacks = new Set<(attempt: RecoveryAttempt) => void>();
  private recoveryFailureCallbacks = new Set<(attempt: RecoveryAttempt) => void>();
  private healthChangeCallbacks = new Set<(health: ConnectionHealth) => void>();

  constructor(
    private readonly networkMonitor: INetworkStateMonitor,
    private readonly connectionFunction: () => Promise<boolean>,
    private readonly healthCheckFunction: () => Promise<boolean>,
    private readonly options: {
      healthCheckInterval?: number;
      customConfigs?: Partial<Record<RecoveryStrategy, Partial<RecoveryConfig>>>;
    } = {}
  ) {
    // Apply custom configurations
    if (options.customConfigs) {
      Object.entries(options.customConfigs).forEach(([strategy, config]) => {
        RECOVERY_CONFIGS[strategy as RecoveryStrategy] = {
          ...RECOVERY_CONFIGS[strategy as RecoveryStrategy],
          ...config
        };
      });
    }
  }

  /**
   * Calculate delay for next recovery attempt
   */
  private calculateDelay(attemptNumber: number, strategy: RecoveryStrategy): number {
    const config = RECOVERY_CONFIGS[strategy];
    let delay: number;

    switch (strategy) {
      case 'immediate':
        delay = config.baseDelay;
        break;
      case 'exponential':
        delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attemptNumber - 1),
          config.maxDelay
        );
        break;
      case 'linear':
        delay = Math.min(
          config.baseDelay * attemptNumber,
          config.maxDelay
        );
        break;
      case 'circuit-breaker':
        // Circuit breaker uses longer delays after multiple failures
        delay = attemptNumber > 3 ? config.maxDelay : config.baseDelay;
        break;
      default:
        delay = config.baseDelay;
    }

    // Add jitter to prevent thundering herd
    const jitter = (Math.random() - 0.5) * config.jitterRange;
    return Math.max(0, delay + jitter);
  }

  /**
   * Add recovery attempt to history
   */
  private addRecoveryAttempt(attempt: RecoveryAttempt): void {
    this.recoveryAttempts.push(attempt);
    
    // Limit history size
    if (this.recoveryAttempts.length > 100) {
      this.recoveryAttempts = this.recoveryAttempts.slice(-50);
    }
  }

  /**
   * Update connection health metrics
   */
  private updateConnectionHealth(isHealthy: boolean, latency?: number): void {
    const now = Date.now();
    
    // Update health check history
    this.healthCheckHistory.push(isHealthy);
    if (this.healthCheckHistory.length > this.maxHistorySize) {
      this.healthCheckHistory.shift();
    }
    
    // Update latency history
    if (latency !== undefined) {
      this.latencyHistory.push(latency);
      if (this.latencyHistory.length > this.maxHistorySize) {
        this.latencyHistory.shift();
      }
    }
    
    // Calculate success rate
    const successCount = this.healthCheckHistory.filter(Boolean).length;
    const successRate = this.healthCheckHistory.length > 0 
      ? successCount / this.healthCheckHistory.length 
      : 1.0;
    
    // Calculate average latency
    const averageLatency = this.latencyHistory.length > 0
      ? this.latencyHistory.reduce((sum, lat) => sum + lat, 0) / this.latencyHistory.length
      : 0;
    
    // Update health object
    const oldHealth = { ...this.connectionHealth };
    this.connectionHealth = {
      isHealthy,
      lastSuccessfulPing: isHealthy ? now : this.connectionHealth.lastSuccessfulPing,
      averageLatency,
      failureCount: isHealthy ? 0 : this.connectionHealth.failureCount + 1,
      successRate,
      lastHealthCheck: now
    };
    
    // Notify if health status changed
    if (oldHealth.isHealthy !== isHealthy) {
      this.healthChangeCallbacks.forEach(callback => {
        try {
          callback(this.connectionHealth);
        } catch (error) {
          console.error('[ConnectionRecoveryManager] Error in health change callback:', error);
        }
      });
    }
  }

  /**
   * Perform single recovery attempt
   */
  private async performRecoveryAttempt(failureType: FailureType, error?: Error): Promise<boolean> {
    const config = RECOVERY_CONFIGS[this.currentStrategy];
    this.currentAttemptNumber++;
    
    const delay = this.calculateDelay(this.currentAttemptNumber, this.currentStrategy);
    
    const attempt: RecoveryAttempt = {
      attemptNumber: this.currentAttemptNumber,
      strategy: this.currentStrategy,
      timestamp: Date.now(),
      failureType,
      delay,
      success: false,
      error: error?.message
    };
    
    // Notify recovery start
    this.recoveryStartCallbacks.forEach(callback => {
      try {
        callback(attempt);
      } catch (error) {
        console.error('[ConnectionRecoveryManager] Error in recovery start callback:', error);
      }
    });
    
    console.log(`[ConnectionRecoveryManager] Recovery attempt ${this.currentAttemptNumber}/${config.maxAttempts} with ${delay}ms delay`);
    
    // Wait for delay
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Check if we should still attempt recovery
    if (!this._isRecovering) {
      return false;
    }
    
    // Check network state before attempting
    if (!this.networkMonitor.isOnline()) {
      console.log('[ConnectionRecoveryManager] Network offline, skipping recovery attempt');
      attempt.success = false;
      attempt.error = 'Network offline';
      this.addRecoveryAttempt(attempt);
      return false;
    }
    
    try {
      // Attempt connection
      const success = await this.connectionFunction();
      
      attempt.success = success;
      this.addRecoveryAttempt(attempt);
      
      if (success) {
        console.log('[ConnectionRecoveryManager] Recovery successful');
        this.recoverySuccessCallbacks.forEach(callback => {
          try {
            callback(attempt);
          } catch (error) {
            console.error('[ConnectionRecoveryManager] Error in recovery success callback:', error);
          }
        });
        return true;
      } else {
        console.log('[ConnectionRecoveryManager] Recovery attempt failed');
        this.recoveryFailureCallbacks.forEach(callback => {
          try {
            callback(attempt);
          } catch (error) {
            console.error('[ConnectionRecoveryManager] Error in recovery failure callback:', error);
          }
        });
        return false;
      }
    } catch (error) {
      console.error('[ConnectionRecoveryManager] Recovery attempt error:', error);
      attempt.success = false;
      attempt.error = error instanceof Error ? error.message : 'Unknown error';
      this.addRecoveryAttempt(attempt);
      
      this.recoveryFailureCallbacks.forEach(callback => {
        try {
          callback(attempt);
        } catch (callbackError) {
          console.error('[ConnectionRecoveryManager] Error in recovery failure callback:', callbackError);
        }
      });
      
      return false;
    }
  }

  // Public interface implementation

  /**
   * Start recovery process
   */
  async startRecovery(failureType: FailureType, error?: Error): Promise<boolean> {
    if (this._isRecovering) {
      console.log('[ConnectionRecoveryManager] Recovery already in progress');
      return false;
    }
    
    this._isRecovering = true;
    this.currentAttemptNumber = 0;
    
    const config = RECOVERY_CONFIGS[this.currentStrategy];
    
    console.log(`[ConnectionRecoveryManager] Starting recovery with ${this.currentStrategy} strategy`);
    
    // Recovery loop
    while (this._isRecovering && this.currentAttemptNumber < config.maxAttempts) {
      const success = await this.performRecoveryAttempt(failureType, error);
      
      if (success) {
        this._isRecovering = false;
        return true;
      }
      
      // For circuit breaker, check if we should stop
      if (this.currentStrategy === 'circuit-breaker' && this.currentAttemptNumber >= 3) {
        const recentFailures = this.recoveryAttempts
          .slice(-5)
          .filter(attempt => !attempt.success).length;
        
        if (recentFailures >= 5) {
          console.log('[ConnectionRecoveryManager] Circuit breaker activated, stopping recovery');
          break;
        }
      }
    }
    
    console.log('[ConnectionRecoveryManager] Recovery failed after all attempts');
    this._isRecovering = false;
    return false;
  }

  /**
   * Stop recovery process
   */
  stopRecovery(): void {
    if (!this._isRecovering) return;
    
    this._isRecovering = false;
    
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout);
      this.recoveryTimeout = null;
    }
    
    console.log('[ConnectionRecoveryManager] Recovery stopped');
  }

  /**
   * Check if recovery is in progress
   */
  isRecovering(): boolean {
    return this._isRecovering;
  }

  /**
   * Set recovery strategy
   */
  setRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.currentStrategy = strategy;
    console.log(`[ConnectionRecoveryManager] Recovery strategy set to: ${strategy}`);
  }

  /**
   * Get current recovery strategy
   */
  getRecoveryStrategy(): RecoveryStrategy {
    return this.currentStrategy;
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring(): void {
    if (this.healthCheckInterval) return;
    
    const interval = this.options.healthCheckInterval || 30000; // 30 seconds
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, interval);
    
    console.log('[ConnectionRecoveryManager] Started health monitoring');
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('[ConnectionRecoveryManager] Stopped health monitoring');
    }
  }

  /**
   * Get connection health
   */
  getConnectionHealth(): ConnectionHealth {
    return { ...this.connectionHealth };
  }

  /**
   * Perform health check
   */
  async performHealthCheck(): Promise<boolean> {
    const startTime = performance.now();
    
    try {
      const isHealthy = await this.healthCheckFunction();
      const latency = performance.now() - startTime;
      
      this.updateConnectionHealth(isHealthy, latency);
      
      return isHealthy;
    } catch (error) {
      console.error('[ConnectionRecoveryManager] Health check failed:', error);
      this.updateConnectionHealth(false);
      return false;
    }
  }

  /**
   * Get recovery attempts history
   */
  getRecoveryAttempts(): RecoveryAttempt[] {
    return [...this.recoveryAttempts];
  }

  /**
   * Clear recovery history
   */
  clearRecoveryHistory(): void {
    this.recoveryAttempts = [];
    this.currentAttemptNumber = 0;
  }

  /**
   * Register recovery start callback
   */
  onRecoveryStart(callback: (attempt: RecoveryAttempt) => void): () => void {
    this.recoveryStartCallbacks.add(callback);
    return () => this.recoveryStartCallbacks.delete(callback);
  }

  /**
   * Register recovery success callback
   */
  onRecoverySuccess(callback: (attempt: RecoveryAttempt) => void): () => void {
    this.recoverySuccessCallbacks.add(callback);
    return () => this.recoverySuccessCallbacks.delete(callback);
  }

  /**
   * Register recovery failure callback
   */
  onRecoveryFailure(callback: (attempt: RecoveryAttempt) => void): () => void {
    this.recoveryFailureCallbacks.add(callback);
    return () => this.recoveryFailureCallbacks.delete(callback);
  }

  /**
   * Register health change callback
   */
  onHealthChange(callback: (health: ConnectionHealth) => void): () => void {
    this.healthChangeCallbacks.add(callback);
    return () => this.healthChangeCallbacks.delete(callback);
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats(): {
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    averageRecoveryTime: number;
    lastRecoveryTime: number;
  } {
    const successful = this.recoveryAttempts.filter(attempt => attempt.success);
    const failed = this.recoveryAttempts.filter(attempt => !attempt.success);

    const recoveryTimes = successful.map(attempt => attempt.delay);
    const averageRecoveryTime = recoveryTimes.length > 0
      ? recoveryTimes.reduce((sum, time) => sum + time, 0) / recoveryTimes.length
      : 0;

    const lastRecovery = this.recoveryAttempts[this.recoveryAttempts.length - 1];

    return {
      totalAttempts: this.recoveryAttempts.length,
      successfulAttempts: successful.length,
      failedAttempts: failed.length,
      averageRecoveryTime,
      lastRecoveryTime: lastRecovery ? lastRecovery.timestamp : 0
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopRecovery();
    this.stopHealthMonitoring();

    this.recoveryStartCallbacks.clear();
    this.recoverySuccessCallbacks.clear();
    this.recoveryFailureCallbacks.clear();
    this.healthChangeCallbacks.clear();

    this.recoveryAttempts = [];
    this.latencyHistory = [];
    this.healthCheckHistory = [];
  }
}
