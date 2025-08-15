/**
 * Tab Coordinator Implementation
 * Single Responsibility: Manage leader election and tab coordination
 * Dependency Inversion: Depends on ICrossTabCommunicator abstraction
 */

import {
  ITabCoordinator,
  ICrossTabCommunicator,
  CrossTabMessage
} from '../interfaces/websocket-manager.interface';
import { DistributedLockManager, AtomicOperationExecutor } from '../utils/atomic-operations';
import { getMemoryManager, createCleanupTarget } from './memory-manager';

/**
 * Leader election candidate information
 */
interface LeaderCandidate {
  tabId: string;
  timestamp: number;
  priority: number;
}

/**
 * Tab coordinator with deterministic leader election
 */
export class TabCoordinator implements ITabCoordinator {
  private readonly tabId: string;
  private isCurrentLeader = false;
  private currentLeaderTabId: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private leaderElectionTimeout: NodeJS.Timeout | null = null;
  private lastLeaderHeartbeat = 0;

  private readonly heartbeatIntervalMs: number;
  private readonly leaderElectionTimeoutMs: number;
  private readonly heartbeatTimeoutMs: number;

  // Tab Visibility API integration
  private isTabVisible = true;
  private visibilityChangeCallbacks = new Set<(isVisible: boolean) => void>();

  private leaderChangeCallbacks = new Set<(newLeaderId: string | null, oldLeaderId: string | null) => void>();
  private crossTabUnsubscribe: (() => void) | null = null;

  // Atomic operations for race condition prevention
  private lockManager: DistributedLockManager;
  private operationExecutor: AtomicOperationExecutor;
  private cleanupUnregister: (() => void) | null = null;
  private isDestroyed = false;

  // Election state management
  private electionState: 'IDLE' | 'CANDIDATE' | 'VOTING' | 'DECIDED' = 'IDLE';
  private electionId: string | null = null;

  constructor(
    private readonly crossTabCommunicator: ICrossTabCommunicator,
    options: {
      heartbeatInterval?: number;
      leaderElectionTimeout?: number;
      heartbeatTimeout?: number;
    } = {}
  ) {
    this.tabId = this.generateTabId();
    this.heartbeatIntervalMs = options.heartbeatInterval ?? 5000; // 5 seconds
    this.leaderElectionTimeoutMs = options.leaderElectionTimeout ?? 2000; // 2 seconds
    this.heartbeatTimeoutMs = options.heartbeatTimeout ?? 10000; // 10 seconds

    // Initialize atomic operations
    this.lockManager = new DistributedLockManager(this.crossTabCommunicator, this.tabId);
    this.operationExecutor = new AtomicOperationExecutor();

    this.setupCrossTabListener();
    this.setupBeforeUnloadHandler();
    this.registerForCleanup();
    this.setupVisibilityChangeListener();
    this.monitorLeaderHeartbeat();
  }

  /**
   * Register for centralized cleanup
   */
  private registerForCleanup(): void {
    const memoryManager = getMemoryManager();
    this.cleanupUnregister = memoryManager.registerCleanupTarget(
      createCleanupTarget(
        `TabCoordinator-${this.tabId}`,
        () => this.performCleanup(),
        {
          priority: 'critical',
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

    // Clean up stale callbacks
    const staleLeaderCallbacks: Array<(newLeaderId: string | null, oldLeaderId: string | null) => void> = [];
    this.leaderChangeCallbacks.forEach(callback => {
      if (typeof callback !== 'function') {
        staleLeaderCallbacks.push(callback);
      }
    });
    staleLeaderCallbacks.forEach(callback => {
      this.leaderChangeCallbacks.delete(callback);
    });

    const staleVisibilityCallbacks: Array<(isVisible: boolean) => void> = [];
    this.visibilityChangeCallbacks.forEach(callback => {
      if (typeof callback !== 'function') {
        staleVisibilityCallbacks.push(callback);
      }
    });
    staleVisibilityCallbacks.forEach(callback => {
      this.visibilityChangeCallbacks.delete(callback);
    });
  }

  /**
   * Get estimated memory usage
   */
  private getMemoryUsage(): number {
    return (
      this.leaderChangeCallbacks.size * 100 +
      this.visibilityChangeCallbacks.size * 100 +
      500 // base overhead
    );
  }

  /**
   * Generate unique tab ID
   */
  private generateTabId(): string {
    return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Setup cross-tab message listener
   */
  private setupCrossTabListener(): void {
    this.crossTabUnsubscribe = this.crossTabCommunicator.onMessage((message) => {
      this.handleCrossTabMessage(message);
    });
  }

  /**
   * Setup beforeunload handler for graceful tab closing
   */
  private setupBeforeUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      this.onTabClosing();
    });
  }

  /**
   * Setup Page Visibility API listener for tab visibility changes
   */
  private setupVisibilityChangeListener(): void {
    // Initialize current visibility state
    this.isTabVisible = !document.hidden;

    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      const wasVisible = this.isTabVisible;
      this.isTabVisible = !document.hidden;

      console.log(`[TabCoordinator] Tab visibility changed: ${wasVisible} -> ${this.isTabVisible}`);

      // Notify visibility change callbacks
      this.visibilityChangeCallbacks.forEach(callback => {
        try {
          callback(this.isTabVisible);
        } catch (error) {
          console.error('[TabCoordinator] Error in visibility change callback:', error);
        }
      });

      // Handle leadership optimization based on visibility
      this.handleVisibilityChange(wasVisible, this.isTabVisible);
    });
  }

  /**
   * Handle cross-tab messages
   */
  private handleCrossTabMessage(message: CrossTabMessage): void {
    // Ignore messages from this tab
    if (message.tabId === this.tabId) return;

    switch (message.type) {
      case 'LEADER_ELECTION':
        this.handleLeaderElectionMessage(message);
        break;
      case 'LEADER_HEARTBEAT':
        this.handleLeaderHeartbeat(message);
        break;
      case 'TAB_CLOSING':
        this.handleTabClosed(message.tabId);
        break;
      case 'TAB_VISIBILITY_CHANGE':
        this.handleTabVisibilityChange(message);
        break;
    }
  }

  /**
   * Handle leader election message
   */
  private handleLeaderElectionMessage(message: CrossTabMessage): void {
    // Log the election message for debugging
    console.log(`[TabCoordinator] Received election message from tab: ${message.tabId}`);

    // Respond with our candidacy if we're also running for leader
    if (this.leaderElectionTimeout) {
      this.broadcastLeaderCandidate();
    }
  }

  /**
   * Handle leader heartbeat message
   */
  private handleLeaderHeartbeat(message: CrossTabMessage): void {
    const oldLeaderId = this.currentLeaderTabId;
    this.currentLeaderTabId = message.tabId;
    this.lastLeaderHeartbeat = message.timestamp;

    // If we were the leader but someone else is now sending heartbeats
    if (this.isCurrentLeader && message.tabId !== this.tabId) {
      console.log(`[TabCoordinator] Leadership taken by tab: ${message.tabId}`);
      this.resignLeadership();
    }

    // Notify if leader changed
    if (oldLeaderId !== this.currentLeaderTabId) {
      this.notifyLeaderChange(this.currentLeaderTabId, oldLeaderId);
    }
  }

  /**
   * Handle tab visibility change message from other tabs
   */
  private handleTabVisibilityChange(message: CrossTabMessage): void {
    const { isVisible, isLeader } = message.data || {};

    console.log(`[TabCoordinator] Tab ${message.tabId} visibility changed: ${isVisible}, isLeader: ${isLeader}`);

    // If a visible tab announced itself and we're not the leader, they might challenge
    if (isVisible && !this.isCurrentLeader && this.isTabVisible) {
      // Multiple visible tabs - let election decide
      return;
    }

    // If the current leader became hidden and we're visible, consider challenging
    if (isLeader === true && !isVisible && this.isTabVisible && !this.isCurrentLeader) {
      console.log(`[TabCoordinator] Leader became hidden, visible tab considering challenge`);
      setTimeout(() => {
        if (!this.isCurrentLeader && this.isTabVisible) {
          this.electLeader();
        }
      }, 500); // Small delay to avoid race conditions
    }
  }

  /**
   * Monitor leader heartbeat and trigger election if needed
   */
  private monitorLeaderHeartbeat(): void {
    setInterval(() => {
      const now = Date.now();
      
      // Check if leader heartbeat has timed out
      if (this.currentLeaderTabId && 
          !this.isCurrentLeader && 
          (now - this.lastLeaderHeartbeat) > this.heartbeatTimeoutMs) {
        
        console.log(`[TabCoordinator] Leader heartbeat timeout, starting election`);
        this.electLeader();
      }
    }, this.heartbeatIntervalMs / 2); // Check more frequently than heartbeat
  }

  /**
   * Broadcast leader candidate information
   */
  private broadcastLeaderCandidate(): void {
    const candidate: LeaderCandidate = {
      tabId: this.tabId,
      timestamp: Date.now(),
      priority: this.calculatePriority()
    };

    this.crossTabCommunicator.broadcast({
      type: 'LEADER_ELECTION',
      tabId: this.tabId,
      timestamp: Date.now(),
      messageId: `election-${this.tabId}-${Date.now()}`,
      data: candidate
    });
  }

  /**
   * Handle visibility change and optimize leadership
   */
  private handleVisibilityChange(wasVisible: boolean, isNowVisible: boolean): void {
    // If this tab became visible and we're not the leader, check if we should challenge
    if (!wasVisible && isNowVisible && !this.isCurrentLeader) {
      // Broadcast visibility change to inform other tabs
      this.crossTabCommunicator.broadcast({
        type: 'TAB_VISIBILITY_CHANGE',
        tabId: this.tabId,
        timestamp: Date.now(),
        messageId: `visibility-${this.tabId}-${Date.now()}`,
        data: { isVisible: true }
      });

      // If current leader is hidden, trigger election
      setTimeout(() => {
        if (this.currentLeaderTabId && !this.isCurrentLeader) {
          console.log(`[TabCoordinator] Visible tab challenging for leadership`);
          this.electLeader();
        }
      }, 100); // Small delay to let other tabs process visibility changes
    }

    // If this tab became hidden and we're the leader, consider resignation
    if (wasVisible && !isNowVisible && this.isCurrentLeader) {
      // Broadcast that leader is now hidden
      this.crossTabCommunicator.broadcast({
        type: 'TAB_VISIBILITY_CHANGE',
        tabId: this.tabId,
        timestamp: Date.now(),
        messageId: `visibility-${this.tabId}-${Date.now()}`,
        data: { isVisible: false, isLeader: true }
      });

      // Consider voluntary resignation after a delay to see if visible tabs are available
      setTimeout(() => {
        if (!this.isTabVisible && this.isCurrentLeader) {
          console.log(`[TabCoordinator] Hidden leader considering resignation`);
          // Trigger election to potentially hand over to visible tab
          this.electLeader();
        }
      }, 1000); // Give time for visible tabs to respond
    }
  }

  /**
   * Calculate priority for leader election (lower number = higher priority)
   */
  private calculatePriority(): number {
    // Use timestamp and tab ID for deterministic priority
    // Earlier tabs get higher priority (lower number)
    const timestampPart = parseInt(this.tabId.split('-')[1]) || 0;

    // Visible tabs get significantly higher priority (lower numbers)
    const visibilityBonus = this.isTabVisible ? 0 : 1000000; // Hidden tabs get much higher numbers

    return timestampPart + visibilityBonus;
  }

  /**
   * Notify leader change callbacks
   */
  private notifyLeaderChange(newLeaderId: string | null, oldLeaderId: string | null): void {
    this.leaderChangeCallbacks.forEach(callback => {
      try {
        callback(newLeaderId, oldLeaderId);
      } catch (error) {
        console.error('[TabCoordinator] Error in leader change callback:', error);
      }
    });
  }

  /**
   * Elect leader using atomic distributed algorithm
   */
  async electLeader(): Promise<boolean> {
    if (this.isDestroyed) return false;

    // Use atomic operation to prevent concurrent elections
    return this.operationExecutor.execute({
      id: `election-${this.tabId}-${Date.now()}`,
      operation: () => this.performAtomicElection(),
      timeout: this.leaderElectionTimeoutMs + 5000,
      priority: 'critical',
      rollback: () => this.rollbackElection()
    });
  }

  /**
   * Perform atomic leader election with distributed locking
   */
  private async performAtomicElection(): Promise<boolean> {
    const electionLockId = 'leader-election';
    this.electionId = `election-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      // Phase 1: Acquire election lock
      console.log(`[TabCoordinator] Attempting to acquire election lock`);
      const lockAcquired = await this.lockManager.acquireLock(electionLockId, {
        timeout: this.leaderElectionTimeoutMs,
        retryInterval: 50,
        maxRetries: 100
      });

      if (!lockAcquired) {
        console.log(`[TabCoordinator] Failed to acquire election lock, election in progress`);
        return false;
      }

      // Phase 2: Set election state
      this.electionState = 'CANDIDATE';

      // Phase 3: Collect candidates
      const candidates = await this.collectCandidates();

      // Phase 4: Determine winner
      this.electionState = 'VOTING';
      const winner = this.determineWinner(candidates);

      // Phase 5: Announce result
      this.electionState = 'DECIDED';
      const isWinner = winner.tabId === this.tabId;

      await this.announceElectionResult(winner, this.electionId!);

      // Phase 6: Apply result
      if (isWinner) {
        this.becomeLeader();
        console.log(`[TabCoordinator] Won atomic leadership election`);
      } else {
        console.log(`[TabCoordinator] Lost atomic leadership election to: ${winner.tabId}`);
        this.currentLeaderTabId = winner.tabId;
      }

      return isWinner;

    } catch (error) {
      console.error('[TabCoordinator] Atomic election failed:', error);
      return false;
    } finally {
      // Always release the election lock
      await this.lockManager.releaseLock(electionLockId);
      this.electionState = 'IDLE';
      this.electionId = null;
    }
  }

  /**
   * Collect candidates for election
   */
  private async collectCandidates(): Promise<LeaderCandidate[]> {
    const candidates: LeaderCandidate[] = [];
    const electionStartTime = Date.now();

    // Add ourselves as candidate
    candidates.push({
      tabId: this.tabId,
      timestamp: electionStartTime,
      priority: this.calculatePriority()
    });

    // Broadcast candidacy announcement
    this.crossTabCommunicator.broadcast({
      type: 'LEADER_ELECTION',
      tabId: this.tabId,
      timestamp: electionStartTime,
      messageId: `election-${this.tabId}-${electionStartTime}`,
      data: {
        tabId: this.tabId,
        timestamp: electionStartTime,
        priority: this.calculatePriority(),
        electionId: this.electionId,
        phase: 'CANDIDATE'
      }
    });

    // Collect responses
    return new Promise((resolve) => {
      const tempUnsubscribe = this.crossTabCommunicator.onMessage((message) => {
        if (message.type === 'LEADER_ELECTION' &&
            message.tabId !== this.tabId &&
            message.data?.electionId === this.electionId) {
          candidates.push(message.data as LeaderCandidate);
        }
      });

      setTimeout(() => {
        tempUnsubscribe();
        resolve(candidates);
      }, this.leaderElectionTimeoutMs / 2); // Shorter collection period
    });
  }

  /**
   * Determine election winner using deterministic algorithm
   */
  private determineWinner(candidates: LeaderCandidate[]): LeaderCandidate {
    return candidates.reduce((prev, current) => {
      // Priority-based selection (lower priority wins)
      if (current.priority < prev.priority) return current;
      if (current.priority > prev.priority) return prev;

      // Tie-breaker 1: Tab visibility (visible tabs preferred)
      const prevVisible = this.isTabVisibleById(prev.tabId);
      const currentVisible = this.isTabVisibleById(current.tabId);
      if (currentVisible && !prevVisible) return current;
      if (prevVisible && !currentVisible) return prev;

      // Tie-breaker 2: Earlier timestamp wins
      if (current.timestamp < prev.timestamp) return current;
      if (current.timestamp > prev.timestamp) return prev;

      // Tie-breaker 3: Lexicographic tab ID
      return current.tabId < prev.tabId ? current : prev;
    });
  }

  /**
   * Announce election result to all tabs
   */
  private async announceElectionResult(winner: LeaderCandidate, electionId: string): Promise<void> {
    this.crossTabCommunicator.broadcast({
      type: 'LEADER_ELECTED',
      tabId: this.tabId,
      timestamp: Date.now(),
      messageId: `result-${electionId}-${Date.now()}`,
      data: {
        winner,
        electionId,
        announcedBy: this.tabId
      }
    });

    // Small delay to ensure message propagation
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Check if a tab is visible (simplified check)
   */
  private isTabVisibleById(tabId: string): boolean {
    // For now, assume our tab visibility, in a real implementation
    // we'd track visibility of other tabs through cross-tab communication
    return tabId === this.tabId ? this.isTabVisible : true;
  }

  /**
   * Rollback election in case of failure
   */
  private async rollbackElection(): Promise<void> {
    this.electionState = 'IDLE';
    this.electionId = null;

    // Broadcast election failure
    this.crossTabCommunicator.broadcast({
      type: 'LEADER_ELECTION_FAILED',
      tabId: this.tabId,
      timestamp: Date.now(),
      messageId: `rollback-${this.tabId}-${Date.now()}`,
      data: {
        reason: 'Election operation failed',
        tabId: this.tabId
      }
    });
  }

  /**
   * Become the leader tab
   */
  becomeLeader(): void {
    const oldLeaderId = this.currentLeaderTabId;
    this.isCurrentLeader = true;
    this.currentLeaderTabId = this.tabId;
    this.startHeartbeat();
    
    this.notifyLeaderChange(this.tabId, oldLeaderId);
  }

  /**
   * Resign from leadership
   */
  resignLeadership(): void {
    if (!this.isCurrentLeader) return;
    
    const oldLeaderId = this.tabId;
    this.isCurrentLeader = false;
    this.currentLeaderTabId = null;
    this.stopHeartbeat();
    
    this.notifyLeaderChange(null, oldLeaderId);
  }

  /**
   * Start sending heartbeat messages
   */
  startHeartbeat(): void {
    if (this.heartbeatInterval) return; // Already started
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isCurrentLeader) {
        this.crossTabCommunicator.broadcast({
          type: 'LEADER_HEARTBEAT',
          tabId: this.tabId,
          timestamp: Date.now(),
          messageId: `heartbeat-${this.tabId}-${Date.now()}`
        });
      }
    }, this.heartbeatIntervalMs);
  }

  /**
   * Stop sending heartbeat messages
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle tab closing event
   */
  onTabClosing(): void {
    // Broadcast that this tab is closing
    this.crossTabCommunicator.broadcast({
      type: 'TAB_CLOSING',
      tabId: this.tabId,
      timestamp: Date.now(),
      messageId: `closing-${this.tabId}-${Date.now()}`
    });

    // If we're the leader, resign and trigger new election
    if (this.isCurrentLeader) {
      this.resignLeadership();
    }

    // Cleanup
    this.stopHeartbeat();
    if (this.crossTabUnsubscribe) {
      this.crossTabUnsubscribe();
    }
  }

  /**
   * Handle when another tab closes
   */
  handleTabClosed(tabId: string): void {
    // If the leader tab closed, start new election
    if (this.currentLeaderTabId === tabId) {
      console.log(`[TabCoordinator] Leader tab closed: ${tabId}, starting election`);
      this.currentLeaderTabId = null;
      this.electLeader();
    }
  }

  // Public interface methods
  isLeader(): boolean {
    return this.isCurrentLeader;
  }

  getLeaderTabId(): string | null {
    return this.currentLeaderTabId;
  }

  getTabId(): string {
    return this.tabId;
  }

  onLeaderChange(callback: (newLeaderId: string | null, oldLeaderId: string | null) => void): () => void {
    this.leaderChangeCallbacks.add(callback);

    return () => {
      this.leaderChangeCallbacks.delete(callback);
    };
  }

  /**
   * Check if current tab is visible
   */
  isVisible(): boolean {
    return this.isTabVisible;
  }

  /**
   * Register callback for visibility changes
   */
  onVisibilityChange(callback: (isVisible: boolean) => void): () => void {
    this.visibilityChangeCallbacks.add(callback);

    return () => {
      this.visibilityChangeCallbacks.delete(callback);
    };
  }
}
