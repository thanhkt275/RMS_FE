/**
 * Enhanced WebSocket Service for RMS System
 * Provides robust connection management, state synchronization, and multi-user support
 */

import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';
import {
  WebSocketConnectionState,
  ConnectionMetrics,
  WebSocketError,
  MatchSession,
  MatchStateSnapshot,
  UserActivity,
  ActiveUser,
  EnhancedWebSocketConfig,
  WebSocketEventMap,
  TimerState,
  ScoreState,
  AudienceDisplaySettings,
  AnnouncementData,
} from '@/types/enhanced-websocket';

class EnhancedWebSocketService extends EventEmitter {
  private static instance: EnhancedWebSocketService;
  private socket: Socket | null = null;
  private config: EnhancedWebSocketConfig;
  private connectionState: WebSocketConnectionState;
  private metrics: ConnectionMetrics;
  private activeUsers: Map<string, ActiveUser> = new Map();
  private matchSessions: Map<string, MatchSession> = new Map();
  private matchStates: Map<string, MatchStateSnapshot> = new Map();
  private userSession: { userId?: string; sessionId: string };
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private failedActions: Map<string, { action: Function; retries: number }> = new Map();

  private constructor() {
    super();
    this.setMaxListeners(50); // Allow more listeners for complex apps
    
    this.config = {
      reconnectAttempts: 10,
      reconnectDelay: 2000,
      heartbeatInterval: 30000,
      activityTimeout: 300000, // 5 minutes
      enableUserTracking: true,
      enableConflictResolution: true,
      enableMetrics: true,
      debugMode: process.env.NODE_ENV === 'development',
    };

    this.connectionState = {
      connected: false,
      reconnecting: false,
      reconnectAttempts: 0,
    };

    this.metrics = {
      totalReconnects: 0,
      connectionUptime: 0,
      averageLatency: 0,
    };

    this.userSession = {
      sessionId: this.generateSessionId(),
    };
  }

  public static getInstance(): EnhancedWebSocketService {
    if (!EnhancedWebSocketService.instance) {
      EnhancedWebSocketService.instance = new EnhancedWebSocketService();
    }
    return EnhancedWebSocketService.instance;
  }

  // =============================================================================
  // CONNECTION MANAGEMENT
  // =============================================================================

  public connect(userConfig?: Partial<EnhancedWebSocketConfig>): void {
    if (this.socket?.connected) {
      this.log('Already connected to WebSocket server');
      return;
    }

    this.config = { ...this.config, ...userConfig };
    const url = this.config.url || 
                process.env.NEXT_PUBLIC_WS_URL || 
                process.env.NEXT_PUBLIC_BACKEND_URL || 
                'http://localhost:5000';

    this.log(`Connecting to Enhanced WebSocket server: ${url}`);

    this.socket = io(url, {
      reconnection: false, // We'll handle reconnection manually
      timeout: 20000,
      forceNew: true,
    });

    this.setupEventHandlers();
    this.startConnectionTimer();
  }

  public disconnect(): void {
    this.log('Disconnecting from WebSocket server');
    
    this.stopHeartbeat();
    this.stopReconnectTimer();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.updateConnectionState({ 
      connected: false, 
      reconnecting: false,
      reconnectAttempts: 0 
    });
    
    this.clearState();
  }

  public reconnect(): void {
    this.log('Manual reconnection requested');
    this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }

  public getConnectionState(): WebSocketConnectionState {
    return { ...this.connectionState };
  }

  public getMetrics(): ConnectionMetrics {
    if (this.connectionState.connected && this.connectionState.lastConnected) {
      this.metrics.connectionUptime = Date.now() - this.connectionState.lastConnected.getTime();
    }
    return { ...this.metrics };
  }

  // =============================================================================
  // MATCH SESSION MANAGEMENT
  // =============================================================================

  public async createMatchSession(
    matchId: string, 
    tournamentId: string, 
    fieldId?: string
  ): Promise<MatchSession> {
    this.log(`Creating match session: ${matchId}`);
    
    const session: MatchSession = {
      matchId,
      tournamentId,
      fieldId,
      status: 'PENDING',
      startTime: new Date(),
      participants: [],
      lastActivity: new Date(),
    };

    if (this.userSession.userId) {
      session.participants.push(this.userSession.userId);
    }

    this.matchSessions.set(matchId, session);
    
    // Reset any existing state for this match
    await this.resetMatchState(matchId, 'session_created');
    
    this.emit('match:session_created', session);
    this.sendToServer('match:create_session', session);
    
    return session;
  }

  public async joinMatchSession(matchId: string): Promise<void> {
    this.log(`Joining match session: ${matchId}`);
    
    let session = this.matchSessions.get(matchId);
    if (!session) {
      throw new Error(`Match session ${matchId} not found`);
    }

    if (this.userSession.userId && !session.participants.includes(this.userSession.userId)) {
      session.participants.push(this.userSession.userId);
      session.lastActivity = new Date();
      this.matchSessions.set(matchId, session);
    }

    this.emit('match:session_updated', session);
    this.sendToServer('match:join_session', { 
      matchId, 
      userId: this.userSession.userId,
      sessionId: this.userSession.sessionId 
    });
  }

  public async leaveMatchSession(matchId: string): Promise<void> {
    this.log(`Leaving match session: ${matchId}`);
    
    const session = this.matchSessions.get(matchId);
    if (session && this.userSession.userId) {
      session.participants = session.participants.filter(id => id !== this.userSession.userId);
      session.lastActivity = new Date();
      
      if (session.participants.length === 0) {
        this.matchSessions.delete(matchId);
        this.emit('match:session_ended', session);
      } else {
        this.matchSessions.set(matchId, session);
        this.emit('match:session_updated', session);
      }
    }

    this.sendToServer('match:leave_session', { 
      matchId, 
      userId: this.userSession.userId,
      sessionId: this.userSession.sessionId 
    });
  }

  public async resetMatch(matchId: string, reason: string = 'manual_reset'): Promise<void> {
    this.log(`Resetting match: ${matchId}, reason: ${reason}`);
    
    await this.resetMatchState(matchId, reason);
    
    const resetEvent = { matchId, reason, timestamp: new Date() };
    this.emit('match:reset', resetEvent);
    this.sendToServer('match:reset', resetEvent);
  }

  private async resetMatchState(matchId: string, reason: string): Promise<void> {
    // Clear all state for this match
    this.matchStates.delete(matchId);
    
    // Create fresh initial state
    const initialState: MatchStateSnapshot = {
      matchId,
      status: 'PENDING',
      currentPeriod: undefined,
      timer: {
        isRunning: false,
        remaining: 0,
        duration: 0,
      },
      scores: {
        red: this.getEmptyAllianceScore(),
        blue: this.getEmptyAllianceScore(),
        lastUpdated: new Date(),
        isRealtime: false,
      },
      teams: {
        red: [],
        blue: [],
      },
      version: 1,
      updatedAt: new Date(),
      updatedBy: this.userSession.userId,
    };

    this.matchStates.set(matchId, initialState);
    this.emit('match:state_changed', initialState);
    
    this.log(`Match state reset for ${matchId}: ${reason}`);
  }

  // =============================================================================
  // STATE MANAGEMENT
  // =============================================================================

  public getMatchState(matchId: string): MatchStateSnapshot | null {
    return this.matchStates.get(matchId) || null;
  }

  public async updateMatchState(
    matchId: string, 
    updates: Partial<MatchStateSnapshot>
  ): Promise<void> {
    const currentState = this.matchStates.get(matchId);
    if (!currentState) {
      throw new Error(`Match state not found: ${matchId}`);
    }

    const newState: MatchStateSnapshot = {
      ...currentState,
      ...updates,
      version: currentState.version + 1,
      updatedAt: new Date(),
      updatedBy: this.userSession.userId,
    };

    this.matchStates.set(matchId, newState);
    this.emit('match:state_changed', newState);
    this.sendToServer('match:update_state', newState);
    
    this.trackActivity('match_state_updated', { matchId, updates });
  }

  // =============================================================================
  // REAL-TIME SCORING
  // =============================================================================

  public async sendRealtimeScore(
    matchId: string, 
    scores: Partial<ScoreState>
  ): Promise<void> {
    const currentState = this.matchStates.get(matchId);
    if (!currentState) {
      throw new Error(`Match state not found: ${matchId}`);
    }

    const updatedScores: ScoreState = {
      ...currentState.scores!,
      ...scores,
      lastUpdated: new Date(),
      isRealtime: true,
    };

    await this.updateMatchState(matchId, { scores: updatedScores });
    
    this.emit('score:realtime_update', updatedScores);
    this.sendToServer('score:realtime_update', {
      matchId,
      scores: updatedScores,
      userId: this.userSession.userId,
    });
    
    this.trackActivity('score_realtime_update', { matchId });
  }

  public async persistScores(matchId: string, scores: ScoreState): Promise<boolean> {
    try {
      const result = await this.sendToServerWithResponse('score:persist', {
        matchId,
        scores,
        userId: this.userSession.userId,
      });

      this.emit('score:persisted', { matchId, success: true });
      this.trackActivity('score_persisted', { matchId });
      
      return true;
    } catch (error) {
      this.log(`Failed to persist scores for match ${matchId}:`, error);
      this.emit('score:persisted', { 
        matchId, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      return false;
    }
  }

  // =============================================================================
  // TIMER CONTROL
  // =============================================================================

  public async startTimer(matchId: string, duration: number): Promise<void> {
    const timerState: TimerState = {
      isRunning: true,
      remaining: duration,
      duration,
      startedAt: new Date(),
    };

    await this.updateMatchState(matchId, { 
      timer: timerState,
      status: 'IN_PROGRESS' 
    });
    
    this.emit('timer:started', timerState);
    this.sendToServer('timer:start', { matchId, duration });
    this.trackActivity('timer_started', { matchId, duration });
  }

  public async pauseTimer(matchId: string): Promise<void> {
    const currentState = this.matchStates.get(matchId);
    if (!currentState?.timer) return;

    const timerState: TimerState = {
      ...currentState.timer,
      isRunning: false,
      pausedAt: new Date(),
    };

    await this.updateMatchState(matchId, { timer: timerState });
    
    this.emit('timer:paused', timerState);
    this.sendToServer('timer:pause', { matchId });
    this.trackActivity('timer_paused', { matchId });
  }

  public async resumeTimer(matchId: string): Promise<void> {
    const currentState = this.matchStates.get(matchId);
    if (!currentState?.timer) return;

    const timerState: TimerState = {
      ...currentState.timer,
      isRunning: true,
      startedAt: new Date(),
      pausedAt: undefined,
    };

    await this.updateMatchState(matchId, { timer: timerState });
    
    this.emit('timer:resumed', timerState);
    this.sendToServer('timer:resume', { matchId });
    this.trackActivity('timer_resumed', { matchId });
  }

  public async resetTimer(matchId: string): Promise<void> {
    const timerState: TimerState = {
      isRunning: false,
      remaining: 0,
      duration: 0,
    };

    await this.updateMatchState(matchId, { timer: timerState });
    
    this.emit('timer:reset', timerState);
    this.sendToServer('timer:reset', { matchId });
    this.trackActivity('timer_reset', { matchId });
  }

  // =============================================================================
  // USER ACTIVITY TRACKING
  // =============================================================================

  public getActiveUsers(matchId?: string, fieldId?: string): ActiveUser[] {
    const users = Array.from(this.activeUsers.values());
    
    if (matchId) {
      return users.filter(user => user.currentMatch === matchId);
    }
    
    if (fieldId) {
      return users.filter(user => user.currentField === fieldId);
    }
    
    return users;
  }

  public trackActivity(action: string, metadata?: Record<string, any>): void {
    if (!this.config.enableUserTracking) return;

    const activity: UserActivity = {
      userId: this.userSession.userId || 'anonymous',
      sessionId: this.userSession.sessionId,
      action,
      timestamp: new Date(),
      metadata,
    };

    this.emit('user:activity', activity);
    this.sendToServer('user:activity', activity);
  }

  public setUser(userId: string, username?: string, role?: string): void {
    this.userSession.userId = userId;
    
    const activeUser: ActiveUser = {
      userId,
      sessionId: this.userSession.sessionId,
      username,
      role,
      lastSeen: new Date(),
    };

    this.activeUsers.set(userId, activeUser);
    this.emit('user:joined', activeUser);
    this.sendToServer('user:join', activeUser);
  }

  // =============================================================================
  // DISPLAY CONTROL
  // =============================================================================

  public async updateDisplay(settings: AudienceDisplaySettings): Promise<void> {
    this.emit('display:mode_changed', settings);
    this.sendToServer('display:update', settings);
    this.trackActivity('display_updated', { mode: settings.displayMode });
  }

  public async sendAnnouncement(announcement: AnnouncementData): Promise<void> {
    const enhancedAnnouncement = {
      ...announcement,
      startTime: new Date(),
      endTime: announcement.duration ? 
        new Date(Date.now() + announcement.duration) : undefined,
    };

    this.emit('display:announcement', enhancedAnnouncement);
    this.sendToServer('announcement:send', enhancedAnnouncement);
    this.trackActivity('announcement_sent', { 
      duration: announcement.duration,
      priority: announcement.priority 
    });
  }

  // =============================================================================
  // CONFIGURATION MANAGEMENT
  // =============================================================================

  public updateConfig(newConfig: Partial<EnhancedWebSocketConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('Configuration updated:', newConfig);
    
    // If connected, apply relevant config changes
    if (this.socket?.connected) {
      // Restart heartbeat if interval changed
      if (newConfig.heartbeatInterval && newConfig.heartbeatInterval !== this.config.heartbeatInterval) {
        this.stopHeartbeat();
        this.startHeartbeat();
      }
      
      // Update debug mode if changed
      if (newConfig.debugMode !== undefined) {
        this.config.debugMode = newConfig.debugMode;
      }
    }
  }

  public enableDebugMode(): void {
    this.config.debugMode = true;
    this.log('Debug mode enabled');
  }

  public disableDebugMode(): void {
    this.config.debugMode = false;
    console.log('[EnhancedWebSocket] Debug mode disabled');
  }

  public getConfig(): EnhancedWebSocketConfig {
    return { ...this.config };
  }

  // =============================================================================
  // EVENT SUBSCRIPTION
  // =============================================================================

  public subscribe<K extends keyof WebSocketEventMap>(
    event: K,
    callback: (data: WebSocketEventMap[K]) => void
  ): () => void {
    this.on(event, callback);
    
    return () => {
      this.off(event, callback);
    };
  }

  public onError(callback: (error: WebSocketError) => void): () => void {
    return this.subscribe('connection:error', callback);
  }

  // =============================================================================
  // ERROR HANDLING & RETRY LOGIC
  // =============================================================================

  public async retryFailedAction(actionId: string): Promise<void> {
    const failedAction = this.failedActions.get(actionId);
    if (!failedAction) {
      throw new Error(`Failed action ${actionId} not found`);
    }

    if (failedAction.retries >= 3) {
      this.failedActions.delete(actionId);
      throw new Error(`Max retries exceeded for action ${actionId}`);
    }

    try {
      await failedAction.action();
      this.failedActions.delete(actionId);
      this.log(`Successfully retried action ${actionId}`);
    } catch (error) {
      failedAction.retries++;
      this.log(`Retry failed for action ${actionId}, attempt ${failedAction.retries}`);
      throw error;
    }
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.log('Connected to Enhanced WebSocket server');
      
      this.updateConnectionState({
        connected: true,
        reconnecting: false,
        reconnectAttempts: 0,
        lastConnected: new Date(),
        error: undefined,
      });

      this.startHeartbeat();
      this.emit('connection:status', this.connectionState);
      
      // Rejoin active sessions
      this.rejoinActiveSessions();
    });

    this.socket.on('disconnect', (reason) => {
      this.log(`Disconnected from WebSocket server: ${reason}`);
      
      this.updateConnectionState({
        connected: false,
        error: `Disconnected: ${reason}`,
      });

      this.stopHeartbeat();
      this.emit('connection:status', this.connectionState);

      // Auto-reconnect unless it was a manual disconnect
      if (reason !== 'io client disconnect' && this.config.reconnectAttempts! > 0) {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      this.log('Connection error:', error);
      
      const wsError: WebSocketError = {
        type: 'CONNECTION_FAILED',
        message: error.message,
        timestamp: new Date(),
        retryable: true,
        context: error,
      };

      this.updateConnectionState({
        connected: false,
        error: error.message,
      });

      this.emit('connection:error', wsError);
      this.scheduleReconnect();
    });

    // Handle incoming events
    this.setupServerEventHandlers();
  }

  private setupServerEventHandlers(): void {
    if (!this.socket) return;

    // Match session events
    this.socket.on('match:session_updated', (session: MatchSession) => {
      this.matchSessions.set(session.matchId, session);
      this.emit('match:session_updated', session);
    });

    this.socket.on('match:state_changed', (state: MatchStateSnapshot) => {
      this.handleMatchStateUpdate(state);
    });

    this.socket.on('match:reset', (data: { matchId: string; reason: string }) => {
      this.resetMatchState(data.matchId, data.reason);
      this.emit('match:reset', data);
    });

    // Score events
    this.socket.on('score:realtime_update', (data: { matchId: string; scores: ScoreState }) => {
      this.handleScoreUpdate(data.matchId, data.scores);
    });

    this.socket.on('score:conflict', (data: { matchId: string; conflictingVersions: MatchStateSnapshot[] }) => {
      this.handleScoreConflict(data.matchId, data.conflictingVersions);
    });

    // Timer events
    this.socket.on('timer:tick', (data: { matchId: string; remaining: number; period?: string }) => {
      this.handleTimerTick(data.matchId, data.remaining, data.period);
    });

    // User events
    this.socket.on('user:joined', (user: ActiveUser) => {
      this.activeUsers.set(user.userId, user);
      this.emit('user:joined', user);
    });

    this.socket.on('user:left', (user: ActiveUser) => {
      this.activeUsers.delete(user.userId);
      this.emit('user:left', user);
    });

    // Display events
    this.socket.on('display:mode_changed', (settings: AudienceDisplaySettings) => {
      this.emit('display:mode_changed', settings);
    });

    this.socket.on('announcement', (announcement: AnnouncementData) => {
      this.emit('display:announcement', announcement);
    });

    // Heartbeat response
    this.socket.on('pong', (timestamp: number) => {
      const latency = Date.now() - timestamp;
      this.updateLatencyMetrics(latency);
    });
  }

  private handleMatchStateUpdate(newState: MatchStateSnapshot): void {
    const currentState = this.matchStates.get(newState.matchId);
    
    if (this.config.enableConflictResolution && currentState && newState.version <= currentState.version) {
      this.log(`Potential conflict detected for match ${newState.matchId}`);
      this.emit('score:conflict', {
        matchId: newState.matchId,
        conflictingVersions: [currentState, newState],
      });
      return;
    }

    this.matchStates.set(newState.matchId, newState);
    this.emit('match:state_changed', newState);
  }

  private handleScoreUpdate(matchId: string, scores: ScoreState): void {
    const currentState = this.matchStates.get(matchId);
    if (currentState) {
      this.updateMatchState(matchId, { scores });
    }
    this.emit('score:realtime_update', scores);
  }

  private handleScoreConflict(matchId: string, conflictingVersions: MatchStateSnapshot[]): void {
    this.log(`Score conflict detected for match ${matchId}`);
    this.emit('score:conflict', { matchId, conflictingVersions });
  }

  private handleTimerTick(matchId: string, remaining: number, period?: string): void {
    const currentState = this.matchStates.get(matchId);
    if (currentState?.timer) {
      const updatedTimer = {
        ...currentState.timer,
        remaining,
        period: period as any,
      };
      
      this.updateMatchState(matchId, { 
        timer: updatedTimer,
        currentPeriod: period,
      });
    }
    
    this.emit('timer:tick', { remaining, period });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout || this.connectionState.reconnectAttempts >= this.config.reconnectAttempts!) {
      return;
    }

    const delay = Math.min(
      this.config.reconnectDelay! * Math.pow(2, this.connectionState.reconnectAttempts),
      30000
    );

    this.updateConnectionState({
      reconnecting: true,
      reconnectAttempts: this.connectionState.reconnectAttempts + 1,
    });

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.log(`Reconnection attempt ${this.connectionState.reconnectAttempts}`);
      this.connect();
    }, delay);
  }

  private stopReconnectTimer(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping', Date.now());
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startConnectionTimer(): void {
    this.metrics.lastPingTime = new Date();
  }

  private updateConnectionState(updates: Partial<WebSocketConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates };
    
    if (updates.connected && updates.reconnectAttempts === 0) {
      this.metrics.totalReconnects++;
    }
  }

  private updateLatencyMetrics(latency: number): void {
    this.connectionState.latency = latency;
    
    // Simple moving average for latency
    this.metrics.averageLatency = 
      (this.metrics.averageLatency * 0.9) + (latency * 0.1);
  }

  private async rejoinActiveSessions(): Promise<void> {
    for (const session of this.matchSessions.values()) {
      if (session.participants.includes(this.userSession.userId || '')) {
        this.sendToServer('match:rejoin_session', {
          matchId: session.matchId,
          userId: this.userSession.userId,
          sessionId: this.userSession.sessionId,
        });
      }
    }
  }

  private clearState(): void {
    this.activeUsers.clear();
    // Keep match sessions and states for potential reconnection
  }

  private sendToServer(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      this.log(`Cannot send ${event}: WebSocket not connected`);
    }
  }

  private async sendToServerWithResponse(event: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for response to ${event}`));
      }, 10000);

      this.socket.emit(event, data, (response: any) => {
        clearTimeout(timeout);
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  private getEmptyAllianceScore() {
    return {
      auto: 0,
      drive: 0,
      total: 0,
      penalty: 0,
      multiplier: 1,
      teamCount: 2,
      gameElements: [],
    };
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(message: string, ...args: any[]): void {
    if (this.config.debugMode) {
      console.log(`[EnhancedWebSocket] ${message}`, ...args);
    }
  }
}

export default EnhancedWebSocketService;