/**
 * RBAC Permission Constants - Step 6 Implementation
 * 
 * Centralized permission definitions that map to the requirements matrix.
 * Follows SOLID principles for maintainable and scalable access control.
 * 
 * Features:
 * - Interface-driven design for type safety
 * - Single source of truth for all permissions
 * - Hierarchical organization by feature
 * - Easy to extend and maintain
 * - Supports complex permission logic
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

import { UserRole } from '@/types/types';

/**
 * Interface for permission definition
 * 
 * Follows Interface Segregation Principle by defining a focused contract
 * for permission specifications.
 */
export interface IPermissionDefinition {
  readonly roles: readonly UserRole[];
  readonly description?: string;
  readonly requiresOwnership?: boolean;
  readonly conditions?: Record<string, unknown>;
}

/**
 * Interface for permission group (feature-based permissions)
 * 
 * Organizes related permissions under a common feature umbrella.
 */
export interface IPermissionGroup {
  readonly [key: string]: IPermissionDefinition;
}

/**
 * Interface for the complete permission system
 * 
 * Provides type safety for the entire permission structure.
 */
export interface IPermissionSystem {
  readonly [feature: string]: IPermissionGroup;
}

/**
 * Permission Helper Class
 * 
 * Provides utility methods for working with permissions following
 * Single Responsibility Principle.
 */
export class PermissionHelper {
  /**
   * Check if a role has permission for a specific action
   * 
   * @param userRole User's current role
   * @param permission Permission definition to check against
   * @param context Additional context for ownership checks
   * @returns boolean indicating if permission is granted
   */
  static hasPermission(
    userRole: UserRole | null,
    permission: IPermissionDefinition,
    context?: { isOwner?: boolean; [key: string]: unknown }
  ): boolean {
    if (!userRole) return false;

    // Check if user's role is in the allowed roles
    const hasRolePermission = permission.roles.includes(userRole);
    
    // If ownership is required, check ownership condition
    if (permission.requiresOwnership && context?.isOwner !== true) {
      return false;
    }

    return hasRolePermission;
  }

  /**
   * Get all roles that have a specific permission
   * 
   * @param permission Permission definition
   * @returns Array of roles with the permission
   */
  static getAuthorizedRoles(permission: IPermissionDefinition): readonly UserRole[] {
    return permission.roles;
  }

  /**
   * Create a permission definition
   * 
   * @param roles Array of roles with this permission
   * @param options Additional permission options
   * @returns Permission definition object
   */
  static createPermission(
    roles: UserRole[],
    options?: {
      description?: string;
      requiresOwnership?: boolean;
      conditions?: Record<string, unknown>;
    }
  ): IPermissionDefinition {
    return {
      roles: Object.freeze(roles),
      description: options?.description,
      requiresOwnership: options?.requiresOwnership || false,
      conditions: options?.conditions,
    };
  }
}

/**
 * Core Permission Definitions
 * 
 * Organized by feature/module following the Domain-Driven Design approach.
 * Each section corresponds to a major feature of the tournament management system.
 */
export const PERMISSIONS: IPermissionSystem = {
  /**
   * Dashboard Permissions
   * Controls what users can see on the main dashboard
   */
  DASHBOARD: {
    SYSTEM_STATS: PermissionHelper.createPermission(
      [UserRole.ADMIN],
      { description: 'View system-wide statistics and metrics' }
    ),
    MATCH_STATUS: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE],
      { description: 'View and monitor match status across all tournaments' }
    ),
    ASSIGNED_MATCHES: PermissionHelper.createPermission(
      [UserRole.ALLIANCE_REFEREE],
      { description: 'View matches assigned to this referee' }
    ),
    TEAM_VIEW: PermissionHelper.createPermission(
      [UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
      { description: 'View team-specific dashboard information' }
    ),
    TOURNAMENT_OVERVIEW: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
      { description: 'View general tournament information and status' }
    ),
  },

  /**
   * User Management Permissions
   * Controls user creation, modification, and administration
   */
  USER_MANAGEMENT: {
    FULL_CONTROL: PermissionHelper.createPermission(
      [UserRole.ADMIN],
      { description: 'Create, edit, delete any user account and assign roles' }
    ),
    VIEW_ALL: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE],
      { description: 'View all user accounts and their basic information' }
    ),
    VIEW_TEAM_MEMBERS: PermissionHelper.createPermission(
      [UserRole.TEAM_LEADER],
      { description: 'View members of own team', requiresOwnership: true }
    ),
    EDIT_OWN_PROFILE: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
      { description: 'Edit own user profile and settings' }
    ),
  },

  /**
   * Team Management Permissions
   * Controls team creation, membership, and administration
   */
  TEAM_MANAGEMENT: {
    CREATE_ANY: PermissionHelper.createPermission(
      [UserRole.ADMIN],
      { description: 'Create teams and assign any users as team leaders' }
    ),
    CREATE_OWN: PermissionHelper.createPermission(
      [UserRole.TEAM_LEADER],
      { description: 'Create and manage own team' }
    ),
    EDIT_ANY: PermissionHelper.createPermission(
      [UserRole.ADMIN],
      { description: 'Edit any team information and membership' }
    ),
    MANAGE_OWN: PermissionHelper.createPermission(
      [UserRole.TEAM_LEADER],
      { description: 'Manage own team membership and settings', requiresOwnership: true }
    ),
    VIEW_ALL: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE],
      { description: 'View all teams and their information' }
    ),
    VIEW_OWN: PermissionHelper.createPermission(
      [UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
      { description: 'View own team information and members', requiresOwnership: true }
    ),
    DELETE_ANY: PermissionHelper.createPermission(
      [UserRole.ADMIN],
      { description: 'Delete any team (with appropriate safeguards)' }
    ),
    // New team-specific permissions for role-based teams page
    VIEW_ALL_READONLY: PermissionHelper.createPermission(
      [UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE],
      { description: 'View all teams in read-only mode for referees' }
    ),
    VIEW_LIMITED: PermissionHelper.createPermission(
      [UserRole.COMMON],
      { description: 'View limited team information for common users' }
    ),
    IMPORT_EXPORT: PermissionHelper.createPermission(
      [UserRole.ADMIN],
      { description: 'Import and export team data' }
    ),
    VIEW_SENSITIVE_DATA: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE],
      { description: 'View sensitive team data like member emails and detailed information' }
    ),
    VIEW_PUBLIC_DATA: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER, UserRole.COMMON],
      { description: 'View public team data like name and organization' }
    ),
  },

  /**
   * Tournament Registration Permissions
   * Controls tournament registration and management
   */
  TOURNAMENT_REGISTRATION: {
    REGISTER_ANY_TEAM: PermissionHelper.createPermission(
      [UserRole.ADMIN],
      { description: 'Register any team for tournaments' }
    ),
    REGISTER_OWN_TEAM: PermissionHelper.createPermission(
      [UserRole.TEAM_LEADER],
      { description: 'Register own team for tournaments', requiresOwnership: true }
    ),
    VIEW_ALL_REGISTRATIONS: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE],
      { description: 'View all tournament registrations' }
    ),
    VIEW_OWN_REGISTRATIONS: PermissionHelper.createPermission(
      [UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
      { description: 'View own team registrations', requiresOwnership: true }
    ),
    APPROVE_REGISTRATIONS: PermissionHelper.createPermission(
      [UserRole.ADMIN],
      { description: 'Approve or reject tournament registrations' }
    ),
  },

  /**
   * Match Scheduling Permissions
   * Controls match scheduling and timeline management
   */
  MATCH_SCHEDULING: {
    FULL_CONTROL: PermissionHelper.createPermission(
      [UserRole.ADMIN],
      { description: 'Create, modify, and delete match schedules' }
    ),
    REQUEST_CHANGES: PermissionHelper.createPermission(
      [UserRole.HEAD_REFEREE],
      { description: 'Request changes to match schedules' }
    ),
    VIEW_ALL: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
      { description: 'View match schedules and timelines' }
    ),
    MANAGE_REFEREE_ASSIGNMENTS: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE],
      { description: 'Assign referees to matches' }
    ),
  },

  /**
   * Live Scoring Permissions
   * Controls match scoring during live events
   */
  LIVE_SCORING: {
    OVERRIDE_SCORES: PermissionHelper.createPermission(
      [UserRole.ADMIN],
      { description: 'Override any score or scoring decision' }
    ),
    ENTER_AND_APPROVE: PermissionHelper.createPermission(
      [UserRole.HEAD_REFEREE],
      { description: 'Enter scores and approve final results' }
    ),
    ENTER_SCORES: PermissionHelper.createPermission(
      [UserRole.ALLIANCE_REFEREE],
      { description: 'Enter scores for assigned matches' }
    ),
    VIEW_LIVE_SCORES: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
      { description: 'View live scores as they are entered' }
    ),
    DISPUTE_SCORES: PermissionHelper.createPermission(
      [UserRole.TEAM_LEADER],
      { description: 'Submit score disputes for own team matches', requiresOwnership: true }
    ),
  },

  /**
   * Rankings and Statistics Permissions
   * Controls access to rankings and statistical data
   */
  RANKINGS: {
    RECALCULATE: PermissionHelper.createPermission(
      [UserRole.ADMIN],
      { description: 'Manually trigger ranking recalculations' }
    ),
    VIEW_ALL: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
      { description: 'View tournament rankings and statistics' }
    ),
    EXPORT_DATA: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE],
      { description: 'Export ranking and statistical data' }
    ),
    VIEW_DETAILED_ANALYTICS: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE],
      { description: 'View detailed analytics and performance metrics' }
    ),
  },

  /**
   * Communication Permissions
   * Controls announcements and messaging systems
   */
  ANNOUNCEMENTS: {
    FULL_CONTROL: PermissionHelper.createPermission(
      [UserRole.ADMIN],
      { description: 'Create, edit, delete any announcements' }
    ),
    CREATE_AND_EDIT: PermissionHelper.createPermission(
      [UserRole.HEAD_REFEREE],
      { description: 'Create and edit announcements' }
    ),
    VIEW_ALL: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
      { description: 'View all announcements' }
    ),
    MODERATE: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE],
      { description: 'Moderate user-generated content and communications' }
    ),
  },

  /**
   * System Administration Permissions
   * Controls system-level settings and configuration
   */
  SYSTEM_SETTINGS: {
    FULL_CONTROL: PermissionHelper.createPermission(
      [UserRole.ADMIN],
      { description: 'Access all system settings and configuration' }
    ),
    VIEW_LOGS: PermissionHelper.createPermission(
      [UserRole.ADMIN],
      { description: 'View system logs and audit trails' }
    ),
    MANAGE_TOURNAMENTS: PermissionHelper.createPermission(
      [UserRole.ADMIN],
      { description: 'Create, configure, and manage tournaments' }
    ),
    BACKUP_RESTORE: PermissionHelper.createPermission(
      [UserRole.ADMIN],
      { description: 'Perform system backups and restore operations' }
    ),
  },

  /**
   * Profile Management Permissions
   * Controls user profile access and modification
   */
  PROFILE: {
    EDIT_ANY: PermissionHelper.createPermission(
      [UserRole.ADMIN],
      { description: 'Edit any user profile' }
    ),
    EDIT_OWN: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
      { description: 'Edit own profile information' }
    ),
    VIEW_ANY: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE],
      { description: 'View any user profile' }
    ),
    VIEW_TEAM_PROFILES: PermissionHelper.createPermission(
      [UserRole.TEAM_LEADER],
      { description: 'View profiles of team members', requiresOwnership: true }
    ),
  },

  /**
   * Reporting Permissions
   * Controls access to reports and data exports
   */
  REPORTING: {
    GENERATE_ALL: PermissionHelper.createPermission(
      [UserRole.ADMIN],
      { description: 'Generate any type of report' }
    ),
    GENERATE_TOURNAMENT: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE],
      { description: 'Generate tournament-specific reports' }
    ),
    VIEW_TEAM_REPORTS: PermissionHelper.createPermission(
      [UserRole.TEAM_LEADER],
      { description: 'View reports for own team', requiresOwnership: true }
    ),
    EXPORT_DATA: PermissionHelper.createPermission(
      [UserRole.ADMIN, UserRole.HEAD_REFEREE],
      { description: 'Export data in various formats' }
    ),
  },
} as const;

/**
 * Permission Validation Service
 * 
 * Provides centralized permission checking logic following
 * Single Responsibility Principle.
 */
export class PermissionService {
  /**
   * Check if user has permission for a specific action
   * 
   * @param userRole User's role
   * @param feature Feature/module name
   * @param action Specific action within the feature
   * @param context Additional context for ownership checks
   * @returns boolean indicating permission status
   */
  static hasPermission(
    userRole: UserRole | null,
    feature: keyof typeof PERMISSIONS,
    action: string,
    context?: { isOwner?: boolean; [key: string]: unknown }
  ): boolean {
    const featurePermissions = PERMISSIONS[feature];
    if (!featurePermissions) return false;

    const permission = featurePermissions[action];
    if (!permission) return false;

    return PermissionHelper.hasPermission(userRole, permission, context);
  }

  /**
   * Get permission definition for a specific action
   * 
   * @param feature Feature/module name
   * @param action Specific action within the feature
   * @returns Permission definition or null if not found
   */
  static getPermission(
    feature: keyof typeof PERMISSIONS,
    action: string
  ): IPermissionDefinition | null {
    const featurePermissions = PERMISSIONS[feature];
    if (!featurePermissions) return null;

    return featurePermissions[action] || null;
  }

  /**
   * Get all permissions for a specific feature
   * 
   * @param feature Feature/module name
   * @returns All permissions for the feature
   */
  static getFeaturePermissions(feature: keyof typeof PERMISSIONS): IPermissionGroup | null {
    return PERMISSIONS[feature] || null;
  }

  /**
   * Get all roles that have permission for a specific action
   * 
   * @param feature Feature/module name
   * @param action Specific action within the feature
   * @returns Array of authorized roles
   */
  static getAuthorizedRoles(
    feature: keyof typeof PERMISSIONS,
    action: string
  ): readonly UserRole[] {
    const permission = this.getPermission(feature, action);
    return permission ? permission.roles : [];
  }
}

// Export commonly used permission arrays for backward compatibility
export const ADMIN_ONLY = [UserRole.ADMIN] as const;
export const ADMIN_AND_HEAD_REFEREE = [UserRole.ADMIN, UserRole.HEAD_REFEREE] as const;
export const ALL_REFEREES = [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE] as const;
export const TEAM_ROLES = [UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER] as const;
export const ALL_ROLES = [
  UserRole.ADMIN,
  UserRole.HEAD_REFEREE,
  UserRole.ALLIANCE_REFEREE,
  UserRole.TEAM_LEADER,
  UserRole.TEAM_MEMBER,
] as const;

/**
 * Legacy permission constants for backward compatibility
 * @deprecated Use PERMISSIONS object instead for better type safety and features
 */
export const LEGACY_PERMISSIONS = {
  DASHBOARD: {
    SYSTEM_STATS: ADMIN_ONLY,
    MATCH_STATUS: ADMIN_AND_HEAD_REFEREE,
    ASSIGNED_MATCHES: [UserRole.ALLIANCE_REFEREE],
    TEAM_VIEW: TEAM_ROLES,
  },
  USER_MANAGEMENT: {
    FULL_CONTROL: ADMIN_ONLY,
    VIEW_ONLY: ADMIN_AND_HEAD_REFEREE,
  },
  // ... other legacy permissions
} as const;
