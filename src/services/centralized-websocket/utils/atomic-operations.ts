/**
 * Atomic Operations and Distributed Locking for WebSocket System
 * Provides race condition prevention and atomic state management
 */

export interface LockOptions {
  timeout: number; // milliseconds
  retryInterval: number; // milliseconds
  maxRetries: number;
}

export interface AtomicOperation<T> {
  id: string;
  operation: () => Promise<T> | T;
  timeout: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies?: string[];
  rollback?: () => Promise<void> | void;
}

export interface DistributedLock {
  id: string;
  ownerId: string;
  acquiredAt: number;
  expiresAt: number;
  renewable: boolean;
}

/**
 * Distributed lock manager using cross-tab communication
 */
export class DistributedLockManager {
  private locks = new Map<string, DistributedLock>();
  private ownedLocks = new Set<string>();
  private lockCallbacks = new Map<string, Set<(acquired: boolean) => void>>();
  private readonly ownerId: string;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly communicator: { 
      broadcast: (message: any) => void; 
      onMessage: (callback: (message: any) => void) => () => void;
    },
    ownerId?: string
  ) {
    this.ownerId = ownerId || `lock-owner-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.setupCommunication();
    this.startCleanup();
  }

  /**
   * Acquire a distributed lock
   */
  async acquireLock(
    lockId: string, 
    options: Partial<LockOptions> = {}
  ): Promise<boolean> {
    const config = {
      timeout: options.timeout || 30000,
      retryInterval: options.retryInterval || 100,
      maxRetries: options.maxRetries || 300,
      ...options
    };

    const startTime = Date.now();
    let attempts = 0;

    while (attempts < config.maxRetries) {
      if (Date.now() - startTime > config.timeout) {
        break;
      }

      if (await this.tryAcquireLock(lockId, config.timeout)) {
        return true;
      }

      attempts++;
      await this.sleep(config.retryInterval);
    }

    return false;
  }

  /**
   * Try to acquire lock atomically
   */
  private async tryAcquireLock(lockId: string, timeout: number): Promise<boolean> {
    const now = Date.now();
    const existingLock = this.locks.get(lockId);

    // Check if lock is available or expired
    if (existingLock && existingLock.expiresAt > now && existingLock.ownerId !== this.ownerId) {
      return false;
    }

    // Create lock request
    const lockRequest: DistributedLock = {
      id: lockId,
      ownerId: this.ownerId,
      acquiredAt: now,
      expiresAt: now + timeout,
      renewable: true
    };

    // Broadcast lock acquisition attempt
    this.communicator.broadcast({
      type: 'LOCK_ACQUIRE',
      lockId,
      lock: lockRequest,
      timestamp: now,
      messageId: `lock-${lockId}-${this.ownerId}-${now}`
    });

    // Wait for potential conflicts
    await this.sleep(50); // Small delay to collect conflicts

    // Check if we still own the lock
    const currentLock = this.locks.get(lockId);
    if (currentLock && currentLock.ownerId === this.ownerId) {
      this.ownedLocks.add(lockId);
      return true;
    }

    return false;
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(lockId: string): Promise<void> {
    const lock = this.locks.get(lockId);
    if (!lock || lock.ownerId !== this.ownerId) {
      return;
    }

    this.locks.delete(lockId);
    this.ownedLocks.delete(lockId);

    // Broadcast lock release
    this.communicator.broadcast({
      type: 'LOCK_RELEASE',
      lockId,
      ownerId: this.ownerId,
      timestamp: Date.now(),
      messageId: `unlock-${lockId}-${this.ownerId}-${Date.now()}`
    });

    // Notify waiting callbacks
    const callbacks = this.lockCallbacks.get(lockId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(false);
        } catch (error) {
          console.error('[DistributedLockManager] Error in lock callback:', error);
        }
      });
    }
  }

  /**
   * Renew a lock to extend its expiration
   */
  async renewLock(lockId: string, additionalTime: number = 30000): Promise<boolean> {
    const lock = this.locks.get(lockId);
    if (!lock || lock.ownerId !== this.ownerId || !lock.renewable) {
      return false;
    }

    const now = Date.now();
    lock.expiresAt = now + additionalTime;

    // Broadcast lock renewal
    this.communicator.broadcast({
      type: 'LOCK_RENEW',
      lockId,
      lock,
      timestamp: now,
      messageId: `renew-${lockId}-${this.ownerId}-${now}`
    });

    return true;
  }

  /**
   * Check if we own a specific lock
   */
  ownsLock(lockId: string): boolean {
    return this.ownedLocks.has(lockId);
  }

  /**
   * Get all owned locks
   */
  getOwnedLocks(): string[] {
    return Array.from(this.ownedLocks);
  }

  /**
   * Setup cross-tab communication for lock coordination
   */
  private setupCommunication(): void {
    this.communicator.onMessage((message) => {
      if (!message.type?.startsWith('LOCK_')) return;

      switch (message.type) {
        case 'LOCK_ACQUIRE':
          this.handleLockAcquire(message);
          break;
        case 'LOCK_RELEASE':
          this.handleLockRelease(message);
          break;
        case 'LOCK_RENEW':
          this.handleLockRenew(message);
          break;
        case 'LOCK_CONFLICT':
          this.handleLockConflict(message);
          break;
      }
    });
  }

  /**
   * Handle lock acquisition from other tabs
   */
  private handleLockAcquire(message: any): void {
    const { lockId, lock, timestamp } = message;
    const existingLock = this.locks.get(lockId);

    // Conflict resolution: earlier timestamp wins, then owner ID as tiebreaker
    if (!existingLock || 
        lock.acquiredAt < existingLock.acquiredAt ||
        (lock.acquiredAt === existingLock.acquiredAt && lock.ownerId < existingLock.ownerId)) {
      
      // If we had this lock, we lost it
      if (existingLock && existingLock.ownerId === this.ownerId) {
        this.ownedLocks.delete(lockId);
        
        // Broadcast conflict notification
        this.communicator.broadcast({
          type: 'LOCK_CONFLICT',
          lockId,
          winnerOwnerId: lock.ownerId,
          loserOwnerId: this.ownerId,
          timestamp: Date.now(),
          messageId: `conflict-${lockId}-${Date.now()}`
        });
      }

      this.locks.set(lockId, lock);
    }
  }

  /**
   * Handle lock release from other tabs
   */
  private handleLockRelease(message: any): void {
    const { lockId, ownerId } = message;
    const lock = this.locks.get(lockId);

    if (lock && lock.ownerId === ownerId) {
      this.locks.delete(lockId);
    }
  }

  /**
   * Handle lock renewal from other tabs
   */
  private handleLockRenew(message: any): void {
    const { lockId, lock } = message;
    const existingLock = this.locks.get(lockId);

    if (existingLock && existingLock.ownerId === lock.ownerId) {
      this.locks.set(lockId, lock);
    }
  }

  /**
   * Handle lock conflict notifications
   */
  private handleLockConflict(message: any): void {
    const { lockId, winnerOwnerId, loserOwnerId } = message;
    
    if (loserOwnerId === this.ownerId) {
      this.ownedLocks.delete(lockId);
    }
  }

  /**
   * Start cleanup of expired locks
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [lockId, lock] of this.locks) {
        if (lock.expiresAt < now) {
          this.locks.delete(lockId);
          if (lock.ownerId === this.ownerId) {
            this.ownedLocks.delete(lockId);
          }
        }
      }
    }, 5000); // Cleanup every 5 seconds
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Release all owned locks
    for (const lockId of this.ownedLocks) {
      this.releaseLock(lockId);
    }

    this.locks.clear();
    this.ownedLocks.clear();
    this.lockCallbacks.clear();
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Atomic operation executor with proper serialization
 */
export class AtomicOperationExecutor {
  private operationQueue: AtomicOperation<any>[] = [];
  private runningOperations = new Map<string, Promise<any>>();
  private isProcessing = false;

  /**
   * Execute an atomic operation
   */
  async execute<T>(operation: AtomicOperation<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrappedOperation: AtomicOperation<T> = {
        ...operation,
        operation: async () => {
          try {
            const result = await operation.operation();
            resolve(result);
            return result;
          } catch (error) {
            if (operation.rollback) {
              try {
                await operation.rollback();
              } catch (rollbackError) {
                console.error('[AtomicOperationExecutor] Rollback failed:', rollbackError);
              }
            }
            reject(error);
            throw error;
          }
        }
      };

      this.operationQueue.push(wrappedOperation);
      this.processQueue();
    });
  }

  /**
   * Process the operation queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.operationQueue.length > 0) {
        // Sort by priority
        this.operationQueue.sort((a, b) => {
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        const operation = this.operationQueue.shift()!;
        
        // Check dependencies
        if (operation.dependencies) {
          const pendingDependencies = operation.dependencies.filter(dep => 
            this.runningOperations.has(dep)
          );
          
          if (pendingDependencies.length > 0) {
            // Wait for dependencies
            await Promise.all(
              pendingDependencies.map(dep => this.runningOperations.get(dep))
            );
          }
        }

        // Execute operation
        const operationPromise = this.executeOperation(operation);
        this.runningOperations.set(operation.id, operationPromise);

        try {
          await operationPromise;
        } finally {
          this.runningOperations.delete(operation.id);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single operation with timeout
   */
  private async executeOperation<T>(operation: AtomicOperation<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation ${operation.id} timed out after ${operation.timeout}ms`));
      }, operation.timeout);

      try {
        const result = await operation.operation();
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Get queue status
   */
  getStatus(): {
    queueLength: number;
    runningOperations: number;
    isProcessing: boolean;
  } {
    return {
      queueLength: this.operationQueue.length,
      runningOperations: this.runningOperations.size,
      isProcessing: this.isProcessing
    };
  }
}
