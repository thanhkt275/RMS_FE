import { TimerData, ScoreData, MatchData, MatchStateData, UserRole } from '@/types/types';
import { WebSocketEventData } from '@/types/websocket';

/**
 * Represents the complete state of a match session
 */
export interface MatchState {
  matchId: string;
  matchNumber: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  currentPeriod: 'auto' | 'teleop' | 'endgame' | null;
  redTeams: Array<{ id: string; name: string; teamNumber: string }>;
  blueTeams: Array<{ id: string; name: string; teamNumber: string }>;
  fieldId?: string;
  tournamentId: string;
  timer: TimerData;
  scores: ScoreData;
  lastUpdated: number;
  activeUsers: string[];
  version: number;
}

/**
 * Represents a state update with metadata
 */
export interface StateUpdate {
  matchId: string;
  userId: string;
  userRole: UserRole;
  timestamp: number;
  version: number;
  changes: Partial<MatchState>;
  changeType: 'timer' | 'score' | 'match' | 'full';
}

/**
 * Represents a state history entry for debugging and recovery
 */
export interface StateHistoryEntry {
  timestamp: number;
  userId: string;
  userRole: UserRole;
  previousState: MatchState;
  newState: MatchState;
  changes: Partial<MatchState>;
  changeType: string;
  conflictResolved?: boolean;
  conflictDetails?: {
    localTimestamp: number;
    remoteTimestamp: number;
    resolution: 'local' | 'remote' | 'merged';
  };
}

/**
 * Configuration for state synchronization
 */
export interface StateSyncConfig {
  maxHistoryEntries: number;
  conflictResolutionStrategy: 'timestamp' | 'role-priority' | 'merge';
  enableStateRecovery: boolean;
  snapshotInterval: number;
  debugMode: boolean;
}

/**
 * Callback types for state synchronization events
 */
export type StateUpdateCallback = (state: MatchState, update: StateUpdate) => void;
export type ConflictResolvedCallback = (resolution: StateHistoryEntry) => void;
export type StateRecoveredCallback = (recoveredState: MatchState) => void;

/**
 * StateSynchronizer handles multi-user collaborative state management
 * with conflict resolution and state history tracking
 */
export class StateSynchronizer {
  private currentStates: Map<string, MatchState> = new Map();
  private stateHistory: Map<string, StateHistoryEntry[]> = new Map();
  private stateSnapshots: Map<string, MatchState[]> = new Map();
  private updateCallbacks: Set<StateUpdateCallback> = new Set();
  private conflictCallbacks: Set<ConflictResolvedCallback> = new Set();
  private recoveryCallbacks: Set<StateRecoveredCallback> = new Set();
  private config: StateSyncConfig;
  private snapshotTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config?: Partial<StateSyncConfig>) {
    this.config = {
      maxHistoryEntries: 100,
      conflictResolutionStrategy: 'timestamp',
      enableStateRecovery: true,
      snapshotInterval: 30000, // 30 seconds
      debugMode: false,
      ...config
    };

    if (this.config.debugMode) {
      console.log('[StateSynchronizer] Initialized with config:', this.config);
    }
  }

  /**
   * Initialize state for a match session
   */
  initializeMatchState(matchId: string, initialState: Partial<MatchState>): MatchState {
    const defaultState: MatchState = {
      matchId,
      matchNumber: 0,
      status: 'PENDING',
      currentPeriod: null,
      redTeams: [],
      blueTeams: [],
      tournamentId: '',
      timer: {
        duration: 150000, // 2.5 minutes default
        remaining: 150000,
        isRunning: false,
        tournamentId: initialState.tournamentId || ''
      },
      scores: {
        matchId,
        redAutoScore: 0,
        redDriveScore: 0,
        redTotalScore: 0,
        blueAutoScore: 0,
        blueDriveScore: 0,
        blueTotalScore: 0,
        tournamentId: initialState.tournamentId || ''
      },
      lastUpdated: Date.now(),
      activeUsers: [],
      version: 1,
      ...initialState
    };

    this.currentStates.set(matchId, defaultState);
    this.stateHistory.set(matchId, []);
    this.stateSnapshots.set(matchId, []);

    // Start snapshot timer
    this.startSnapshotTimer(matchId);

    if (this.config.debugMode) {
      console.log(`[StateSynchronizer] Initialized state for match ${matchId}:`, defaultState);
    }

    return defaultState;
  }

  /**
   * Synchronize state with conflict resolution
   */
  syncState(update: StateUpdate): MatchState {
    const { matchId, userId, userRole, timestamp, changes, changeType } = update;
    
    let currentState = this.currentStates.get(matchId);
    if (!currentState) {
      // Initialize state if it doesn't exist
      currentState = this.initializeMatchState(matchId, {});
    }

    // Check for conflicts
    const hasConflict = this.detectConflict(currentState, update);
    let resolvedState: MatchState;

    if (hasConflict) {
      resolvedState = this.resolveConflict(currentState, update);
      if (this.config.debugMode) {
        console.log(`[StateSynchronizer] Conflict resolved for match ${matchId}`);
      }
    } else {
      // No conflict, apply changes directly
      resolvedState = this.applyChanges(currentState, changes, timestamp);
    }

    // Update version and metadata
    resolvedState.version += 1;
    resolvedState.lastUpdated = Math.max(timestamp, resolvedState.lastUpdated);

    // Add user to active users if not already present
    if (!resolvedState.activeUsers.includes(userId)) {
      resolvedState.activeUsers.push(userId);
    }

    // Store the updated state
    this.currentStates.set(matchId, resolvedState);

    // Record in history
    this.recordStateChange(matchId, {
      timestamp,
      userId,
      userRole,
      previousState: currentState,
      newState: resolvedState,
      changes,
      changeType,
      conflictResolved: hasConflict,
      conflictDetails: hasConflict ? {
        localTimestamp: currentState.lastUpdated,
        remoteTimestamp: timestamp,
        resolution: this.getResolutionStrategy(currentState, update)
      } : undefined
    });

    // Notify callbacks
    this.notifyStateUpdate(resolvedState, update);

    if (this.config.debugMode) {
      console.log(`[StateSynchronizer] State synchronized for match ${matchId}:`, resolvedState);
    }

    return resolvedState;
  }

  /**
   * Get current state for a match
   */
  getState(matchId: string): MatchState | null {
    return this.currentStates.get(matchId) || null;
  }

  /**
   * Get state history for a match
   */
  getStateHistory(matchId: string): StateHistoryEntry[] {
    return this.stateHistory.get(matchId) || [];
  }

  /**
   * Create a state snapshot for recovery
   */
  createSnapshot(matchId: string): MatchState | null {
    const currentState = this.currentStates.get(matchId);
    if (!currentState) return null;

    const snapshot = { ...currentState };
    const snapshots = this.stateSnapshots.get(matchId) || [];
    
    snapshots.push(snapshot);
    
    // Keep only recent snapshots (max 10)
    if (snapshots.length > 10) {
      snapshots.shift();
    }
    
    this.stateSnapshots.set(matchId, snapshots);

    if (this.config.debugMode) {
      console.log(`[StateSynchronizer] Created snapshot for match ${matchId}`);
    }

    return snapshot;
  }

  /**
   * Recover state from the most recent snapshot
   */
  recoverState(matchId: string): MatchState | null {
    if (!this.config.enableStateRecovery) {
      console.warn('[StateSynchronizer] State recovery is disabled');
      return null;
    }

    const snapshots = this.stateSnapshots.get(matchId);
    if (!snapshots || snapshots.length === 0) {
      console.warn(`[StateSynchronizer] No snapshots available for match ${matchId}`);
      return null;
    }

    // Get the most recent snapshot
    const snapshotState = snapshots[snapshots.length - 1];
    const currentState = this.currentStates.get(matchId);
    
    const recoveredState = { 
      ...snapshotState,
      version: (currentState?.version || snapshotState.version) + 1,
      lastUpdated: Date.now()
    };

    // Restore the state
    this.currentStates.set(matchId, recoveredState);

    // Record recovery in history
    this.recordStateChange(matchId, {
      timestamp: Date.now(),
      userId: 'system',
      userRole: 'ADMIN' as UserRole,
      previousState: currentState || snapshotState,
      newState: recoveredState,
      changes: { version: recoveredState.version },
      changeType: 'recovery'
    });

    // Notify recovery callbacks
    this.recoveryCallbacks.forEach(callback => {
      try {
        callback(recoveredState);
      } catch (error) {
        console.error('[StateSynchronizer] Error in recovery callback:', error);
      }
    });

    if (this.config.debugMode) {
      console.log(`[StateSynchronizer] State recovered for match ${matchId}:`, recoveredState);
    }

    return recoveredState;
  }

  /**
   * Add a user to the active users list
   */
  addActiveUser(matchId: string, userId: string): void {
    const state = this.currentStates.get(matchId);
    if (state && !state.activeUsers.includes(userId)) {
      state.activeUsers.push(userId);
      state.lastUpdated = Date.now();
      this.currentStates.set(matchId, state);

      if (this.config.debugMode) {
        console.log(`[StateSynchronizer] Added active user ${userId} to match ${matchId}`);
      }
    }
  }

  /**
   * Remove a user from the active users list
   */
  removeActiveUser(matchId: string, userId: string): void {
    const state = this.currentStates.get(matchId);
    if (state) {
      const index = state.activeUsers.indexOf(userId);
      if (index > -1) {
        state.activeUsers.splice(index, 1);
        state.lastUpdated = Date.now();
        this.currentStates.set(matchId, state);

        if (this.config.debugMode) {
          console.log(`[StateSynchronizer] Removed active user ${userId} from match ${matchId}`);
        }
      }
    }
  }

  /**
   * Get active users for a match
   */
  getActiveUsers(matchId: string): string[] {
    const state = this.currentStates.get(matchId);
    return state ? [...state.activeUsers] : [];
  }

  /**
   * Register callback for state updates
   */
  onStateUpdate(callback: StateUpdateCallback): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  /**
   * Register callback for conflict resolution
   */
  onConflictResolved(callback: ConflictResolvedCallback): () => void {
    this.conflictCallbacks.add(callback);
    return () => this.conflictCallbacks.delete(callback);
  }

  /**
   * Register callback for state recovery
   */
  onStateRecovered(callback: StateRecoveredCallback): () => void {
    this.recoveryCallbacks.add(callback);
    return () => this.recoveryCallbacks.delete(callback);
  }

  /**
   * Clean up resources for a match
   */
  cleanupMatch(matchId: string): void {
    this.currentStates.delete(matchId);
    this.stateHistory.delete(matchId);
    this.stateSnapshots.delete(matchId);
    
    // Clear snapshot timer
    const timer = this.snapshotTimers.get(matchId);
    if (timer) {
      clearInterval(timer);
      this.snapshotTimers.delete(matchId);
    }

    if (this.config.debugMode) {
      console.log(`[StateSynchronizer] Cleaned up resources for match ${matchId}`);
    }
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    this.currentStates.clear();
    this.stateHistory.clear();
    this.stateSnapshots.clear();
    this.updateCallbacks.clear();
    this.conflictCallbacks.clear();
    this.recoveryCallbacks.clear();

    // Clear all timers
    this.snapshotTimers.forEach(timer => clearInterval(timer));
    this.snapshotTimers.clear();

    if (this.config.debugMode) {
      console.log('[StateSynchronizer] All resources cleaned up');
    }
  }

  /**
   * Get synchronizer statistics
   */
  getStats(): {
    activeMatches: number;
    totalHistoryEntries: number;
    totalSnapshots: number;
    config: StateSyncConfig;
  } {
    const totalHistoryEntries = Array.from(this.stateHistory.values())
      .reduce((total, history) => total + history.length, 0);
    
    const totalSnapshots = Array.from(this.stateSnapshots.values())
      .reduce((total, snapshots) => total + snapshots.length, 0);

    return {
      activeMatches: this.currentStates.size,
      totalHistoryEntries,
      totalSnapshots,
      config: { ...this.config }
    };
  }

  // === Private Methods ===

  /**
   * Detect if there's a conflict between current state and incoming update
   */
  private detectConflict(currentState: MatchState, update: StateUpdate): boolean {
    // Check if the update is based on an older version
    if (update.version && update.version < currentState.version) {
      return true;
    }

    // Check if there are simultaneous updates (within 1 second) AND different versions
    const timeDiff = Math.abs(currentState.lastUpdated - update.timestamp);
    if (timeDiff < 1000 && update.version && update.version !== currentState.version) {
      return true;
    }

    return false;
  }

  /**
   * Resolve conflicts between states using configured strategy
   */
  private resolveConflict(currentState: MatchState, update: StateUpdate): MatchState {
    switch (this.config.conflictResolutionStrategy) {
      case 'timestamp':
        return this.resolveByTimestamp(currentState, update);
      case 'role-priority':
        return this.resolveByRolePriority(currentState, update);
      case 'merge':
        return this.resolveByMerging(currentState, update);
      default:
        return this.resolveByTimestamp(currentState, update);
    }
  }

  /**
   * Resolve conflict using timestamp (most recent wins)
   */
  private resolveByTimestamp(currentState: MatchState, update: StateUpdate): MatchState {
    if (update.timestamp > currentState.lastUpdated) {
      // Remote update is newer, apply it
      return this.applyChanges(currentState, update.changes, update.timestamp);
    } else {
      // Current state is newer or equal, keep it
      return currentState;
    }
  }

  /**
   * Resolve conflict using role priority (higher roles win)
   */
  private resolveByRolePriority(currentState: MatchState, update: StateUpdate): MatchState {
    const rolePriority = {
      'ADMIN': 5,
      'HEAD_REFEREE': 4,
      'ALLIANCE_REFEREE': 3,
      'TEAM_LEADER': 2,
      'TEAM_MEMBER': 1,
      'COMMON': 0
    };

    // For simplicity, assume current state was updated by HEAD_REFEREE if not specified
    const currentRolePriority = rolePriority['HEAD_REFEREE'];
    const updateRolePriority = rolePriority[update.userRole] || 0;

    if (updateRolePriority >= currentRolePriority) {
      return this.applyChanges(currentState, update.changes, update.timestamp);
    } else {
      return currentState;
    }
  }

  /**
   * Resolve conflict by merging non-conflicting changes
   */
  private resolveByMerging(currentState: MatchState, update: StateUpdate): MatchState {
    // For timer and score updates, use timestamp resolution
    // For other fields, merge if possible
    const mergedChanges = { ...update.changes };
    
    // Always use the most recent timestamp for timer and scores
    if (update.changeType === 'timer' || update.changeType === 'score') {
      return this.resolveByTimestamp(currentState, update);
    }

    return this.applyChanges(currentState, mergedChanges, Math.max(currentState.lastUpdated, update.timestamp));
  }

  /**
   * Apply changes to current state
   */
  private applyChanges(currentState: MatchState, changes: Partial<MatchState>, timestamp: number): MatchState {
    const newState = {
      ...currentState,
      lastUpdated: timestamp
    };

    // Apply top-level changes
    Object.keys(changes).forEach(key => {
      if (key !== 'timer' && key !== 'scores') {
        (newState as any)[key] = (changes as any)[key];
      }
    });

    // Handle nested object updates properly
    if (changes.timer) {
      newState.timer = {
        ...currentState.timer,
        ...changes.timer
      };
    }

    if (changes.scores) {
      newState.scores = {
        ...currentState.scores,
        ...changes.scores
      };
    }

    if (this.config.debugMode) {
      console.log('[StateSynchronizer] Applied changes:', { changes, currentState, newState });
    }

    return newState;
  }

  /**
   * Get the resolution strategy used for a conflict
   */
  private getResolutionStrategy(currentState: MatchState, update: StateUpdate): 'local' | 'remote' | 'merged' {
    if (update.timestamp > currentState.lastUpdated) {
      return 'remote';
    } else if (update.timestamp < currentState.lastUpdated) {
      return 'local';
    } else {
      return 'merged';
    }
  }

  /**
   * Record a state change in history
   */
  private recordStateChange(matchId: string, entry: StateHistoryEntry): void {
    const history = this.stateHistory.get(matchId) || [];
    history.push(entry);

    // Limit history size
    if (history.length > this.config.maxHistoryEntries) {
      history.shift();
    }

    this.stateHistory.set(matchId, history);

    // Notify conflict callbacks if this was a conflict resolution
    if (entry.conflictResolved) {
      this.conflictCallbacks.forEach(callback => {
        try {
          callback(entry);
        } catch (error) {
          console.error('[StateSynchronizer] Error in conflict callback:', error);
        }
      });
    }
  }

  /**
   * Notify state update callbacks
   */
  private notifyStateUpdate(state: MatchState, update: StateUpdate): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(state, update);
      } catch (error) {
        console.error('[StateSynchronizer] Error in state update callback:', error);
      }
    });
  }

  /**
   * Start snapshot timer for a match
   */
  private startSnapshotTimer(matchId: string): void {
    const timer = setInterval(() => {
      this.createSnapshot(matchId);
    }, this.config.snapshotInterval);

    this.snapshotTimers.set(matchId, timer);
  }
}