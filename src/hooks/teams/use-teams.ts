import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { QueryKeys } from "@/lib/query-keys";
import TeamService from "@/services/team.service";
import { CreateTeamRequest, UpdateTeamRequest, Team } from "@/types/team.types";
import { TeamResponseDto, TeamsListResponseDto } from "@/types/team-dto.types";
import { TeamDataFilterService } from "@/utils/teams/team-data-filter";
import { PermissionService } from "@/config/permissions";
import { useAuth } from "@/hooks/common/use-auth";
import { UserRole } from "@/types/types";
import { toast } from "sonner";


export async function getTeamById(teamId: string) {
  return apiClient.get<Team>(`teams/${teamId}`);
}

export function useTeamById(teamId: string | undefined) {
  const { user } = useAuth();
  const userRole = user?.role as UserRole | null;
  const userId = user?.id;

  return useQuery({
    queryKey: QueryKeys.teams.byId(teamId ?? ""),
    queryFn: async () => {
      if (!teamId) return null;

      // Fetch team data first
      const team = await apiClient.get<Team>(`teams/${teamId}`);

      // Role-based access control logic
      switch (userRole) {
        case UserRole.ADMIN:
          // ADMIN: Full access to view and edit all teams
          return team;

        case UserRole.HEAD_REFEREE:
        case UserRole.ALLIANCE_REFEREE:
          // REFEREE: Can view all teams across all tournaments (read-only)
          return team;

        case UserRole.TEAM_LEADER:
          // TEAM_LEADER: Can view and edit teams they own only
          const isTeamOwner = team.userId === userId;
          if (!isTeamOwner) {
            throw new Error('Team leaders can only access teams they own');
          }
          return team;

        case UserRole.TEAM_MEMBER:
          // TEAM_MEMBER: Can view teams they are associated with (owner OR member)
          const isOwner = team.userId === userId;
          const isMember = team.teamMembers?.some(member => member.email === user?.email);

          if (!isOwner && !isMember) {
            throw new Error('Team members can only view teams they own or are a member of');
          }
          return team;

        case UserRole.COMMON:
          // COMMON: Limited access based on VIEW_LIMITED permission
          const canViewLimited = PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_LIMITED');
          if (!canViewLimited) {
            throw new Error('Insufficient permissions to view team details');
          }
          return team;

        default:
          throw new Error('Invalid user role or insufficient permissions');
      }
    },
    enabled: !!teamId,
  });
}

/**
 * Helper function to determine if a user can edit a specific team
 * Based on the role-based access control rules
 */
export function canUserEditTeam(
  team: Team | null,
  userRole: UserRole | null,
  userId: string | undefined
): boolean {
  if (!team || !userRole || !userId) return false;

  switch (userRole) {
    case UserRole.ADMIN:
      // ADMIN: Can edit all teams
      return true;

    case UserRole.TEAM_LEADER:
      // TEAM_LEADER: Can edit teams they own only
      return team.userId === userId;

    case UserRole.HEAD_REFEREE:
    case UserRole.ALLIANCE_REFEREE:
    case UserRole.TEAM_MEMBER:
    case UserRole.COMMON:
      // REFEREE, TEAM_MEMBER, COMMON: Read-only access
      return false;

    default:
      return false;
  }
}

/**
 * Helper function to determine if a user can view a specific team
 * Based on the role-based access control rules
 */
export function canUserViewTeam(
  team: Team | null,
  userRole: UserRole | null,
  userId: string | undefined,
  userEmail: string | undefined
): boolean {
  if (!team || !userRole) return false;

  switch (userRole) {
    case UserRole.ADMIN:
    case UserRole.HEAD_REFEREE:
    case UserRole.ALLIANCE_REFEREE:
      // ADMIN and REFEREE: Can view all teams
      return true;

    case UserRole.TEAM_LEADER:
      // TEAM_LEADER: Can view teams they own only
      return team.userId === userId;

    case UserRole.TEAM_MEMBER:
      // TEAM_MEMBER: Can view teams they own or are a member of
      const isOwner = team.userId === userId;
      const isMember = team.teamMembers?.some(member => member.email === userEmail);
      return isOwner || !!isMember;

    case UserRole.COMMON:
      // COMMON: Limited access based on permissions
      return PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_LIMITED');

    default:
      return false;
  }
}

export function useAllTeams() {
  const { user } = useAuth();
  const userRole = user?.role as UserRole | null;
  const userId = user?.id;

  return useQuery({
    queryKey: [...QueryKeys.teams.all(), 'all-tournaments'],
    queryFn: async () => {
      // Check if user has permission to view all teams
      const canViewAll = PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL') ||
                        PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL_READONLY');
      
      if (!canViewAll) {
        throw new Error('Insufficient permissions to view all teams');
      }
      
      // Fetch teams across all tournaments
      return await apiClient.get<Team[]>('teams');
    },
    enabled: PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL') ||
             PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL_READONLY'),
  });
}

export function useTeams(tournamentId: string | undefined) {
  const { user } = useAuth();
  const userRole = user?.role as UserRole | null;
  const userId = user?.id;

  return useQuery({
    queryKey: QueryKeys.teams.byTournament(tournamentId ?? ""),
    queryFn: async () => {
      if (!tournamentId) return [];
      
      // Check if user has permission to view teams
      if (!PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL') &&
          !PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL_READONLY') &&
          !PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_OWN') &&
          !PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_LIMITED')) {
        return [];
      }
      
      // Use role-based filtering service
      return await TeamService.getTeamsWithRoleFiltering(
        tournamentId,
        userRole,
        userId
      );
    },
    enabled: !!tournamentId,
  });
}

/**
 * Hook for teams with comprehensive role-based response
 */
export function useTeamsWithRoleData(tournamentId: string | undefined) {
  const { user } = useAuth();
  const userRole = user?.role as UserRole | null;
  const userId = user?.id;

  return useQuery({
    queryKey: [...QueryKeys.teams.byTournament(tournamentId ?? ""), 'role-based'],
    queryFn: async (): Promise<TeamsListResponseDto> => {
      if (!tournamentId) {
        return TeamDataFilterService.createTeamsListResponse([], userRole, userId);
      }
      
      // Fetch raw teams from API
      const teams = await apiClient.get<Team[]>(`teams?tournamentId=${tournamentId}`);
      
      // Apply role-based filtering and create comprehensive response
      return TeamDataFilterService.createTeamsListResponse(teams, userRole, userId);
    },
    enabled: !!tournamentId,
  });
}

/**
 * Hook to fetch all teams where the current user is a member/owner
 * Supports multi-team membership across different tournaments
 */
export function useUserTeams() {
  const { user } = useAuth();
  const userRole = user?.role as UserRole | null;
  const userId = user?.id;

  console.log('🔍 useUserTeams Debug:', { userId, userRole });

  const isEnabled = !!userId && (
    userRole === UserRole.TEAM_LEADER ||
    userRole === UserRole.TEAM_MEMBER ||
    PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL') ||
    PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL_READONLY')
  );

  console.log('🔍 useUserTeams Query Enabled:', isEnabled);

  return useQuery({
    queryKey: [...QueryKeys.teams.all(), 'user-teams', userId],
    queryFn: async () => {
      console.log('🔍 useUserTeams queryFn executing...');
      if (!userId) return [];

      // For TEAM_LEADER and TEAM_MEMBER roles, they should be able to view their own teams
      // The ownership context will be validated on the backend
      const canViewOwnTeams = userRole === UserRole.TEAM_LEADER ||
                             userRole === UserRole.TEAM_MEMBER ||
                             PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL') ||
                             PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL_READONLY');

      console.log('🔍 useUserTeams canViewOwnTeams:', canViewOwnTeams);

      if (!canViewOwnTeams) {
        console.log('🔍 useUserTeams: No permission to view teams');
        return [];
      }

      try {
        // Fetch user's teams from the new endpoint
        const result = await apiClient.get<Team[]>('teams/user/my-teams');
        console.log('🔍 useUserTeams API result:', result);
        return result;
      } catch (error) {
        console.error('🔍 useUserTeams API error:', error);
        throw error;
      }
    },
    enabled: isEnabled,
  });
}

export function useTeamsMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userRole = user?.role as UserRole | null;

  const createTeam = useMutation({
    mutationFn: async (data: CreateTeamRequest) => {
      // Check permission before attempting to create
      if (!PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'CREATE_ANY') &&
          !PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'CREATE_OWN')) {
        throw new Error('Insufficient permissions to create teams');
      }
      
      return await TeamService.createTeam(data);
    },
    onSuccess: (_, data) => {
      toast.success("Team created successfully");
      [
        QueryKeys.teams.byTournament(data.tournamentId),
  // Ensure the global All Teams list refreshes after creation
  [...QueryKeys.teams.all(), 'all-tournaments'],
        QueryKeys.tournaments.all(),
      ].forEach((queryKey) =>
        queryClient.invalidateQueries({
          queryKey,
        })
      );
    },
    onError: (error: Error) => {
      toast.error(`Failed to create team: ${error.message}`);
    },
  });

  const updateTeam = useMutation({
    mutationFn: async (data: UpdateTeamRequest) => {
      // Check permission before attempting to update
      const canEditAny = PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'EDIT_ANY');
      const canEditOwn = PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'MANAGE_OWN');
      
      if (!canEditAny && !canEditOwn) {
        throw new Error('Insufficient permissions to update teams');
      }
      
      return await TeamService.updateTeam(data);
    },
    onSuccess: (_, data) => {
      toast.success("Team updated successfully");
      queryClient.invalidateQueries({
        queryKey: QueryKeys.tournaments.all(),
      });

      // Update the global All Teams list as well
      queryClient.invalidateQueries({
        queryKey: [...QueryKeys.teams.all(), 'all-tournaments'],
      });

      if (data.tournamentId) {
        queryClient.invalidateQueries({
          queryKey: QueryKeys.teams.byTournament(data.tournamentId),
        });
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to update team: ${error.message}`);
    },
  });

  return {
    createTeam,
    updateTeam,
  };
}
