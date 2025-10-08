
/**
 * Compares new data with the previous state to detect genuine changes.
 * @param eventType The type of WebSocket event.
 * @param newData The new data being sent.
 * @param previousData The previously stored data for this event type and context.
 * @returns True if data has changed, otherwise false.
 */
function hasDataChanged(eventType: string, newData: WebSocketEventData, previousData?: WebSocketEventData): boolean {
    if (!previousData) {
        return true; // If there's no previous data, it's definitely new.
    }

    // Handle different event types with specific comparison logic
    switch (eventType) {
        case 'match_update':
            return hasMatchDataChanged(newData as any, previousData as any);
        case 'score_update':
        case 'scoreUpdateRealtime':
            return hasScoreDataChanged(newData as any, previousData as any);
        case 'timer_update':
            return hasTimerDataChanged(newData as any, previousData as any);
        case 'match_state_change':
            return hasMatchStateChanged(newData as any, previousData as any);
        default:
            // For other events, use a generic comparison
            return JSON.stringify(newData) !== JSON.stringify(previousData);
    }
}

/**
 * Compares match data for changes using deep comparison of relevant fields.
 */
function hasMatchDataChanged(newData: any, previousData: any): boolean {
    const { deepEquals, extractRelevantMatchFields } = require('@/lib/data-comparison');
    
    const newRelevantData = extractRelevantMatchFields(newData);
    const previousRelevantData = extractRelevantMatchFields(previousData);
    
    return !deepEquals(newRelevantData, previousRelevantData);
}

/**
 * Compares score data for changes using deep comparison of relevant fields.
 */
function hasScoreDataChanged(newData: any, previousData: any): boolean {
    const { deepEquals, extractRelevantScoreFields } = require('@/lib/data-comparison');
    
    const newRelevantData = extractRelevantScoreFields(newData);
    const previousRelevantData = extractRelevantScoreFields(previousData);
    
    return !deepEquals(newRelevantData, previousRelevantData);
}

/**
 * Compares timer data for changes using deep comparison of relevant fields.
 */
function hasTimerDataChanged(newData: any, previousData: any): boolean {
    const { deepEquals, extractRelevantTimerFields } = require('@/lib/data-comparison');
    
    const newRelevantData = extractRelevantTimerFields(newData);
    const previousRelevantData = extractRelevantTimerFields(previousData);
    
    return !deepEquals(newRelevantData, previousRelevantData);
}

/**
 * Compares match state data for changes using deep comparison of relevant fields.
 */
function hasMatchStateChanged(newData: any, previousData: any): boolean {
    const { deepEquals, extractRelevantMatchStateFields } = require('@/lib/data-comparison');
    
    const newRelevantData = extractRelevantMatchStateFields(newData);
    const previousRelevantData = extractRelevantMatchStateFields(previousData);
    
    return !deepEquals(newRelevantData, previousRelevantData);
}

import { ConnectionManager, ConnectionStatus } from './connection-manager';
import { EventManager, EventCallback, EventOptions } from './event-manager';
import { DebounceManager, DebounceConfig } from './debounce-manager';
import { RoleManager, FeaturePermission } from './role-manager';
import { StateSynchronizer, MatchState, StateUpdate } from './state-synchronizer';
import {
    WebSocketEventData,
    CollaborativeStateUpdateData,
    UserSessionEventData,
    UserDisconnectEventData,
    StateSyncRequestData,
    StateSyncResponseData,
    SessionHeartbeatData
} from '@/types/websocket';
import {
    TimerData,
    MatchData,
    ScoreData,
    MatchStateData,
    AudienceDisplaySettings,
    AnnouncementData
} from '@/types/types';
import { UserRole } from '@/types/user.types';

export interface EmitOptions extends EventOptions {
    debounce?: boolean;
    rateLimit?: number;
    debounceConfig?: DebounceConfig;
    skipChangeDetection?: boolean;
}

/**
 * Unified WebSocket Service Interface
 * Provides a single point of WebSocket communication with robust error handling
 */
export interface IUnifiedWebSocketService {
    // Connection Management
    connect(url?: string): Promise<void>;
    disconnect(): void;
    isConnected(): boolean;
    getConnectionStatus(): ConnectionStatus;

    // Event Management with Debouncing
    emit(event: string, data: WebSocketEventData, options?: EmitOptions): void;
    on<T>(event: string, callback: EventCallback<T>, options?: EventOptions): () => void;
    off(event: string): void;

    // Specialized Methods
    sendTimerUpdate(data: TimerData): void;
    sendScoreUpdate(data: ScoreData): void;
    sendMatchUpdate(data: MatchData): void;

    // Role-based Access
    setUserRole(role: UserRole): void;
    canAccess(feature: FeaturePermission): boolean;
    getUIAccessControl(): {
        canControlTimer: boolean;
        canControlMatch: boolean;
        canUpdateScores: boolean;
        canControlDisplay: boolean;
        canManageTournament: boolean;
        canManageUsers: boolean;
        canManageFields: boolean;
        showTimerControls: boolean;
        showMatchControls: boolean;
        showScoringPanel: boolean;
        showDisplayControls: boolean;
    };
    getCurrentRole(): UserRole;
    onRoleChange(callback: (newRole: UserRole, previousRole: UserRole) => void): () => void;

    // Multi-user Support
    joinCollaborativeSession(matchId: string): void;
    leaveCollaborativeSession(matchId: string): void;
    getCollaborativeSessionState(matchId: string): MatchState | null;
    syncCollaborativeState(update: StateUpdate): MatchState;
    getActiveCollaborators(matchId: string): string[];
    getUserLastSeen(matchId: string, userId: string): number | null;
    handleUserDisconnection(userId: string): void;

    // Legacy Support
    joinTournament(tournamentId: string): void;
    leaveTournament(tournamentId: string): void;
    joinFieldRoom(fieldId: string): void;
    leaveFieldRoom(fieldId: string): void;
    sendDisplayModeChange(settings: AudienceDisplaySettings): void;
    sendMatchStateChange(data: MatchStateData): void;
    startTimer(data: TimerData): void;
    pauseTimer(data: TimerData): void;
    resetTimer(data: TimerData): void;
    sendAnnouncement(data: AnnouncementData): void;

    // Error Handling
    onError(callback: (error: Error) => void): () => void;
    onConnectionStatus(callback: (status: ConnectionStatus) => void): () => void;
}

/**
 * Main WebSocket Service Implementation using composition pattern
 * Delegates connection management to ConnectionManager and event handling to EventManager
 */
export class UnifiedWebSocketService implements IUnifiedWebSocketService {
    private connectionManager: ConnectionManager;
    private eventManager: EventManager;
    private debounceManager: DebounceManager;
    private roleManager: RoleManager;
    private stateSynchronizer: StateSynchronizer;
    private currentTournamentId: string | null = null;
    private currentFieldId: string | null = null;
    private collaborativeSessions: Set<string> = new Set();
    private currentUserId: string | null = null;
    private sessionHeartbeats: Map<string, NodeJS.Timeout> = new Map();
    private userLastSeen: Map<string, Map<string, number>> = new Map(); // matchId -> userId -> timestamp
    private previousEventData: Map<string, WebSocketEventData> = new Map(); // Store previous data for change detection
    private readonly bypassChangeDetectionEvents: Set<string> = new Set([
        'join_tournament',
        'leave_tournament',
        'joinFieldRoom',
        'leaveFieldRoom',
        'join_collaborative_session',
        'leave_collaborative_session',
        'request_state_sync'
    ]);

    constructor() {
        this.connectionManager = new ConnectionManager();
        this.eventManager = new EventManager(this.connectionManager);
        this.debounceManager = new DebounceManager();
        this.roleManager = new RoleManager();
        this.stateSynchronizer = new StateSynchronizer();

        // Setup connection status monitoring for state resync
        this.connectionManager.onConnectionStatus((status) => {
            if (status.connected && status.state === 'CONNECTED') {
                this.resyncStateOnReconnection();
            }
        });

        // Start periodic cleanup of inactive users (every 2 minutes)
        setInterval(() => {
            this.cleanupInactiveUsers();
        }, 2 * 60 * 1000);
    }

    // === Connection Management (Delegation) ===

    async connect(url?: string): Promise<void> {
        return this.connectionManager.connect(url);
    }

    disconnect(): void {
        this.connectionManager.disconnect();
    }

    isConnected(): boolean {
        return this.connectionManager.isConnected();
    }

    getConnectionStatus(): ConnectionStatus {
        return this.connectionManager.getConnectionStatus();
    }

    onConnectionStatus(callback: (status: ConnectionStatus) => void): () => void {
        return this.connectionManager.onConnectionStatus(callback);
    }

    // === Event Management (Delegation) ===

    emit(event: string, data: WebSocketEventData, options?: EmitOptions): void {
        const skipChangeDetection = options?.skipChangeDetection || this.bypassChangeDetectionEvents.has(event);

        // Check if there's an actual change in data (unless skipChangeDetection is true)
        if (!skipChangeDetection && this.isDataUnchanged(event, data)) {
            console.log(`[UnifiedWebSocketService] No changes detected for event: ${event}`);
            return;
        }
        // Check if user can emit this event
        if (!this.roleManager.canEmitEvent(event)) {
            console.warn(`[UnifiedWebSocketService] User role ${this.roleManager.getCurrentRole()} cannot emit event: ${event}`);
            return;
        }

        // Add role and context information
        const enrichedData = {
            ...data,
            userRole: this.roleManager.getCurrentRole(),
            tournamentId: this.currentTournamentId || data.tournamentId,
            fieldId: this.currentFieldId || data.fieldId,
            timestamp: Date.now()
        };

        // Check if debouncing should be applied
        const shouldDebounce = options?.debounce !== false && this.debounceManager.shouldDebounce(event);

        if (shouldDebounce) {
            // Use debouncing for high-frequency events
            const debounceKey = this.generateDebounceKey(event, enrichedData);
            const config = options?.debounceConfig || this.debounceManager.getConfigForEvent(event);

            this.debounceManager.debounce(
                debounceKey,
                (debouncedData: WebSocketEventData) => {
                    this.eventManager.emit(event, debouncedData, options);
                },
                enrichedData,
                config
            );
        } else {
            // Emit immediately for non-debounced events
            this.eventManager.emit(event, enrichedData, options);
        }
    }

    on<T>(event: string, callback: EventCallback<T>, options?: EventOptions): () => void {
        return this.eventManager.on(event, callback, options);
    }

    off(event: string): void {
        this.eventManager.off(event);
    }

    onError(callback: (error: Error) => void): () => void {
        return this.eventManager.onError(callback);
    }

    // === Specialized Methods ===

    sendTimerUpdate(data: TimerData): void {
        if (!this.canAccess('timer_control')) {
            console.warn('[UnifiedWebSocketService] Access denied for timer control');
            return;
        }

        this.emit('timer_update', data as any as WebSocketEventData, {
            fieldId: data.fieldId,
            tournamentId: data.tournamentId,
            debounce: true,
            debounceConfig: {
                delay: 1000,
                maxCalls: 1,
                windowMs: 1000
            }
        });
    }

    sendScoreUpdate(data: ScoreData): void {
        if (!this.canAccess('score_update')) {
            console.warn('[UnifiedWebSocketService] Access denied for score updates');
            return;
        }

        this.emit('score_update', data as any as WebSocketEventData, {
            fieldId: data.fieldId,
            tournamentId: data.tournamentId,
            debounce: true,
            debounceConfig: {
                delay: 200,
                maxCalls: 10,
                windowMs: 1000
            }
        });
    }

    sendWinnerBadgeUpdate(data: { matchId: string; tournamentId: string; fieldId?: string; showWinnerBadge: boolean }): void {
        console.log('[UnifiedWebSocketService] sendWinnerBadgeUpdate called with:', data);
        console.log('[UnifiedWebSocketService] Current user role:', this.roleManager.getCurrentRole());
        console.log('[UnifiedWebSocketService] Can access display_control:', this.canAccess('display_control'));
        
        if (!this.canAccess('display_control')) {
            console.warn('[UnifiedWebSocketService] Access denied for winner badge control');
            return;
        }

        console.log('[UnifiedWebSocketService] Emitting winner_badge_update event');
        this.emit('winner_badge_update', data as any as WebSocketEventData, {
            fieldId: data.fieldId,
            tournamentId: data.tournamentId
        });
    }

    sendMatchUpdate(data: MatchData): void {
        console.log('🎠 [UnifiedWebSocketService] sendMatchUpdate called with data:', data);
        console.log('🎠 [UnifiedWebSocketService] Data redTeams:', data.redTeams);
        console.log('🎠 [UnifiedWebSocketService] Data blueTeams:', data.blueTeams);
        console.log('🎠 [UnifiedWebSocketService] Team counts - Red:', data.redTeams?.length || 0, 'Blue:', data.blueTeams?.length || 0);
        console.log('🎠 [UnifiedWebSocketService] Data fieldId:', data.fieldId);
        console.log('🎠 [UnifiedWebSocketService] Data tournamentId:', data.tournamentId);
        console.log('🎠 [UnifiedWebSocketService] Current user role:', this.roleManager.getCurrentRole());
        
        if (!this.canAccess('match_control')) {
            console.warn('🎠 [UnifiedWebSocketService] Access denied for match control');
            return;
        }

        console.log('🎠 [UnifiedWebSocketService] EMITTING match_update event at:', new Date().toISOString());
        
        this.emit('match_update', data as any as WebSocketEventData, {
            tournamentId: data.tournamentId
        });
        
        console.log('🎠 [UnifiedWebSocketService] sendMatchUpdate COMPLETED');
    }

    // === Role-based Access Control ===

    setUserRole(role: UserRole): void {
        this.roleManager.setRole(role);
        console.log(`[UnifiedWebSocketService] User role set to: ${role}`);
    }

    canAccess(feature: FeaturePermission): boolean {
        return this.roleManager.canAccess(feature);
    }

    /**
     * Get UI access control information for the current role
     */
    getUIAccessControl() {
        return this.roleManager.getUIAccessControl();
    }

    /**
     * Get the current user role
     */
    getCurrentRole(): UserRole {
        return this.roleManager.getCurrentRole();
    }

    /**
     * Register a callback to be notified when the user role changes
     */
    onRoleChange(callback: (newRole: UserRole, previousRole: UserRole) => void): () => void {
        return this.roleManager.onRoleChange(callback);
    }

    // === Multi-user Collaborative Support ===

    joinCollaborativeSession(matchId: string): void {
        this.collaborativeSessions.add(matchId);

        // Generate a user ID if we don't have one
        if (!this.currentUserId) {
            this.currentUserId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        }

        // Initialize state for the match if it doesn't exist
        let currentState = this.stateSynchronizer.getState(matchId);
        if (!currentState) {
            currentState = this.stateSynchronizer.initializeMatchState(matchId, {
                matchId,
                tournamentId: this.currentTournamentId || ''
            });
        }

        // Add user to the collaborative session
        this.stateSynchronizer.addActiveUser(matchId, this.currentUserId);

        // Emit join event to notify other users
        this.emit('join_collaborative_session', {
            matchId,
            userId: this.currentUserId,
            userRole: this.roleManager.getCurrentRole(),
            timestamp: Date.now()
        });

        // Emit user joined session event for tracking
        this.emit('user_joined_session', {
            matchId,
            userId: this.currentUserId,
            userRole: this.roleManager.getCurrentRole(),
            timestamp: Date.now()
        });

        // Request immediate state sync from existing users
        this.emit('request_state_sync', {
            matchId,
            userId: this.currentUserId,
            timestamp: Date.now()
        });

        // Set up state synchronization listeners
        this.setupCollaborativeListeners(matchId);

        // Start session heartbeat
        this.startSessionHeartbeat(matchId);

        console.log(`[UnifiedWebSocketService] Joined collaborative session for match: ${matchId} as user: ${this.currentUserId}`);
    }

    leaveCollaborativeSession(matchId: string): void {
        this.collaborativeSessions.delete(matchId);

        if (this.currentUserId) {
            // Remove user from the collaborative session
            this.stateSynchronizer.removeActiveUser(matchId, this.currentUserId);

            // Emit leave event to notify other users
            this.emit('leave_collaborative_session', {
                matchId,
                userId: this.currentUserId,
                userRole: this.roleManager.getCurrentRole(),
                timestamp: Date.now()
            });

            // Emit user left session event for tracking
            this.emit('user_left_session', {
                matchId,
                userId: this.currentUserId,
                userRole: this.roleManager.getCurrentRole(),
                timestamp: Date.now()
            });
        }

        // Stop session heartbeat
        this.stopSessionHeartbeat(matchId);

        // Clean up state synchronizer resources for this match
        this.stateSynchronizer.cleanupMatch(matchId);

        console.log(`[UnifiedWebSocketService] Left collaborative session for match: ${matchId}`);
    }

    getCollaborativeSessionState(matchId: string): MatchState | null {
        return this.stateSynchronizer.getState(matchId);
    }

    syncCollaborativeState(update: StateUpdate): MatchState {
        // Ensure we have a user ID
        if (!this.currentUserId) {
            this.currentUserId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        // Add user ID and role to the update
        const enrichedUpdate: StateUpdate = {
            ...update,
            userId: this.currentUserId,
            userRole: this.roleManager.getCurrentRole(),
            timestamp: update.timestamp || Date.now()
        };

        // Sync state through the state synchronizer
        const newState = this.stateSynchronizer.syncState(enrichedUpdate);

        // State is already updated in the stateSynchronizer.syncState method

        // Emit the state update to other clients
        this.emit('collaborative_state_update', {
            matchId: update.matchId,
            state: newState,
            update: enrichedUpdate
        });

        return newState;
    }

    getActiveCollaborators(matchId: string): string[] {
        return this.stateSynchronizer.getActiveUsers(matchId);
    }

    // === Legacy Support Methods ===

    joinTournament(tournamentId: string): void {
        this.currentTournamentId = tournamentId;
        this.emit('join_tournament', { tournamentId });
        console.log(`[UnifiedWebSocketService] Joined tournament: ${tournamentId}`);
    }

    leaveTournament(tournamentId: string): void {
        if (this.currentTournamentId === tournamentId) {
            this.currentTournamentId = null;
        }
        this.emit('leave_tournament', { tournamentId });
        console.log(`[UnifiedWebSocketService] Left tournament: ${tournamentId}`);
    }

    joinFieldRoom(fieldId: string): void {
        this.currentFieldId = fieldId;
        this.emit('joinFieldRoom', {
            fieldId,
            tournamentId: this.currentTournamentId || undefined
        });
        console.log(`[UnifiedWebSocketService] Joined field room: ${fieldId}`);
    }

    leaveFieldRoom(fieldId: string): void {
        if (this.currentFieldId === fieldId) {
            this.currentFieldId = null;
        }
        this.emit('leaveFieldRoom', {
            fieldId,
            tournamentId: this.currentTournamentId || undefined
        });
        console.log(`[UnifiedWebSocketService] Left field room: ${fieldId}`);
    }

    sendDisplayModeChange(settings: AudienceDisplaySettings): void {
        if (!this.canAccess('display_control')) {
            console.warn('[UnifiedWebSocketService] Access denied for display control');
            return;
        }

        this.emit('display_mode_change', settings as any as WebSocketEventData, {
            fieldId: settings.fieldId || undefined,
            tournamentId: settings.tournamentId
        });
    }

    sendMatchStateChange(data: MatchStateData): void {
        if (!this.canAccess('match_control')) {
            console.warn('[UnifiedWebSocketService] Access denied for match state control');
            return;
        }

        this.emit('match_state_change', data as any as WebSocketEventData, {
            tournamentId: data.tournamentId
        });
    }

    startTimer(data: TimerData): void {
        if (!this.canAccess('timer_control')) {
            console.warn('[UnifiedWebSocketService] Access denied for timer control');
            return;
        }

        this.emit('start_timer', {
            ...data,
            startedAt: Date.now(),
            isRunning: true
        } as WebSocketEventData, {
            fieldId: data.fieldId,
            tournamentId: data.tournamentId
        });
    }

    pauseTimer(data: TimerData): void {
        if (!this.canAccess('timer_control')) {
            console.warn('[UnifiedWebSocketService] Access denied for timer control');
            return;
        }

        this.emit('pause_timer', {
            ...data,
            pausedAt: Date.now(),
            isRunning: false
        } as WebSocketEventData, {
            fieldId: data.fieldId,
            tournamentId: data.tournamentId
        });
    }

    resetTimer(data: TimerData): void {
        if (!this.canAccess('timer_control')) {
            console.warn('[UnifiedWebSocketService] Access denied for timer control');
            return;
        }

        this.emit('reset_timer', {
            ...data,
            remaining: data.duration,
            isRunning: false
        } as WebSocketEventData, {
            fieldId: data.fieldId,
            tournamentId: data.tournamentId
        });
    }

    sendAnnouncement(data: AnnouncementData): void {
        if (!this.canAccess('display_control')) {
            console.warn('[UnifiedWebSocketService] Access denied for announcements');
            return;
        }

        this.emit('announcement', data as any as WebSocketEventData, {
            fieldId: data.fieldId,
            tournamentId: data.tournamentId
        });
    }

    // === State Management ===

    /**
     * Resync state after reconnection
     */
    private resyncStateOnReconnection(): void {
        console.log('[UnifiedWebSocketService] Resyncing state after reconnection');

        // Rejoin tournament if we were in one
        if (this.currentTournamentId) {
            this.joinTournament(this.currentTournamentId);
        }

        // Rejoin field room if we were in one
        if (this.currentFieldId) {
            this.joinFieldRoom(this.currentFieldId);
        }

        // Rejoin collaborative sessions and request state sync
        this.collaborativeSessions.forEach(matchId => {
            // Rejoin the session
            this.emit('join_collaborative_session', {
                matchId,
                userId: this.currentUserId,
                userRole: this.roleManager.getCurrentRole()
            });

            // Request immediate state sync from other clients
            this.emit('request_state_sync', {
                matchId,
                userId: this.currentUserId
            });

            // Re-setup listeners
            this.setupCollaborativeListeners(matchId);
        });
    }

/**
 * Check if the incoming data is unchanged compared to the current state.
 */
private isDataUnchanged(event: string, data: WebSocketEventData): boolean {
    const previousData = this.previousEventData.get(event);
    if (hasDataChanged(event, data, previousData)) {
        // Store the newly detected change
        this.previousEventData.set(event, data);
        return false; // Data has changed
    }
    return true; // No change detected
}

// === Debounce Configuration Methods ===

    /**
     * Set custom debounce configuration for an event type
     */
    setDebounceConfig(eventType: string, config: DebounceConfig): void {
        this.debounceManager.setConfig(eventType, config);
        console.log(`[UnifiedWebSocketService] Updated debounce config for ${eventType}:`, config);
    }

    /**
     * Get current debounce configuration for an event type
     */
    getDebounceConfig(eventType: string): DebounceConfig {
        return this.debounceManager.getConfigForEvent(eventType);
    }

    /**
     * Cancel pending debounced calls for a specific key
     */
    cancelDebounce(key: string): void {
        this.debounceManager.cancel(key);
    }

    /**
     * Cancel all pending debounced calls
     */
    cancelAllDebounce(): void {
        this.debounceManager.cancelAll();
    }

    // === Utility Methods ===

    /**
     * Generate a unique debounce key for an event and data combination
     */
    private generateDebounceKey(event: string, data: WebSocketEventData): string {
        const contextParts = [
            event,
            data.tournamentId || 'no-tournament',
            data.fieldId || 'no-field',
            data.matchId || data.id || 'no-match'
        ];
        return contextParts.join(':');
    }

    /**
     * Get current context information
     */
    getCurrentContext(): {
        tournamentId: string | null;
        fieldId: string | null;
        userRole: UserRole;
        userId: string | null;
        collaborativeSessions: string[];
        activeCollaborators: { [matchId: string]: string[] };
    } {
        const activeCollaborators: { [matchId: string]: string[] } = {};
        this.collaborativeSessions.forEach(matchId => {
            activeCollaborators[matchId] = this.getActiveCollaborators(matchId);
        });

        return {
            tournamentId: this.currentTournamentId,
            fieldId: this.currentFieldId,
            userRole: this.roleManager.getCurrentRole(),
            userId: this.currentUserId,
            collaborativeSessions: Array.from(this.collaborativeSessions),
            activeCollaborators
        };
    }

    /**
     * Get service statistics
     */
    getStats(): {
        connectionStatus: ConnectionStatus;
        eventStats: { [event: string]: number };
        debounceStats: ReturnType<DebounceManager['getStats']>;
        stateSyncStats: ReturnType<StateSynchronizer['getStats']>;
        context: ReturnType<UnifiedWebSocketService['getCurrentContext']>
    } {
        return {
            connectionStatus: this.getConnectionStatus(),
            eventStats: this.eventManager.getStats(),
            debounceStats: this.debounceManager.getStats(),
            stateSyncStats: this.stateSynchronizer.getStats(),
            context: this.getCurrentContext()
        };
    }

    /**
     * Set up collaborative listeners for a match
     */
    private setupCollaborativeListeners(matchId: string): void {
        // Listen for collaborative state updates from other clients
        this.on('collaborative_state_update', (data: CollaborativeStateUpdateData) => {
            if (data.matchId === matchId && data.update.userId !== this.currentUserId) {
                // Apply remote state update
                this.stateSynchronizer.syncState(data.update);
            }
        });

        // Listen for user join/leave events
        this.on('user_joined_session', (data: UserSessionEventData) => {
            if (data.matchId === matchId) {
                this.stateSynchronizer.addActiveUser(matchId, data.userId);
                console.log(`[UnifiedWebSocketService] User ${data.userId} joined collaborative session for match ${matchId}`);
            }
        });

        this.on('user_left_session', (data: UserSessionEventData) => {
            if (data.matchId === matchId) {
                this.stateSynchronizer.removeActiveUser(matchId, data.userId);
                console.log(`[UnifiedWebSocketService] User ${data.userId} left collaborative session for match ${matchId}`);
            }
        });

        // Listen for user disconnect events (for cleanup)
        this.on('user_disconnected', (data: UserDisconnectEventData) => {
            if (data.userId !== this.currentUserId) {
                // Remove disconnected user from all active sessions
                this.collaborativeSessions.forEach(sessionMatchId => {
                    this.stateSynchronizer.removeActiveUser(sessionMatchId, data.userId);
                });
                console.log(`[UnifiedWebSocketService] Cleaned up disconnected user ${data.userId} from all sessions`);
            }
        });

        // Listen for immediate state sync requests (for new joiners)
        this.on('request_state_sync', (data: StateSyncRequestData) => {
            if (data.matchId === matchId && data.userId !== this.currentUserId) {
                const currentState = this.stateSynchronizer.getState(matchId);
                if (currentState) {
                    // Send immediate state sync response
                    this.emit('state_sync_response', {
                        matchId,
                        state: currentState,
                        requesterId: data.userId,
                        providerId: this.currentUserId,
                        timestamp: Date.now()
                    });
                    console.log(`[UnifiedWebSocketService] Provided state sync for match ${matchId} to user ${data.userId}`);
                }
            }
        });

        // Listen for state sync responses
        this.on('state_sync_response', (data: StateSyncResponseData) => {
            if (data.matchId === matchId && data.requesterId === this.currentUserId) {
                // Initialize our state with the received state
                this.stateSynchronizer.initializeMatchState(matchId, data.state);
                console.log(`[UnifiedWebSocketService] Received state sync for match ${matchId} from user ${data.providerId}`);
            }
        });

        // Listen for session heartbeat to track active users
        this.on('session_heartbeat', (data: SessionHeartbeatData) => {
            if (data.matchId === matchId && data.userId !== this.currentUserId) {
                // Update last seen timestamp for the user
                this.updateUserLastSeen(matchId, data.userId, data.timestamp);
            }
        });
    }

    /**
     * Start session heartbeat for a match
     */
    private startSessionHeartbeat(matchId: string): void {
        // Clear existing heartbeat if any
        this.stopSessionHeartbeat(matchId);

        // Send heartbeat every 30 seconds
        const heartbeatInterval = setInterval(() => {
            if (this.currentUserId && this.collaborativeSessions.has(matchId)) {
                this.emit('session_heartbeat', {
                    matchId,
                    userId: this.currentUserId,
                    timestamp: Date.now()
                });
            }
        }, 30000);

        this.sessionHeartbeats.set(matchId, heartbeatInterval);
    }

    /**
     * Stop session heartbeat for a match
     */
    private stopSessionHeartbeat(matchId: string): void {
        const heartbeat = this.sessionHeartbeats.get(matchId);
        if (heartbeat) {
            clearInterval(heartbeat);
            this.sessionHeartbeats.delete(matchId);
        }
    }

    /**
     * Update last seen timestamp for a user in a match
     */
    private updateUserLastSeen(matchId: string, userId: string, timestamp: number): void {
        if (!this.userLastSeen.has(matchId)) {
            this.userLastSeen.set(matchId, new Map());
        }
        this.userLastSeen.get(matchId)!.set(userId, timestamp);
    }

    /**
     * Get last seen timestamp for a user in a match
     */
    getUserLastSeen(matchId: string, userId: string): number | null {
        const matchUsers = this.userLastSeen.get(matchId);
        return matchUsers?.get(userId) || null;
    }

    /**
     * Clean up inactive users (not seen for more than 5 minutes)
     */
    private cleanupInactiveUsers(): void {
        const now = Date.now();
        const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

        this.userLastSeen.forEach((users, matchId) => {
            const inactiveUsers: string[] = [];

            users.forEach((lastSeen, userId) => {
                if (now - lastSeen > inactiveThreshold) {
                    inactiveUsers.push(userId);
                }
            });

            // Remove inactive users
            inactiveUsers.forEach(userId => {
                this.stateSynchronizer.removeActiveUser(matchId, userId);
                users.delete(userId);
                console.log(`[UnifiedWebSocketService] Cleaned up inactive user ${userId} from match ${matchId}`);
            });
        });
    }

    /**
     * Handle user disconnection cleanup
     */
    handleUserDisconnection(userId: string): void {
        // Remove user from all collaborative sessions
        this.collaborativeSessions.forEach(matchId => {
            this.stateSynchronizer.removeActiveUser(matchId, userId);
        });

        // Remove from last seen tracking
        this.userLastSeen.forEach(users => {
            users.delete(userId);
        });

        // Emit user disconnected event
        this.emit('user_disconnected', {
            userId,
            timestamp: Date.now(),
            reason: 'connection_lost'
        });

        console.log(`[UnifiedWebSocketService] Handled disconnection for user ${userId}`);
    }

    /**
     * Clean up all resources
     */
    cleanup(): void {
        console.log('[UnifiedWebSocketService] Cleaning up resources');

        // Leave all collaborative sessions
        this.collaborativeSessions.forEach(matchId => {
            this.leaveCollaborativeSession(matchId);
        });

        // Clear all heartbeat timers
        this.sessionHeartbeats.forEach(timer => clearInterval(timer));
        this.sessionHeartbeats.clear();

        // Clear user tracking
        this.userLastSeen.clear();

        // Clear previous event data for change detection
        this.previousEventData.clear();

        // Clean up state synchronizer
        this.stateSynchronizer.cleanup();

        // Clean up debounce manager
        this.debounceManager.cleanup();

        // Clear event handlers
        this.eventManager.clearAll();

        // Disconnect
        this.disconnect();
    }
}

// Export singleton instance
export const unifiedWebSocketService = new UnifiedWebSocketService();
export default unifiedWebSocketService;
