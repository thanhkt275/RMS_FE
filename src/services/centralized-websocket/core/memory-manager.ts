/**
 * Centralized Memory Manager for WebSocket System
 * Coordinates cleanup across all WebSocket components and monitors memory usage
 */

export interface MemoryManagerConfig {
  cleanupInterval: number; // milliseconds
  memoryThreshold: number; // percentage (0-100)
  enableMonitoring: boolean;
  enableAggressive: boolean; // enable aggressive cleanup when memory is high
  debug: boolean;
}

export interface CleanupTarget {
  name: string;
  cleanup: () => Promise<void> | void;
  getMemoryUsage?: () => number; // bytes
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface MemoryStats {
  totalTargets: number;
  lastCleanupTime: number;
  cleanupCount: number;
  memoryUsage: number;
  cleanupDuration: number;
  errors: number;
}

/**
 * Centralized memory manager for coordinating cleanup across WebSocket components
 */
export class MemoryManager {
  private static instance: MemoryManager | null = null;
  private readonly config: MemoryManagerConfig;
  private readonly cleanupTargets = new Map<string, CleanupTarget>();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private stats: MemoryStats = {
    totalTargets: 0,
    lastCleanupTime: 0,
    cleanupCount: 0,
    memoryUsage: 0,
    cleanupDuration: 0,
    errors: 0
  };

  private constructor(config: Partial<MemoryManagerConfig> = {}) {
    this.config = {
      cleanupInterval: config.cleanupInterval || 60000, // 1 minute
      memoryThreshold: config.memoryThreshold || 80, // 80%
      enableMonitoring: config.enableMonitoring ?? true,
      enableAggressive: config.enableAggressive ?? true,
      debug: config.debug ?? false
    };

    this.log('MemoryManager initialized');
  }

  static getInstance(config?: Partial<MemoryManagerConfig>): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager(config);
    }
    return MemoryManager.instance;
  }

  /**
   * Register a cleanup target
   */
  registerCleanupTarget(target: CleanupTarget): () => void {
    this.cleanupTargets.set(target.name, target);
    this.stats.totalTargets = this.cleanupTargets.size;
    
    this.log(`Registered cleanup target: ${target.name} (priority: ${target.priority})`);

    // Return unregister function
    return () => {
      this.unregisterCleanupTarget(target.name);
    };
  }

  /**
   * Unregister a cleanup target
   */
  unregisterCleanupTarget(name: string): void {
    if (this.cleanupTargets.delete(name)) {
      this.stats.totalTargets = this.cleanupTargets.size;
      this.log(`Unregistered cleanup target: ${name}`);
    }
  }

  /**
   * Start the memory manager
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.scheduleCleanup();
    this.log('MemoryManager started');
  }

  /**
   * Stop the memory manager
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.log('MemoryManager stopped');
  }

  /**
   * Perform immediate cleanup
   */
  async performCleanup(aggressive = false): Promise<void> {
    const startTime = Date.now();
    let errorCount = 0;

    this.log(`Starting ${aggressive ? 'aggressive ' : ''}cleanup of ${this.cleanupTargets.size} targets`);

    // Sort targets by priority
    const sortedTargets = Array.from(this.cleanupTargets.values()).sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Perform cleanup for each target
    for (const target of sortedTargets) {
      try {
        this.log(`Cleaning up: ${target.name}`);
        await target.cleanup();
      } catch (error) {
        errorCount++;
        console.error(`[MemoryManager] Error cleaning up ${target.name}:`, error);
      }
    }

    // Update stats
    const duration = Date.now() - startTime;
    this.stats.lastCleanupTime = startTime;
    this.stats.cleanupCount++;
    this.stats.cleanupDuration = duration;
    this.stats.errors += errorCount;

    this.log(`Cleanup completed in ${duration}ms with ${errorCount} errors`);
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): MemoryStats & { targetStats: Array<{ name: string; usage: number; priority: string }> } {
    const targetStats = Array.from(this.cleanupTargets.values()).map(target => ({
      name: target.name,
      usage: target.getMemoryUsage ? target.getMemoryUsage() : 0,
      priority: target.priority
    }));

    return {
      ...this.stats,
      targetStats
    };
  }

  /**
   * Check if memory usage is above threshold
   */
  private isMemoryHigh(): boolean {
    if (!this.config.enableMonitoring) return false;

    try {
      // Use performance.memory if available (Chrome)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        this.stats.memoryUsage = usagePercent;
        return usagePercent > this.config.memoryThreshold;
      }
    } catch (error) {
      // Fallback: assume memory is not high if we can't measure it
      this.log('Memory monitoring not available');
    }

    return false;
  }

  /**
   * Schedule next cleanup
   */
  private scheduleCleanup(): void {
    if (!this.isRunning) return;

    const interval = this.isMemoryHigh() && this.config.enableAggressive 
      ? this.config.cleanupInterval / 2 // More frequent cleanup when memory is high
      : this.config.cleanupInterval;

    this.cleanupTimer = setTimeout(async () => {
      try {
        const aggressive = this.isMemoryHigh() && this.config.enableAggressive;
        await this.performCleanup(aggressive);
      } catch (error) {
        console.error('[MemoryManager] Error during scheduled cleanup:', error);
      } finally {
        this.scheduleCleanup(); // Schedule next cleanup
      }
    }, interval);
  }

  /**
   * Log debug messages
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[MemoryManager] ${message}`);
    }
  }

  /**
   * Destroy the memory manager
   */
  destroy(): void {
    this.stop();
    this.cleanupTargets.clear();
    this.stats = {
      totalTargets: 0,
      lastCleanupTime: 0,
      cleanupCount: 0,
      memoryUsage: 0,
      cleanupDuration: 0,
      errors: 0
    };
    MemoryManager.instance = null;
    this.log('MemoryManager destroyed');
  }
}

/**
 * Utility function to create a cleanup target
 */
export function createCleanupTarget(
  name: string,
  cleanup: () => Promise<void> | void,
  options: {
    priority?: CleanupTarget['priority'];
    getMemoryUsage?: () => number;
  } = {}
): CleanupTarget {
  return {
    name,
    cleanup,
    priority: options.priority || 'medium',
    getMemoryUsage: options.getMemoryUsage
  };
}

/**
 * Decorator for automatic cleanup registration
 */
export function registerForCleanup(
  name: string,
  priority: CleanupTarget['priority'] = 'medium'
) {
  return function <T extends { cleanup?: () => Promise<void> | void }>(
    target: T,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<any>
  ) {
    const originalMethod = descriptor.value as Function;

    descriptor.value = function (...args: any[]) {
      const result = originalMethod.apply(this, args);

      // Register this instance for cleanup
      const instance = this as { cleanup?: () => Promise<void> | void };
      if (typeof instance.cleanup === 'function') {
        const memoryManager = MemoryManager.getInstance();
        memoryManager.registerCleanupTarget({
          name: `${name}-${Date.now()}`,
          cleanup: instance.cleanup.bind(instance),
          priority
        });
      }

      return result;
    };

    return descriptor;
  };
}

// Export singleton instance getter
export const getMemoryManager = () => MemoryManager.getInstance();
