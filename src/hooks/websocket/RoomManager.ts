/**
 * WebSocket Room Manager for RMS System
 * Handles room joining/leaving with race condition prevention and proper state management
 */

import { EventEmitter } from 'events';

export interface RoomState {
  roomId: string;
  roomType: 'tournament' | 'field' | 'match';
  memberCount: number;
  joinedAt: number;
  isJoined: boolean;
}

interface PendingOperation {
  promise: Promise<void>;
  timeout: NodeJS.Timeout;
  retryCount: number;
}

export class RoomManager extends EventEmitter {
  private roomMembership: Map<string, RoomState> = new Map();
  private pendingJoins: Map<string, PendingOperation> = new Map();
  private pendingLeaves: Map<string, PendingOperation> = new Map();
  private socket: any = null;
  private isConnected: boolean = false;
  private readonly MAX_RETRIES = 3;
  private readonly JOIN_TIMEOUT = 3000; // 3 seconds (reduced since no acks expected)
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor() {
    super();
  }

  /**
   * Set the socket instance for room operations
   */
  setSocket(socket: any): void {
    this.socket = socket;
    this.setupSocketListeners();
  }

  /**
   * Set connection status
   */
  setConnectionStatus(connected: boolean): void {
    this.isConnected = connected;
    
    if (!connected) {
      // Clear all pending operations on disconnect
      this.clearPendingOperations();
      // Mark all rooms as not joined
      for (const [, state] of this.roomMembership) {
        state.isJoined = false;
      }
    }
  }

  /**
   * Join a room with race condition prevention
   */
  async joinRoom(roomId: string, roomType: 'tournament' | 'field' | 'match' = 'tournament'): Promise<void> {
    console.log(`[RoomManager] Attempting to join room: ${roomId} (${roomType})`);

    // Check if already joined
    const existingState = this.roomMembership.get(roomId);
    if (existingState?.isJoined) {
      console.log(`[RoomManager] Already joined room: ${roomId}`);
      return;
    }

    // Check if join is already in progress
    if (this.pendingJoins.has(roomId)) {
      console.log(`[RoomManager] Join already in progress for room: ${roomId}`);
      return this.pendingJoins.get(roomId)!.promise;
    }

    // Wait for connection if not ready
    await this.waitForConnection();

    const joinPromise = this.performRoomJoin(roomId, roomType);
    const timeout = setTimeout(() => {
      this.handleJoinTimeout(roomId);
    }, this.JOIN_TIMEOUT);

    const pendingOp: PendingOperation = {
      promise: joinPromise,
      timeout,
      retryCount: 0
    };

    this.pendingJoins.set(roomId, pendingOp);

    try {
      await joinPromise;
      this.addToRoom(roomId, roomType);
      console.log(`[RoomManager] Successfully joined room: ${roomId}`);
    } catch (error) {
      console.error(`[RoomManager] Failed to join room ${roomId}:`, error);
      await this.handleJoinError(roomId, roomType, error);
    } finally {
      clearTimeout(timeout);
      this.pendingJoins.delete(roomId);
    }
  }

  /**
   * Leave a room with proper cleanup
   */
  async leaveRoom(roomId: string): Promise<void> {
    console.log(`[RoomManager] Attempting to leave room: ${roomId}`);

    const roomState = this.roomMembership.get(roomId);
    if (!roomState?.isJoined) {
      console.log(`[RoomManager] Not joined to room: ${roomId}`);
      return;
    }

    // Check if leave is already in progress
    if (this.pendingLeaves.has(roomId)) {
      console.log(`[RoomManager] Leave already in progress for room: ${roomId}`);
      return this.pendingLeaves.get(roomId)!.promise;
    }

    const leavePromise = this.performRoomLeave(roomId);
    const timeout = setTimeout(() => {
      this.handleLeaveTimeout(roomId);
    }, this.JOIN_TIMEOUT);

    const pendingOp: PendingOperation = {
      promise: leavePromise,
      timeout,
      retryCount: 0
    };

    this.pendingLeaves.set(roomId, pendingOp);

    try {
      await leavePromise;
      this.removeFromRoom(roomId);
      console.log(`[RoomManager] Successfully left room: ${roomId}`);
    } catch (error) {
      console.error(`[RoomManager] Failed to leave room ${roomId}:`, error);
    } finally {
      clearTimeout(timeout);
      this.pendingLeaves.delete(roomId);
    }
  }

  /**
   * Get current room membership status
   */
  getRoomState(roomId: string): RoomState | null {
    return this.roomMembership.get(roomId) || null;
  }

  /**
   * Get all joined rooms
   */
  getJoinedRooms(): RoomState[] {
    return Array.from(this.roomMembership.values()).filter(state => state.isJoined);
  }

  /**
   * Check if currently joined to a room
   */
  isJoinedToRoom(roomId: string): boolean {
    return this.roomMembership.get(roomId)?.isJoined || false;
  }

  /**
   * Get room statistics
   */
  getStats(): Record<string, any> {
    return {
      totalRooms: this.roomMembership.size,
      joinedRooms: this.getJoinedRooms().length,
      pendingJoins: this.pendingJoins.size,
      pendingLeaves: this.pendingLeaves.size,
      rooms: Object.fromEntries(this.roomMembership)
    };
  }

  // Private methods

  private async waitForConnection(): Promise<void> {
    if (this.isConnected && this.socket) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.JOIN_TIMEOUT);

      const checkConnection = () => {
        if (this.isConnected && this.socket) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }

  private async performRoomJoin(roomId: string, roomType: string): Promise<void> {
    if (!this.socket) {
      throw new Error('Socket not available');
    }

    // Determine the correct event name based on room type and existing server implementation
    let eventName: string;
    let eventData: any;

    if (roomType === 'tournament') {
      // Use existing server event for tournaments
      eventName = 'join_tournament';
      eventData = { tournamentId: roomId.replace('tournament:', '') };
    } else if (roomType === 'field') {
      // Use existing server event for fields
      eventName = 'joinFieldRoom';
      eventData = { fieldId: roomId.replace('field:', '') };
    } else {
      // Generic room join for future use
      eventName = 'join_room';
      eventData = { roomId, roomType, timestamp: Date.now() };
    }

    // Since the server doesn't send acknowledgments, we'll emit and assume success
    // We'll listen for confirmation events if available
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // Don't reject immediately - the server might not send acks
        console.warn(`[RoomManager] No acknowledgment received for ${roomId}, assuming success`);
        resolve();
      }, 2000); // Reduced timeout since we're not expecting acks

      // Set up one-time listeners for confirmation events if they exist
      const confirmationHandler = (data: any) => {
        if (data.roomId === roomId || data.tournamentId === roomId.replace('tournament:', '') || data.fieldId === roomId.replace('field:', '')) {
          clearTimeout(timeout);
          this.socket.off('room_joined', confirmationHandler);
          resolve();
        }
      };

      // Listen for potential confirmation events
      this.socket.on('room_joined', confirmationHandler);

      // Emit the room join event
      this.socket.emit(eventName, eventData);

      // Auto-resolve after a short delay since server doesn't send acks
      setTimeout(() => {
        clearTimeout(timeout);
        this.socket.off('room_joined', confirmationHandler);
        resolve();
      }, 500); // Assume success after 500ms
    });
  }

  private async performRoomLeave(roomId: string): Promise<void> {
    if (!this.socket) {
      throw new Error('Socket not available');
    }

    // Determine the correct event name based on room type and existing server implementation
    const roomState = this.roomMembership.get(roomId);
    let eventName: string;
    let eventData: any;

    if (roomState?.roomType === 'tournament') {
      // Use existing server event for tournaments
      eventName = 'leave_tournament';
      eventData = { tournamentId: roomId.replace('tournament:', '') };
    } else if (roomState?.roomType === 'field') {
      // Use existing server event for fields
      eventName = 'leaveFieldRoom';
      eventData = { fieldId: roomId.replace('field:', '') };
    } else {
      // Generic room leave for future use
      eventName = 'leave_room';
      eventData = { roomId, timestamp: Date.now() };
    }

    // Since the server doesn't send acknowledgments, we'll emit and assume success
    return new Promise((resolve) => {
      // Set up one-time listeners for confirmation events if they exist
      const confirmationHandler = (data: any) => {
        if (data.roomId === roomId || data.tournamentId === roomId.replace('tournament:', '') || data.fieldId === roomId.replace('field:', '')) {
          this.socket.off('room_left', confirmationHandler);
          resolve();
        }
      };

      // Listen for potential confirmation events
      this.socket.on('room_left', confirmationHandler);

      // Emit the room leave event
      this.socket.emit(eventName, eventData);

      // Auto-resolve after a short delay since server doesn't send acks
      setTimeout(() => {
        this.socket.off('room_left', confirmationHandler);
        resolve();
      }, 500); // Assume success after 500ms
    });
  }

  private addToRoom(roomId: string, roomType: 'tournament' | 'field' | 'match'): void {
    const state: RoomState = {
      roomId,
      roomType,
      memberCount: 1,
      joinedAt: Date.now(),
      isJoined: true
    };

    this.roomMembership.set(roomId, state);
    this.emit('roomJoined', state);
  }

  private removeFromRoom(roomId: string): void {
    const state = this.roomMembership.get(roomId);
    if (state) {
      state.isJoined = false;
      this.emit('roomLeft', state);
    }
    this.roomMembership.delete(roomId);
  }

  private async handleJoinError(roomId: string, roomType: string, error: any): Promise<void> {
    const pendingOp = this.pendingJoins.get(roomId);
    
    if (pendingOp && pendingOp.retryCount < this.MAX_RETRIES) {
      pendingOp.retryCount++;
      console.log(`[RoomManager] Retrying join for room ${roomId} (attempt ${pendingOp.retryCount})`);
      
      await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
      
      try {
        await this.performRoomJoin(roomId, roomType);
        this.addToRoom(roomId, roomType as any);
      } catch (retryError) {
        if (pendingOp.retryCount >= this.MAX_RETRIES) {
          throw retryError;
        }
        await this.handleJoinError(roomId, roomType, retryError);
      }
    } else {
      throw error;
    }
  }

  private handleJoinTimeout(roomId: string): void {
    console.error(`[RoomManager] Join timeout for room: ${roomId}`);
    this.pendingJoins.delete(roomId);
  }

  private handleLeaveTimeout(roomId: string): void {
    console.error(`[RoomManager] Leave timeout for room: ${roomId}`);
    this.pendingLeaves.delete(roomId);
  }

  private clearPendingOperations(): void {
    // Clear pending joins
    for (const [, op] of this.pendingJoins) {
      clearTimeout(op.timeout);
    }
    this.pendingJoins.clear();

    // Clear pending leaves
    for (const [, op] of this.pendingLeaves) {
      clearTimeout(op.timeout);
    }
    this.pendingLeaves.clear();
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('room_joined', (data: any) => {
      console.log(`[RoomManager] Room joined confirmation:`, data);
      // Update member count if provided
      const state = this.roomMembership.get(data.roomId);
      if (state && data.memberCount) {
        state.memberCount = data.memberCount;
      }
    });

    this.socket.on('room_left', (data: any) => {
      console.log(`[RoomManager] Room left confirmation:`, data);
    });

    this.socket.on('room_error', (data: any) => {
      console.error(`[RoomManager] Room error:`, data);
      this.emit('roomError', data);
    });
  }
}
