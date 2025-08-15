
/**
 * Unified WebSocket Service for RMS System
 * Provides standardized event handling with type safety and performance optimization
 */

import {
    getStandardizedEventName
} from '@/types/websocket-events';

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

    // Standardize event name for comparison
    const standardizedEventType = getStandardizedEventName(eventType);

    // Handle different event types with specific comparison logic
    switch (standardizedEventType) {
        case 'match_update':
            return hasMatchDataChanged(newData as any, previousData as any);
        case 'score_update':
            return hasScoreDataChanged(newData as any, previousData as any);
        case 'timer_update':
        case 'timer_start':
        case 'timer_pause':
        case 'timer_reset':
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

// Phase 2 optimizations - now integrated
import { RoomManager } from '@/hooks/websocket/RoomManager';
import { FieldFilter } from '@/utils/fieldFilter';
import {
    WebSocketEventData,
    CollaborativeStateUpdateData,
    UserSessionEventData,
    UserDisconnectEventData,
    SessionHeartbeatData
} from '@/types/websocket';
import {
    TimerData,
    MatchData,
    ScoreData,
    MatchStateData,
    AudienceDisplaySettings,
    AnnouncementData,
    UserRole
} from '@/types/types';

export interface EmitOptions extends EventOptions {
    debounce?: boolean;
    rateLimit?: number;
    debounceConfig?: DebounceConfig;
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

    // Multi-user Support (Simplified - StateSynchronizer removed)
    joinCollaborativeSession(matchId: string): void;
    leaveCollaborativeSession(matchId: string): void;
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

    private roomManager: RoomManager; // Phase 2: Room management with race condition prevention
    private fieldFilter: FieldFilter; // Phase 2: Intelligent event filtering
    private currentTournamentId: string | null = null;
    private currentFieldId: string | null = null;
    private collaborativeSessions: Set<string> = new Set();
    private currentUserId: string | null = null;
    private sessionHeartbeats: Map<string, NodeJS.Timeout> = new Map();
    private userLastSeen: Map<string, Map<string, number>> = new Map(); // matchId -> userId -> timestamp
    private previousEventData: Map<string, WebSocketEventData> = new Map(); // Store previous data for change detection
    private connectionRefCount: number = 0; // Track how many components are using this connection
    private activeRooms: Set<string> = new Set(); // Track active rooms to prevent duplicates

    constructor() {
        this.connectionManager = new ConnectionManager();
        this.eventManager = new EventManager(this.connectionManager);
        this.debounceManager = new DebounceManager();
        this.roleManager = new RoleManager();

        this.roomManager = new RoomManager(); // Phase 2: Initialize room manager
        this.fieldFilter = FieldFilter.getInstance(); // Phase 2: Initialize field filter

        // Setup connection status monitoring for state resync
        this.connectionManager.onConnectionStatus((status) => {
            if (status.connected && status.state === 'CONNECTED') {
                this.resyncStateOnReconnection();
                // Phase 2: Setup room manager with socket
                const socket = this.connectionManager.getSocket();
                if (socket) {
                    this.roomManager.setSocket(socket);
                    this.roomManager.setConnectionStatus(true);
                }
            } else {
                // Phase 2: Update room manager connection status
                this.roomManager.setConnectionStatus(false);
            }
        });

        // Start periodic cleanup of inactive users (every 2 minutes)
        setInterval(() => {
            this.cleanupInactiveUsers();
        }, 2 * 60 * 1000);
    }

    // === Connection Management (Delegation) ===

    async connect(url?: string): Promise<void> {
        this.connectionRefCount++;
        console.log(`[UnifiedWebSocketService] Connection requested (ref count: ${this.connectionRefCount})`);
        
        // Only connect if this is the first request or if not already connected
        if (this.connectionRefCount === 1 || !this.connectionManager.isConnected()) {
            console.log('[UnifiedWebSocketService] Establishing new connection');
            return this.connectionManager.connect(url);
        } else {
            console.log('[UnifiedWebSocketService] Using existing connection');
            return Promise.resolve();
        }
    }

    disconnect(): void {
        this.connectionRefCount = Math.max(0, this.connectionRefCount - 1);
        console.log(`[UnifiedWebSocketService] Disconnect requested (ref count: ${this.connectionRefCount})`);
        
        // Only disconnect if no components are using the connection
        if (this.connectionRefCount === 0) {
            console.log('[UnifiedWebSocketService] Closing connection (no more references)');
            this.connectionManager.disconnect();
            this.activeRooms.clear();
        } else {
            console.log('[UnifiedWebSocketService] Keeping connection alive (other components still using it)');
        }
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
    // Check if there's an actual change in data
    if (this.isDataUnchanged(event, data)) {
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
        // Phase 2: Apply field filtering to incoming events
        const filteredCallback: EventCallback<T> = (data: T) => {
            // Create filter context
            const context = {
                currentFieldId: this.currentFieldId || undefined,
                currentTournamentId: this.currentTournamentId || undefined,
                userRole: this.roleManager.getCurrentRole()
            };

            // Apply field filtering if data has field/tournament context
            if (data && typeof data === 'object' && ('fieldId' in data || 'tournamentId' in data)) {
                const shouldProcess = FieldFilter.shouldProcessEvent(data as any, context);
                if (!shouldProcess) {
                    console.log(`[UnifiedWebSocketService] Event '${event}' filtered out by field filter`);
                    return;
                }
            }

            // Call original callback if event passes filter
            callback(data);
        };

        return this.eventManager.on(event, filteredCallback, options);
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

    sendMatchUpdate(data: MatchData): void {
        if (!this.canAccess('match_control')) {
            console.warn('[UnifiedWebSocketService] Access denied for match control');
            return;
        }

        this.emit('match_update', data as any as WebSocketEventData, {
            tournamentId: data.tournamentId
        });
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

        // Track user in collaborative session (simplified without StateSynchronizer)
        if (!this.userLastSeen.has(matchId)) {
            this.userLastSeen.set(matchId, new Map());
        }
        this.userLastSeen.get(matchId)!.set(this.currentUserId, Date.now());

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

        // Set up collaborative listeners
        this.setupCollaborativeListeners(matchId);

        // Start session heartbeat
        this.startSessionHeartbeat(matchId);

        console.log(`[UnifiedWebSocketService] Joined collaborative session for match: ${matchId} as user: ${this.currentUserId}`);
    }

    leaveCollaborativeSession(matchId: string): void {
        this.collaborativeSessions.delete(matchId);

        if (this.currentUserId) {
            // Remove user from tracking (simplified without StateSynchronizer)
            const users = this.userLastSeen.get(matchId);
            if (users) {
                users.delete(this.currentUserId);
            }

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

        // Clean up user tracking for this match
        this.userLastSeen.delete(matchId);

        console.log(`[UnifiedWebSocketService] Left collaborative session for match: ${matchId}`);
    }

    // Note: getCollaborativeSessionState and syncCollaborativeState removed
    // These methods depended on StateSynchronizer which has been removed
    // State synchronization is now handled by the centralized WebSocket architecture

    getActiveCollaborators(matchId: string): string[] {
        const users = this.userLastSeen.get(matchId);
        return users ? Array.from(users.keys()) : [];
    }

    // === Legacy Support Methods ===

    joinTournament(tournamentId: string): void {
        const roomKey = `tournament:${tournamentId}`;
        
        // Prevent duplicate room joins
        if (this.activeRooms.has(roomKey)) {
            console.log(`[UnifiedWebSocketService] Already joined tournament: ${tournamentId}`);
            return;
        }
        
        this.currentTournamentId = tournamentId;
        this.activeRooms.add(roomKey);
        
        // Phase 2: Use RoomManager for race condition prevention
        this.roomManager.joinRoom(roomKey, 'tournament').catch(error => {
            console.error(`[UnifiedWebSocketService] Failed to join tournament ${tournamentId}:`, error);
            this.activeRooms.delete(roomKey);
        });
        console.log(`[UnifiedWebSocketService] Joining tournament: ${tournamentId}`);
    }

    leaveTournament(tournamentId: string): void {
        const roomKey = `tournament:${tournamentId}`;
        
        if (!this.activeRooms.has(roomKey)) {
            console.log(`[UnifiedWebSocketService] Not joined to tournament: ${tournamentId}`);
            return;
        }
        
        if (this.currentTournamentId === tournamentId) {
            this.currentTournamentId = null;
        }
        
        this.activeRooms.delete(roomKey);
        
        // Phase 2: Use RoomManager for proper cleanup
        this.roomManager.leaveRoom(roomKey).catch(error => {
            console.error(`[UnifiedWebSocketService] Failed to leave tournament ${tournamentId}:`, error);
        });
        console.log(`[UnifiedWebSocketService] Leaving tournament: ${tournamentId}`);
    }

    joinFieldRoom(fieldId: string): void {
        const roomKey = `field:${fieldId}`;
        
        // Prevent duplicate room joins
        if (this.activeRooms.has(roomKey)) {
            console.log(`[UnifiedWebSocketService] Already joined field room: ${fieldId}`);
            return;
        }
        
        this.currentFieldId = fieldId;
        this.activeRooms.add(roomKey);
        
        // Phase 2: Use RoomManager for race condition prevention
        this.roomManager.joinRoom(roomKey, 'field').catch(error => {
            console.error(`[UnifiedWebSocketService] Failed to join field ${fieldId}:`, error);
            this.activeRooms.delete(roomKey);
        });
        console.log(`[UnifiedWebSocketService] Joining field room: ${fieldId}`);
    }

    leaveFieldRoom(fieldId: string): void {
        const roomKey = `field:${fieldId}`;
        
        if (!this.activeRooms.has(roomKey)) {
            console.log(`[UnifiedWebSocketService] Not joined to field room: ${fieldId}`);
            return;
        }
        
        if (this.currentFieldId === fieldId) {
            this.currentFieldId = null;
        }
        
        this.activeRooms.delete(roomKey);
        
        // Phase 2: Use RoomManager for proper cleanup
        this.roomManager.leaveRoom(roomKey).catch(error => {
            console.error(`[UnifiedWebSocketService] Failed to leave field ${fieldId}:`, error);
        });
        console.log(`[UnifiedWebSocketService] Leaving field room: ${fieldId}`);
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

        this.emit('timer_start', {
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

        this.emit('timer_pause', {
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

        this.emit('timer_reset', {
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
            data.matchId || 'no-match'
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
     * Set up collaborative listeners for a match
     */
    private setupCollaborativeListeners(matchId: string): void {
        // Listen for collaborative state updates from other clients
        this.on('collaborative_state_update', (data: CollaborativeStateUpdateData) => {
            if (data.matchId === matchId && data.update.userId !== this.currentUserId) {
                // Note: State synchronization now handled by centralized architecture
                console.log(`[UnifiedWebSocketService] Received collaborative state update for match ${matchId}`);
            }
        });

        // Listen for user join/leave events
        this.on('user_joined_session', (data: UserSessionEventData) => {
            if (data.matchId === matchId) {
                // Track user in simplified way
                if (!this.userLastSeen.has(matchId)) {
                    this.userLastSeen.set(matchId, new Map());
                }
                this.userLastSeen.get(matchId)!.set(data.userId, Date.now());
                console.log(`[UnifiedWebSocketService] User ${data.userId} joined collaborative session for match ${matchId}`);
            }
        });

        this.on('user_left_session', (data: UserSessionEventData) => {
            if (data.matchId === matchId) {
                // Remove user from tracking
                const users = this.userLastSeen.get(matchId);
                if (users) {
                    users.delete(data.userId);
                }
                console.log(`[UnifiedWebSocketService] User ${data.userId} left collaborative session for match ${matchId}`);
            }
        });

        // Listen for user disconnect events (for cleanup)
        this.on('user_disconnected', (data: UserDisconnectEventData) => {
            if (data.userId !== this.currentUserId) {
                // Remove disconnected user from all active sessions
                this.collaborativeSessions.forEach(sessionMatchId => {
                    const users = this.userLastSeen.get(sessionMatchId);
                    if (users) {
                        users.delete(data.userId);
                    }
                });
                console.log(`[UnifiedWebSocketService] Cleaned up disconnected user ${data.userId} from all sessions`);
            }
        });

        // Note: State sync requests/responses removed
        // These features depended on StateSynchronizer which has been removed
        // State synchronization is now handled by the centralized WebSocket architecture

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
            const users = this.userLastSeen.get(matchId);
            if (users) {
                users.delete(userId);
            }
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

        // Note: StateSynchronizer cleanup removed (component was removed)

        // Clean up debounce manager
        this.debounceManager.cleanup();

        // Clear event handlers
        this.eventManager.clearAll();

        // Disconnect
        this.disconnect();
    }

    // === Phase 2: Enhanced Statistics and Health Monitoring ===

    /**
     * Get comprehensive service statistics
     */
    getStats(): Record<string, any> {
        return {
            connection: this.connectionManager.getConnectionStatus(),
            rooms: this.roomManager.getStats(),
            fieldFilter: FieldFilter.getStats(),
            debouncing: this.debounceManager.getStats(),
            collaborativeSessions: Array.from(this.collaborativeSessions),
            activeUsers: this.userLastSeen.size,
            currentContext: {
                tournamentId: this.currentTournamentId,
                fieldId: this.currentFieldId,
                userId: this.currentUserId,
                role: this.roleManager.getCurrentRole()
            }
        };
    }

    /**
     * Get room management status
     */
    getRoomStatus(): Record<string, any> {
        return this.roomManager.getStats();
    }

    /**
     * Get field filtering statistics
     */
    getFilterStats(): Record<string, number> {
        return FieldFilter.getStats();
    }

    /**
     * Reset field filtering statistics
     */
    resetFilterStats(): void {
        FieldFilter.resetStats();
    }

    /**
     * Enable debug mode for field filtering
     */
    enableFilterDebug(): void {
        this.fieldFilter.enableDebug();
    }

    /**
     * Disable debug mode for field filtering
     */
    disableFilterDebug(): void {
        this.fieldFilter.disableDebug();
    }
}

// Export singleton instance
export const unifiedWebSocketService = new UnifiedWebSocketService();
export default unifiedWebSocketService;