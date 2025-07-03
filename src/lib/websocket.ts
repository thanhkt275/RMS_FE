import { io, Socket } from 'socket.io-client';
import { 
  BaseScoreData, 
  ScoreUpdateData, 
  PersistScoresData, 
  PersistenceResultData, 
  WebSocketConnectionStatus,
  WebSocketError,
  ScoreUpdateCallback,
  PersistenceResultCallback,
  ConnectionStatusCallback,
  ErrorCallback 
} from '@/types/websocket';

// === INTERFACES ===

interface IConnectionManager {
  connect(url?: string): void;
  disconnect(): void;
  isConnected(): boolean;
  getConnectionStatus(): WebSocketConnectionStatus;
  forceReconnect(): void;
}

interface IEventEmitter {
  emit(event: string, data: any): void;
  on<T = any>(event: string, callback: (data: T) => void): () => void;
  off(event: string): void;
}

interface IScoreManager {
  sendRealtimeScoreUpdate(data: BaseScoreData): Promise<void>;
  persistScores(data: BaseScoreData): Promise<PersistenceResultData>;
  onScoreUpdate(callback: ScoreUpdateCallback): () => void;
  onScoresPersisted(callback: PersistenceResultCallback): () => void;
  sendMatchUpdate(data: any): void;
  onMatchUpdate(callback: (data: any) => void): () => void;
}

interface ILegacySupport {
  joinTournament(id: string): void;
  leaveTournament(id: string): void;
  joinFieldRoom(fieldId: string): void;
  leaveFieldRoom(fieldId: string): void;
  sendDisplayModeChange(settings: any): void;
  sendMatchUpdate(data: any): void;
  sendScoreUpdate(data: any): void;
  sendMatchStateChange(data: any): void;
  startTimer(data: any): void;
  pauseTimer(data: any): void;
  resetTimer(data: any): void;
  sendAnnouncement(data: any): void;
}

// === VALIDATION SERVICE ===

class ScoreDataValidator {
  static validate(data: BaseScoreData): void {
    if (!data.matchId) {
      throw new Error('matchId is required');
    }
    if (!data.tournamentId) {
      throw new Error('tournamentId is required');
    }
    if (typeof data.redAutoScore !== 'number' || typeof data.blueAutoScore !== 'number') {
      throw new Error('Auto scores must be numbers');
    }
    if (typeof data.redDriveScore !== 'number' || typeof data.blueDriveScore !== 'number') {
      throw new Error('Drive scores must be numbers');
    }
  }
  static sanitize(data: BaseScoreData): BaseScoreData {
    return {
      ...data,
      redAutoScore: Number(data.redAutoScore) || 0,
      redDriveScore: Number(data.redDriveScore) || 0,
      blueAutoScore: Number(data.blueAutoScore) || 0,
      blueDriveScore: Number(data.blueDriveScore) || 0,
      redTotalScore: Number(data.redTotalScore) || 0,
      blueTotalScore: Number(data.blueTotalScore) || 0,
      redPenalty: Number(data.redPenalty) || 0,
      bluePenalty: Number(data.bluePenalty) || 0,
    };
  }
}

// === CONNECTION MANAGER ===

class ConnectionManager implements IConnectionManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 2000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectionStatus: WebSocketConnectionStatus = {
    connected: false,
    reconnecting: false,
    reconnectAttempts: 0,
  };
  private statusCallbacks: Set<ConnectionStatusCallback> = new Set();
  private fallbackCallbacks: Set<(reason: string) => void> = new Set();
  connect(url?: string): void {
    if (!this.socket) {
      // Use the same environment variable as legacy WebSocket for consistency
      const backendUrl = url || process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      
      console.log('🔗 [New WebSocket Service] Connecting to:', backendUrl);
      
      this.socket = io(backendUrl, {
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 10000,
      });

      this.setupEventHandlers();
    }
  }
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.updateConnectionStatus({
        connected: false,
        reconnecting: false,
        reconnectAttempts: 0,
      });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionStatus(): WebSocketConnectionStatus {
    return { ...this.connectionStatus };
  }
  forceReconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.reconnectAttempts = 0;
      this.handleConnectionLoss();
    }
  }
  onConnectionStatus(callback: ConnectionStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    callback(this.connectionStatus);
    
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  onFallbackMode(callback: (reason: string) => void): () => void {
    this.fallbackCallbacks.add(callback);
    return () => {
      this.fallbackCallbacks.delete(callback);
    };
  }

  // === STEP 11: Connection Recovery Implementation ===

  private handleConnectionLoss(): void {
    console.warn('WebSocket connection lost, attempting to reconnect...');
    this.attemptReconnection();
  }

  private attemptReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
      
      this.updateConnectionStatus({
        connected: false,
        reconnecting: true,
        reconnectAttempts: this.reconnectAttempts,
      });

      this.reconnectTimeout = setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.enableDatabaseFallback();
    }
  }

  private onReconnectSuccess(): void {
    console.log('WebSocket reconnected successfully');
    this.reconnectAttempts = 0;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.updateConnectionStatus({
      connected: true,
      reconnecting: false,
      reconnectAttempts: 0,
      lastConnected: new Date(),
    });

    // Emit reconnected event for components to handle
    this.fallbackCallbacks.forEach(callback => callback('reconnected'));
  }

  private enableDatabaseFallback(): void {
    this.updateConnectionStatus({
      connected: false,
      reconnecting: false,
      reconnectAttempts: this.reconnectAttempts,
    });

    this.fallbackCallbacks.forEach(callback => callback('websocket_failure'));
  }  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🟢 [New WebSocket Service] Connected successfully');
      this.onReconnectSuccess();
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`🔴 [New WebSocket Service] Disconnected: ${reason}`);
      this.updateConnectionStatus({
        connected: false,
        reconnecting: reason !== 'io server disconnect',
        reconnectAttempts: this.reconnectAttempts,
      });

      // Automatically attempt reconnection unless it was a server-initiated disconnect
      if (reason !== 'io server disconnect') {
        this.handleConnectionLoss();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ [New WebSocket Service] Connection error:', error);
      
      this.updateConnectionStatus({
        connected: false,
        reconnecting: this.reconnectAttempts < this.maxReconnectAttempts,
        reconnectAttempts: this.reconnectAttempts,
      });

      // If this is during an active reconnection attempt, the attemptReconnection logic will handle it
      // If not, start the reconnection process
      if (!this.reconnectTimeout) {
        this.handleConnectionLoss();
      }
    });
  }

  private updateConnectionStatus(status: Partial<WebSocketConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...status };
    this.statusCallbacks.forEach(callback => callback(this.connectionStatus));
  }
}

// === EVENT EMITTER  ===

class EventEmitter implements IEventEmitter {
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  private errorCallbacks: Set<ErrorCallback> = new Set();

  private callbackMap: Map<string, Map<(...args: any[]) => void, (...args: any[]) => void>> = new Map();

  private masterHandlers: Map<string, (...args: any[]) => void> = new Map();

  constructor(private connectionManager: ConnectionManager) {}

  emit(event: string, data: any): void {
    const socket = this.connectionManager.getSocket();
    
    if (!socket || !socket.connected) {
      const error: WebSocketError = {
        event,
        message: 'WebSocket not connected',
        data,
        timestamp: new Date(),
      };
      this.notifyError(error);
      
      // Try to reconnect and queue the event
      this.connectionManager.connect();
      setTimeout(() => {
        const retrySocket = this.connectionManager.getSocket();
        if (retrySocket && retrySocket.connected) {
          console.log('Retrying emit after reconnection:', { event, data });
          retrySocket.emit(event, data);
        } else {
          console.error('Still not connected, event not sent:', event);
        }
      }, 500);
      return;
    }
    
    console.log('Emitting WebSocket event:', { event, data });
    socket.emit(event, data);
  }  on<T = any>(event: string, callback: (data: T) => void): () => void {
    console.log(`🔔 [New WebSocket Service] Setting up listener for event: ${event}`);
    
    // Initialize data structures for this event if needed
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
      this.callbackMap.set(event, new Map());
    }

    // Add the original callback to our internal tracking
    this.listeners.get(event)?.add(callback);

    const socket = this.connectionManager.getSocket();
    if (socket) {
      // Check if we need to create a master handler for this event
      if (!this.masterHandlers.has(event)) {
        // Create a single master handler that will call all registered callbacks
        const masterHandler = (data: T) => {
          console.log(`📨 [New WebSocket Service] Received event '${event}':`, data);
          
          // Call all registered callbacks for this event
          const eventCallbacks = this.listeners.get(event);
          if (eventCallbacks) {
            eventCallbacks.forEach(cb => {
              try {
                cb(data);
              } catch (error) {
                console.error(`❌ [New WebSocket Service] Error in event callback for '${event}':`, error);
                this.notifyError({
                  event,
                  message: 'Callback error',
                  data,
                  timestamp: new Date(),
                });
              }
            });
          }
        };
        
        // Store the master handler and register it with the socket
        this.masterHandlers.set(event, masterHandler);
        socket.on(event, masterHandler);
        console.log(`🎯 [New WebSocket Service] Registered master handler for event: ${event}`);
      }
    } else {
      console.warn(`⚠️ [New WebSocket Service] No socket available when setting up listener for: ${event}`);
    }

    // Return cleanup function that properly removes this specific callback
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        // Remove the callback from our internal tracking
        callbacks.delete(callback);
        
        // If this was the last callback for this event, clean up the master handler
        if (callbacks.size === 0) {
          const socket = this.connectionManager.getSocket();
          if (socket) {
            const masterHandler = this.masterHandlers.get(event);
            if (masterHandler) {
              socket.off(event, masterHandler);
              console.log(`🧹 [New WebSocket Service] Removed master handler for event: ${event}`);
            }
          }
          
          // Clean up our data structures
          this.listeners.delete(event);
          this.callbackMap.delete(event);
          this.masterHandlers.delete(event);
        }
      }
    };
  }
  off(event: string): void {
    if (this.listeners.has(event)) {
      const socket = this.connectionManager.getSocket();
      
      // Remove the master handler from the socket
      if (socket) {
        const masterHandler = this.masterHandlers.get(event);
        if (masterHandler) {
          socket.off(event, masterHandler);
          console.log(`🧹 [New WebSocket Service] Removed master handler for event: ${event}`);
        }
      }
      
      // Clean up all our data structures for this event
      this.listeners.delete(event);
      this.callbackMap.delete(event);
      this.masterHandlers.delete(event);
    }
  }

  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => {
      this.errorCallbacks.delete(callback);
    };
  }

  private notifyError(error: WebSocketError): void {
    this.errorCallbacks.forEach(callback => callback(error));
  }
}

// === SCORE MANAGER===

class ScoreManager implements IScoreManager {
  constructor(
    private eventEmitter: EventEmitter,
    private connectionManager: ConnectionManager
  ) {}
  async sendRealtimeScoreUpdate(data: BaseScoreData): Promise<void> {
    try {
      ScoreDataValidator.validate(data);
      const sanitizedData = ScoreDataValidator.sanitize(data);
      
      const scoreUpdateData: ScoreUpdateData = {
        ...sanitizedData,
        type: 'realtime', // Changed from 'scoreUpdate' to 'realtime' to match backend
      };

      console.log('Sending real-time score update:', scoreUpdateData);
     
      this.eventEmitter.emit('scoreUpdateRealtime', scoreUpdateData);
      
    } catch (error) {
      console.error('Real-time score update failed:', error);
      throw error;
    }
  }

  async persistScores(data: BaseScoreData): Promise<PersistenceResultData> {
    return new Promise((resolve, reject) => {
      try {
        ScoreDataValidator.validate(data);
        const sanitizedData = ScoreDataValidator.sanitize(data);
        
        const persistData: PersistScoresData = {
          ...sanitizedData,
          type: 'persist', // FIXED: must match backend expectation
        };

        // Set up one-time listeners for response
        const successListener = (result: PersistenceResultData) => {
          if (result.matchId === data.matchId) {
            this.eventEmitter.off('scoresPersisted');
            this.eventEmitter.off('scorePersistenceError');
            resolve(result);
          }
        };

        const errorListener = (result: PersistenceResultData) => {
          if (result.matchId === data.matchId) {
            this.eventEmitter.off('scoresPersisted');
            this.eventEmitter.off('scorePersistenceError');
            reject(new Error(result.error || 'Persistence failed'));
          }
        };

        this.eventEmitter.on('scoresPersisted', successListener);
        this.eventEmitter.on('scorePersistenceError', errorListener);

        // Set timeout for persistence operation
        setTimeout(() => {
          this.eventEmitter.off('scoresPersisted');
          this.eventEmitter.off('scorePersistenceError');
          reject(new Error('Persistence timeout - no response from server'));
        }, 10000);

        console.log('Persisting scores to database:', persistData);
        this.eventEmitter.emit('persistScores', persistData);
        
      } catch (error) {
        console.error('Score persistence failed:', error);
        reject(error);
      }
    });
  }  onScoreUpdate(callback: ScoreUpdateCallback): () => void {
    
    return this.eventEmitter.on('scoreUpdateRealtime', callback);
  }
  onScoresPersisted(callback: PersistenceResultCallback): () => void {
    return this.eventEmitter.on('scoresPersisted', callback);
  }
  sendMatchUpdate(data: any): void {
    this.eventEmitter.emit('matchUpdate', data);
  }

  onMatchUpdate(callback: (data: any) => void): () => void {
    return this.eventEmitter.on('matchUpdate', callback);
  }
}

// === LEGACY SUPPORT===

class LegacySupport implements ILegacySupport {
  constructor(private eventEmitter: EventEmitter) {}

  joinTournament(id: string): void {
    this.eventEmitter.emit('join_tournament', { tournamentId: id });
  }

  leaveTournament(id: string): void {
    this.eventEmitter.emit('leave_tournament', { tournamentId: id });
  }

  joinFieldRoom(fieldId: string): void {
    this.eventEmitter.emit('joinFieldRoom', { fieldId });
  }

  leaveFieldRoom(fieldId: string): void {
    this.eventEmitter.emit('leaveFieldRoom', { fieldId });
  }

  sendDisplayModeChange(settings: any): void {
    this.eventEmitter.emit('display_mode_change', settings);
  }

  sendMatchUpdate(data: any): void {
    this.eventEmitter.emit('match_update', data);
  }

  sendScoreUpdate(data: any): void {
    console.log('Legacy sendScoreUpdate called with:', data);
    this.eventEmitter.emit('score_update', data);
  }

  sendMatchStateChange(data: any): void {
    this.eventEmitter.emit('match_state_change', data);
  }

  startTimer(data: any): void {
    this.eventEmitter.emit('start_timer', data);
  }

  pauseTimer(data: any): void {
    this.eventEmitter.emit('pause_timer', data);
  }

  resetTimer(data: any): void {
    this.eventEmitter.emit('reset_timer', data);
  }

  sendAnnouncement(data: any): void {
    this.eventEmitter.emit('announcement', data);
  }
}

// === MAIN WEBSOCKET CLIENT  ===

export interface IWebSocketService extends 
  IConnectionManager, 
  IEventEmitter, 
  IScoreManager, 
  ILegacySupport {
  onConnectionStatus(callback: ConnectionStatusCallback): () => void;
  onError(callback: ErrorCallback): () => void;
  onFallbackMode(callback: (reason: string) => void): () => void;
}

class WebSocketService implements IWebSocketService {
  private static instance: WebSocketService;
  private connectionManager: ConnectionManager;
  private eventEmitter: EventEmitter;
  private scoreManager: ScoreManager;
  private legacySupport: LegacySupport;

  private constructor() {
  
    this.connectionManager = new ConnectionManager();
    this.eventEmitter = new EventEmitter(this.connectionManager);
    this.scoreManager = new ScoreManager(this.eventEmitter, this.connectionManager);
    this.legacySupport = new LegacySupport(this.eventEmitter);
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  // === Connection Management (Delegation) ===
  connect(url?: string): void {
    this.connectionManager.connect(url);
  }

  disconnect(): void {
    this.connectionManager.disconnect();
  }

  isConnected(): boolean {
    return this.connectionManager.isConnected();
  }

  getConnectionStatus(): WebSocketConnectionStatus {
    return this.connectionManager.getConnectionStatus();
  }

  forceReconnect(): void {
    this.connectionManager.forceReconnect();
  }
  onConnectionStatus(callback: ConnectionStatusCallback): () => void {
    return this.connectionManager.onConnectionStatus(callback);
  }

  onFallbackMode(callback: (reason: string) => void): () => void {
    return this.connectionManager.onFallbackMode(callback);
  }

  // === Event Management (Delegation) ===
  emit(event: string, data: any): void {
    this.eventEmitter.emit(event, data);
  }

  on<T = any>(event: string, callback: (data: T) => void): () => void {
    return this.eventEmitter.on(event, callback);
  }

  off(event: string): void {
    this.eventEmitter.off(event);
  }

  onError(callback: ErrorCallback): () => void {
    return this.eventEmitter.onError(callback);
  }

  // === Score Management  ===
  async sendRealtimeScoreUpdate(data: BaseScoreData): Promise<void> {
    return this.scoreManager.sendRealtimeScoreUpdate(data);
  }

  async persistScores(data: BaseScoreData): Promise<PersistenceResultData> {
    return this.scoreManager.persistScores(data);
  }

  onScoreUpdate(callback: ScoreUpdateCallback): () => void {
    return this.scoreManager.onScoreUpdate(callback);
  }

  onScoresPersisted(callback: PersistenceResultCallback): () => void {
    return this.scoreManager.onScoresPersisted(callback);
  }

  sendMatchUpdate(data: any): void {
    this.scoreManager.sendMatchUpdate(data);
  }

  onMatchUpdate(callback: (data: any) => void): () => void {
    return this.scoreManager.onMatchUpdate(callback);
  }

  // === Legacy Support  ===
  joinTournament(id: string): void {
    this.legacySupport.joinTournament(id);
  }

  leaveTournament(id: string): void {
    this.legacySupport.leaveTournament(id);
  }

  joinFieldRoom(fieldId: string): void {
    this.legacySupport.joinFieldRoom(fieldId);
  }

  leaveFieldRoom(fieldId: string): void {
    this.legacySupport.leaveFieldRoom(fieldId);
  }
  sendDisplayModeChange(settings: any): void {
    this.legacySupport.sendDisplayModeChange(settings);
  }

  // Note: sendMatchUpdate is handled by scoreManager (new service) to ensure timing with scores
  // Legacy match updates go through sendLegacyMatchUpdate for backward compatibility

  sendLegacyMatchUpdate(data: any): void {
    this.legacySupport.sendMatchUpdate(data);
  }

  sendScoreUpdate(data: any): void {
    this.legacySupport.sendScoreUpdate(data);
  }

  sendMatchStateChange(data: any): void {
    this.legacySupport.sendMatchStateChange(data);
  }

  startTimer(data: any): void {
    this.legacySupport.startTimer(data);
  }

  pauseTimer(data: any): void {
    this.legacySupport.pauseTimer(data);
  }

  resetTimer(data: any): void {
    this.legacySupport.resetTimer(data);
  }

  sendAnnouncement(data: any): void {
    this.legacySupport.sendAnnouncement(data);
  }
}


export const webSocketService = WebSocketService.getInstance();
export default webSocketService;

// Export legacy client for backward compatibility
export const webSocketClient = webSocketService;
