/**
 * Cross-Tab Synchronizer Implementation
 * Single Responsibility: Provide ordered, reliable cross-tab message synchronization
 * Builds on top of CrossTabCommunicator for enhanced synchronization features
 */

import {
  ICrossTabSynchronizer,
  ICrossTabCommunicator,
  SynchronizedMessage,
  MessageAcknowledgment,
  SyncStats,
  CrossTabMessage,
  CrossTabMessageType
} from '../interfaces/websocket-manager.interface';
import { BoundedMap, BoundedArray } from '../utils/memory-management';
import { getMemoryManager, createCleanupTarget } from './memory-manager';
import { VectorClockManager, TimestampedMessage } from '../utils/vector-clock';
import { AtomicOperationExecutor } from '../utils/atomic-operations';

/**
 * Message buffer entry for ordering
 */
interface BufferedMessage {
  message: SynchronizedMessage;
  receivedAt: number;
  processed: boolean;
}

/**
 * Pending acknowledgment tracking
 */
interface PendingAck {
  message: SynchronizedMessage;
  sentAt: number;
  retryCount: number;
  resolve: (acks: MessageAcknowledgment[]) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * Enhanced cross-tab synchronizer with ordering and reliability
 */
export class CrossTabSynchronizer implements ICrossTabSynchronizer {
  private readonly tabId: string;
  private sequenceNumber = 0;
  private isStarted = false;

  // Message handling
  private messageCallbacks = new Set<(message: SynchronizedMessage) => void>();
  private orderedMessageCallbacks = new Set<(message: SynchronizedMessage) => void>();
  private messageBuffer: BoundedMap<string, BufferedMessage[]>; // tabId -> messages
  private messageHistory: BoundedArray<SynchronizedMessage>;
  private processedMessages = new Set<string>();

  // Memory management
  private cleanupUnregister: (() => void) | null = null;
  private isDestroyed = false;

  // Message ordering with vector clocks
  private vectorClockManager: VectorClockManager;
  private operationExecutor: AtomicOperationExecutor;
  private knownTabs = new Set<string>();
  
  // Reliability features
  private pendingAcks = new Map<string, PendingAck>();
  private acknowledgments = new Map<string, MessageAcknowledgment[]>();
  
  // Statistics
  private stats: SyncStats = {
    messagesSent: 0,
    messagesReceived: 0,
    messagesDropped: 0,
    messagesRetried: 0,
    averageLatency: 0,
    lastSyncTime: 0,
    activeConnections: 0,
    fallbackActive: false
  };
  
  // Configuration
  private maxHistorySize = 1000;
  private maxBufferSize = 100;
  private ackTimeout = 5000; // 5 seconds
  private maxRetries = 3;
  private bufferTimeout = 2000; // 2 seconds
  
  // Timers
  private bufferProcessingInterval: NodeJS.Timeout | null = null;
  private statsUpdateInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(
    private readonly communicator: ICrossTabCommunicator,
    private readonly options: {
      tabId?: string;
      maxHistorySize?: number;
      maxBufferSize?: number;
      ackTimeout?: number;
      maxRetries?: number;
      bufferTimeout?: number;
    } = {}
  ) {
    this.tabId = options.tabId || this.generateTabId();

    // Apply configuration options
    if (options.maxHistorySize) this.maxHistorySize = options.maxHistorySize;
    if (options.maxBufferSize) this.maxBufferSize = options.maxBufferSize;
    if (options.ackTimeout) this.ackTimeout = options.ackTimeout;
    if (options.maxRetries) this.maxRetries = options.maxRetries;
    if (options.bufferTimeout) this.bufferTimeout = options.bufferTimeout;

    // Initialize bounded collections
    this.messageBuffer = new BoundedMap<string, BufferedMessage[]>({
      maxSize: 50, // Max 50 different tab buffers
      maxAge: 300000, // 5 minutes
      cleanupInterval: 60000, // 1 minute
      onEviction: (buffer) => {
        console.debug(`[CrossTabSynchronizer] Evicted message buffer with ${buffer.length} messages`);
      }
    });

    this.messageHistory = new BoundedArray<SynchronizedMessage>(
      this.maxHistorySize,
      (message) => {
        console.debug(`[CrossTabSynchronizer] Evicted message from history: ${message.messageId}`);
      }
    );

    // Initialize vector clock manager for message ordering
    this.vectorClockManager = new VectorClockManager(this.tabId);
    this.operationExecutor = new AtomicOperationExecutor();

    this.setupCommunicatorListener();
    this.registerForCleanup();
  }

  /**
   * Register for centralized cleanup
   */
  private registerForCleanup(): void {
    const memoryManager = getMemoryManager();
    this.cleanupUnregister = memoryManager.registerCleanupTarget(
      createCleanupTarget(
        `CrossTabSynchronizer-${this.tabId}`,
        () => this.performMemoryCleanup(),
        {
          priority: 'high',
          getMemoryUsage: () => this.getMemoryUsage()
        }
      )
    );
  }

  /**
   * Perform comprehensive memory cleanup
   */
  private performMemoryCleanup(): void {
    if (this.isDestroyed) return;

    // Clean up stale processed messages
    const now = Date.now();
    const staleMessages = Array.from(this.processedMessages).filter(messageId => {
      // Remove messages older than 10 minutes (more aggressive than regular cleanup)
      const messageTime = parseInt(messageId.split('-')[1]) || 0;
      return (now - messageTime) > 600000;
    });

    staleMessages.forEach(messageId => {
      this.processedMessages.delete(messageId);
    });

    // Clean up stale pending acknowledgments
    for (const [messageId, pending] of this.pendingAcks) {
      if ((now - pending.sentAt) > (this.ackTimeout * 3)) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Acknowledgment timeout during cleanup'));
        this.pendingAcks.delete(messageId);
      }
    }

    // The bounded collections handle their own cleanup automatically
  }

  /**
   * Get estimated memory usage
   */
  private getMemoryUsage(): number {
    let bufferSize = 0;
    for (const entry of this.messageBuffer.values()) {
      const buffer = entry ? entry.value : undefined;
      if (buffer) {
        bufferSize += buffer.length * 200; // rough estimate per buffered message
      }
    }

    return (
      this.messageHistory.length * 150 + // rough estimate per history message
      bufferSize +
      this.processedMessages.size * 50 + // rough estimate per processed message ID
      this.pendingAcks.size * 300 // rough estimate per pending ack
    );
  }

  /**
   * Generate unique tab ID
   */
  private generateTabId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Setup listener for underlying communicator
   */
  private setupCommunicatorListener(): void {
    this.communicator.onMessage((message) => {
      this.handleIncomingMessage(message);
    });
  }

  /**
   * Handle incoming messages from communicator
   */
  private handleIncomingMessage(message: CrossTabMessage): void {
    // Skip messages from this tab
    if (message.tabId === this.tabId) return;

    switch (message.type) {
      case 'SYNC_ACK':
        this.handleAcknowledgment(message.data as MessageAcknowledgment);
        break;
      case 'SYNC_REQUEST':
        this.handleSyncRequest(message);
        break;
      case 'SYNC_RESPONSE':
        this.handleSyncResponse(message);
        break;
      default:
        // Handle as synchronized message
        if (this.isSynchronizedMessage(message)) {
          this.processSynchronizedMessage(message as SynchronizedMessage);
        }
        break;
    }
  }

  /**
   * Check if message is a synchronized message
   */
  private isSynchronizedMessage(message: CrossTabMessage): boolean {
    return 'sequenceNumber' in message && typeof message.sequenceNumber === 'number';
  }

  /**
   * Process synchronized message with vector clock ordering
   */
  private processSynchronizedMessage(message: SynchronizedMessage): void {
    // Check for duplicates
    if (this.processedMessages.has(message.messageId)) {
      return;
    }

    // Add sender to known tabs
    this.knownTabs.add(message.tabId);
    this.vectorClockManager.addNode(message.tabId);

    // Process message with vector clock ordering
    if (message.vectorClock) {
      this.processVectorClockMessage(message);
    } else {
      // Fallback to legacy processing
      this.processLegacyMessage(message);
    }
  }

  /**
   * Process message with vector clock ordering
   */
  private processVectorClockMessage(message: SynchronizedMessage): void {
    // Convert vector clock from object to Map
    const vectorClock = new Map(Object.entries(message.vectorClock || {}));

    // Create timestamped message for vector clock processing
    const timestampedMessage: TimestampedMessage = {
      id: message.messageId,
      senderId: message.tabId,
      vectorClock,
      content: message,
      timestamp: message.timestamp
    };

    // Process with vector clock manager
    const orderingResult = this.vectorClockManager.processMessage(timestampedMessage);

    if (orderingResult.canDeliver) {
      this.deliverMessage(message);
    } else {
      console.debug(`[CrossTabSynchronizer] Message buffered: ${orderingResult.reason}`);
      // Message is automatically buffered by vector clock manager
    }
  }

  /**
   * Process legacy message without vector clock
   */
  private processLegacyMessage(message: SynchronizedMessage): void {
    // Update statistics
    this.stats.messagesReceived++;
    this.stats.lastSyncTime = Date.now();

    // Add to message history
    this.addToHistory(message);

    // Send acknowledgment if required
    if (message.requiresAck) {
      this.sendAcknowledgment(message, 'received');
    }

    // Handle ordering
    if (this.orderedMessageCallbacks.size > 0) {
      this.bufferMessageForOrdering(message);
    } else {
      // Direct processing for non-ordered callbacks
      this.distributeMessage(message);
    }
  }

  /**
   * Deliver a message that passed ordering checks
   */
  private deliverMessage(message: SynchronizedMessage): void {
    // Mark as processed
    this.processedMessages.add(message.messageId);

    // Update statistics
    this.stats.messagesReceived++;
    this.stats.lastSyncTime = Date.now();

    // Add to message history
    this.addToHistory(message);

    // Send acknowledgment if required
    if (message.requiresAck) {
      this.sendAcknowledgment(message, 'received');
    }

    // Distribute to callbacks
    this.distributeMessage(message);
  }

  /**
   * Buffer message for ordered processing
   */
  private bufferMessageForOrdering(message: SynchronizedMessage): void {
    const senderTabId = message.tabId;
    if (!this.messageBuffer.has(senderTabId)) {
      this.messageBuffer.set(senderTabId, []);
    }

    // BoundedMap stores TimestampedEntry<V> as the value, so retrieve the entry and use its .value
    const entry = this.messageBuffer.get(senderTabId)!;
    const buffer = entry.value;
    buffer.push({
      message,
      receivedAt: Date.now(),
      processed: false
    });
    
    // Sort by sequence number
    buffer.sort((a, b) => a.message.sequenceNumber - b.message.sequenceNumber);
    
    // Limit buffer size
    if (buffer.length > this.maxBufferSize) {
      const dropped = buffer.splice(0, buffer.length - this.maxBufferSize);
      this.stats.messagesDropped += dropped.length;
    }
    
    // Process ordered messages
  // Persist trimmed/updated buffer back into the bounded map so its timestamp/access metadata is updated
  this.messageBuffer.set(senderTabId, buffer);
  this.processOrderedMessages(senderTabId);
  }

  /**
   * Process messages in order from buffer
   */
  private processOrderedMessages(senderTabId: string): void {
    const entry = this.messageBuffer.get(senderTabId);
    if (!entry) return;

    const buffer = entry.value;

    let processed = 0;
    for (const buffered of buffer) {
      if (buffered.processed) continue;

      // Check if this is the next expected message (simple ordering)
      // In a more sophisticated implementation, we'd track expected sequence numbers
      buffered.processed = true;
      this.distributeMessage(buffered.message);
      processed++;
    }

    // Clean up processed messages
    if (processed > 0) {
      const remaining = buffer.filter(b => !b.processed);
      this.messageBuffer.set(senderTabId, remaining);
    }
  }

  /**
   * Distribute message to callbacks
   */
  private distributeMessage(message: SynchronizedMessage): void {
    this.processedMessages.add(message.messageId);
    
    // Distribute to all message callbacks
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('[CrossTabSynchronizer] Error in message callback:', error);
      }
    });
    
    // Distribute to ordered message callbacks
    this.orderedMessageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('[CrossTabSynchronizer] Error in ordered message callback:', error);
      }
    });
  }

  /**
   * Add message to history (BoundedArray handles cleanup automatically)
   */
  private addToHistory(message: SynchronizedMessage): void {
    this.messageHistory.push(message);
    // BoundedArray automatically handles size limits and eviction
    // Evicted messages are handled by the onEviction callback set in constructor
  }

  /**
   * Send acknowledgment for a message
   */
  private sendAcknowledgment(message: SynchronizedMessage, status: 'received' | 'processed' | 'failed', error?: string): void {
    const ack: MessageAcknowledgment = {
      messageId: message.messageId,
      tabId: this.tabId,
      timestamp: Date.now(),
      status,
      error
    };

    this.communicator.broadcast({
      type: 'SYNC_ACK',
      tabId: this.tabId,
      timestamp: Date.now(),
      messageId: `ack-${message.messageId}-${Date.now()}`,
      data: ack
    });
  }

  /**
   * Handle incoming acknowledgment
   */
  private handleAcknowledgment(ack: MessageAcknowledgment): void {
    const pending = this.pendingAcks.get(ack.messageId);
    if (!pending) return;

    // Store acknowledgment
    if (!this.acknowledgments.has(ack.messageId)) {
      this.acknowledgments.set(ack.messageId, []);
    }
    this.acknowledgments.get(ack.messageId)!.push(ack);

    // Check if we have enough acknowledgments (for now, just resolve on first ack)
    clearTimeout(pending.timeout);
    pending.resolve([ack]);
    this.pendingAcks.delete(ack.messageId);
  }

  /**
   * Handle sync request from another tab
   */
  private handleSyncRequest(message: CrossTabMessage): void {
    // Send recent message history as response
    const recentMessages = this.messageHistory.slice(-50); // Last 50 messages

    this.communicator.broadcast({
      type: 'SYNC_RESPONSE',
      tabId: this.tabId,
      timestamp: Date.now(),
      messageId: `sync-response-${Date.now()}`,
      data: {
        requestId: message.messageId,
        messages: recentMessages,
        stats: this.stats
      }
    });
  }

  /**
   * Handle sync response from another tab
   */
  private handleSyncResponse(message: CrossTabMessage): void {
    const { messages, stats } = message.data;

    // Process any messages we might have missed
    if (Array.isArray(messages)) {
      messages.forEach((msg: SynchronizedMessage) => {
        if (!this.processedMessages.has(msg.messageId)) {
          this.processSynchronizedMessage(msg);
        }
      });
    }

    // Update connection count from stats
    if (stats && typeof stats.activeConnections === 'number') {
      this.stats.activeConnections = Math.max(this.stats.activeConnections, stats.activeConnections);
    }
  }

  /**
   * Generate message fingerprint for deduplication
   */
  private generateFingerprint(message: Omit<SynchronizedMessage, 'fingerprint'>): string {
    const content = JSON.stringify({
      type: message.type,
      data: message.data,
      tabId: message.tabId,
      timestamp: message.timestamp
    });

    // Simple hash function (in production, use a proper hash function)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(36);
  }

  /**
   * Start background processing
   */
  private startBackgroundProcessing(): void {
    // Process buffered messages periodically
    this.bufferProcessingInterval = setInterval(() => {
      this.processAllBufferedMessages();
    }, this.bufferTimeout);

    // Update statistics periodically
    this.statsUpdateInterval = setInterval(() => {
      this.updateStats();
    }, 10000); // Every 10 seconds

    // Cleanup old data periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  /**
   * Stop background processing
   */
  private stopBackgroundProcessing(): void {
    if (this.bufferProcessingInterval) {
      clearInterval(this.bufferProcessingInterval);
      this.bufferProcessingInterval = null;
    }

    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval);
      this.statsUpdateInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Process all buffered messages
   */
  private processAllBufferedMessages(): void {
    for (const tabId of this.messageBuffer.keys()) {
      this.processOrderedMessages(tabId);
    }
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    this.stats.activeConnections = this.messageBuffer.size + 1; // +1 for this tab
    this.stats.fallbackActive = !this.communicator.isChannelSupported();

    // Calculate average latency (simplified)
    const now = Date.now();
    const recentMessages = this.messageHistory.slice(-10);
    if (recentMessages.length > 0) {
      const totalLatency = recentMessages.reduce((sum, msg) => {
        return sum + (now - msg.timestamp);
      }, 0);
      this.stats.averageLatency = totalLatency / recentMessages.length;
    }
  }

  /**
   * Cleanup old data
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes

    // Cleanup message buffers
    for (const [tabId, entry] of this.messageBuffer) {
      const buffer = entry.value;
      const filtered = buffer.filter(b => (now - b.receivedAt) < maxAge);
      if (filtered.length !== buffer.length) {
        this.messageBuffer.set(tabId, filtered);
      }
    }

    // Cleanup processed messages set
    const oldMessages = this.messageHistory.filter(msg => (now - msg.timestamp) > maxAge);
    oldMessages.forEach(msg => this.processedMessages.delete(msg.messageId));

    // Cleanup pending acknowledgments
    for (const [messageId, pending] of this.pendingAcks) {
      if ((now - pending.sentAt) > (this.ackTimeout * 2)) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Acknowledgment timeout'));
        this.pendingAcks.delete(messageId);
      }
    }
  }

  // Public interface implementation

  /**
   * Broadcast message with vector clock ordering
   */
  async broadcast(message: Omit<SynchronizedMessage, 'sequenceNumber' | 'timestamp' | 'fingerprint'>): Promise<void> {
    return this.operationExecutor.execute({
      id: `broadcast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      operation: () => this.performOrderedBroadcast(message),
      timeout: 10000,
      priority: 'medium'
    });
  }

  /**
   * Perform ordered broadcast with vector clock
   */
  private async performOrderedBroadcast(message: Omit<SynchronizedMessage, 'sequenceNumber' | 'timestamp' | 'fingerprint'>): Promise<void> {
    // Create vector clock message
    const vectorMessage = this.vectorClockManager.createMessage(message);

    // Create synchronized message with vector clock
    const synchronizedMessage: SynchronizedMessage = {
      ...message,
      sequenceNumber: vectorMessage.vectorClock.get(this.tabId) || 0,
      timestamp: vectorMessage.timestamp,
      fingerprint: this.generateFingerprint(message as any),
      messageId: vectorMessage.id,
      vectorClock: Object.fromEntries(vectorMessage.vectorClock), // Convert Map to object for serialization
      tabId: this.tabId
    };

    // Add to history
    this.addToHistory(synchronizedMessage);

    // Update statistics
    this.stats.messagesSent++;

    try {
      this.communicator.broadcast(synchronizedMessage);
    } catch (error) {
      console.error('[CrossTabSynchronizer] Error broadcasting message:', error);
      throw error;
    }
  }

  /**
   * Broadcast message with acknowledgment requirement
   */
  async broadcastReliable(message: Omit<SynchronizedMessage, 'sequenceNumber' | 'timestamp' | 'fingerprint'>): Promise<MessageAcknowledgment[]> {
    const synchronizedMessage: SynchronizedMessage = {
      ...message,
      sequenceNumber: ++this.sequenceNumber,
      timestamp: Date.now(),
      fingerprint: this.generateFingerprint(message as any),
      messageId: message.messageId || `msg-${this.tabId}-${this.sequenceNumber}-${Date.now()}`,
      requiresAck: true,
      maxRetries: message.maxRetries || this.maxRetries
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingAcks.delete(synchronizedMessage.messageId);
        reject(new Error(`Acknowledgment timeout for message ${synchronizedMessage.messageId}`));
      }, this.ackTimeout);

      this.pendingAcks.set(synchronizedMessage.messageId, {
        message: synchronizedMessage,
        sentAt: Date.now(),
        retryCount: 0,
        resolve,
        reject,
        timeout
      });

      // Add to history
      this.addToHistory(synchronizedMessage);

      // Update statistics
      this.stats.messagesSent++;

      try {
        this.communicator.broadcast(synchronizedMessage);
      } catch (error) {
        clearTimeout(timeout);
        this.pendingAcks.delete(synchronizedMessage.messageId);
        reject(error);
      }
    });
  }

  /**
   * Register callback for all messages
   */
  onMessage(callback: (message: SynchronizedMessage) => void): () => void {
    this.messageCallbacks.add(callback);

    return () => {
      this.messageCallbacks.delete(callback);
    };
  }

  /**
   * Register callback for ordered messages
   */
  onOrderedMessage(callback: (message: SynchronizedMessage) => void): () => void {
    this.orderedMessageCallbacks.add(callback);

    return () => {
      this.orderedMessageCallbacks.delete(callback);
    };
  }

  /**
   * Wait for synchronization with other tabs
   */
  async waitForSync(timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Sync timeout'));
      }, timeout);

      // Request sync from other tabs
      this.communicator.broadcast({
        type: 'SYNC_REQUEST',
        tabId: this.tabId,
        timestamp: Date.now(),
        messageId: `sync-req-${Date.now()}`
      });

      // For simplicity, resolve after a short delay
      // In a real implementation, we'd wait for responses
      setTimeout(() => {
        clearTimeout(timeoutId);
        resolve();
      }, 1000);
    });
  }

  /**
   * Request synchronization from other tabs
   */
  async requestSync(): Promise<SynchronizedMessage[]> {
    const requestId = `sync-req-${Date.now()}`;
    const responses: SynchronizedMessage[] = [];

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(responses);
      }, 3000);

      // Listen for sync responses
      const unsubscribe = this.communicator.onMessage((message) => {
        if (message.type === 'SYNC_RESPONSE' && message.data.requestId === requestId) {
          responses.push(...message.data.messages);
        }
      });

      // Send sync request
      this.communicator.broadcast({
        type: 'SYNC_REQUEST',
        tabId: this.tabId,
        timestamp: Date.now(),
        messageId: requestId
      });

      // Cleanup after timeout
      setTimeout(() => {
        unsubscribe();
        clearTimeout(timeout);
        resolve(responses);
      }, 3000);
    });
  }

  /**
   * Get message history
   */
  getMessageHistory(count?: number): SynchronizedMessage[] {
    if (count) {
      return this.messageHistory.slice(-count);
    }
    return [...this.messageHistory];
  }

  /**
   * Resend a message
   */
  async resendMessage(messageId: string): Promise<void> {
    const message = this.messageHistory.find(msg => msg.messageId === messageId);
    if (!message) {
      throw new Error(`Message ${messageId} not found in history`);
    }

    // Update retry count
    const updatedMessage = {
      ...message,
      retryCount: (message.retryCount || 0) + 1,
      timestamp: Date.now()
    };

    this.stats.messagesRetried++;

    try {
      this.communicator.broadcast(updatedMessage);
    } catch (error) {
      console.error('[CrossTabSynchronizer] Error resending message:', error);
      throw error;
    }
  }

  /**
   * Acknowledge a message
   */
  acknowledgeMessage(messageId: string, status: 'received' | 'processed' | 'failed', error?: string): void {
    const message = this.messageHistory.find(msg => msg.messageId === messageId);
    if (message) {
      this.sendAcknowledgment(message, status, error);
    }
  }

  /**
   * Get synchronization statistics
   */
  getStats(): SyncStats {
    return { ...this.stats };
  }

  /**
   * Check if synchronizer is healthy
   */
  isHealthy(): boolean {
    const now = Date.now();
    const timeSinceLastSync = now - this.stats.lastSyncTime;

    // Consider healthy if we've had activity in the last 30 seconds
    // or if we just started
    return timeSinceLastSync < 30000 || this.stats.lastSyncTime === 0;
  }

  /**
   * Get current sequence number
   */
  getSequenceNumber(): number {
    return this.sequenceNumber;
  }

  /**
   * Start the synchronizer
   */
  async start(): Promise<void> {
    if (this.isStarted) return;

    this.isStarted = true;
    this.startBackgroundProcessing();

    // Request initial sync
    try {
      await this.waitForSync(2000);
    } catch (error) {
      console.warn('[CrossTabSynchronizer] Initial sync failed:', error);
    }
  }

  /**
   * Stop the synchronizer with comprehensive cleanup
   */
  async stop(): Promise<void> {
    if (!this.isStarted) return;

    this.isStarted = false;
    this.isDestroyed = true;
    this.stopBackgroundProcessing();

    // Clear pending acknowledgments
    for (const [messageId, pending] of this.pendingAcks) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Synchronizer stopped'));
    }
    this.pendingAcks.clear();

    // Destroy bounded collections
    this.messageBuffer.destroy();
    this.messageHistory.destroy();

    // Clear other collections
    this.processedMessages.clear();
    this.acknowledgments.clear();
    this.messageCallbacks.clear();
    this.orderedMessageCallbacks.clear();

    // Unregister from memory manager
    if (this.cleanupUnregister) {
      this.cleanupUnregister();
      this.cleanupUnregister = null;
    }
  }

  /**
   * Reset the synchronizer state
   */
  reset(): void {
    if (this.isDestroyed) return;

    this.sequenceNumber = 0;

    // Clear bounded collections (they handle cleanup automatically)
    this.messageHistory.length = 0; // Clear array contents
    this.messageBuffer.clear();
    this.processedMessages.clear();
    this.acknowledgments.clear();

    // Reset statistics
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      messagesDropped: 0,
      messagesRetried: 0,
      averageLatency: 0,
      lastSyncTime: 0,
      activeConnections: 0,
      fallbackActive: !this.communicator.isChannelSupported()
    };
  }
}
