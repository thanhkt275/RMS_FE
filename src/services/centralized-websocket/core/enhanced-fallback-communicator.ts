/**
 * Enhanced Fallback Communicator
 * Single Responsibility: Provide robust fallback mechanisms for cross-tab communication
 * Handles browser compatibility issues and provides multiple fallback strategies
 */

import { CrossTabMessage } from '../interfaces/websocket-manager.interface';

/**
 * Fallback strategy interface
 */
export interface IFallbackStrategy {
  name: string;
  isSupported(): boolean;
  broadcast(message: CrossTabMessage): Promise<void>;
  onMessage(callback: (message: CrossTabMessage) => void): () => void;
  close(): void;
}

/**
 * Enhanced LocalStorage fallback with persistence and polling
 */
export class EnhancedLocalStorageFallback implements IFallbackStrategy {
  name = 'enhanced-localStorage';
  
  private readonly storageKey = 'websocket-cross-tab-messages';
  private readonly queueKey = 'websocket-message-queue';
  private readonly heartbeatKey = 'websocket-tab-heartbeat';
  
  private messageCallbacks = new Set<(message: CrossTabMessage) => void>();
  private storageListener: ((event: StorageEvent) => void) | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  private readonly tabId = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  private lastProcessedTimestamp = 0;
  private isActive = true;

  constructor(private readonly options: {
    pollingInterval?: number;
    heartbeatInterval?: number;
    maxQueueSize?: number;
    messageTimeout?: number;
  } = {}) {
    this.setupStorageListener();
    this.setupPolling();
    this.setupHeartbeat();
  }

  isSupported(): boolean {
    try {
      const testKey = '__websocket_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Setup storage event listener (primary mechanism)
   */
  private setupStorageListener(): void {
    if (typeof window === 'undefined') return;

    this.storageListener = (event: StorageEvent) => {
      if (!this.isActive) return;
      
      if (event.key === this.storageKey && event.newValue) {
        try {
          const message: CrossTabMessage = JSON.parse(event.newValue);
          this.processMessage(message);
        } catch (error) {
          console.error('[EnhancedLocalStorageFallback] Error parsing storage message:', error);
        }
      }
    };

    window.addEventListener('storage', this.storageListener);
  }

  /**
   * Setup polling mechanism (fallback for Safari and mobile browsers)
   */
  private setupPolling(): void {
    const interval = this.options.pollingInterval || 1000; // 1 second
    
    this.pollingInterval = setInterval(() => {
      if (!this.isActive) return;
      this.pollForMessages();
    }, interval);
  }

  /**
   * Setup heartbeat to track active tabs
   */
  private setupHeartbeat(): void {
    const interval = this.options.heartbeatInterval || 5000; // 5 seconds
    
    this.heartbeatInterval = setInterval(() => {
      if (!this.isActive) return;
      this.sendHeartbeat();
    }, interval);
  }

  /**
   * Poll for new messages (Safari compatibility)
   */
  private pollForMessages(): void {
    try {
      const queueData = localStorage.getItem(this.queueKey);
      if (!queueData) return;

      const queue: Array<{ message: CrossTabMessage; timestamp: number }> = JSON.parse(queueData);
      const newMessages = queue.filter(item => item.timestamp > this.lastProcessedTimestamp);

      newMessages.forEach(item => {
        this.processMessage(item.message);
        this.lastProcessedTimestamp = Math.max(this.lastProcessedTimestamp, item.timestamp);
      });

      // Cleanup old messages
      this.cleanupQueue();
    } catch (error) {
      console.error('[EnhancedLocalStorageFallback] Error polling messages:', error);
    }
  }

  /**
   * Send heartbeat to indicate this tab is active
   */
  private sendHeartbeat(): void {
    try {
      const heartbeat = {
        tabId: this.tabId,
        timestamp: Date.now(),
        active: this.isActive
      };
      
      localStorage.setItem(`${this.heartbeatKey}-${this.tabId}`, JSON.stringify(heartbeat));
    } catch (error) {
      console.error('[EnhancedLocalStorageFallback] Error sending heartbeat:', error);
    }
  }

  /**
   * Process incoming message
   */
  private processMessage(message: CrossTabMessage): void {
    // Skip messages from this tab
    if (message.tabId === this.tabId) return;

    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('[EnhancedLocalStorageFallback] Error in message callback:', error);
      }
    });
  }

  /**
   * Cleanup old messages from queue
   */
  private cleanupQueue(): void {
    try {
      const queueData = localStorage.getItem(this.queueKey);
      if (!queueData) return;

      const queue: Array<{ message: CrossTabMessage; timestamp: number }> = JSON.parse(queueData);
      const maxAge = this.options.messageTimeout || 300000; // 5 minutes
      const now = Date.now();
      
      const cleanQueue = queue.filter(item => (now - item.timestamp) < maxAge);
      
      // Limit queue size
      const maxSize = this.options.maxQueueSize || 1000;
      if (cleanQueue.length > maxSize) {
        cleanQueue.splice(0, cleanQueue.length - maxSize);
      }

      localStorage.setItem(this.queueKey, JSON.stringify(cleanQueue));
    } catch (error) {
      console.error('[EnhancedLocalStorageFallback] Error cleaning queue:', error);
    }
  }

  async broadcast(message: CrossTabMessage): Promise<void> {
    if (!this.isActive) {
      throw new Error('Fallback communicator is not active');
    }

    try {
      // Method 1: Direct storage (triggers storage event)
      localStorage.setItem(this.storageKey, JSON.stringify(message));
      
      // Clear after short delay to trigger event
      setTimeout(() => {
        try {
          localStorage.removeItem(this.storageKey);
        } catch (error) {
          // Ignore cleanup errors
        }
      }, 100);

      // Method 2: Add to persistent queue (for polling)
      const queueData = localStorage.getItem(this.queueKey);
      const queue: Array<{ message: CrossTabMessage; timestamp: number }> = queueData ? JSON.parse(queueData) : [];
      
      queue.push({
        message,
        timestamp: Date.now()
      });

      localStorage.setItem(this.queueKey, JSON.stringify(queue));
      
    } catch (error) {
      console.error('[EnhancedLocalStorageFallback] Error broadcasting message:', error);
      throw error;
    }
  }

  onMessage(callback: (message: CrossTabMessage) => void): () => void {
    this.messageCallbacks.add(callback);
    
    return () => {
      this.messageCallbacks.delete(callback);
    };
  }

  close(): void {
    this.isActive = false;
    
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    this.messageCallbacks.clear();
    
    // Remove heartbeat
    try {
      localStorage.removeItem(`${this.heartbeatKey}-${this.tabId}`);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * IndexedDB fallback for large message storage
 */
export class IndexedDBFallback implements IFallbackStrategy {
  name = 'indexedDB';
  
  private db: IDBDatabase | null = null;
  private messageCallbacks = new Set<(message: CrossTabMessage) => void>();
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastProcessedId = 0;
  private isActive = true;

  constructor(private readonly dbName = 'websocket-cross-tab-db') {
    this.initializeDB();
    this.setupPolling();
  }

  isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  private async initializeDB(): Promise<void> {
    if (!this.isSupported()) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('messages')) {
          const store = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('tabId', 'tabId', { unique: false });
        }
      };
    });
  }

  private setupPolling(): void {
    this.pollingInterval = setInterval(() => {
      if (this.isActive && this.db) {
        this.pollForMessages();
      }
    }, 2000); // 2 seconds
  }

  private async pollForMessages(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const request = store.getAll();

      request.onsuccess = () => {
        const messages = request.result;
        const newMessages = messages.filter(item => item.id > this.lastProcessedId);
        
        newMessages.forEach(item => {
          if (item.message.tabId !== this.getTabId()) {
            this.processMessage(item.message);
            this.lastProcessedId = Math.max(this.lastProcessedId, item.id);
          }
        });
      };
    } catch (error) {
      console.error('[IndexedDBFallback] Error polling messages:', error);
    }
  }

  private getTabId(): string {
    // Simple tab ID generation
    return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private processMessage(message: CrossTabMessage): void {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('[IndexedDBFallback] Error in message callback:', error);
      }
    });
  }

  async broadcast(message: CrossTabMessage): Promise<void> {
    if (!this.db || !this.isActive) {
      throw new Error('IndexedDB fallback is not available');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      
      const request = store.add({
        message,
        timestamp: Date.now()
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  onMessage(callback: (message: CrossTabMessage) => void): () => void {
    this.messageCallbacks.add(callback);
    
    return () => {
      this.messageCallbacks.delete(callback);
    };
  }

  close(): void {
    this.isActive = false;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    this.messageCallbacks.clear();
  }
}
