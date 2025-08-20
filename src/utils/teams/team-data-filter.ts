/**
 * Team Data Filtering Utilities
 * 
 * Provides data filtering utilities for teams based on user roles and permissions.
 * Uses existing permission patterns from the PermissionService.
 * 
 * Features:
 * - Role-based team data filtering
 * - Column configuration based on permissions
 * - Ownership-based access control
 * - Integration with existing RBAC system
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

import { PermissionService } from '@/config/permissions';
import { UserRole } from '@/types/types';
import type { Team } from '@/types/team.types';
import {
  TeamResponseDto,
  PublicTeamDto,
  OwnTeamDto,
  RefereeTeamDto,
  AdminTeamDto,
  FilteredTeamMemberDto,
  TeamsListResponseDto
} from '@/types/team-dto.types';

/**
 * Interface for filtered team data
 */
export interface FilteredTeam extends Partial<Team> {
  id: string;
  name: string;
  organization: string;
  isUserTeam?: boolean;
  memberCount?: number;
  teamNumber?: string;
  description?: string;
  tournamentId?: string;
  referralSource?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Interface for team column configuration
 */
export interface TeamColumn {
  key: string;
  label: string;
  visible: boolean;
  sortable?: boolean;
  filterable?: boolean;
  permissionRequired?: {
    feature: string;
    action: string;
  };
}

/**
 * Role-based team column configuration using PermissionService
 */
export interface TeamColumnConfig {
  [UserRole.ADMIN]: TeamColumn[];
  [UserRole.HEAD_REFEREE]: TeamColumn[];
  [UserRole.ALLIANCE_REFEREE]: TeamColumn[];
  [UserRole.TEAM_LEADER]: TeamColumn[];
  [UserRole.TEAM_MEMBER]: TeamColumn[];
  [UserRole.COMMON]: TeamColumn[];
}

/**
 * Team data filtering service
 * 
 * Provides utilities for filtering team data based on user roles and permissions
 * using the existing PermissionService infrastructure.
 */
export class TeamDataFilterService {
  /**
   * Filter teams based on user role and permissions using existing PERMISSIONS.TEAM_MANAGEMENT rules
   */
  static filterTeamsForRole(
    teams: Team[],
    userRole: UserRole | null,
    userId?: string
  ): TeamResponseDto[] {
    if (!userRole) {
      return [];
    }

    // Filter teams based on permission rules
    const filteredTeams = teams.filter(team => {
      // Admin and referees can view all teams
      if (PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL') ||
          PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL_READONLY')) {
        return true;
      }

      // Team members can view their own team
      if (PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_OWN') && 
          team.userId === userId) {
        return true;
      }

      // Common users can view public data of all teams
      if (PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_PUBLIC_DATA')) {
        return true;
      }

      return false;
    });

    return filteredTeams.map(team => this.convertTeamToDto(team, userRole, userId));
  }

  /**
   * Convert a team to appropriate DTO based on user role and permissions
   */
  static convertTeamToDto(
    team: Team,
    userRole: UserRole | null,
    userId?: string
  ): TeamResponseDto {
    if (!userRole) {
      return this.createPublicTeamDto(team);
    }

    const isUserTeam = team.userId === userId;

    // Admin gets full access to all teams
    if (PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'EDIT_ANY')) {
      return this.createAdminTeamDto(team, isUserTeam);
    }

    // Referees get comprehensive viewing access
    if (PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_SENSITIVE_DATA')) {
      return this.createRefereeTeamDto(team, isUserTeam);
    }

    // Team members get full access to their own team, limited to others
    if (PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_OWN') && isUserTeam) {
      return this.createOwnTeamDto(team);
    }

    // Default to public information
    return this.createPublicTeamDto(team);
  }

  /**
   * Create public team DTO (minimal information)
   */
  static createPublicTeamDto(team: Team): PublicTeamDto {
    return {
      id: team.id,
      name: team.name,
      organization: team.referralSource || 'Unknown Organization',
      memberCount: team.teamMembers?.length || 0,
    };
  }

  /**
   * Create own team DTO (full details for user's own team)
   */
  static createOwnTeamDto(team: Team): OwnTeamDto {
    return {
      id: team.id,
      name: team.name,
      teamNumber: team.teamNumber,
      organization: team.referralSource || 'Unknown Organization',
      description: '', // Add description field to Team interface if needed
      tournamentId: team.tournamentId,
      referralSource: team.referralSource,
      memberCount: team.teamMembers?.length || 0,
      members: this.filterTeamMembers(team.teamMembers || [], 'TEAM_MEMBER'),
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      isUserTeam: true,
    };
  }

  /**
   * Create referee team DTO (comprehensive but no sensitive admin data)
   */
  static createRefereeTeamDto(team: Team, isUserTeam: boolean = false): RefereeTeamDto {
    return {
      id: team.id,
      name: team.name,
      teamNumber: team.teamNumber,
      organization: team.referralSource || 'Unknown Organization',
      description: '', // Add description field if needed
      tournamentId: team.tournamentId,
      memberCount: team.teamMembers?.length || 0,
      members: this.filterTeamMembers(team.teamMembers || [], 'REFEREE'),
      createdAt: team.createdAt,
    };
  }

  /**
   * Create admin team DTO (all information including sensitive data)
   */
  static createAdminTeamDto(team: Team, isUserTeam: boolean = false): AdminTeamDto {
    return {
      id: team.id,
      name: team.name,
      teamNumber: team.teamNumber,
      organization: team.referralSource || 'Unknown Organization',
      description: '', // Add description field if needed
      tournamentId: team.tournamentId,
      userId: team.userId,
      referralSource: team.referralSource,
      memberCount: team.teamMembers?.length || 0,
      members: this.filterTeamMembers(team.teamMembers || [], 'ADMIN'),
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      createdBy: team.userId,
      // Add audit log and statistics if available
    };
  }

  /**
   * Filter team members based on viewer role
   */
  static filterTeamMembers(
    members: any[],
    viewerRole: 'ADMIN' | 'REFEREE' | 'TEAM_MEMBER' | 'PUBLIC'
  ): FilteredTeamMemberDto[] {
    return members.map(member => {
      const baseInfo: FilteredTeamMemberDto = {
        id: member.id,
        name: member.name,
        organization: member.organization,
      };

      // Admin and referees can see contact information
      if (viewerRole === 'ADMIN' || viewerRole === 'REFEREE') {
        return {
          ...baseInfo,
          email: member.email,
          phoneNumber: member.phoneNumber,
          province: member.province,
          ward: member.ward,
        };
      }

      // Team members can see their own team's contact info
      if (viewerRole === 'TEAM_MEMBER') {
        return {
          ...baseInfo,
          email: member.email,
          phoneNumber: member.phoneNumber,
          province: member.province,
          ward: member.ward,
        };
      }

      // Public viewers only see basic info
      return baseInfo;
    });
  }

  /**
   * Create teams list response with role-based permissions
   */
  static createTeamsListResponse(
    teams: Team[],
    userRole: UserRole | null,
    userId?: string
  ): TeamsListResponseDto {
    const filteredTeams = this.filterTeamsForRole(teams, userRole, userId);

    return {
      teams: filteredTeams,
      totalCount: teams.length,
      filteredCount: filteredTeams.length,
      userRole: userRole || UserRole.COMMON,
      permissions: {
        canCreate: this.canPerformTeamAction('create', userRole),
        canImport: this.canPerformTeamAction('import', userRole),
        canExport: this.canPerformTeamAction('export', userRole),
        canViewSensitiveData: PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_SENSITIVE_DATA'),
      },
    };
  }

  /**
   * Filter team details based on user role and ownership using existing ownership-based permissions
   */
  static filterTeamDetailsForRole(
    team: Team,
    userRole: UserRole | null,
    userId?: string
  ): FilteredTeam {
    if (!userRole) {
      return this.getPublicTeamInfo(team);
    }

    const isUserTeam = team.userId === userId;
    const ownershipContext = { isOwner: isUserTeam };

    // Check permissions with ownership context
    const canViewSensitive = PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_SENSITIVE_DATA');
    const canViewAll = PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL') ||
                      PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL_READONLY');
    const canViewOwn = PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_OWN', ownershipContext);
    const canViewPublic = PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_PUBLIC_DATA');

    // Build filtered team based on permissions
    const filteredTeam: FilteredTeam = {
      id: team.id,
      name: team.name,
      organization: team.referralSource || 'Unknown Organization',
      memberCount: team.teamMembers?.length || 0,
      isUserTeam,
    };

    // Add sensitive data if user has appropriate permissions
    if (canViewSensitive || canViewAll || (canViewOwn && isUserTeam)) {
      return {
        ...filteredTeam,
        teamNumber: team.teamNumber,
        description: '', // Add description field if available
        tournamentId: team.tournamentId,
        referralSource: team.referralSource,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      };
    }

    // Return public info if user can only view public data
    if (canViewPublic) {
      return filteredTeam;
    }

    // No access - return minimal info
    return {
      id: team.id,
      name: 'Access Denied',
      organization: 'Access Denied',
      memberCount: 0,
      isUserTeam: false,
    };
  }

  /**
   * Get public team information (safe for all users)
   */
  static getPublicTeamInfo(team: Team): FilteredTeam {
    // Get organization from the first team member if available
    const organization = team.teamMembers?.[0]?.organization || 'Unknown';

    return {
      id: team.id,
      name: team.name,
      organization,
      memberCount: team.teamMembers?.length || 0,
      isUserTeam: false,
    };
  }

  /**
   * Get column configuration based on user role using PermissionService
   */
  static getTeamColumnsForRole(userRole: UserRole | null): TeamColumn[] {
    if (!userRole) {
      return this.getPublicColumns();
    }

    // Get the column configuration for the specific role
    const columnConfig = this.getTeamColumnConfig();
    
    // Return columns for the user's role, filtering by permissions
    const roleColumns = columnConfig[userRole] || this.getPublicColumns();
    
    // Filter columns based on actual permissions
    return roleColumns.filter(column => {
      if (!column.permissionRequired) {
        return column.visible;
      }
      
      return column.visible && PermissionService.hasPermission(
        userRole,
        column.permissionRequired.feature,
        column.permissionRequired.action
      );
    });
  }

  /**
   * Get comprehensive team column configuration using PermissionService
   */
  static getTeamColumnConfig(): TeamColumnConfig {
    const baseColumns: TeamColumn[] = [
      { 
        key: 'name', 
        label: 'Team Name', 
        visible: true, 
        sortable: true, 
        filterable: true,
        permissionRequired: { feature: 'TEAM_MANAGEMENT', action: 'VIEW_PUBLIC_DATA' }
      },
      { 
        key: 'organization', 
        label: 'Organization', 
        visible: true, 
        sortable: true, 
        filterable: true,
        permissionRequired: { feature: 'TEAM_MANAGEMENT', action: 'VIEW_PUBLIC_DATA' }
      },
      { 
        key: 'memberCount', 
        label: 'Members', 
        visible: true, 
        sortable: true,
        permissionRequired: { feature: 'TEAM_MANAGEMENT', action: 'VIEW_PUBLIC_DATA' }
      },
    ];

    const sensitiveColumns: TeamColumn[] = [
      { 
        key: 'code', 
        label: 'Team Code', 
        visible: true, 
        sortable: true, 
        filterable: true,
        permissionRequired: { feature: 'TEAM_MANAGEMENT', action: 'VIEW_SENSITIVE_DATA' }
      },
      { 
        key: 'description', 
        label: 'Description', 
        visible: true,
        permissionRequired: { feature: 'TEAM_MANAGEMENT', action: 'VIEW_SENSITIVE_DATA' }
      },
      { 
        key: 'createdAt', 
        label: 'Created', 
        visible: true, 
        sortable: true,
        permissionRequired: { feature: 'TEAM_MANAGEMENT', action: 'VIEW_SENSITIVE_DATA' }
      },
    ];

    const adminColumns: TeamColumn[] = [
      { 
        key: 'createdBy', 
        label: 'Created By', 
        visible: true,
        permissionRequired: { feature: 'TEAM_MANAGEMENT', action: 'EDIT_ANY' }
      },
      { 
        key: 'actions', 
        label: 'Actions', 
        visible: true,
        permissionRequired: { feature: 'TEAM_MANAGEMENT', action: 'EDIT_ANY' }
      },
    ];

    const ownTeamActions: TeamColumn[] = [
      { 
        key: 'actions', 
        label: 'Actions', 
        visible: true,
        permissionRequired: { feature: 'TEAM_MANAGEMENT', action: 'MANAGE_OWN' }
      },
    ];

    return {
      [UserRole.ADMIN]: [
        ...baseColumns,
        ...sensitiveColumns,
        ...adminColumns,
      ],
      [UserRole.HEAD_REFEREE]: [
        ...baseColumns,
        ...sensitiveColumns,
      ],
      [UserRole.ALLIANCE_REFEREE]: [
        ...baseColumns,
        ...sensitiveColumns,
      ],
      [UserRole.TEAM_LEADER]: [
        ...baseColumns,
        { 
          key: 'description', 
          label: 'Description', 
          visible: true,
          permissionRequired: { feature: 'TEAM_MANAGEMENT', action: 'VIEW_OWN' }
        },
        ...ownTeamActions,
      ],
      [UserRole.TEAM_MEMBER]: [
        ...baseColumns,
        { 
          key: 'description', 
          label: 'Description', 
          visible: true,
          permissionRequired: { feature: 'TEAM_MANAGEMENT', action: 'VIEW_OWN' }
        },
      ],
      [UserRole.COMMON]: baseColumns,
    };
  }

  /**
   * Get public columns (no permissions required)
   */
  static getPublicColumns(): TeamColumn[] {
    return [
      { key: 'name', label: 'Team Name', visible: true, sortable: true, filterable: true },
      { key: 'organization', label: 'Organization', visible: true, sortable: true, filterable: true },
      { key: 'memberCount', label: 'Members', visible: true, sortable: true },
    ];
  }

  /**
   * Check if user can perform action on team
   */
  static canPerformTeamAction(
    action: 'create' | 'edit' | 'delete' | 'view' | 'import' | 'export',
    userRole: UserRole | null,
    team?: Team,
    userId?: string
  ): boolean {
    if (!userRole) {
      return false;
    }

    const isOwner = team && team.userId === userId;

    switch (action) {
      case 'create':
        return !!(PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'CREATE_ANY') ||
          PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'CREATE_OWN'));

      case 'edit':
        return !!(PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'EDIT_ANY') ||
          (PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'MANAGE_OWN') && isOwner));

      case 'delete':
        return !!PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'DELETE_ANY');

      case 'view':
        return !!(PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL') ||
          PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL_READONLY') ||
          (PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_OWN') && isOwner) ||
          PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_PUBLIC_DATA'));

      case 'import':
      case 'export':
        return !!PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'IMPORT_EXPORT');

      default:
        return false;
    }
  }

  /**
   * Get filtered team actions based on user role and team ownership
   */
  static getAvailableTeamActions(
    userRole: UserRole | null,
    team: Team,
    userId?: string
  ): string[] {
    const actions: string[] = [];

    if (this.canPerformTeamAction('view', userRole, team, userId)) {
      actions.push('view');
    }

    if (this.canPerformTeamAction('edit', userRole, team, userId)) {
      actions.push('edit');
    }

    if (this.canPerformTeamAction('delete', userRole, team, userId)) {
      actions.push('delete');
    }

    return actions;
  }
  /**
   * Helper function to check team ownership using existing auth context
   */
  static isTeamOwner(team: Team, userId?: string): boolean {
    return !!(userId && team.userId === userId);
  }

  /**
   * Helper function to get team access level based on role and ownership
   */
  static getTeamAccessLevel(
    team: Team,
    userRole: UserRole | null,
    userId?: string
  ): 'FULL' | 'SENSITIVE' | 'PUBLIC' | 'NONE' {
    if (!userRole) return 'NONE';

    const isOwner = this.isTeamOwner(team, userId);
    const ownershipContext = { isOwner };

    // Full access for admins
    if (PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'EDIT_ANY')) {
      return 'FULL';
    }

    // Sensitive access for referees and team owners
    if (PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_SENSITIVE_DATA') ||
        (PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_OWN', ownershipContext) && isOwner)) {
      return 'SENSITIVE';
    }

    // Public access for users with public data permission
    if (PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_PUBLIC_DATA')) {
      return 'PUBLIC';
    }

    return 'NONE';
  }

  /**
   * Helper function to check if user can manage team using existing auth context
   */
  static canManageTeam(
    team: Team,
    userRole: UserRole | null,
    userId?: string
  ): boolean {
    if (!userRole) return false;

    const isOwner = this.isTeamOwner(team, userId);
    const ownershipContext = { isOwner };

    return PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'EDIT_ANY') ||
           (PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'MANAGE_OWN', ownershipContext) && isOwner);
  }

  /**
   * Helper function to get filtered team members based on access level
   */
  static getFilteredTeamMembers(
    team: Team,
    userRole: UserRole | null,
    userId?: string
  ): FilteredTeamMemberDto[] {
    const accessLevel = this.getTeamAccessLevel(team, userRole, userId);
    
    switch (accessLevel) {
      case 'FULL':
        return this.filterTeamMembers(team.teamMembers || [], 'ADMIN');
      case 'SENSITIVE':
        return this.filterTeamMembers(team.teamMembers || [], 'REFEREE');
      case 'PUBLIC':
        return this.filterTeamMembers(team.teamMembers || [], 'PUBLIC');
      default:
        return [];
    }
  }

  /**
   * Helper function to check if user can view team details using existing permissions
   */
  static canViewTeamDetails(
    team: Team,
    userRole: UserRole | null,
    userId?: string
  ): boolean {
    if (!userRole) return false;

    const isOwner = this.isTeamOwner(team, userId);
    const ownershipContext = { isOwner };

    return PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL') ||
           PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL_READONLY') ||
           PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_SENSITIVE_DATA') ||
           (PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_OWN', ownershipContext) && isOwner) ||
           PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_PUBLIC_DATA');
  }
}

/**
 * Helper functions for team data filtering that integrate with existing auth context
 */
export const teamFilterUtils = {
  /**
   * Filter teams for role with user context
   */
  filterTeamsForUser: (teams: Team[], userRole: UserRole | null, userId?: string) =>
    TeamDataFilterService.filterTeamsForRole(teams, userRole, userId),

  /**
   * Get columns for role using PermissionService
   */
  getColumnsForRole: (userRole: UserRole | null) =>
    TeamDataFilterService.getTeamColumnsForRole(userRole),

  /**
   * Check team action permission using existing auth context
   */
  canPerformAction: (action: string, userRole: UserRole | null, team?: Team, userId?: string) =>
    TeamDataFilterService.canPerformTeamAction(action as any, userRole, team, userId),

  /**
   * Get available actions for team
   */
  getAvailableActions: (userRole: UserRole | null, team: Team, userId?: string) =>
    TeamDataFilterService.getAvailableTeamActions(userRole, team, userId),

  /**
   * Check team ownership using existing auth context
   */
  isTeamOwner: (team: Team, userId?: string) =>
    TeamDataFilterService.isTeamOwner(team, userId),

  /**
   * Get team access level based on role and ownership
   */
  getTeamAccessLevel: (team: Team, userRole: UserRole | null, userId?: string) =>
    TeamDataFilterService.getTeamAccessLevel(team, userRole, userId),

  /**
   * Check if user can manage team using existing auth context
   */
  canManageTeam: (team: Team, userRole: UserRole | null, userId?: string) =>
    TeamDataFilterService.canManageTeam(team, userRole, userId),

  /**
   * Get filtered team members based on access level
   */
  getFilteredTeamMembers: (team: Team, userRole: UserRole | null, userId?: string) =>
    TeamDataFilterService.getFilteredTeamMembers(team, userRole, userId),

  /**
   * Check if user can view team details using existing permissions
   */
  canViewTeamDetails: (team: Team, userRole: UserRole | null, userId?: string) =>
    TeamDataFilterService.canViewTeamDetails(team, userRole, userId),

  /**
   * Get team column configuration using PermissionService
   */
  getTeamColumnConfig: () =>
    TeamDataFilterService.getTeamColumnConfig(),
};