/**
 * Common User Teams View Component
 *
 * Provides limited team viewing for common users using ownership-based permissions.
 * Shows user's own team with full details and limited info for other teams.
 *
 * Features:
 * - Full details for user's own team
 * - Limited public information for other teams
 * - No CRUD operations or management capabilities
 * - Clear indication of access level
 *
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TeamsTable } from "./TeamsTable";
import { EditTeamDialog } from "@/components/dialogs/EditTeamDialog";
import { useTeamsRoleAccess } from "@/hooks/teams/use-teams-role-access";
import { useUserTeams } from "@/hooks/teams/use-teams";
import { useTeamActions } from "@/hooks/teams/use-team-actions";
import { useAuth } from "@/hooks/common/use-auth";
import { RoleGuard } from "@/components/features/auth/RoleGuard";
import { UserRole } from "@/types/types";
import type { Tournament } from "@/types/types";
import type { OwnTeamDto, PublicTeamDto } from "@/types/team-dto.types";
import type { Team } from "@/types/team.types";

interface CommonTeamsViewProps {
  tournaments: Tournament[];
  selectedTournamentId: string;
  onTournamentChange: (id: string) => void;
  teams: Team[];
  isLoading: boolean;
  tournamentsLoading: boolean;
  hasStoredPreference?: boolean;
}

export function CommonTeamsView({
  tournaments,
  selectedTournamentId,
  onTournamentChange,
  teams,
  isLoading,
  tournamentsLoading,
  hasStoredPreference,
}: CommonTeamsViewProps) {
  const { currentRole, currentUser } = useTeamsRoleAccess();
  const { user } = useAuth();

  // Team actions hook for handling view and edit functionality
  const {
    selectedTeam,
    showEditDialog,
    handleViewTeamById,
    handleEditTeam,
    closeDialogs,
    setShowEditDialog,
  } = useTeamActions();

  // Fetch all teams where the user is a member/owner
  const { data: userTeams = [], isLoading: userTeamsLoading } = useUserTeams();

  // Separate user's teams from other teams
  const { ownTeams, otherTeams, allTeamsForLeader } = useMemo(() => {
    const ownTeams = teams.filter(team => 
      team.userId === user?.id || 
      team.teamMembers?.some(member => member.email === user?.email)
    );
    const otherTeams = teams.filter(team => 
      team.userId !== user?.id && 
      !team.teamMembers?.some(member => member.email === user?.email)
    );

    // For TEAM_LEADER, show all teams in one view but with different edit capabilities
    const allTeamsForLeader = user?.role === UserRole.TEAM_LEADER ? teams : [];

    return { ownTeams, otherTeams, allTeamsForLeader };
  }, [teams, user?.id, user?.email, user?.role]);

  return (
    <RoleGuard
      feature="TEAM_MANAGEMENT"
      action="VIEW_PUBLIC_DATA"
      showUnauthorized={true}
      logFeature="common-teams-view"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-100 tracking-tight mb-1">
              Teams
            </h1>
            <p className="text-base text-gray-400">
              {user?.role === UserRole.TEAM_LEADER
                ? "View all teams and manage your own teams"
                : "View your team details and public team information"}
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            {/* Tournament Selection */}
            <Select
              value={selectedTournamentId}
              onValueChange={onTournamentChange}
            >
              <SelectTrigger className="w-full md:w-56 bg-blue-950 border-blue-700 text-blue-100">
                <SelectValue
                  placeholder={
                    tournamentsLoading
                      ? "Loading tournaments..."
                      : "Select a tournament"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {tournaments?.map((tournament) => (
                  <SelectItem key={tournament.id} value={tournament.id}>
                    <div className="flex items-center gap-2">
                      <span>{tournament.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {tournament._count?.teams || 0} teams
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Access level indicator */}
            <div className="px-3 py-2 bg-gray-800/50 rounded-md border border-gray-600">
              <span className="text-gray-300 text-sm font-medium">
                Limited Access
              </span>
            </div>
          </div>
        </div>

        {/* Team Leader View - All Teams with Edit Capabilities for Own Teams */}
        {user?.role === UserRole.TEAM_LEADER && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-gray-100">All Teams</CardTitle>
                <Badge
                  variant="outline"
                  className="bg-blue-800 text-blue-200"
                >
                  Team Leader Access
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-blue-200">
                        Team Leader Capabilities
                      </h3>
                      <div className="mt-1 text-sm text-blue-300">
                        <ul className="list-disc list-inside space-y-1">
                          <li>View all teams in the tournament</li>
                          <li>Edit teams you own (marked with edit button)</li>
                          <li>View detailed information for all teams</li>
                          <li>No deletion capabilities (admin only)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <TeamsTable
                  teams={allTeamsForLeader}
                  isLoading={isLoading}
                  selectedTournamentId={selectedTournamentId}
                  userRole={currentRole}
                  userId={user?.id}
                  userEmail={user?.email}
                  onViewTeam={handleViewTeamById}
                  onEditTeam={(teamId) => {
                    // Team leaders can edit their own teams
                    const team = allTeamsForLeader.find(t => t.id === teamId);
                    if (team && team.userId === user?.id) {
                      handleEditTeam(team);
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* User's Teams Section - For non-Team Leader roles */}
        {user?.role !== UserRole.TEAM_LEADER && ownTeams.length > 0 && (
          <Card className="border-2 border-green-700 bg-gradient-to-br from-green-950 to-green-900 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-green-200 flex items-center gap-2">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Your Teams ({ownTeams.length})
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="bg-green-800 text-green-200"
                >
                  Team Owner/Member
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-green-200 text-sm">
                  Teams you own or are a member of in this tournament
                </p>

                {/* User's Teams Table */}
                <div className="bg-green-900/30 rounded-lg border border-green-700 overflow-hidden">
                  <TeamsTable
                    teams={ownTeams}
                    isLoading={isLoading}
                    selectedTournamentId={selectedTournamentId}
                    userRole={currentRole}
                    userId={user?.id}
                    userEmail={user?.email}
                    onViewTeam={handleViewTeamById}
                    onEditTeam={(teamId) => {
                      // Team leaders can edit their own teams
                      if (user?.role === UserRole.TEAM_LEADER) {
                        const team = ownTeams.find(t => t.id === teamId);
                        if (team) {
                          handleEditTeam(team);
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Access Information - Only for non-Team Leader roles */}
        {user?.role !== UserRole.TEAM_LEADER && (
          <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-gray-400 mt-0.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-300">
                  Limited Access Information
                </h3>
                <div className="mt-1 text-sm text-gray-400">
                  <p>
                    As a common user, you have limited access to team information:
                  </p>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>Full details for your own team (if registered)</li>
                    <li>
                      Basic public information for other teams (name,
                      organization, rank)
                    </li>
                    <li>No editing or management capabilities</li>
                    <li>
                      Contact administrators for team registration or changes
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other Teams Section - Only for non-Team Leader roles */}
        {user?.role !== UserRole.TEAM_LEADER && (
          <div>
            <h2 className="text-xl font-semibold text-gray-200 mb-4">
              Other Teams (Public Information)
            </h2>

            <TeamsTable
              teams={otherTeams}
              isLoading={isLoading}
              selectedTournamentId={selectedTournamentId}
              userRole={currentRole}
              userId={user?.id}
              userEmail={user?.email}
              onViewTeam={handleViewTeamById}
              // Common users can't edit other teams
            />
          </div>
        )}

        {/* Edit Team Dialog for owned teams */}
        <EditTeamDialog
          open={showEditDialog}
          onOpenChange={(open) => {
            setShowEditDialog(open);
            if (!open) closeDialogs();
          }}
          team={selectedTeam}
          tournamentId={selectedTournamentId}
        />

        {/* Footer Information */}
        <div className="text-center text-sm text-gray-400 border-t border-gray-700 pt-4">
          <p>
            {user?.role === UserRole.TEAM_LEADER ? (
              <>Showing {allTeamsForLeader.length} teams</>
            ) : (
              <>
                Showing {ownTeams.length > 0 ? `${ownTeams.length} your teams and ` : ""}
                {otherTeams.length} other teams
              </>
            )}
            {selectedTournamentId &&
              tournaments?.find((t) => t.id === selectedTournamentId) && (
                <span>
                  {" "}
                  in{" "}
                  {tournaments.find((t) => t.id === selectedTournamentId)?.name}
                </span>
              )}
          </p>
          <p className="mt-1">
            {user?.role === UserRole.TEAM_LEADER ? (
              "Team Leader access: View all teams, edit your own teams"
            ) : (
              "Contact tournament administrators for team registration or to request additional access"
            )}
          </p>
        </div>
      </div>
    </RoleGuard>
  );
}
