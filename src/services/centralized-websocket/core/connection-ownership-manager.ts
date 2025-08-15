/**
 * Connection Ownership Manager Implementation
 * Single Responsibility: Manage connection ownership and handoff between tabs
 * Coordinates with TabCoordinator for leadership-based connection ownership
 */

import {
  IConnectionOwnershipManager,
  ITabCoordinator,
  IConnectionStateManager,
  ICrossTabSynchronizer,
  CentralizedConnectionState,
  ConnectionHandoffState,
  SynchronizedMessage
} from '../interfaces/websocket-manager.interface';

/**
 * Handoff timeout configuration
 */
const HANDOFF_TIMEOUT = 10000; // 10 seconds
const HANDOFF_RETRY_DELAY = 2000; // 2 seconds
const MAX_HANDOFF_RETRIES = 3;

/**
 * Connection ownership manager with graceful handoff
 */
export class ConnectionOwnershipManager implements IConnectionOwnershipManager {
  private isCurrentOwner = false;
  private currentOwnerTabId: string | null = null;
  private activeHandoffs = new Map<string, NodeJS.Timeout>();
  
  // Event callbacks
  private handoffRequestCallbacks = new Set<(handoffState: ConnectionHandoffState) => void>();
  private handoffCompleteCallbacks = new Set<(handoffId: string) => void>();
  private ownershipChangeCallbacks = new Set<(newOwner: string | null, oldOwner: string | null) => void>();
  
  // Connection functions
  private establishConnectionFn: (() => Promise<void>) | null = null;
  private closeConnectionFn: (() => Promise<void>) | null = null;

  constructor(
    private readonly tabCoordinator: ITabCoordinator,
    private readonly stateManager: IConnectionStateManager,
    private readonly synchronizer: ICrossTabSynchronizer
  ) {
    this.setupTabCoordinatorListener();
    this.setupSynchronizerListener();
  }

  /**
   * Setup tab coordinator listener for leadership changes
   */
  private setupTabCoordinatorListener(): void {
    this.tabCoordinator.onLeaderChange((newLeaderId, oldLeaderId) => {
      this.handleLeadershipChange(newLeaderId, oldLeaderId);
    });
  }

  /**
   * Setup synchronizer listener for handoff messages
   */
  private setupSynchronizerListener(): void {
    this.synchronizer.onMessage((message: SynchronizedMessage) => {
      switch (message.type) {
        case 'CONNECTION_STATUS':
          if (message.data?.handoffRequest) {
            this.handleHandoffRequest(message.data.handoffRequest);
          } else if (message.data?.handoffResponse) {
            this.handleHandoffResponse(message.data.handoffResponse);
          } else if (message.data?.handoffComplete) {
            this.handleHandoffComplete(message.data.handoffComplete);
          }
          break;
      }
    });
  }

  /**
   * Handle leadership change from TabCoordinator
   */
  private async handleLeadershipChange(newLeaderId: string | null, oldLeaderId: string | null): Promise<void> {
    const myTabId = this.tabCoordinator.getTabId();
    const wasOwner = this.isCurrentOwner;

    // Update ownership status
    this.isCurrentOwner = newLeaderId === myTabId;
    this.currentOwnerTabId = newLeaderId;

    console.log(`[ConnectionOwnershipManager] Leadership changed: ${oldLeaderId?.slice(-8)} -> ${newLeaderId?.slice(-8)}, I am ${this.isCurrentOwner ? 'owner' : 'not owner'}`);

    // Handle ownership transition
    if (this.isCurrentOwner && !wasOwner) {
      // Became owner - establish connection
      await this.handleBecameOwner(oldLeaderId);
    } else if (!this.isCurrentOwner && wasOwner) {
      // Lost ownership - close connection
      await this.handleLostOwnership(newLeaderId);
    }
    
    // Notify ownership change
    this.ownershipChangeCallbacks.forEach(callback => {
      try {
        callback(newLeaderId, oldLeaderId);
      } catch (error) {
        console.error('[ConnectionOwnershipManager] Error in ownership change callback:', error);
      }
    });
  }

  /**
   * Handle becoming connection owner
   */
  private async handleBecameOwner(previousOwnerId: string | null): Promise<void>{
    console.log('[ConnectionOwnershipManager] Became connection owner');
    
    try {
      // If there was a previous owner, request handoff
      if (previousOwnerId && previousOwnerId !== this.tabCoordinator.getTabId()) {
        const handoffSuccess = await this.requestHandoffFromTab(previousOwnerId);
        if (!handoffSuccess) {
          console.warn('[ConnectionOwnershipManager] Handoff failed, establishing new connection');
        }
      }
      
      // Establish connection if we don't have one or handoff failed
      if (this.establishConnectionFn) {
        await this.establishConnectionFn();
      }
      
    } catch (error) {
      console.error('[ConnectionOwnershipManager] Error becoming owner:', error);
    }
  }

  /**
   * Handle losing connection ownership
   */
  private async handleLostOwnership(newOwnerId: string | null): Promise<void> {
    console.log('[ConnectionOwnershipManager] Lost connection ownership');
    
    try {
      // If there's a new owner, offer handoff
      if (newOwnerId && this.closeConnectionFn) {
        const handoffSuccess = await this.offerHandoffToTab(newOwnerId);
        if (!handoffSuccess) {
          console.warn('[ConnectionOwnershipManager] Handoff offer failed, closing connection');
          await this.closeConnectionFn();
        }
      } else if (this.closeConnectionFn) {
        // No new owner, just close connection
        await this.closeConnectionFn();
      }
      
    } catch (error) {
      console.error('[ConnectionOwnershipManager] Error losing ownership:', error);
    }
  }

  /**
   * Request handoff from previous owner
   */
  private async requestHandoffFromTab(targetTabId: string): Promise<boolean> {
    const handoffId = `handoff-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    console.log(`[ConnectionOwnershipManager] Requesting handoff from tab ${targetTabId.slice(-8)}`);
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.activeHandoffs.delete(handoffId);
        resolve(false);
      }, HANDOFF_TIMEOUT);
      
      this.activeHandoffs.set(handoffId, timeout);
      
      // Listen for handoff response
      const unsubscribe = this.synchronizer.onMessage((message: SynchronizedMessage) => {
        if (message.type === 'CONNECTION_STATUS' && 
            message.data?.handoffResponse?.handoffId === handoffId) {
          
          clearTimeout(timeout);
          this.activeHandoffs.delete(handoffId);
          unsubscribe();
          
          const success = message.data.handoffResponse.success;
          if (success) {
            this.processHandoffData(message.data.handoffResponse.handoffState);
          }
          
          resolve(success);
        }
      });
      
      // Send handoff request
      this.synchronizer.broadcast({
        type: 'CONNECTION_STATUS',
        tabId: this.tabCoordinator.getTabId(),
        messageId: `handoff-request-${handoffId}`,
        priority: 'high',
        data: {
          handoffRequest: {
            handoffId,
            targetTabId,
            requestingTabId: this.tabCoordinator.getTabId()
          }
        }
      }).catch(error => {
        console.error('[ConnectionOwnershipManager] Error sending handoff request:', error);
        clearTimeout(timeout);
        this.activeHandoffs.delete(handoffId);
        unsubscribe();
        resolve(false);
      });
    });
  }

  /**
   * Offer handoff to new owner
   */
  private async offerHandoffToTab(targetTabId: string): Promise<boolean> {
    const handoffId = `handoff-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    console.log(`[ConnectionOwnershipManager] Offering handoff to tab ${targetTabId.slice(-8)}`);
    
    try {
      // Prepare handoff state
      const connectionState = this.stateManager.getState();
      const handoffState: ConnectionHandoffState = {
        fromTabId: this.tabCoordinator.getTabId(),
        toTabId: targetTabId,
        connectionState,
        subscriptions: [], // Would be populated with actual subscriptions
        pendingMessages: [], // Would be populated with pending messages
        handoffStartTime: Date.now(),
        handoffId
      };
      
      // Save handoff state
      await this.stateManager.saveHandoffState(handoffState);
      
      // Send handoff offer
      await this.synchronizer.broadcast({
        type: 'CONNECTION_STATUS',
        tabId: this.tabCoordinator.getTabId(),
        messageId: `handoff-offer-${handoffId}`,
        priority: 'high',
        data: {
          handoffRequest: handoffState
        }
      });
      
      return true;
    } catch (error) {
      console.error('[ConnectionOwnershipManager] Error offering handoff:', error);
      return false;
    }
  }

  /**
   * Process handoff data from previous owner
   */
  private async processHandoffData(handoffState: ConnectionHandoffState): Promise<void> {
    console.log('[ConnectionOwnershipManager] Processing handoff data');
    
    try {
      // Update connection state with handoff data
      this.stateManager.updateState(handoffState.connectionState);
      
      // Process subscriptions and pending messages
      // This would involve re-establishing subscriptions and processing pending messages
      
      // Complete handoff
      await this.completeHandoff(handoffState.handoffId);
      
    } catch (error) {
      console.error('[ConnectionOwnershipManager] Error processing handoff data:', error);
    }
  }

  /**
   * Handle incoming handoff request
   */
  private async handleHandoffRequest(handoffRequest: any): Promise<void> {
    const { handoffId, requestingTabId } = handoffRequest;
    
    console.log(`[ConnectionOwnershipManager] Received handoff request from ${requestingTabId.slice(-8)}`);
    
    // Only respond if we're the current owner
    if (!this.isCurrentOwner) return;
    
    try {
      // Prepare handoff state
      const connectionState = this.stateManager.getState();
      const handoffState: ConnectionHandoffState = {
        fromTabId: this.tabCoordinator.getTabId(),
        toTabId: requestingTabId,
        connectionState,
        subscriptions: [],
        pendingMessages: [],
        handoffStartTime: Date.now(),
        handoffId
      };
      
      // Save handoff state
      await this.stateManager.saveHandoffState(handoffState);
      
      // Send handoff response
      await this.synchronizer.broadcast({
        type: 'CONNECTION_STATUS',
        tabId: this.tabCoordinator.getTabId(),
        messageId: `handoff-response-${handoffId}`,
        priority: 'high',
        data: {
          handoffResponse: {
            handoffId,
            success: true,
            handoffState
          }
        }
      });
      
      // Close our connection after successful handoff
      if (this.closeConnectionFn) {
        await this.closeConnectionFn();
      }
      
    } catch (error) {
      console.error('[ConnectionOwnershipManager] Error handling handoff request:', error);
      
      // Send failure response
      this.synchronizer.broadcast({
        type: 'CONNECTION_STATUS',
        tabId: this.tabCoordinator.getTabId(),
        messageId: `handoff-response-${handoffId}`,
        priority: 'high',
        data: {
          handoffResponse: {
            handoffId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }).catch(broadcastError => {
        console.error('[ConnectionOwnershipManager] Error sending handoff failure response:', broadcastError);
      });
    }
  }

  /**
   * Handle handoff response
   */
  private handleHandoffResponse(handoffResponse: any): void {
    // This is handled in the requestHandoffFromTab promise
  }

  /**
   * Handle handoff completion
   */
  private handleHandoffComplete(handoffComplete: any): void {
    const { handoffId } = handoffComplete;
    
    console.log(`[ConnectionOwnershipManager] Handoff ${handoffId} completed`);
    
    // Clean up handoff state
    this.stateManager.clearHandoffState(handoffId).catch(error => {
      console.error('[ConnectionOwnershipManager] Error clearing handoff state:', error);
    });
    
    // Notify callbacks
    this.handoffCompleteCallbacks.forEach(callback => {
      try {
        callback(handoffId);
      } catch (error) {
        console.error('[ConnectionOwnershipManager] Error in handoff complete callback:', error);
      }
    });
  }

  // Public interface implementation

  /**
   * Set connection functions
   */
  setConnectionFunctions(
    establishConnection: () => Promise<void>,
    closeConnection: () => Promise<void>
  ): void {
    this.establishConnectionFn = establishConnection;
    this.closeConnectionFn = closeConnection;
  }

  /**
   * Take ownership of connection
   */
  async takeOwnership(): Promise<boolean> {
    try {
      const success = await this.tabCoordinator.electLeader();
      if (success) {
        this.isCurrentOwner = true;
        this.currentOwnerTabId = this.tabCoordinator.getTabId();
      }
      return success;
    } catch (error) {
      console.error('[ConnectionOwnershipManager] Error taking ownership:', error);
      return false;
    }
  }

  /**
   * Release ownership of connection
   */
  async releaseOwnership(): Promise<void> {
    if (!this.isCurrentOwner) return;

    try {
      this.tabCoordinator.resignLeadership();
      this.isCurrentOwner = false;
      this.currentOwnerTabId = null;

      if (this.closeConnectionFn) {
        await this.closeConnectionFn();
      }
    } catch (error) {
      console.error('[ConnectionOwnershipManager] Error releasing ownership:', error);
    }
  }

  /**
   * Check if this tab is the owner
   */
  isOwner(): boolean {
    return this.isCurrentOwner;
  }

  /**
   * Get current owner tab ID
   */
  getOwnerTabId(): string | null {
    return this.currentOwnerTabId;
  }

  /**
   * Initiate handoff to specific tab
   */
  async initiateHandoff(targetTabId: string): Promise<boolean> {
    if (!this.isOwner) {
      throw new Error('Cannot initiate handoff: not the current owner');
    }

    return await this.offerHandoffToTab(targetTabId);
  }

  /**
   * Accept handoff from another tab
   */
  async acceptHandoff(handoffState: ConnectionHandoffState): Promise<boolean> {
    try {
      await this.processHandoffData(handoffState);
      return true;
    } catch (error) {
      console.error('[ConnectionOwnershipManager] Error accepting handoff:', error);
      return false;
    }
  }

  /**
   * Complete handoff process
   */
  async completeHandoff(handoffId: string): Promise<void> {
    try {
      // Notify completion
      await this.synchronizer.broadcast({
        type: 'CONNECTION_STATUS',
        tabId: this.tabCoordinator.getTabId(),
        messageId: `handoff-complete-${handoffId}`,
        priority: 'high',
        data: {
          handoffComplete: {
            handoffId,
            completedBy: this.tabCoordinator.getTabId(),
            timestamp: Date.now()
          }
        }
      });

      // Clean up handoff state
      await this.stateManager.clearHandoffState(handoffId);

    } catch (error) {
      console.error('[ConnectionOwnershipManager] Error completing handoff:', error);
    }
  }

  /**
   * Cancel handoff process
   */
  async cancelHandoff(handoffId: string): Promise<void> {
    try {
      // Clear timeout if exists
      const timeout = this.activeHandoffs.get(handoffId);
      if (timeout) {
        clearTimeout(timeout);
        this.activeHandoffs.delete(handoffId);
      }

      // Clean up handoff state
      await this.stateManager.clearHandoffState(handoffId);

      // Notify cancellation
      await this.synchronizer.broadcast({
        type: 'CONNECTION_STATUS',
        tabId: this.tabCoordinator.getTabId(),
        messageId: `handoff-cancel-${handoffId}`,
        priority: 'high',
        data: {
          handoffCancel: {
            handoffId,
            cancelledBy: this.tabCoordinator.getTabId(),
            timestamp: Date.now()
          }
        }
      });

    } catch (error) {
      console.error('[ConnectionOwnershipManager] Error cancelling handoff:', error);
    }
  }

  /**
   * Register handoff request callback
   */
  onHandoffRequest(callback: (handoffState: ConnectionHandoffState) => void): () => void {
    this.handoffRequestCallbacks.add(callback);
    return () => this.handoffRequestCallbacks.delete(callback);
  }

  /**
   * Register handoff complete callback
   */
  onHandoffComplete(callback: (handoffId: string) => void): () => void {
    this.handoffCompleteCallbacks.add(callback);
    return () => this.handoffCompleteCallbacks.delete(callback);
  }

  /**
   * Register ownership change callback
   */
  onOwnershipChange(callback: (newOwner: string | null, oldOwner: string | null) => void): () => void {
    this.ownershipChangeCallbacks.add(callback);
    return () => this.ownershipChangeCallbacks.delete(callback);
  }

  /**
   * Establish connection (if owner)
   */
  async establishConnection(): Promise<void> {
    if (!this.isOwner) {
      throw new Error('Cannot establish connection: not the owner');
    }

    if (this.establishConnectionFn) {
      await this.establishConnectionFn();
    }
  }

  /**
   * Close connection (if owner)
   */
  async closeConnection(): Promise<void> {
    if (!this.isOwner) {
      throw new Error('Cannot close connection: not the owner');
    }

    if (this.closeConnectionFn) {
      await this.closeConnectionFn();
    }
  }

  /**
   * Transfer connection to another tab
   */
  async transferConnection(targetTabId: string): Promise<boolean> {
    if (!this.isOwner) {
      throw new Error('Cannot transfer connection: not the owner');
    }

    return await this.initiateHandoff(targetTabId);
  }

  /**
   * Get current connection state
   */
  getConnectionState(): CentralizedConnectionState {
    return this.stateManager.getState();
  }

  /**
   * Synchronize connection state across tabs
   */
  async syncConnectionState(): Promise<void> {
    await this.stateManager.syncStateAcrossTabs();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear all active handoffs
    for (const [handoffId, timeout] of this.activeHandoffs) {
      clearTimeout(timeout);
    }
    this.activeHandoffs.clear();

    // Clear callbacks
    this.handoffRequestCallbacks.clear();
    this.handoffCompleteCallbacks.clear();
    this.ownershipChangeCallbacks.clear();

    // Reset state
    this.isCurrentOwner = false;
    this.currentOwnerTabId = null;
    this.establishConnectionFn = null;
    this.closeConnectionFn = null;
  }
}
