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

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LeaderboardTable } from "@/components/features/leaderboard/leaderboard-table";
import { LeaderboardFilters } from "@/components/features/leaderboard/leaderboard-filters";
import {
  teamLeaderboardColumns,
  TeamLeaderboardRow,
} from "@/components/features/leaderboard/team-leaderboard-columns";
import { useTeamsRoleAccess } from "@/hooks/teams/use-teams-role-access";
import { RoleGuard } from "@/components/features/auth/RoleGuard";
import type { Tournament } from "@/types/types";
import type { TeamColumn } from "@/utils/teams/team-data-filter";
import type { OwnTeamDto, PublicTeamDto } from "@/types/team-dto.types";

interface CommonTeamsViewProps {
  tournaments: Tournament[];
  selectedTournamentId: string;
  onTournamentChange: (id: string) => void;
  userTeam: OwnTeamDto | null;
  otherTeams: PublicTeamDto[];
  leaderboardRows: TeamLeaderboardRow[];
  isLoading: boolean;
  tournamentsLoading: boolean;
  limitedColumns: TeamColumn[];
}

export function CommonTeamsView({
  tournaments,
  selectedTournamentId,
  onTournamentChange,
  userTeam,
  otherTeams,
  leaderboardRows,
  isLoading,
  tournamentsLoading,
  limitedColumns,
}: CommonTeamsViewProps) {
  const { currentRole, currentUser } = useTeamsRoleAccess();

  // State for leaderboard filters (only for public teams)
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [rankRange, setRankRange] = useState<[number, number]>([1, 100]);
  const [totalScoreRange, setTotalScoreRange] = useState<[number, number]>([
    0, 1000,
  ]);

  // Filter leaderboard rows to show only public information
  const filteredPublicRows: TeamLeaderboardRow[] = useMemo(
    () =>
      leaderboardRows
        .filter((row) => !userTeam || row.id !== userTeam.id) // Exclude user's own team from public list
        .filter(
          (row) =>
            (!teamName ||
              row.teamName.toLowerCase().includes(teamName.toLowerCase())) &&
            (!teamCode ||
              row.teamCode.toLowerCase().includes(teamCode.toLowerCase())) &&
            row.rank >= rankRange[0] &&
            row.rank <= rankRange[1] &&
            row.totalScore >= totalScoreRange[0] &&
            row.totalScore <= totalScoreRange[1]
        ),
    [leaderboardRows, userTeam, teamName, teamCode, rankRange, totalScoreRange]
  );

  // Filter columns to show only public information
  const publicColumns = useMemo(() => {
    return teamLeaderboardColumns.filter((column) => {
      // Only show basic public columns for common users
      const allowedColumns = ["teamName", "organization", "rank", "totalScore"];
      return allowedColumns.includes(column.id || "");
    });
  }, []);

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
              View your team details and public team information
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
                    {tournament.name}
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

        {/* User's Own Team Section */}
        {userTeam ? (
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
                  Your Team
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="bg-green-800 text-green-200"
                >
                  Team Member
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold text-green-300 mb-1">
                    Team Name
                  </h4>
                  <p className="text-green-100">{userTeam.name}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-green-300 mb-1">
                    Team Number
                  </h4>
                  <p className="text-green-100">{userTeam.teamNumber}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-green-300 mb-1">
                    Organization
                  </h4>
                  <p className="text-green-100">{userTeam.organization}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-green-300 mb-1">Members</h4>
                  <p className="text-green-100">
                    {userTeam.memberCount} members
                  </p>
                </div>
                {userTeam.description && (
                  <div className="md:col-span-2">
                    <h4 className="font-semibold text-green-300 mb-1">
                      Description
                    </h4>
                    <p className="text-green-100">{userTeam.description}</p>
                  </div>
                )}
              </div>

              {/* Team Members */}
              {userTeam.members && userTeam.members.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold text-green-300 mb-3">
                    Team Members
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {userTeam.members.map((member, index) => (
                      <div
                        key={member.id || index}
                        className="bg-green-900/40 rounded-lg p-3 border border-green-700"
                      >
                        <div className="font-medium text-green-200">
                          {member.name}
                        </div>
                        {member.email && (
                          <div className="text-sm text-green-300">
                            {member.email}
                          </div>
                        )}
                        {member.organization && (
                          <div className="text-sm text-green-400">
                            {member.organization}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-yellow-700 bg-gradient-to-br from-yellow-950 to-yellow-900 shadow-xl">
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-8 w-8 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-yellow-200">
                    No Team Registered
                  </h3>
                  <p className="text-yellow-300">
                    You are not currently part of any team in this tournament.
                    Contact your team leader or tournament administrator to join
                    a team.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Access Information */}
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

        {/* Other Teams Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-200 mb-4">
            Other Teams (Public Information)
          </h2>

          <LeaderboardTable
            data={filteredPublicRows}
            columns={publicColumns}
            loading={isLoading}
            filterUI={
              <LeaderboardFilters
                teamName={teamName}
                setTeamName={setTeamName}
                teamCode={teamCode}
                setTeamCode={setTeamCode}
                rankRange={rankRange}
                setRankRange={setRankRange}
                totalScoreRange={totalScoreRange}
                setTotalScoreRange={setTotalScoreRange}
              />
            }
            initialSorting={[{ id: "rank", desc: false }]}
            emptyMessage="No other teams found in this tournament."
          />
        </div>

        {/* Footer Information */}
        <div className="text-center text-sm text-gray-400 border-t border-gray-700 pt-4">
          <p>
            Showing {userTeam ? "your team and " : ""}
            {filteredPublicRows.length} other teams
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
            Contact tournament administrators for team registration or to
            request additional access
          </p>
        </div>
      </div>
    </RoleGuard>
  );
}
