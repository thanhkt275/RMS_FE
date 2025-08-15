/**
 * Connection State Manager Implementation
 * Single Responsibility: Manage WebSocket connection state persistence and synchronization
 * Handles state storage, cross-tab synchronization, and handoff state management
 */

import {
  IConnectionStateManager,
  CentralizedConnectionState,
  ConnectionHandoffState,
  ICrossTabSynchronizer,
  SynchronizedMessage
} from '../interfaces/websocket-manager.interface';

/**
 * Storage keys for different state types
 */
const STORAGE_KEYS = {
  CONNECTION_STATE: 'websocket-connection-state',
  HANDOFF_STATE: 'websocket-handoff-state',
  STATE_VERSION: 'websocket-state-version'
} as const;

/**
 * State version for migration support
 */
const CURRENT_STATE_VERSION = 1;

/**
 * Connection state manager with persistence and synchronization
 */
export class ConnectionStateManager implements IConnectionStateManager {
  private currentState: CentralizedConnectionState | null = null;
  private stateChangeCallbacks = new Set<(state: CentralizedConnectionState) => void>();
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(
    private readonly synchronizer: ICrossTabSynchronizer,
    private readonly options: {
      syncInterval?: number;
      storageType?: 'localStorage' | 'indexedDB';
      enableAutoSync?: boolean;
    } = {}
  ) {
    this.setupSynchronizer();
    
    if (options.enableAutoSync !== false) {
      this.startAutoSync();
    }
  }

  /**
   * Setup synchronizer for cross-tab state updates
   */
  private setupSynchronizer(): void {
    this.synchronizer.onMessage((message: SynchronizedMessage) => {
      if (message.type === 'CONNECTION_STATUS' && message.data?.stateUpdate) {
        this.handleRemoteStateUpdate(message.data.stateUpdate);
      }
    });
  }

  /**
   * Handle state update from another tab
   */
  private handleRemoteStateUpdate(stateUpdate: Partial<CentralizedConnectionState>): void {
    if (this.currentState) {
      const updatedState = { ...this.currentState, ...stateUpdate };
      this.currentState = updatedState;
      this.notifyStateChange(updatedState);
    }
  }

  /**
   * Start automatic state synchronization
   */
  private startAutoSync(): void {
    const interval = this.options.syncInterval || 30000; // 30 seconds
    
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncStateAcrossTabs();
      } catch (error) {
        console.error('[ConnectionStateManager] Auto-sync failed:', error);
      }
    }, interval);
  }

  /**
   * Stop automatic state synchronization
   */
  private stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Notify state change callbacks
   */
  private notifyStateChange(state: CentralizedConnectionState): void {
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('[ConnectionStateManager] Error in state change callback:', error);
      }
    });
  }

  /**
   * Get storage key with prefix
   */
  private getStorageKey(key: string): string {
    return `${key}-${window.location.origin}`;
  }

  /**
   * Save data to storage
   */
  private async saveToStorage(key: string, data: any): Promise<void> {
    const storageKey = this.getStorageKey(key);
    
    try {
      if (this.options.storageType === 'indexedDB') {
        await this.saveToIndexedDB(storageKey, data);
      } else {
        localStorage.setItem(storageKey, JSON.stringify({
          data,
          timestamp: Date.now(),
          version: CURRENT_STATE_VERSION
        }));
      }
    } catch (error) {
      console.error('[ConnectionStateManager] Error saving to storage:', error);
      throw error;
    }
  }

  /**
   * Load data from storage
   */
  private async loadFromStorage<T>(key: string): Promise<T | null> {
    const storageKey = this.getStorageKey(key);
    
    try {
      if (this.options.storageType === 'indexedDB') {
        return await this.loadFromIndexedDB<T>(storageKey);
      } else {
        const stored = localStorage.getItem(storageKey);
        if (!stored) return null;
        
        const parsed = JSON.parse(stored);
        
        // Check version compatibility
        if (parsed.version !== CURRENT_STATE_VERSION) {
          console.warn('[ConnectionStateManager] State version mismatch, clearing state');
          localStorage.removeItem(storageKey);
          return null;
        }
        
        return parsed.data;
      }
    } catch (error) {
      console.error('[ConnectionStateManager] Error loading from storage:', error);
      return null;
    }
  }

  /**
   * Remove data from storage
   */
  private async removeFromStorage(key: string): Promise<void> {
    const storageKey = this.getStorageKey(key);
    
    try {
      if (this.options.storageType === 'indexedDB') {
        await this.removeFromIndexedDB(storageKey);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.error('[ConnectionStateManager] Error removing from storage:', error);
    }
  }

  /**
   * Save to IndexedDB (placeholder - would need full implementation)
   */
  private async saveToIndexedDB(key: string, data: any): Promise<void> {
    // This would be a full IndexedDB implementation
    // For now, fall back to localStorage
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
      version: CURRENT_STATE_VERSION
    }));
  }

  /**
   * Load from IndexedDB (placeholder - would need full implementation)
   */
  private async loadFromIndexedDB<T>(key: string): Promise<T | null> {
    // This would be a full IndexedDB implementation
    // For now, fall back to localStorage
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    return parsed.data;
  }

  /**
   * Remove from IndexedDB (placeholder - would need full implementation)
   */
  private async removeFromIndexedDB(key: string): Promise<void> {
    // This would be a full IndexedDB implementation
    // For now, fall back to localStorage
    localStorage.removeItem(key);
  }

  // Public interface implementation

  /**
   * Get current connection state
   */
  getState(): CentralizedConnectionState {
    if (!this.currentState) {
      throw new Error('Connection state not initialized. Call loadState() first.');
    }
    return { ...this.currentState };
  }

  /**
   * Update connection state
   */
  updateState(updates: Partial<CentralizedConnectionState>): void {
    if (!this.currentState) {
      throw new Error('Connection state not initialized. Call loadState() first.');
    }

    const oldState = { ...this.currentState };
    this.currentState = { ...this.currentState, ...updates };
    
    // Save updated state
    this.saveState().catch(error => {
      console.error('[ConnectionStateManager] Error saving updated state:', error);
    });
    
    // Broadcast state update to other tabs
    this.synchronizer.broadcast({
      type: 'CONNECTION_STATUS',
      tabId: this.currentState.tabId,
      messageId: `state-update-${Date.now()}`,
      priority: 'normal',
      data: {
        stateUpdate: updates,
        fullState: this.currentState
      }
    }).catch(error => {
      console.error('[ConnectionStateManager] Error broadcasting state update:', error);
    });
    
    this.notifyStateChange(this.currentState);
  }

  /**
   * Save current state to persistent storage
   */
  async saveState(): Promise<void> {
    if (!this.currentState) return;
    
    await this.saveToStorage(STORAGE_KEYS.CONNECTION_STATE, this.currentState);
  }

  /**
   * Load state from persistent storage
   */
  async loadState(): Promise<CentralizedConnectionState | null> {
    const state = await this.loadFromStorage<CentralizedConnectionState>(STORAGE_KEYS.CONNECTION_STATE);
    
    if (state) {
      this.currentState = state;
      this.isInitialized = true;
    }
    
    return state;
  }

  /**
   * Clear state from persistent storage
   */
  async clearState(): Promise<void> {
    await this.removeFromStorage(STORAGE_KEYS.CONNECTION_STATE);
    this.currentState = null;
    this.isInitialized = false;
  }

  /**
   * Synchronize state across tabs
   */
  async syncStateAcrossTabs(): Promise<void> {
    if (!this.currentState) return;

    try {
      await this.synchronizer.broadcast({
        type: 'SYNC_REQUEST',
        tabId: this.currentState.tabId,
        messageId: `sync-request-${Date.now()}`,
        priority: 'normal',
        data: {
          requestType: 'connection-state',
          currentState: this.currentState
        }
      });
    } catch (error) {
      console.error('[ConnectionStateManager] Error syncing state across tabs:', error);
    }
  }

  /**
   * Register state change callback
   */
  onStateChange(callback: (state: CentralizedConnectionState) => void): () => void {
    this.stateChangeCallbacks.add(callback);
    
    return () => {
      this.stateChangeCallbacks.delete(callback);
    };
  }

  /**
   * Save handoff state
   */
  async saveHandoffState(handoffState: ConnectionHandoffState): Promise<void> {
    const key = `${STORAGE_KEYS.HANDOFF_STATE}-${handoffState.handoffId}`;
    await this.saveToStorage(key, handoffState);
  }

  /**
   * Load handoff state
   */
  async loadHandoffState(handoffId: string): Promise<ConnectionHandoffState | null> {
    const key = `${STORAGE_KEYS.HANDOFF_STATE}-${handoffId}`;
    return await this.loadFromStorage<ConnectionHandoffState>(key);
  }

  /**
   * Clear handoff state
   */
  async clearHandoffState(handoffId: string): Promise<void> {
    const key = `${STORAGE_KEYS.HANDOFF_STATE}-${handoffId}`;
    await this.removeFromStorage(key);
  }

  /**
   * Initialize state manager
   */
  async initialize(initialState: CentralizedConnectionState): Promise<void> {
    // Try to load existing state first
    const existingState = await this.loadState();
    
    if (existingState) {
      // Merge with initial state, preferring existing state for most fields
      this.currentState = {
        ...initialState,
        ...existingState,
        // Always use new tab ID and reset connection status
        tabId: initialState.tabId,
        isConnected: false,
        connectionStatus: initialState.connectionStatus
      };
    } else {
      this.currentState = initialState;
    }
    
    this.isInitialized = true;
    await this.saveState();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopAutoSync();
    this.stateChangeCallbacks.clear();
    this.currentState = null;
    this.isInitialized = false;
  }
}
