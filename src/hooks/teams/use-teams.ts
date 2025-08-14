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
      
      // Check if user has permission to view teams
      const canViewAll = PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL') ||
                        PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL_READONLY');
      
      const team = await apiClient.get<Team>(`teams/${teamId}`);
      
      // For team members/leaders, check if they can view this specific team
      if (!canViewAll) {
        const canViewOwn = PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_OWN');
        const canViewLimited = PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_LIMITED');
        
        if (canViewOwn) {
          // Check if user is part of this team
          const isTeamMember = team.userId === userId || 
                              team.teamMembers?.some(member => member.email === user?.email);
          if (!isTeamMember) {
            throw new Error('You can only view your own team details');
          }
        } else if (!canViewLimited) {
          throw new Error('Insufficient permissions to view team details');
        }
      }
      
      return team;
    },
    enabled: !!teamId,
  });
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
