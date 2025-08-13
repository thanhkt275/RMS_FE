/**
 * Teams Role-Based Access Control Hook
 * 
 * Provides role-based access control for teams functionality using the existing
 * PermissionService and RBAC infrastructure.
 * 
 * Features:
 * - Leverages existing PermissionService for consistent access control
 * - Provides team-specific permission checks
 * - Integrates with existing auth context
 * - Supports ownership-based permissions
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/common/use-auth';
import { PermissionService } from '@/config/permissions';
import { TeamDataFilterService } from '@/utils/teams/team-data-filter';
import { TeamErrorHandler } from '@/utils/teams/team-error-handler';
import { UserRole } from '@/types/types';
import type { Team } from '@/types/team.types';

/**
 * Interface for teams role-based access control
 */
export interface UseTeamsRoleAccessReturn {
  // User information
  currentRole: UserRole | null;
  currentUser: any;

  // Permission checks
  canCreateTeams: boolean;
  canEditAnyTeam: boolean;
  canEditOwnTeam: boolean;
  canDeleteTeams: boolean;
  canViewAllTeams: boolean;
  canViewOwnTeam: boolean;
  canImportExport: boolean;
  canViewSensitiveData: boolean;
  canViewPublicData: boolean;

  // Role-specific flags
  isAdmin: boolean;
  isReferee: boolean;
  isHeadReferee: boolean;
  isAllianceReferee: boolean;
  isTeamMember: boolean;
  isCommonUser: boolean;

  // Utility functions
  canAccessTeam: (team: Team) => boolean;
  canEditTeam: (team: Team) => boolean;
  canViewTeamDetails: (team: Team) => boolean;
  getAccessDeniedMessage: (action: string) => string;

  // Data filtering helpers
  shouldShowFullTeamData: (team: Team) => boolean;
  shouldShowLimitedTeamData: (team: Team) => boolean;
  getFilteredTeamData: (team: Team) => any;
  canPerformTeamAction: (action: 'create' | 'edit' | 'delete' | 'view' | 'import' | 'export', team?: Team) => boolean;
  getAvailableTeamActions: (team: Team) => string[];
}

/**
 * Hook for teams role-based access control
 * 
 * Provides comprehensive access control for teams functionality using
 * the existing PermissionService infrastructure.
 */
export function useTeamsRoleAccess(): UseTeamsRoleAccessReturn {
  const { user } = useAuth();
  const currentRole = user?.role as UserRole | null;

  // Basic permission checks using PermissionService
  const permissions = useMemo(() => ({
    canCreateTeams: PermissionService.hasPermission(currentRole, 'TEAM_MANAGEMENT', 'CREATE_ANY') ||
      PermissionService.hasPermission(currentRole, 'TEAM_MANAGEMENT', 'CREATE_OWN'),
    canEditAnyTeam: PermissionService.hasPermission(currentRole, 'TEAM_MANAGEMENT', 'EDIT_ANY'),
    canEditOwnTeam: PermissionService.hasPermission(currentRole, 'TEAM_MANAGEMENT', 'MANAGE_OWN'),
    canDeleteTeams: PermissionService.hasPermission(currentRole, 'TEAM_MANAGEMENT', 'DELETE_ANY'),
    canViewAllTeams: PermissionService.hasPermission(currentRole, 'TEAM_MANAGEMENT', 'VIEW_ALL') ||
      PermissionService.hasPermission(currentRole, 'TEAM_MANAGEMENT', 'VIEW_ALL_READONLY'),
    canViewOwnTeam: PermissionService.hasPermission(currentRole, 'TEAM_MANAGEMENT', 'VIEW_OWN'),
    canImportExport: PermissionService.hasPermission(currentRole, 'TEAM_MANAGEMENT', 'IMPORT_EXPORT'),
    canViewSensitiveData: PermissionService.hasPermission(currentRole, 'TEAM_MANAGEMENT', 'VIEW_SENSITIVE_DATA'),
    canViewPublicData: PermissionService.hasPermission(currentRole, 'TEAM_MANAGEMENT', 'VIEW_PUBLIC_DATA'),
  }), [currentRole]);

  // Role-specific flags
  const roleFlags = useMemo(() => ({
    isAdmin: currentRole === UserRole.ADMIN,
    isHeadReferee: currentRole === UserRole.HEAD_REFEREE,
    isAllianceReferee: currentRole === UserRole.ALLIANCE_REFEREE,
    isReferee: currentRole === UserRole.HEAD_REFEREE || currentRole === UserRole.ALLIANCE_REFEREE,
    isTeamMember: currentRole === UserRole.TEAM_LEADER || currentRole === UserRole.TEAM_MEMBER,
    isCommonUser: currentRole === UserRole.COMMON,
  }), [currentRole]);

  /**
   * Check if user can access a specific team
   */
  const canAccessTeam = (team: Team): boolean => {
    // Admin and referees can access all teams
    if (permissions.canViewAllTeams) {
      return true;
    }

    // Team members can access their own team
    if (permissions.canViewOwnTeam && team.userId === user?.id) {
      return true;
    }

    // Common users can view public data of all teams
    if (permissions.canViewPublicData) {
      return true;
    }

    return false;
  };

  /**
   * Check if user can edit a specific team
   */
  const canEditTeam = (team: Team): boolean => {
    // Admin can edit any team
    if (permissions.canEditAnyTeam) {
      return true;
    }

    // Team leaders can edit their own team
    if (permissions.canEditOwnTeam && team.userId === user?.id) {
      return true;
    }

    return false;
  };

  /**
   * Check if user can view detailed information of a team
   */
  const canViewTeamDetails = (team: Team): boolean => {
    // Admin and referees can view all team details
    if (permissions.canViewSensitiveData) {
      return true;
    }

    // Team members can view their own team details
    if (permissions.canViewOwnTeam && team.userId === user?.id) {
      return true;
    }

    return false;
  };

  /**
   * Get access denied message for a specific action using enhanced error handler
   */
  const getAccessDeniedMessage = (action: string, team?: Team): string => {
    return TeamErrorHandler.getTooltipMessage(action, currentRole, team);
  };

  /**
   * Check if user should see full team data for a specific team
   */
  const shouldShowFullTeamData = (team: Team): boolean => {
    return canViewTeamDetails(team);
  };

  /**
   * Check if user should see limited team data for a specific team
   */
  const shouldShowLimitedTeamData = (team: Team): boolean => {
    return permissions.canViewPublicData && !shouldShowFullTeamData(team);
  };

  /**
   * Get filtered team data based on user role and permissions
   */
  const getFilteredTeamData = (team: Team) => {
    return TeamDataFilterService.convertTeamToDto(team, currentRole, user?.id);
  };

  /**
   * Check if user can perform a specific action on a team
   */
  const canPerformTeamAction = (
    action: 'create' | 'edit' | 'delete' | 'view' | 'import' | 'export',
    team?: Team
  ): boolean => {
    return TeamDataFilterService.canPerformTeamAction(action, currentRole, team, user?.id);
  };

  /**
   * Get available actions for a specific team
   */
  const getAvailableTeamActions = (team: Team): string[] => {
    return TeamDataFilterService.getAvailableTeamActions(currentRole, team, user?.id);
  };

  return {
    // User information
    currentRole,
    currentUser: user,

    // Permission checks
    ...permissions,

    // Role-specific flags
    ...roleFlags,

    // Utility functions
    canAccessTeam,
    canEditTeam,
    canViewTeamDetails,
    getAccessDeniedMessage,

    // Data filtering helpers
    shouldShowFullTeamData,
    shouldShowLimitedTeamData,
    getFilteredTeamData,
    canPerformTeamAction,
    getAvailableTeamActions,
  };
}