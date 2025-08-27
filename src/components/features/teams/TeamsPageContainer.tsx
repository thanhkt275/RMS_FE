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

import { useMemo, useEffect, useState, useCallback } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/common/use-auth";
import { useTeamsPageData } from "@/hooks/teams/use-teams-page-data";
import { useTeamsRoleAccess } from "@/hooks/teams/use-teams-role-access";
import { useTeams } from "@/hooks/teams/use-teams";
import { usePublicTeams, usePublicTournaments } from "@/hooks/teams/use-public-teams";
import { usePublicTournamentPreferences } from "@/hooks/common/use-tournament-preferences";
import { TeamDataFilterService } from "@/utils/teams/team-data-filter";
import { TeamLoadingState, TeamErrorState, TeamAccessDenied } from "./TeamAccessDenied";
import { AdminTeamsView } from "./AdminTeamsView";
import { RefTeamsView } from "./RefTeamsView";
import { CommonTeamsView } from "./CommonTeamsView";
import { PublicTeamsView } from "./PublicTeamsView";
import { ResponsiveTeamsDisplay } from "./ResponsiveTeamsDisplay";
import { UserRole } from "@/types/types";
import type { OwnTeamDto, PublicTeamDto } from "@/types/team-dto.types";

/**
 * Loading component for the teams page
 */
const TeamsPageLoading = React.memo(function TeamsPageLoading() {
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
});

/**
 * Error component for the teams page
 */
const TeamsPageError = React.memo(function TeamsPageError({ error }: { error: string }) {
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
});

/**
 * Main Teams Page Container Component
 */
export const TeamsPageContainer = React.memo(function TeamsPageContainer({ initialTournamentId }: { initialTournamentId?: string } = {}) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const {
    currentRole,
    currentUser,
    canViewAllTeams,
    canViewOwnTeam,
    canViewPublicData,
  } = useTeamsRoleAccess();

  // State for public view tournament selection with auto-save
  const {
    data: publicTournaments = [],
    isLoading: publicTournamentsLoading,
    error: publicTournamentsError,
  } = usePublicTournaments();

  // Auto-save public tournament selection
  const {
    selectedTournamentId: publicSelectedTournamentId,
    setSelectedTournamentId: setPublicSelectedTournamentId,
    hasStoredPreference: hasPublicStoredPreference,
  } = usePublicTournamentPreferences(publicTournaments);

  const {
    data: publicTeams = [],
    isLoading: publicTeamsLoading,
    error: publicTeamsError,
  } = usePublicTeams(publicSelectedTournamentId);

  // Memoized callback for public tournament selection
  const handlePublicTournamentChange = useCallback((tournamentId: string) => {
    setPublicSelectedTournamentId(tournamentId);
  }, [setPublicSelectedTournamentId]);

  // Remove the old useEffect for setting initial tournament since it's now handled by preferences

  // Teams page data hook - handles all the complex selection and data fetching logic (for authenticated users)
  const {
    selectedTournamentId,
    setSelectedTournamentId,
    selectedStageId,
    setSelectedStageId,
    tournaments,
    filteredStages,
    isLoading: dataLoading,
    tournamentsLoading,
    stagesLoading,
    hasStoredPreference,
    ALL_TEAMS_OPTION,
  } = useTeamsPageData();

  // Memoized callback for tournament selection (authenticated users)
  const handleTournamentChange = useCallback((tournamentId: string) => {
    setSelectedTournamentId(tournamentId);
  }, [setSelectedTournamentId]);

  // All teams query for role-based filtering (for authenticated users)
  const {
    data: allTeams = [],
    error: teamsError,
    isLoading: teamsLoading,
  } = useTeams(user ? selectedTournamentId : undefined); // Only fetch if authenticated


  // Process teams based on user role (only for authenticated users)
  // Optimized with better dependency management to prevent unnecessary re-computations
  const processedTeamData = useMemo(() => {
    // Early return for unauthenticated users or missing role
    if (!user || !currentRole) {
      return {
        userTeam: null,
        otherTeams: [],
        filteredTeams: [],
      };
    }

    // Early return for empty teams array
    if (!allTeams?.length) {
      return {
        userTeam: null,
        otherTeams: [],
        filteredTeams: [],
      };
    }

    // Filter teams based on role - this is the expensive computation
    const filteredTeams = TeamDataFilterService.filterTeamsForRole(
      allTeams,
      currentRole,
      currentUser?.id
    );

    // For common users, separate own team from others
    const isCommonUser = (
      currentRole === UserRole.COMMON ||
      currentRole === UserRole.TEAM_MEMBER ||
      currentRole === UserRole.TEAM_LEADER
    );

    if (isCommonUser) {
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
  }, [
    user,
    currentRole,
    currentUser?.id,
    allTeams, // This is already memoized by React Query
  ]);

  // Note: Removed auto-redirect logic to support multi-team membership
  // Users can now see all their teams across different tournaments

  // Get columns based on role (only for authenticated users)
  // Memoized to prevent unnecessary recomputation when role doesn't change
  const columns = useMemo(() => {
    if (!currentRole) return [];
    return TeamDataFilterService.getTeamColumnsForRole(currentRole);
  }, [currentRole]);

  // Memoized tournament arrays for better performance
  const memoizedPublicTournaments = useMemo(() => {
    return Array.isArray(publicTournaments) ? publicTournaments : [];
  }, [publicTournaments]);

  const memoizedPublicTeams = useMemo(() => {
    return Array.isArray(publicTeams) ? publicTeams : [];
  }, [publicTeams]);

  const memoizedTournaments = useMemo(() => {
    return tournaments || [];
  }, [tournaments]);

  // Show loading state
  if (authLoading) {
    return <TeamLoadingState message="Loading authentication..." />;
  }

  // Show public view if user is not authenticated
  if (!user) {
    // Show error if tournaments failed to load
    if (publicTournamentsError) {
      return (
        <div className="container mx-auto py-8 px-4">
          <TeamsPageError
            error={`Failed to load tournaments: ${publicTournamentsError.message || "Unable to connect to server"}`}
          />
        </div>
      );
    }

    return (
      <div className="container mx-auto py-8 px-4">
        <PublicTeamsView
          tournaments={memoizedPublicTournaments}
          selectedTournamentId={publicSelectedTournamentId}
          onTournamentChange={handlePublicTournamentChange}
          teams={memoizedPublicTeams}
          isLoading={publicTeamsLoading}
          tournamentsLoading={publicTournamentsLoading}
          hasStoredPreference={hasPublicStoredPreference}
        />
      </div>
    );
  }

  // Show error if role is not recognized
  if (!currentRole) {
    return <TeamsPageError error="Unable to determine user role" />;
  }

  // Show loading state for data
  if (dataLoading) {
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
          tournaments={memoizedTournaments}
          selectedTournamentId={selectedTournamentId}
          onTournamentChange={handleTournamentChange}
          teams={allTeams}
          isLoading={dataLoading || teamsLoading}
          tournamentsLoading={tournamentsLoading}
          hasStoredPreference={hasStoredPreference}
        />
        </div>
      );

    case UserRole.HEAD_REFEREE:
    case UserRole.ALLIANCE_REFEREE:
      return (
        <div className="container mx-auto py-8 px-4">
          <RefTeamsView
            tournaments={memoizedTournaments}
            selectedTournamentId={selectedTournamentId}
            onTournamentChange={handleTournamentChange}
            teams={allTeams}
            isLoading={dataLoading || teamsLoading}
            tournamentsLoading={tournamentsLoading}
            hasStoredPreference={hasStoredPreference}
          />
        </div>
      );

    case UserRole.TEAM_LEADER:
    case UserRole.TEAM_MEMBER:
    case UserRole.COMMON:
      return (
        <div className="container mx-auto py-8 px-4">
          <CommonTeamsView
            tournaments={memoizedTournaments}
            selectedTournamentId={selectedTournamentId}
            onTournamentChange={handleTournamentChange}
            teams={allTeams}
            isLoading={dataLoading || teamsLoading}
            tournamentsLoading={tournamentsLoading}
            hasStoredPreference={hasStoredPreference}
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
});
