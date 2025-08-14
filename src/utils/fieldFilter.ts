/**
 * Field Filtering Utility for RMS WebSocket Events
 * Provides intelligent event filtering based on field and tournament context
 */

export interface EventData {
  fieldId?: string;
  tournamentId?: string;
  isGlobal?: boolean;
  matchId?: string;
  userId?: string;
  timestamp?: number;
}

export interface FilterContext {
  currentFieldId?: string;
  currentTournamentId?: string;
  currentMatchId?: string;
  userRole?: string;
}

export interface FilterResult {
  shouldProcess: boolean;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export class FieldFilter {
  private static instance: FieldFilter;
  private filterStats: Map<string, number> = new Map();
  private debugMode: boolean = false;

  private constructor() {}

  public static getInstance(): FieldFilter {
    if (!FieldFilter.instance) {
      FieldFilter.instance = new FieldFilter();
    }
    return FieldFilter.instance;
  }

  /**
   * Enable debug logging for filter decisions
   */
  enableDebug(): void {
    this.debugMode = true;
  }

  /**
   * Disable debug logging
   */
  disableDebug(): void {
    this.debugMode = false;
  }

  /**
   * Main filtering logic - determines if an event should be processed
   */
  static shouldProcessEvent(
    eventData: EventData,
    context: FilterContext
  ): boolean {
    const result = FieldFilter.getInstance().evaluateEvent(eventData, context);
    return result.shouldProcess;
  }

  /**
   * Enhanced filtering with detailed result information
   */
  static shouldProcessEventDetailed(
    eventData: EventData,
    context: FilterContext
  ): FilterResult {
    return FieldFilter.getInstance().evaluateEvent(eventData, context);
  }

  /**
   * Create a field-aware event handler wrapper
   */
  static createFieldAwareHandler<T extends EventData>(
    handler: (data: T) => void,
    context: FilterContext,
    options?: {
      priority?: 'high' | 'medium' | 'low';
      allowGlobal?: boolean;
      requireExactMatch?: boolean;
    }
  ): (data: T) => void {
    const filter = FieldFilter.getInstance();
    
    return (data: T) => {
      const result = filter.evaluateEvent(data, context);
      
      // Apply priority filtering if specified
      if (options?.priority && result.priority !== options.priority) {
        filter.logDebug(`Event filtered by priority: ${result.priority} !== ${options.priority}`, data);
        return;
      }

      if (result.shouldProcess) {
        filter.incrementStat('processed');
        handler(data);
      } else {
        filter.incrementStat('filtered');
        filter.logDebug(`Event filtered: ${result.reason}`, data);
      }
    };
  }

  /**
   * Create a batch filter for multiple events
   */
  static filterEventBatch<T extends EventData>(
    events: T[],
    context: FilterContext
  ): T[] {
    const filter = FieldFilter.getInstance();
    
    return events.filter(event => {
      const result = filter.evaluateEvent(event, context);
      return result.shouldProcess;
    });
  }

  /**
   * Get filtering statistics
   */
  static getStats(): Record<string, number> {
    return Object.fromEntries(FieldFilter.getInstance().filterStats);
  }

  /**
   * Reset filtering statistics
   */
  static resetStats(): void {
    FieldFilter.getInstance().filterStats.clear();
  }

  // Private methods

  private evaluateEvent(eventData: EventData, context: FilterContext): FilterResult {
    // Global events are always processed with high priority
    if (eventData.isGlobal) {
      return {
        shouldProcess: true,
        reason: 'Global event',
        priority: 'high'
      };
    }

    // Connection and system events are high priority
    if (this.isSystemEvent(eventData)) {
      return {
        shouldProcess: true,
        reason: 'System event',
        priority: 'high'
      };
    }

    // Tournament-wide events (no specific field)
    if (!eventData.fieldId && eventData.tournamentId) {
      if (eventData.tournamentId === context.currentTournamentId) {
        return {
          shouldProcess: true,
          reason: 'Tournament-wide event for current tournament',
          priority: 'medium'
        };
      } else {
        return {
          shouldProcess: false,
          reason: 'Tournament-wide event for different tournament',
          priority: 'low'
        };
      }
    }

    // Field-specific events
    if (eventData.fieldId) {
      // Exact field match
      if (eventData.fieldId === context.currentFieldId) {
        return {
          shouldProcess: true,
          reason: 'Exact field match',
          priority: 'high'
        };
      }

      // Different field in same tournament
      if (eventData.tournamentId === context.currentTournamentId) {
        return {
          shouldProcess: false,
          reason: 'Different field in same tournament',
          priority: 'low'
        };
      }

      // Different tournament entirely
      return {
        shouldProcess: false,
        reason: 'Different field and tournament',
        priority: 'low'
      };
    }

    // Match-specific filtering
    if (eventData.matchId && context.currentMatchId) {
      if (eventData.matchId === context.currentMatchId) {
        return {
          shouldProcess: true,
          reason: 'Current match event',
          priority: 'high'
        };
      } else {
        return {
          shouldProcess: false,
          reason: 'Different match event',
          priority: 'low'
        };
      }
    }

    // Default: process events without specific field/tournament context
    if (!eventData.fieldId && !eventData.tournamentId) {
      return {
        shouldProcess: true,
        reason: 'No field/tournament context - allowing',
        priority: 'medium'
      };
    }

    // Fallback: don't process
    return {
      shouldProcess: false,
      reason: 'No matching context found',
      priority: 'low'
    };
  }

  private isSystemEvent(eventData: EventData): boolean {
    // Check if this is a system-level event that should always be processed
    const systemEventPatterns = [
      'connection_status',
      'user_joined',
      'user_left',
      'room_joined',
      'room_left',
      'announcement' // Announcements are typically system-wide
    ];

    // This would need to be enhanced based on actual event structure
    // For now, we'll use a simple heuristic
    return false; // Placeholder - would need actual event type detection
  }

  private incrementStat(key: string): void {
    const current = this.filterStats.get(key) || 0;
    this.filterStats.set(key, current + 1);
  }

  private logDebug(message: string, data?: any): void {
    if (this.debugMode) {
      console.log(`[FieldFilter] ${message}`, data);
    }
  }
}

// Convenience functions for common filtering scenarios

/**
 * Filter for audience display - only show events for current field
 */
export function createAudienceDisplayFilter<T extends EventData>(
  handler: (data: T) => void,
  fieldId?: string,
  tournamentId?: string
): (data: T) => void {
  return FieldFilter.createFieldAwareHandler(handler, {
    currentFieldId: fieldId,
    currentTournamentId: tournamentId
  }, {
    priority: 'high',
    allowGlobal: true
  });
}

/**
 * Filter for control match - allow broader event scope
 */
export function createControlMatchFilter<T extends EventData>(
  handler: (data: T) => void,
  fieldId?: string,
  tournamentId?: string,
  matchId?: string
): (data: T) => void {
  return FieldFilter.createFieldAwareHandler(handler, {
    currentFieldId: fieldId,
    currentTournamentId: tournamentId,
    currentMatchId: matchId
  }, {
    allowGlobal: true
  });
}

/**
 * Filter for tournament-wide events
 */
export function createTournamentFilter<T extends EventData>(
  handler: (data: T) => void,
  tournamentId?: string
): (data: T) => void {
  return FieldFilter.createFieldAwareHandler(handler, {
    currentTournamentId: tournamentId
  }, {
    allowGlobal: true
  });
}

// Export singleton instance
export const fieldFilter = FieldFilter.getInstance();
export default FieldFilter;
