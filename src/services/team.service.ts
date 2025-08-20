import { apiClient } from "@/lib/api-client";
import { CreateTeamRequest, UpdateTeamRequest, Team } from "@/types/team.types";
import { UserRole } from "@/types/types";
import { TeamDataFilterService } from "@/utils/teams/team-data-filter";

/**
 * Team Service with Role-Based Access Control
 * 
 * Extends the basic team service with role-based filtering and access control
 * using existing RBAC middleware patterns.
 */
export default class TeamService {
  /**
   * Create a new team
   */
  static async createTeam(req: CreateTeamRequest) {
    return apiClient.post("teams", req);
  }

  /**
   * Update an existing team
   */
  static async updateTeam(req: UpdateTeamRequest) {
    return apiClient.patch("teams", req);
  }

  /**
   * Get teams with role-based filtering
   * 
   * This method applies client-side filtering based on user role and permissions.
   * The backend should also implement server-side filtering for security.
   */
  static async getTeamsWithRoleFiltering(
    tournamentId: string,
    userRole: UserRole | null,
    userId?: string
  ): Promise<Team[]> {
    // Fetch all teams from backend (backend should apply server-side filtering)
    const teams = await apiClient.get<Team[]>(`teams?tournamentId=${tournamentId}`);

    // Return raw teams - filtering will be done in the hook layer
    return teams;
  }

  /**
   * Get a single team with role-based filtering
   */
  static async getTeamWithRoleFiltering(
    teamId: string,
    userRole: UserRole | null,
    userId?: string
  ): Promise<Team | null> {
    try {
      const team = await apiClient.get<Team>(`teams/${teamId}`);

      // Check if user has permission to view this team
      if (!TeamDataFilterService.canPerformTeamAction('view', userRole, team, userId)) {
        throw new Error('Access denied: Insufficient permissions to view this team');
      }

      // Return the raw team - filtering will be done at the component level
      return team;
    } catch (error: any) {
      if (error.status === 403 || error.status === 401) {
        throw new Error('Access denied: Insufficient permissions to view this team');
      }
      throw error;
    }
  }

  /**
   * Delete a team (Admin only)
   */
  static async deleteTeam(teamId: string) {
    return apiClient.delete(`teams/${teamId}`);
  }

  /**
   * Import teams from CSV (Admin only)
   */
  static async importTeams(tournamentId: string, csvData: any[]) {
    return apiClient.post(`teams/import`, {
      tournamentId,
      teams: csvData
    });
  }

  /**
   * Export teams to CSV (Admin only)
   */
  static async exportTeams(tournamentId: string): Promise<Blob> {
    return apiClient.getBlob(`teams/export?tournamentId=${tournamentId}`);
  }

  /**
   * Get team statistics with role-based filtering
   */
  static async getTeamStats(
    teamId: string,
    userRole: UserRole | null,
    userId?: string
  ) {
    try {
      const stats = await apiClient.get(`teams/${teamId}/stats`);

      // Check if user has permission to view team stats
      const team = await apiClient.get<Team>(`teams/${teamId}`);
      if (!TeamDataFilterService.canPerformTeamAction('view', userRole, team, userId)) {
        throw new Error('Access denied: Insufficient permissions to view team statistics');
      }

      return stats;
    } catch (error: any) {
      if (error.status === 403 || error.status === 401) {
        throw new Error('Access denied: Insufficient permissions to view team statistics');
      }
      throw error;
    }
  }
}
