/* eslint-disable @typescript-eslint/no-unused-vars */
import { Socket } from 'socket.io-client';
import { ConnectionManager } from './connection-manager';
import { WebSocketEventData } from '@/types/websocket';

export type EventCallback<T = WebSocketEventData> = (data: T) => void;
export type EventFilter = (data: WebSocketEventData) => boolean;

export interface EventOptions {
  fieldId?: string;
  tournamentId?: string;
  filter?: EventFilter;
}

/**
 * EventManager handles centralized event management with deduplication and filtering
 * Implements master handlers to prevent duplicate event listeners
 */
export class EventManager {
  private eventHandlers: Map<string, Set<EventCallback<unknown>>> = new Map();
  private masterHandlers: Map<string, EventCallback<unknown>> = new Map();
  private eventFilters: Map<string, EventFilter[]> = new Map();
  private lastEventData: Map<string, WebSocketEventData> = new Map();
  private errorCallbacks: Set<(error: Error) => void> = new Set();
  private queuedEvents: Array<{ event: string; data: unknown; options?: EventOptions }> = [];
  private isProcessingQueue = false;

  constructor(private connectionManager: ConnectionManager) { 
    // Set up connection listener to process queued events when connected
    this.connectionManager.onConnectionStatus((status) => {
      if (status.connected && status.state === 'CONNECTED') {
        this.processQueuedEvents();
      }
    });
  }

  /**
   * Subscribe to an event with optional filtering
   */
  on<T = WebSocketEventData>(event: string, callback: EventCallback<T>, options?: EventOptions): () => void {
    console.log(`[EventManager] Setting up listener for event: ${event}`);

    // Initialize event handlers set if needed
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
      this.eventFilters.set(event, []);
    }

    // Add callback to handlers
    this.eventHandlers.get(event)!.add(callback as EventCallback<unknown>);

    // Add filter if provided
    if (options?.filter) {
      this.eventFilters.get(event)!.push(options.filter);
    }

    // Create field/tournament filter if specified
    if (options?.fieldId || options?.tournamentId) {
      const contextFilter = this.createContextFilter(options.fieldId, options.tournamentId);
      this.eventFilters.get(event)!.push(contextFilter);
    }

    // Setup master handler if this is the first listener for this event
    if (!this.masterHandlers.has(event)) {
      this.setupMasterHandler(event);
    }

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(callback as EventCallback<unknown>);

        // Clean up if no more handlers
        if (handlers.size === 0) {
          this.cleanupEvent(event);
        }
      }
    };
  }

  /**
   * Unsubscribe from all callbacks for an event
   */
  off(event: string): void {
    console.log(`[EventManager] Removing all listeners for event: ${event}`);
    this.cleanupEvent(event);
  }

  /**
   * Emit an event through the WebSocket connection
   */
  emit<T = WebSocketEventData>(event: string, data: T, options?: EventOptions): void {
    const socket = this.connectionManager.getSocket();

    if (!socket || !socket.connected) {
      console.warn(`[EventManager] Cannot emit '${event}': not connected. Socket: ${!!socket}, Connected: ${socket?.connected}`);
      
      // For critical room joining events, queue them for retry
      if (event === 'joinFieldRoom' || event === 'join_tournament') {
        console.log(`[EventManager] Queuing critical event '${event}' for retry when connected`);
        this.queueCriticalEvent(event, data, options);
      }
      return;
    }

    // Add context information if provided
    let eventData = data;
    if (options?.fieldId || options?.tournamentId) {
      eventData = {
        ...data,
        fieldId: options.fieldId,
        tournamentId: options.tournamentId,
        timestamp: Date.now()
      } as T;
    }

    console.log(`[EventManager] Emitting event '${event}':`, eventData);
    socket.emit(event, eventData);
  }

  /**
   * Subscribe to error events
   */
  onError(callback: (error: Error) => void): () => void {
    this.errorCallbacks.add(callback);
    return () => {
      this.errorCallbacks.delete(callback);
    };
  }

  /**
   * Get the last received data for an event (for deduplication)
   */
  getLastEventData(event: string): WebSocketEventData | undefined {
    return this.lastEventData.get(event);
  }

  /**
   * Setup master handler for an event
   */
  private setupMasterHandler(event: string): void {
    const socket = this.connectionManager.getSocket();
    if (!socket) {
      console.warn(`[EventManager] No socket available for event: ${event}`);
      return;
    }

    const masterHandler = (data: WebSocketEventData) => {
      try {
        console.log(`[EventManager] Received event '${event}':`, data);

        // Check for event deduplication
        if (this.isDuplicateEvent(event, data)) {
          console.log(`[EventManager] Duplicate event '${event}' ignored`);
          return;
        }

        // Store last event data
        this.lastEventData.set(event, data);

        // Apply filters
        const filteredData = this.applyFilters(event, data);
        if (filteredData === null) {
          console.log(`[EventManager] Event '${event}' filtered out`);
          return;
        }

        // Call all registered callbacks
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          handlers.forEach(callback => {
            try {
              callback(filteredData);
            } catch (error) {
              console.error(`[EventManager] Error in callback for '${event}':`, error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              this.notifyError(new Error(`Callback error for event '${event}': ${errorMessage}`));
            }
          });
        }
      } catch (error) {
        console.error(`[EventManager] Error processing event '${event}':`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.notifyError(new Error(`Event processing error for '${event}': ${errorMessage}`));
      }
    };

    // Register master handler with socket
    socket.on(event, masterHandler);
    this.masterHandlers.set(event, masterHandler as EventCallback<unknown>);

    console.log(`[EventManager] Registered master handler for event: ${event}`);
  }

  /**
   * Clean up event handlers and master handler
   */
  private cleanupEvent(event: string): void {
    const socket = this.connectionManager.getSocket();

    // Remove master handler from socket
    if (socket) {
      const masterHandler = this.masterHandlers.get(event);
      if (masterHandler) {
        socket.off(event, masterHandler);
        console.log(`[EventManager] Removed master handler for event: ${event}`);
      }
    }

    // Clean up internal data structures
    this.eventHandlers.delete(event);
    this.masterHandlers.delete(event);
    this.eventFilters.delete(event);
    this.lastEventData.delete(event);
  }

  /**
   * Check if event is a duplicate based on data comparison
   */
  private isDuplicateEvent(event: string, data: WebSocketEventData): boolean {
    const lastData = this.lastEventData.get(event);
    if (!lastData) return false;

    // Simple deep comparison for deduplication
    try {
      return JSON.stringify(lastData) === JSON.stringify(data);
    } catch (error) {
      // If comparison fails, assume not duplicate
      return false;
    }
  }

  /**
   * Apply all filters for an event
   */
  private applyFilters(event: string, data: WebSocketEventData): WebSocketEventData | null {
    const filters = this.eventFilters.get(event);
    if (!filters || filters.length === 0) {
      return data;
    }

    // All filters must pass
    for (const filter of filters) {
      try {
        if (!filter(data)) {
          return null; // Filter rejected the event
        }
      } catch (error) {
        console.error(`[EventManager] Filter error for event '${event}':`, error);
        // Continue with other filters if one fails
      }
    }

    return data;
  }

  /**
   * Create a context filter for field/tournament filtering
   */
  private createContextFilter(fieldId?: string, tournamentId?: string): EventFilter {
    return (data: WebSocketEventData) => {
      // If no context specified in filter, pass all events
      if (!fieldId && !tournamentId) return true;

      // Check field filtering
      if (fieldId && data.fieldId && data.fieldId !== fieldId) {
        return false;
      }

      // Check tournament filtering
      if (tournamentId && data.tournamentId && data.tournamentId !== tournamentId) {
        return false;
      }

      return true;
    };
  }

  /**
   * Notify error callbacks
   */
  private notifyError(error: Error): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('[EventManager] Error in error callback:', callbackError);
      }
    });
  }

  /**
   * Get statistics about current event handlers
   */
  getStats(): { [event: string]: number } {
    const stats: { [event: string]: number } = {};

    this.eventHandlers.forEach((handlers, event) => {
      stats[event] = handlers.size;
    });

    return stats;
  }

  /**
   * Clear all event handlers (useful for cleanup)
   */
  clearAll(): void {
    console.log('[EventManager] Clearing all event handlers');

    const events = Array.from(this.eventHandlers.keys());
    events.forEach(event => this.cleanupEvent(event));
    
    // Clear queued events as well
    this.queuedEvents = [];
  }

  /**
   * Queue a critical event for retry when connection is established
   */
  private queueCriticalEvent<T = WebSocketEventData>(event: string, data: T, options?: EventOptions): void {
    // Avoid duplicates in the queue
    const isDuplicate = this.queuedEvents.some(queuedEvent => 
      queuedEvent.event === event && JSON.stringify(queuedEvent.data) === JSON.stringify(data)
    );
    
    if (!isDuplicate) {
      this.queuedEvents.push({ event, data, options });
      console.log(`[EventManager] Queued event '${event}' for retry (queue size: ${this.queuedEvents.length})`);
    }
  }

  /**
   * Process all queued events when connection is restored
   */
  private processQueuedEvents(): void {
    if (this.isProcessingQueue || this.queuedEvents.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    console.log(`[EventManager] Processing ${this.queuedEvents.length} queued events`);

    const eventsToProcess = [...this.queuedEvents];
    this.queuedEvents = [];

    eventsToProcess.forEach(({ event, data, options }) => {
      try {
        console.log(`[EventManager] Retrying queued event '${event}'`);
        this.emit(event, data, options);
      } catch (error) {
        console.error(`[EventManager] Error processing queued event '${event}':`, error);
      }
    });

    this.isProcessingQueue = false;
  }
}