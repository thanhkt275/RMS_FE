/**
 * Teams Page Container Component
 *
 * Main container that detects user role and renders the appropriate team view.
 * Integrates with existing hooks and provides role-based routing.
 *
 * Features:
 * - Role detection and appropriate view rendering
 * - Integration with existing data hooks
 * - Consistent error handling and loading states
 * - Backward compatibility with existing functionality
 *
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/common/use-auth";
import { useTeamsPageData } from "@/hooks/teams/use-teams-page-data";
import { useTeamsRoleAccess } from "@/hooks/teams/use-teams-role-access";
import { useTeams } from "@/hooks/teams/use-teams";
import { TeamDataFilterService } from "@/utils/teams/team-data-filter";
import { TeamErrorHandler } from "@/utils/teams/team-error-handler";
import { TeamLoadingState, TeamErrorState, TeamAccessDenied } from "./TeamAccessDenied";
import { AdminTeamsView } from "./AdminTeamsView";
import { RefTeamsView } from "./RefTeamsView";
import { CommonTeamsView } from "./CommonTeamsView";
import { UserRole } from "@/types/types";
import type { OwnTeamDto, PublicTeamDto } from "@/types/team-dto.types";

/**
 * Loading component for the teams page
 */
function TeamsPageLoading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-400">Loading teams...</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Error component for the teams page
 */
function TeamsPageError({ error }: { error: string }) {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 max-w-md">
            <svg
              className="h-12 w-12 text-red-400 mx-auto mb-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <h3 className="text-lg font-semibold text-red-300 mb-2">
              Error Loading Teams
            </h3>
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Teams Page Container Component
 */
export function TeamsPageContainer() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    currentRole,
    currentUser,
    canViewAllTeams,
    canViewOwnTeam,
    canViewPublicData,
  } = useTeamsRoleAccess();

  // Teams page data hook - handles all the complex selection and data fetching logic
  const {
    selectedTournamentId,
    setSelectedTournamentId,
    selectedStageId,
    setSelectedStageId,
    tournaments,
    filteredStages,
    leaderboardRows,
    isLoading: dataLoading,
    tournamentsLoading,
    stagesLoading,
    ALL_TEAMS_OPTION,
  } = useTeamsPageData();

  // All teams query for role-based filtering
  const {
    data: allTeams = [],
    error: teamsError,
    isLoading: teamsLoading,
  } = useTeams(selectedTournamentId);

  // Process teams based on user role
  const processedTeamData = useMemo(() => {
    if (!currentRole) {
      return {
        userTeam: null,
        otherTeams: [],
        filteredTeams: [],
      };
    }

    // Handle empty teams array
    if (!allTeams || !allTeams.length) {
      return {
        userTeam: null,
        otherTeams: [],
        filteredTeams: [],
      };
    }

    // Filter teams based on role
    const filteredTeams = TeamDataFilterService.filterTeamsForRole(
      allTeams,
      currentRole,
      currentUser?.id
    );

    // For common users, separate own team from others
    if (
      currentRole === UserRole.COMMON ||
      currentRole === UserRole.TEAM_MEMBER ||
      currentRole === UserRole.TEAM_LEADER
    ) {
      const userTeam = filteredTeams.find(
        (team) => "isUserTeam" in team && team.isUserTeam
      ) as OwnTeamDto | undefined;

      const otherTeams = filteredTeams.filter(
        (team) => !("isUserTeam" in team) || !team.isUserTeam
      ) as PublicTeamDto[];

      return {
        userTeam: userTeam || null,
        otherTeams,
        filteredTeams,
      };
    }

    return {
      userTeam: null,
      otherTeams: [],
      filteredTeams,
    };
  }, [allTeams, currentRole, currentUser?.id]);

  // Get columns based on role
  const columns = useMemo(() => {
    return TeamDataFilterService.getTeamColumnsForRole(currentRole);
  }, [currentRole]);

  // Show loading state
  if (authLoading || (!user && !authLoading)) {
    return <TeamLoadingState message="Loading authentication..." />;
  }

  // Show error if user is not authenticated
  if (!user) {
    return <TeamsPageError error="Please log in to view teams" />;
  }

  // Show error if role is not recognized
  if (!currentRole) {
    return <TeamsPageError error="Unable to determine user role" />;
  }

  // Show loading state for data
  if (dataLoading && !leaderboardRows.length) {
    return <TeamLoadingState message="Loading team data..." />;
  }

  // Show error if teams failed to load
  if (teamsError) {
    return (
      <TeamsPageError
        error={`Failed to load teams: ${teamsError.message || "Unknown error"}`}
      />
    );
  }

  // Render appropriate view based on role
  switch (currentRole) {
    case UserRole.ADMIN:
      return (
        <div className="container mx-auto py-8 px-4">
          <AdminTeamsView
            tournaments={tournaments || []}
            selectedTournamentId={selectedTournamentId}
            onTournamentChange={setSelectedTournamentId}
            teams={allTeams}
            leaderboardRows={leaderboardRows}
            isLoading={dataLoading || teamsLoading}
            tournamentsLoading={tournamentsLoading}
          />
        </div>
      );

    case UserRole.HEAD_REFEREE:
    case UserRole.ALLIANCE_REFEREE:
      return (
        <div className="container mx-auto py-8 px-4">
          <RefTeamsView
            tournaments={tournaments || []}
            selectedTournamentId={selectedTournamentId}
            onTournamentChange={setSelectedTournamentId}
            leaderboardRows={leaderboardRows}
            isLoading={dataLoading || teamsLoading}
            tournamentsLoading={tournamentsLoading}
            columns={columns}
          />
        </div>
      );

    case UserRole.TEAM_LEADER:
    case UserRole.TEAM_MEMBER:
    case UserRole.COMMON:
      return (
        <div className="container mx-auto py-8 px-4">
          <CommonTeamsView
            tournaments={tournaments || []}
            selectedTournamentId={selectedTournamentId}
            onTournamentChange={setSelectedTournamentId}
            userTeam={processedTeamData.userTeam}
            otherTeams={processedTeamData.otherTeams}
            leaderboardRows={leaderboardRows}
            isLoading={dataLoading || teamsLoading}
            tournamentsLoading={tournamentsLoading}
            limitedColumns={columns}
          />
        </div>
      );

    default:
      return (
        <TeamsPageError
          error={`Unsupported user role: ${currentRole}. Please contact an administrator.`}
        />
      );
  }
}
