/**
 * Atomic State Manager for Race Condition Prevention
 * Provides atomic state transitions and proper synchronization
 */

export interface StateTransition<T> {
  from: T | T[];
  to: T;
  condition?: (currentState: T, context?: any) => boolean;
  action?: (currentState: T, newState: T, context?: any) => Promise<void> | void;
  rollback?: (currentState: T, failedState: T, context?: any) => Promise<void> | void;
}

export interface StateManagerOptions<T> {
  initialState: T;
  transitions: StateTransition<T>[];
  onStateChange?: (oldState: T, newState: T, context?: any) => void;
  debug?: boolean;
}

/**
 * Atomic state manager with proper transition guards and rollback
 */
export class AtomicStateManager<T> {
  private currentState: T;
  private readonly transitions: StateTransition<T>[];
  private readonly onStateChange?: (oldState: T, newState: T, context?: any) => void;
  private readonly debug: boolean;
  private transitionInProgress = false;
  private transitionQueue: Array<{
    targetState: T;
    context?: any;
    resolve: (success: boolean) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(options: StateManagerOptions<T>) {
    this.currentState = options.initialState;
    this.transitions = options.transitions;
    this.onStateChange = options.onStateChange;
    this.debug = options.debug || false;
  }

  /**
   * Get current state
   */
  getState(): T {
    return this.currentState;
  }

  /**
   * Attempt atomic state transition
   */
  async transitionTo(targetState: T, context?: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Queue the transition
      this.transitionQueue.push({
        targetState,
        context,
        resolve,
        reject
      });

      // Process queue if not already processing
      if (!this.transitionInProgress) {
        this.processTransitionQueue();
      }
    });
  }

  /**
   * Process queued transitions atomically
   */
  private async processTransitionQueue(): Promise<void> {
    if (this.transitionInProgress) return;
    this.transitionInProgress = true;

    try {
      while (this.transitionQueue.length > 0) {
        const transition = this.transitionQueue.shift()!;
        
        try {
          const success = await this.performTransition(
            transition.targetState,
            transition.context
          );
          transition.resolve(success);
        } catch (error) {
          transition.reject(error as Error);
        }
      }
    } finally {
      this.transitionInProgress = false;
    }
  }

  /**
   * Perform a single atomic transition
   */
  private async performTransition(targetState: T, context?: any): Promise<boolean> {
    const currentState = this.currentState;
    
    if (this.debug) {
      console.log(`[AtomicStateManager] Attempting transition: ${currentState} -> ${targetState}`);
    }

    // Find valid transition
    const validTransition = this.findValidTransition(currentState, targetState);
    if (!validTransition) {
      if (this.debug) {
        console.warn(`[AtomicStateManager] No valid transition from ${currentState} to ${targetState}`);
      }
      return false;
    }

    // Check condition if specified
    if (validTransition.condition && !validTransition.condition(currentState, context)) {
      if (this.debug) {
        console.warn(`[AtomicStateManager] Transition condition failed: ${currentState} -> ${targetState}`);
      }
      return false;
    }

    // Perform transition action
    try {
      if (validTransition.action) {
        await validTransition.action(currentState, targetState, context);
      }

      // Update state atomically
      const oldState = this.currentState;
      this.currentState = targetState;

      // Notify state change
      if (this.onStateChange) {
        try {
          this.onStateChange(oldState, targetState, context);
        } catch (error) {
          console.error('[AtomicStateManager] Error in state change callback:', error);
        }
      }

      if (this.debug) {
        console.log(`[AtomicStateManager] Transition successful: ${oldState} -> ${targetState}`);
      }

      return true;

    } catch (error) {
      if (this.debug) {
        console.error(`[AtomicStateManager] Transition action failed: ${currentState} -> ${targetState}`, error);
      }

      // Perform rollback if specified
      if (validTransition.rollback) {
        try {
          await validTransition.rollback(currentState, targetState, context);
        } catch (rollbackError) {
          console.error('[AtomicStateManager] Rollback failed:', rollbackError);
        }
      }

      throw error;
    }
  }

  /**
   * Find valid transition for the given state change
   */
  private findValidTransition(from: T, to: T): StateTransition<T> | null {
    return this.transitions.find(transition => {
      if (Array.isArray(transition.from)) {
        return transition.from.includes(from) && transition.to === to;
      } else {
        return transition.from === from && transition.to === to;
      }
    }) || null;
  }

  /**
   * Check if transition is valid
   */
  canTransitionTo(targetState: T, context?: any): boolean {
    const validTransition = this.findValidTransition(this.currentState, targetState);
    if (!validTransition) return false;

    if (validTransition.condition) {
      return validTransition.condition(this.currentState, context);
    }

    return true;
  }

  /**
   * Get all possible next states from current state
   */
  getPossibleTransitions(): T[] {
    return this.transitions
      .filter(transition => {
        if (Array.isArray(transition.from)) {
          return transition.from.includes(this.currentState);
        } else {
          return transition.from === this.currentState;
        }
      })
      .map(transition => transition.to);
  }

  /**
   * Force state change (bypass transition rules) - use with caution
   */
  forceState(newState: T, context?: any): void {
    const oldState = this.currentState;
    this.currentState = newState;

    if (this.onStateChange) {
      try {
        this.onStateChange(oldState, newState, context);
      } catch (error) {
        console.error('[AtomicStateManager] Error in forced state change callback:', error);
      }
    }

    if (this.debug) {
      console.warn(`[AtomicStateManager] Forced state change: ${oldState} -> ${newState}`);
    }
  }

  /**
   * Reset to initial state
   */
  async reset(context?: any): Promise<boolean> {
    const initialState = this.transitions.length > 0 
      ? (Array.isArray(this.transitions[0].from) ? this.transitions[0].from[0] : this.transitions[0].from)
      : this.currentState;
    
    return this.transitionTo(initialState, context);
  }

  /**
   * Get transition queue length
   */
  getQueueLength(): number {
    return this.transitionQueue.length;
  }

  /**
   * Check if transition is in progress
   */
  isTransitioning(): boolean {
    return this.transitionInProgress;
  }

  /**
   * Clear transition queue (emergency use only)
   */
  clearQueue(): void {
    const queuedTransitions = this.transitionQueue.splice(0);
    queuedTransitions.forEach(transition => {
      transition.reject(new Error('Transition queue cleared'));
    });
  }

  /**
   * Get state manager statistics
   */
  getStats(): {
    currentState: T;
    queueLength: number;
    isTransitioning: boolean;
    possibleTransitions: T[];
  } {
    return {
      currentState: this.currentState,
      queueLength: this.transitionQueue.length,
      isTransitioning: this.transitionInProgress,
      possibleTransitions: this.getPossibleTransitions()
    };
  }
}

/**
 * Utility function to create connection state transitions
 */
export function createConnectionStateTransitions() {
  return [
    // Initial connections
    { from: 'DISCONNECTED', to: 'CONNECTING' },
    { from: 'FAILED', to: 'CONNECTING' },
    
    // Successful connection
    { from: 'CONNECTING', to: 'CONNECTED' },
    
    // Connection failures
    { from: 'CONNECTING', to: 'FAILED' },
    { from: 'CONNECTED', to: 'FAILED' },
    
    // Disconnections
    { from: 'CONNECTED', to: 'DISCONNECTING' },
    { from: 'DISCONNECTING', to: 'DISCONNECTED' },
    { from: 'FAILED', to: 'DISCONNECTED' },
    
    // Reconnections
    { from: 'DISCONNECTED', to: 'RECONNECTING' },
    { from: 'FAILED', to: 'RECONNECTING' },
    { from: 'RECONNECTING', to: 'CONNECTING' },
    { from: 'RECONNECTING', to: 'CONNECTED' },
    { from: 'RECONNECTING', to: 'FAILED' }
  ];
}
