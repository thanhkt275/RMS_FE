/**
 * Vector Clock Implementation for Message Ordering
 * Provides causal ordering and happens-before relationships for distributed messages
 */

export type VectorClock = Map<string, number>;

export interface TimestampedMessage {
  id: string;
  senderId: string;
  vectorClock: VectorClock;
  content: any;
  timestamp: number;
}

export interface MessageOrderingResult {
  canDeliver: boolean;
  missingMessages: string[];
  reason: string;
}

/**
 * Vector clock manager for distributed message ordering
 */
export class VectorClockManager {
  private localClock: VectorClock = new Map();
  private readonly nodeId: string;
  private messageBuffer = new Map<string, TimestampedMessage>();
  private deliveredMessages = new Set<string>();
  private expectedSequence = new Map<string, number>();

  constructor(nodeId: string, knownNodes: string[] = []) {
    this.nodeId = nodeId;
    
    // Initialize clock with known nodes
    this.localClock.set(nodeId, 0);
    knownNodes.forEach(node => {
      if (node !== nodeId) {
        this.localClock.set(node, 0);
      }
    });
  }

  /**
   * Create a new timestamped message
   */
  createMessage(content: any, messageId?: string): TimestampedMessage {
    // Increment local clock
    const currentValue = this.localClock.get(this.nodeId) || 0;
    this.localClock.set(this.nodeId, currentValue + 1);

    // Create message with current vector clock
    const message: TimestampedMessage = {
      id: messageId || `msg-${this.nodeId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      senderId: this.nodeId,
      vectorClock: new Map(this.localClock),
      content,
      timestamp: Date.now()
    };

    return message;
  }

  /**
   * Process received message and determine if it can be delivered
   */
  processMessage(message: TimestampedMessage): MessageOrderingResult {
    // Check if message was already delivered
    if (this.deliveredMessages.has(message.id)) {
      return {
        canDeliver: false,
        missingMessages: [],
        reason: 'Message already delivered'
      };
    }

    // Update local clock with received message's clock
    this.updateClockWithMessage(message);

    // Check if message can be delivered based on causal ordering
    const orderingResult = this.checkCausalOrdering(message);
    
    if (orderingResult.canDeliver) {
      this.deliverMessage(message);
      
      // Try to deliver any buffered messages that are now ready
      this.processBufferedMessages();
    } else {
      // Buffer message for later delivery
      this.messageBuffer.set(message.id, message);
    }

    return orderingResult;
  }

  /**
   * Update local vector clock with received message
   */
  private updateClockWithMessage(message: TimestampedMessage): void {
    // Ensure we have entries for all nodes in the message's clock
    for (const [nodeId, value] of message.vectorClock) {
      if (!this.localClock.has(nodeId)) {
        this.localClock.set(nodeId, 0);
      }
    }

    // Update local clock: max(local[i], message[i]) for all i != sender
    // and max(local[sender], message[sender]) for sender
    for (const [nodeId, messageValue] of message.vectorClock) {
      const localValue = this.localClock.get(nodeId) || 0;
      
      if (nodeId === message.senderId) {
        // For sender: we expect the next sequence number
        this.localClock.set(nodeId, Math.max(localValue, messageValue));
      } else {
        // For others: take maximum
        this.localClock.set(nodeId, Math.max(localValue, messageValue));
      }
    }
  }

  /**
   * Check if message satisfies causal ordering constraints
   */
  private checkCausalOrdering(message: TimestampedMessage): MessageOrderingResult {
    const missingMessages: string[] = [];
    
    // Check if we have all causally preceding messages
    for (const [nodeId, messageValue] of message.vectorClock) {
      const localValue = this.localClock.get(nodeId) || 0;
      
      if (nodeId === message.senderId) {
        // For sender: message should be exactly next in sequence
        const expected = this.expectedSequence.get(nodeId) || 0;
        if (messageValue !== expected + 1) {
          return {
            canDeliver: false,
            missingMessages: [`${nodeId}:${expected + 1}-${messageValue - 1}`],
            reason: `Missing messages from sender ${nodeId}: expected ${expected + 1}, got ${messageValue}`
          };
        }
      } else {
        // For others: we should have all messages up to messageValue
        if (localValue < messageValue) {
          missingMessages.push(`${nodeId}:${localValue + 1}-${messageValue}`);
        }
      }
    }

    if (missingMessages.length > 0) {
      return {
        canDeliver: false,
        missingMessages,
        reason: `Missing causally preceding messages: ${missingMessages.join(', ')}`
      };
    }

    return {
      canDeliver: true,
      missingMessages: [],
      reason: 'Message can be delivered'
    };
  }

  /**
   * Deliver a message (mark as delivered and update expected sequence)
   */
  private deliverMessage(message: TimestampedMessage): void {
    this.deliveredMessages.add(message.id);
    
    // Update expected sequence for sender
    const currentExpected = this.expectedSequence.get(message.senderId) || 0;
    const messageSequence = message.vectorClock.get(message.senderId) || 0;
    this.expectedSequence.set(message.senderId, Math.max(currentExpected, messageSequence));
    
    // Remove from buffer if it was buffered
    this.messageBuffer.delete(message.id);
  }

  /**
   * Process buffered messages to see if any can now be delivered
   */
  private processBufferedMessages(): void {
    const deliverableMessages: TimestampedMessage[] = [];
    
    // Check all buffered messages
    for (const message of this.messageBuffer.values()) {
      const result = this.checkCausalOrdering(message);
      if (result.canDeliver) {
        deliverableMessages.push(message);
      }
    }
    
    // Deliver messages in causal order
    deliverableMessages
      .sort((a, b) => this.compareVectorClocks(a.vectorClock, b.vectorClock))
      .forEach(message => {
        this.deliverMessage(message);
      });
    
    // Recursively process if we delivered any messages
    if (deliverableMessages.length > 0) {
      this.processBufferedMessages();
    }
  }

  /**
   * Compare two vector clocks for ordering
   * Returns: -1 if a < b, 1 if a > b, 0 if concurrent
   */
  private compareVectorClocks(clockA: VectorClock, clockB: VectorClock): number {
    let aLessB = false;
    let bLessA = false;
    
    // Get all node IDs from both clocks
    const allNodes = new Set([...clockA.keys(), ...clockB.keys()]);
    
    for (const nodeId of allNodes) {
      const valueA = clockA.get(nodeId) || 0;
      const valueB = clockB.get(nodeId) || 0;
      
      if (valueA < valueB) {
        aLessB = true;
      } else if (valueA > valueB) {
        bLessA = true;
      }
    }
    
    if (aLessB && !bLessA) return -1;  // A happens before B
    if (bLessA && !aLessB) return 1;   // B happens before A
    return 0; // Concurrent
  }

  /**
   * Check if two events are concurrent
   */
  areConcurrent(clockA: VectorClock, clockB: VectorClock): boolean {
    return this.compareVectorClocks(clockA, clockB) === 0;
  }

  /**
   * Check if event A happens before event B
   */
  happensBefore(clockA: VectorClock, clockB: VectorClock): boolean {
    return this.compareVectorClocks(clockA, clockB) === -1;
  }

  /**
   * Get current vector clock
   */
  getCurrentClock(): VectorClock {
    return new Map(this.localClock);
  }

  /**
   * Get buffered messages count
   */
  getBufferedMessageCount(): number {
    return this.messageBuffer.size;
  }

  /**
   * Get delivered messages count
   */
  getDeliveredMessageCount(): number {
    return this.deliveredMessages.size;
  }

  /**
   * Get expected sequence numbers for all nodes
   */
  getExpectedSequences(): Map<string, number> {
    return new Map(this.expectedSequence);
  }

  /**
   * Add a new node to the vector clock
   */
  addNode(nodeId: string): void {
    if (!this.localClock.has(nodeId)) {
      this.localClock.set(nodeId, 0);
      this.expectedSequence.set(nodeId, 0);
    }
  }

  /**
   * Remove a node from the vector clock
   */
  removeNode(nodeId: string): void {
    this.localClock.delete(nodeId);
    this.expectedSequence.delete(nodeId);
    
    // Remove buffered messages from this node
    for (const [messageId, message] of this.messageBuffer) {
      if (message.senderId === nodeId) {
        this.messageBuffer.delete(messageId);
      }
    }
  }

  /**
   * Reset the vector clock manager
   */
  reset(): void {
    this.localClock.clear();
    this.localClock.set(this.nodeId, 0);
    this.messageBuffer.clear();
    this.deliveredMessages.clear();
    this.expectedSequence.clear();
  }

  /**
   * Get statistics about the vector clock manager
   */
  getStats(): {
    localClock: Record<string, number>;
    bufferedMessages: number;
    deliveredMessages: number;
    expectedSequences: Record<string, number>;
  } {
    return {
      localClock: Object.fromEntries(this.localClock),
      bufferedMessages: this.messageBuffer.size,
      deliveredMessages: this.deliveredMessages.size,
      expectedSequences: Object.fromEntries(this.expectedSequence)
    };
  }
}
