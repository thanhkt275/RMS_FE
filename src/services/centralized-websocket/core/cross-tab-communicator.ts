/**
 * Cross-Tab Communicator Implementation
 * Single Responsibility: Handle BroadcastChannel communication between tabs
 * Open/Closed Principle: Extensible with fallback mechanisms
 */

import {
  ICrossTabCommunicator,
  CrossTabMessage,
  CrossTabMessageType
} from '../interfaces/websocket-manager.interface';
import { BoundedSet, BoundedCollectionConfig } from '../utils/memory-management';
import { getMemoryManager, createCleanupTarget } from './memory-manager';

/**
 * Fallback communication strategy interface
 */
interface IFallbackCommunicator {
  broadcast(message: CrossTabMessage): void;
  onMessage(callback: (message: CrossTabMessage) => void): () => void;
  close(): void;
}

/**
 * LocalStorage-based fallback communicator
 */
class LocalStorageFallback implements IFallbackCommunicator {
  private readonly storageKey = 'websocket-cross-tab-messages';
  private messageCallbacks = new Set<(message: CrossTabMessage) => void>();
  private storageListener: ((event: StorageEvent) => void) | null = null;
  private cleanupUnregister: (() => void) | null = null;
  private isDestroyed = false;

  constructor() {
    this.setupStorageListener();
    this.registerForCleanup();
  }

  private setupStorageListener(): void {
    if (this.isDestroyed) return;

    this.storageListener = (event: StorageEvent) => {
      if (this.isDestroyed) return;

      if (event.key === this.storageKey && event.newValue) {
        try {
          const message: CrossTabMessage = JSON.parse(event.newValue);
          this.messageCallbacks.forEach(callback => {
            try {
              callback(message);
            } catch (error) {
              console.error('[LocalStorageFallback] Error in message callback:', error);
            }
          });
        } catch (error) {
          console.error('[LocalStorageFallback] Error parsing message:', error);
        }
      }
    };

    window.addEventListener('storage', this.storageListener);
  }

  private registerForCleanup(): void {
    const memoryManager = getMemoryManager();
    this.cleanupUnregister = memoryManager.registerCleanupTarget(
      createCleanupTarget(
        'LocalStorageFallback',
        () => this.performCleanup(),
        {
          priority: 'high',
          getMemoryUsage: () => this.messageCallbacks.size * 100 // rough estimate
        }
      )
    );
  }

  private performCleanup(): void {
    // Clean up any stale localStorage entries
    try {
      const keys = Object.keys(localStorage);
      const staleKeys = keys.filter(key =>
        key.startsWith('websocket-') &&
        key !== this.storageKey
      );

      staleKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          // Ignore errors when cleaning up stale keys
        }
      });
    } catch (error) {
      console.warn('[LocalStorageFallback] Error during cleanup:', error);
    }
  }

  broadcast(message: CrossTabMessage): void {
    if (this.isDestroyed) return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(message));
      // Clear immediately to trigger storage event
      setTimeout(() => {
        if (!this.isDestroyed) {
          try {
            localStorage.removeItem(this.storageKey);
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      }, 100);
    } catch (error) {
      console.error('[LocalStorageFallback] Error broadcasting message:', error);
    }
  }

  onMessage(callback: (message: CrossTabMessage) => void): () => void {
    if (this.isDestroyed) return () => {};

    this.messageCallbacks.add(callback);

    return () => {
      this.messageCallbacks.delete(callback);
    };
  }

  close(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }

    this.messageCallbacks.clear();

    if (this.cleanupUnregister) {
      this.cleanupUnregister();
      this.cleanupUnregister = null;
    }

    // Clean up our localStorage entry
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Main cross-tab communicator with BroadcastChannel and fallback support
 */
export class CrossTabCommunicator implements ICrossTabCommunicator {
  private broadcastChannel: BroadcastChannel | null = null;
  private fallbackCommunicator: IFallbackCommunicator | null = null;
  private messageCallbacks = new Set<(message: CrossTabMessage) => void>();
  private readonly channelName: string;
  private channelSupported: boolean;
  private processedMessages: BoundedSet<string>;
  private cleanupUnregister: (() => void) | null = null;
  private isDestroyed = false;

  constructor(channelName: string = 'websocket-sync') {
    this.channelName = channelName;
    this.channelSupported = this.checkBroadcastChannelSupport();

    // Initialize bounded processed messages set
    this.processedMessages = new BoundedSet<string>({
      maxSize: 1000,
      maxAge: 300000, // 5 minutes
      cleanupInterval: 60000, // 1 minute
      onEviction: (messageId) => {
        console.debug(`[CrossTabCommunicator] Evicted processed message: ${messageId}`);
      }
    });

    this.initializeCommunication();
    this.registerForCleanup();
  }

  /**
   * Register for centralized cleanup
   */
  private registerForCleanup(): void {
    const memoryManager = getMemoryManager();
    this.cleanupUnregister = memoryManager.registerCleanupTarget(
      createCleanupTarget(
        `CrossTabCommunicator-${this.channelName}`,
        () => this.performCleanup(),
        {
          priority: 'high',
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

    // The BoundedSet handles its own cleanup automatically
    // We just need to ensure we're not holding onto stale references

    // Clean up any stale message callbacks
    const staleCallbacks: Array<(message: CrossTabMessage) => void> = [];
    this.messageCallbacks.forEach(callback => {
      // Check if callback is still valid (basic check)
      if (typeof callback !== 'function') {
        staleCallbacks.push(callback);
      }
    });

    staleCallbacks.forEach(callback => {
      this.messageCallbacks.delete(callback);
    });
  }

  /**
   * Get estimated memory usage
   */
  private getMemoryUsage(): number {
    return (
      this.processedMessages.size * 50 + // rough estimate for message IDs
      this.messageCallbacks.size * 100 // rough estimate for callbacks
    );
  }

  /**
   * Check if BroadcastChannel is supported
   */
  private checkBroadcastChannelSupport(): boolean {
    return typeof BroadcastChannel !== 'undefined';
  }

  /**
   * Initialize communication channel
   */
  private initializeCommunication(): void {
    if (this.channelSupported) {
      try {
        this.broadcastChannel = new BroadcastChannel(this.channelName);
        this.setupBroadcastChannelListener();
        console.log('[CrossTabCommunicator] BroadcastChannel initialized');
      } catch (error) {
        console.warn('[CrossTabCommunicator] BroadcastChannel failed, using fallback:', error);
        this.initializeFallback();
      }
    } else {
      console.warn('[CrossTabCommunicator] BroadcastChannel not supported, using fallback');
      this.initializeFallback();
    }
  }

  /**
   * Setup BroadcastChannel message listener
   */
  private setupBroadcastChannelListener(): void {
    if (!this.broadcastChannel) return;

    this.broadcastChannel.addEventListener('message', (event) => {
      try {
        const message: CrossTabMessage = event.data;
        
        // Prevent duplicate message processing
        if (this.processedMessages.has(message.messageId)) {
          return;
        }

        this.addProcessedMessage(message.messageId);
        this.distributeMessage(message);
      } catch (error) {
        console.error('[CrossTabCommunicator] Error processing BroadcastChannel message:', error);
      }
    });
  }

  /**
   * Initialize fallback communication
   */
  private initializeFallback(): void {
    this.fallbackCommunicator = new LocalStorageFallback();
    
    this.fallbackCommunicator.onMessage((message) => {
      // Prevent duplicate message processing
      if (this.processedMessages.has(message.messageId)) {
        return;
      }

      this.addProcessedMessage(message.messageId);
      this.distributeMessage(message);
    });
  }

  /**
   * Add message ID to processed set (BoundedSet handles cleanup automatically)
   */
  private addProcessedMessage(messageId: string): void {
    this.processedMessages.add(messageId);
    // No manual cleanup needed - BoundedSet handles size limits and age-based cleanup automatically
  }

  /**
   * Distribute message to all callbacks
   */
  private distributeMessage(message: CrossTabMessage): void {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('[CrossTabCommunicator] Error in message callback:', error);
      }
    });
  }

  /**
   * Broadcast message to all tabs
   */
  broadcast(message: CrossTabMessage): void {
    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage(message);
      } else if (this.fallbackCommunicator) {
        this.fallbackCommunicator.broadcast(message);
      } else {
        console.error('[CrossTabCommunicator] No communication channel available');
      }
    } catch (error) {
      console.error('[CrossTabCommunicator] Error broadcasting message:', error);

      // Try fallback if BroadcastChannel fails
      if (this.broadcastChannel && !this.fallbackCommunicator) {
        console.log('[CrossTabCommunicator] Initializing fallback due to broadcast error');
        this.initializeFallback();
        // After initialization, fallbackCommunicator should be available
        (this.fallbackCommunicator as IFallbackCommunicator | null)?.broadcast(message);
      }
    }
  }

  /**
   * Register message callback
   */
  onMessage(callback: (message: CrossTabMessage) => void): () => void {
    this.messageCallbacks.add(callback);
    
    return () => {
      this.messageCallbacks.delete(callback);
    };
  }

  /**
   * Check if BroadcastChannel is supported
   */
  isChannelSupported(): boolean {
    return this.channelSupported;
  }

  /**
   * Get channel name
   */
  getChannelName(): string {
    return this.channelName;
  }

  /**
   * Enable specific fallback type
   */
  enableFallback(fallbackType: 'localStorage' | 'sharedWorker'): void {
    if (fallbackType === 'localStorage') {
      if (!this.fallbackCommunicator) {
        this.initializeFallback();
      }
    } else if (fallbackType === 'sharedWorker') {
      // TODO: Implement SharedWorker fallback
      console.warn('[CrossTabCommunicator] SharedWorker fallback not yet implemented');
    }
  }

  /**
   * Get current message processing stats
   */
  getStats(): { processedMessages: number; activeCallbacks: number; channelType: string } {
    return {
      processedMessages: this.processedMessages.size,
      activeCallbacks: this.messageCallbacks.size,
      channelType: this.broadcastChannel ? 'BroadcastChannel' : 'LocalStorage'
    };
  }

  /**
   * Close communication channels with comprehensive cleanup
   */
  close(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    try {
      // Close BroadcastChannel
      if (this.broadcastChannel) {
        this.broadcastChannel.close();
        this.broadcastChannel = null;
      }

      // Close fallback communicator
      if (this.fallbackCommunicator) {
        this.fallbackCommunicator.close();
        this.fallbackCommunicator = null;
      }

      // Clear callbacks
      this.messageCallbacks.clear();

      // Destroy bounded collections (this will clear them and stop cleanup timers)
      this.processedMessages.destroy();

      // Unregister from memory manager
      if (this.cleanupUnregister) {
        this.cleanupUnregister();
        this.cleanupUnregister = null;
      }

      console.log('[CrossTabCommunicator] Communication channels closed and cleaned up');
    } catch (error) {
      console.error('[CrossTabCommunicator] Error closing channels:', error);
    }
  }
}
