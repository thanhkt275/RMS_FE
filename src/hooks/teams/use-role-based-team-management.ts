/**
 * Role-Based Team Management Hook
 * 
 * Comprehensive hook that combines team data fetching, role-based access control,
 * and team management operations using existing RBAC middleware patterns.
 * 
 * Features:
 * - Role-based data filtering using existing PermissionService
 * - Integrated access control checks
 * - Team CRUD operations with permission validation
 * - Import/Export functionality for authorized users
 * - Error handling with role-specific messages
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/common/use-auth';
import { useTeamsRoleAccess } from './use-teams-role-access';
import { TeamDataFilterService } from '@/utils/teams/team-data-filter';
import { teamErrorUtils, TeamErrorHandler } from '@/utils/teams/team-error-handler';
import TeamService from '@/services/team.service';
import { QueryKeys } from '@/lib/query-keys';
import { UserRole } from '@/types/types';
import type { Team } from '@/types/team.types';
import {
  TeamResponseDto,
  TeamsListResponseDto,
  CreateTeamDto,
  UpdateTeamDto,
  TeamImportDto,
  TeamExportDto
} from '@/types/team-dto.types';
import { toast } from 'sonner';

/**
 * Interface for role-based team management hook
 */
export interface UseRoleBasedTeamManagementReturn {
  // Data and loading states
  teams: TeamResponseDto[];
  teamsData: TeamsListResponseDto | undefined;
  isLoading: boolean;
  error: Error | null;

  // Role and permission information
  userRole: UserRole | null;
  permissions: {
    canCreate: boolean;
    canImport: boolean;
    canExport: boolean;
    canViewSensitiveData: boolean;
  };

  // Team operations
  createTeam: (data: CreateTeamDto) => Promise<void>;
  updateTeam: (data: UpdateTeamDto) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;

  // Import/Export operations
  importTeams: (data: TeamImportDto) => Promise<void>;
  exportTeams: (data: TeamExportDto) => Promise<Blob>;

  // Utility functions
  canAccessTeam: (team: Team) => boolean;
  canEditTeam: (team: Team) => boolean;
  canDeleteTeam: (team: Team) => boolean;
  getFilteredTeamData: (team: Team) => TeamResponseDto;
  getAvailableActions: (team: Team) => string[];

  // Loading states for operations
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isImporting: boolean;
  isExporting: boolean;
}

/**
 * Hook for comprehensive role-based team management
 */
export function useRoleBasedTeamManagement(
  tournamentId: string | undefined
): UseRoleBasedTeamManagementReturn {
  const { user } = useAuth();
  const userRole = user?.role as UserRole | null;
  const userId = user?.id;
  const queryClient = useQueryClient();

  // Get role-based access control
  const roleAccess = useTeamsRoleAccess();

  // Fetch teams with role-based filtering
  const {
    data: teamsData,
    isLoading,
    error
  } = useQuery({
    queryKey: [...QueryKeys.teams.byTournament(tournamentId ?? ""), 'role-based-management'],
    queryFn: async (): Promise<TeamsListResponseDto> => {
      if (!tournamentId) {
        return TeamDataFilterService.createTeamsListResponse([], userRole, userId);
      }

      try {
        // Fetch teams using role-based service
        const rawTeams = await TeamService.getTeamsWithRoleFiltering(
          tournamentId,
          userRole,
          userId
        );

        // Convert raw teams to DTOs with proper filtering
        const teams = rawTeams.map(team =>
          TeamDataFilterService.convertTeamToDto(team, userRole, userId)
        );

        // Create comprehensive response with permissions
        return {
          teams,
          totalCount: teams.length,
          filteredCount: teams.length,
          userRole: userRole || UserRole.COMMON,
          permissions: {
            canCreate: TeamDataFilterService.canPerformTeamAction('create', userRole),
            canImport: TeamDataFilterService.canPerformTeamAction('import', userRole),
            canExport: TeamDataFilterService.canPerformTeamAction('export', userRole),
            canViewSensitiveData: roleAccess.canViewSensitiveData,
          },
        };
      } catch (error: any) {
        // Handle role-based access errors using enhanced error handler
        if (error.message?.includes('Access denied')) {
          await teamErrorUtils.handleViewError(error, 'teams-list', userId, userRole || undefined);
          return TeamDataFilterService.createTeamsListResponse([], userRole, userId);
        }
        throw error;
      }
    },
    enabled: !!tournamentId,
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (data: CreateTeamDto) => {
      // Check permissions before attempting creation
      if (!TeamDataFilterService.canPerformTeamAction('create', userRole)) {
        const errorMessage = roleAccess.getAccessDeniedMessage('create');
        await TeamErrorHandler.handleTeamOperationDenied({
          userId,
          userRole: userRole || undefined,
          operation: 'create'
        }, errorMessage, { showToast: false }); // Don't show toast here as mutation will handle it
        throw new Error(errorMessage);
      }

      // Convert DTO to service format
      const createRequest = {
        name: data.name,
        tournamentId: data.tournamentId,
        referralSource: data.referralSource,
        teamMembers: data.members.map(member => ({
          name: member.name,
          email: member.email,
          phoneNumber: member.phoneNumber,
          province: member.province || '',
          ward: member.ward || '',
          organization: member.organization,
        }))
      };

      return await TeamService.createTeam(createRequest);
    },
    onSuccess: (_, data) => {
      toast.success('Team created successfully');
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: QueryKeys.teams.byTournament(data.tournamentId),
      });
    },
    onError: async (error: Error) => {
      await teamErrorUtils.handleCreateError(error, userId, userRole || undefined);
    },
  });

  // Update team mutation
  const updateTeamMutation = useMutation({
    mutationFn: async (data: UpdateTeamDto) => {
      // Check permissions before attempting update
      if (!data.id) {
        throw new Error('Team ID is required for update');
      }

      // For now, we'll assume the team object is available in the cache
      // In a real implementation, you might need to fetch the team first
      const canUpdate = TeamDataFilterService.canPerformTeamAction('edit', userRole);
      if (!canUpdate) {
        const errorMessage = roleAccess.getAccessDeniedMessage('edit');
        await TeamErrorHandler.handleTeamOperationDenied({
          userId,
          userRole: userRole || undefined,
          teamId: data.id,
          operation: 'edit'
        }, errorMessage, { showToast: false }); // Don't show toast here as mutation will handle it
        throw new Error(errorMessage);
      }

      // Convert DTO to service format
      const updateRequest = {
        name: data.name || '',
        tournamentId: '', // This should be provided or fetched
        referralSource: data.referralSource || '',
        teamMembers: data.members?.map(member => ({
          name: member.name,
          email: member.email,
          phoneNumber: member.phoneNumber,
          province: member.province || '',
          ward: member.ward || '',
          organization: member.organization,
        })) || []
      };

      return await TeamService.updateTeam(updateRequest);
    },
    onSuccess: () => {
      toast.success('Team updated successfully');
      // Invalidate relevant queries
      if (tournamentId) {
        queryClient.invalidateQueries({
          queryKey: QueryKeys.teams.byTournament(tournamentId),
        });
      }
    },
    onError: async (error: Error, variables) => {
      await teamErrorUtils.handleUpdateError(error, variables.id, userId, userRole || undefined);
    },
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      // Check permissions before attempting deletion
      if (!TeamDataFilterService.canPerformTeamAction('delete', userRole)) {
        const errorMessage = roleAccess.getAccessDeniedMessage('delete');
        await TeamErrorHandler.handleTeamOperationDenied({
          userId,
          userRole: userRole || undefined,
          teamId: teamId,
          operation: 'delete'
        }, errorMessage, { showToast: false }); // Don't show toast here as mutation will handle it
        throw new Error(errorMessage);
      }

      return await TeamService.deleteTeam(teamId);
    },
    onSuccess: () => {
      toast.success('Team deleted successfully');
      // Invalidate relevant queries
      if (tournamentId) {
        queryClient.invalidateQueries({
          queryKey: QueryKeys.teams.byTournament(tournamentId),
        });
      }
    },
    onError: async (error: Error, variables) => {
      await teamErrorUtils.handleDeleteError(error, variables, userId, userRole || undefined);
    },
  });

  // Import teams mutation
  const importTeamsMutation = useMutation({
    mutationFn: async (data: TeamImportDto) => {
      // Check permissions before attempting import
      if (!TeamDataFilterService.canPerformTeamAction('import', userRole)) {
        const errorMessage = roleAccess.getAccessDeniedMessage('import_export');
        await TeamErrorHandler.handleTeamOperationDenied({
          userId,
          userRole: userRole || undefined,
          operation: 'import'
        }, errorMessage, { showToast: false }); // Don't show toast here as mutation will handle it
        throw new Error(errorMessage);
      }

      // Convert teams to the format expected by the service
      const teamsData = data.teams.map(team => ({
        name: team.name,
        tournamentId: team.tournamentId,
        referralSource: team.referralSource,
        teamMembers: team.members.map(member => ({
          name: member.name,
          email: member.email,
          phoneNumber: member.phoneNumber,
          province: member.province || '',
          ward: member.ward || '',
          organization: member.organization,
        }))
      }));

      return await TeamService.importTeams(data.tournamentId, teamsData);
    },
    onSuccess: (_, data) => {
      toast.success('Teams imported successfully');
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: QueryKeys.teams.byTournament(data.tournamentId),
      });
    },
    onError: async (error: Error) => {
      await teamErrorUtils.handleImportError(error, userId, userRole || undefined);
    },
  });

  // Export teams function
  const exportTeams = async (data: TeamExportDto): Promise<Blob> => {
    // Check permissions before attempting export
    if (!TeamDataFilterService.canPerformTeamAction('export', userRole)) {
      const errorMessage = roleAccess.getAccessDeniedMessage('import_export');
      await TeamErrorHandler.handleTeamOperationDenied({
        userId,
        userRole: userRole || undefined,
        operation: 'export'
      }, errorMessage);
      throw new Error(errorMessage);
    }

    try {
      return await TeamService.exportTeams(data.tournamentId);
    } catch (error: any) {
      await teamErrorUtils.handleExportError(error, userId, userRole || undefined);
      throw error;
    }
  };

  // Utility functions
  const canAccessTeam = (team: Team): boolean => {
    return roleAccess.canAccessTeam(team);
  };

  const canEditTeam = (team: Team): boolean => {
    return roleAccess.canEditTeam(team);
  };

  const canDeleteTeam = (team: Team): boolean => {
    return TeamDataFilterService.canPerformTeamAction('delete', userRole, team, userId);
  };

  const getFilteredTeamData = (team: Team): TeamResponseDto => {
    return TeamDataFilterService.convertTeamToDto(team, userRole, userId);
  };

  const getAvailableActions = (team: Team): string[] => {
    return TeamDataFilterService.getAvailableTeamActions(userRole, team, userId);
  };

  return {
    // Data and loading states
    teams: teamsData?.teams || [],
    teamsData,
    isLoading,
    error,

    // Role and permission information
    userRole,
    permissions: teamsData?.permissions || {
      canCreate: false,
      canImport: false,
      canExport: false,
      canViewSensitiveData: false,
    },

    // Team operations
    createTeam: createTeamMutation.mutateAsync,
    updateTeam: updateTeamMutation.mutateAsync,
    deleteTeam: deleteTeamMutation.mutateAsync,

    // Import/Export operations
    importTeams: importTeamsMutation.mutateAsync,
    exportTeams,

    // Utility functions
    canAccessTeam,
    canEditTeam,
    canDeleteTeam,
    getFilteredTeamData,
    getAvailableActions,

    // Loading states for operations
    isCreating: createTeamMutation.isPending,
    isUpdating: updateTeamMutation.isPending,
    isDeleting: deleteTeamMutation.isPending,
    isImporting: importTeamsMutation.isPending,
    isExporting: false, // Export is handled synchronously for now
  };
}