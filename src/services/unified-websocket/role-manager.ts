import { UserRole } from '@/types/types';
import { WebSocketEventData } from '@/types/websocket';

/**
 * Feature permissions for different user roles
 */
export type FeaturePermission = 
  | 'timer_control'
  | 'match_control' 
  | 'score_update'
  | 'display_control'
  | 'tournament_management'
  | 'user_management'
  | 'field_management';

/**
 * WebSocket event with role information
 */
export interface RoleAwareWebSocketEvent extends WebSocketEventData {
  type: string;
  data: any;
  timestamp: number;
  userId?: string;
  role?: UserRole;
  fieldId?: string;
  tournamentId?: string;
}

/**
 * Role change callback type
 */
export type RoleChangeCallback = (newRole: UserRole, previousRole: UserRole) => void;

/**
 * RoleManager handles user permission validation, role-based event filtering,
 * and UI access control for the WebSocket system.
 */
export class RoleManager {
  private currentRole: UserRole = UserRole.COMMON;
  private permissions: Map<UserRole, Set<FeaturePermission>>;
  private roleChangeCallbacks: Set<RoleChangeCallback> = new Set();

  constructor() {
    this.permissions = this.initializePermissions();
  }

  /**
   * Initialize role permissions mapping
   */
  private initializePermissions(): Map<UserRole, Set<FeaturePermission>> {
    const permissions = new Map<UserRole, Set<FeaturePermission>>();

    // ADMIN - Full access to all features
    permissions.set(UserRole.ADMIN, new Set([
      'timer_control',
      'match_control',
      'score_update',
      'display_control',
      'tournament_management',
      'user_management',
      'field_management'
    ]));

    // HEAD_REFEREE - Full match control access
    permissions.set(UserRole.HEAD_REFEREE, new Set([
      'timer_control',
      'match_control',
      'score_update',
      'display_control'
    ]));

    // ALLIANCE_REFEREE - Scoring access and limited match control (can select matches for scoring)
    permissions.set(UserRole.ALLIANCE_REFEREE, new Set([
      'score_update',
      'match_control' // Allow match selection for scoring purposes
    ]));

    // TEAM_LEADER - No control access
    permissions.set(UserRole.TEAM_LEADER, new Set([]));

    // TEAM_MEMBER - No control access
    permissions.set(UserRole.TEAM_MEMBER, new Set([]));

    // COMMON - No control access
    permissions.set(UserRole.COMMON, new Set([]));

    return permissions;
  }

  /**
   * Set the current user role and notify listeners
   */
  setRole(role: UserRole): void {
    const previousRole = this.currentRole;
    this.currentRole = role;
    
    console.log(`[RoleManager] Role changed from ${previousRole} to ${role}`);
    
    // Notify role change callbacks
    this.roleChangeCallbacks.forEach(callback => {
      try {
        callback(role, previousRole);
      } catch (error) {
        console.error('[RoleManager] Error in role change callback:', error);
      }
    });
  }

  /**
   * Get the current user role
   */
  getCurrentRole(): UserRole {
    return this.currentRole;
  }

  /**
   * Check if the current user can access a specific feature
   */
  canAccess(feature: FeaturePermission): boolean {
    const rolePermissions = this.permissions.get(this.currentRole);
    return rolePermissions?.has(feature) ?? false;
  }

  /**
   * Check if a specific role can access a feature
   */
  canRoleAccess(role: UserRole, feature: FeaturePermission): boolean {
    const rolePermissions = this.permissions.get(role);
    return rolePermissions?.has(feature) ?? false;
  }

  /**
   * Get all permissions for the current role
   */
  getCurrentPermissions(): Set<FeaturePermission> {
    return this.permissions.get(this.currentRole) ?? new Set();
  }

  /**
   * Get all permissions for a specific role
   */
  getRolePermissions(role: UserRole): Set<FeaturePermission> {
    return this.permissions.get(role) ?? new Set();
  }

  /**
   * Filter WebSocket events based on the current user's role
   */
  filterEventsByRole(events: RoleAwareWebSocketEvent[]): RoleAwareWebSocketEvent[] {
    return events.filter(event => this.canReceiveEvent(event));
  }

  /**
   * Check if the current user can receive a specific WebSocket event
   */
  canReceiveEvent(event: RoleAwareWebSocketEvent): boolean {
    // Allow all users to receive display updates and general information
    const publicEvents = [
      'display_mode_change',
      'match_update',
      'score_update',
      'scoreUpdateRealtime',
      'timer_update',
      'match_state_change',
      'announcement',
      'ranking_update',
      'ranking_recalculation'
    ];

    if (publicEvents.includes(event.type)) {
      return true;
    }

    // Control events require specific permissions
    const controlEventPermissions: Record<string, FeaturePermission> = {
      'timer_start': 'timer_control',
      'timer_pause': 'timer_control',
      'timer_reset': 'timer_control',
      'match_select': 'match_control',
      'match_status_change': 'match_control',
      'score_submit': 'score_update',
      'display_control_change': 'display_control'
    };

    const requiredPermission = controlEventPermissions[event.type];
    if (requiredPermission) {
      return this.canAccess(requiredPermission);
    }

    // Default to allowing the event if no specific permission is required
    return true;
  }

  /**
   * Check if the current user can emit a specific WebSocket event
   */
  canEmitEvent(eventType: string): boolean {
    const controlEventPermissions: Record<string, FeaturePermission> = {
      'timer_start': 'timer_control',
      'timer_pause': 'timer_control',
      'timer_reset': 'timer_control',
      'timer_update': 'timer_control',
      'match_select': 'match_control',
      'match_status_change': 'match_control',
      'score_update': 'score_update',
      'scoreUpdateRealtime': 'score_update',
      'display_control_change': 'display_control'
    };

    const requiredPermission = controlEventPermissions[eventType];
    if (requiredPermission) {
      return this.canAccess(requiredPermission);
    }

    // Allow general events that don't require specific permissions
    return true;
  }

  /**
   * Get UI access control information for the current role
   */
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
  } {
    return {
      canControlTimer: this.canAccess('timer_control'),
      canControlMatch: this.canAccess('match_control'),
      canUpdateScores: this.canAccess('score_update'),
      canControlDisplay: this.canAccess('display_control'),
      canManageTournament: this.canAccess('tournament_management'),
      canManageUsers: this.canAccess('user_management'),
      canManageFields: this.canAccess('field_management'),
      showTimerControls: this.canAccess('timer_control'),
      showMatchControls: this.canAccess('match_control'),
      showScoringPanel: this.canAccess('score_update'),
      showDisplayControls: this.canAccess('display_control')
    };
  }

  /**
   * Register a callback to be notified when the user role changes
   */
  onRoleChange(callback: RoleChangeCallback): () => void {
    this.roleChangeCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.roleChangeCallbacks.delete(callback);
    };
  }

  /**
   * Get a human-readable description of the current role's permissions
   */
  getRoleDescription(): string {
    switch (this.currentRole) {
      case UserRole.ADMIN:
        return 'Full system access including user management and tournament administration';
      case UserRole.HEAD_REFEREE:
        return 'Full match control access including timer, scoring, and match management';
      case UserRole.ALLIANCE_REFEREE:
        return 'Scoring access only - can update alliance scores during matches';
      case UserRole.TEAM_LEADER:
        return 'Team management access - can view match information';
      case UserRole.TEAM_MEMBER:
        return 'Basic access - can view match information and scores';
      case UserRole.COMMON:
        return 'Guest access - can view public match information';
      default:
        return 'Unknown role';
    }
  }

  /**
   * Validate if a role transition is allowed
   */
  canChangeRoleTo(newRole: UserRole): boolean {
    // Only admins can change roles to admin
    if (newRole === UserRole.ADMIN && this.currentRole !== UserRole.ADMIN) {
      return false;
    }

    // Admins and head referees can change to any non-admin role
    if (this.currentRole === UserRole.ADMIN || this.currentRole === UserRole.HEAD_REFEREE) {
      return true;
    }

    // Other roles can only downgrade or stay the same
    const roleHierarchy = [
      UserRole.ADMIN,
      UserRole.HEAD_REFEREE,
      UserRole.ALLIANCE_REFEREE,
      UserRole.TEAM_LEADER,
      UserRole.TEAM_MEMBER,
      UserRole.COMMON
    ];

    const currentIndex = roleHierarchy.indexOf(this.currentRole);
    const newIndex = roleHierarchy.indexOf(newRole);

    return newIndex >= currentIndex;
  }

  /**
   * Get debug information about the current role state
   */
  getDebugInfo(): {
    currentRole: UserRole;
    permissions: FeaturePermission[];
    description: string;
  } {
    return {
      currentRole: this.currentRole,
      permissions: Array.from(this.getCurrentPermissions()),
      description: this.getRoleDescription()
    };
  }
}