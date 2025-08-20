/**
 * Referee Teams View Component
 * 
 * Provides read-only access to all team information for referees.
 * Leverages existing role-based access patterns and permission checks.
 * 
 * Features:
 * - Read-only view of all teams
 * - Full team information display (non-sensitive)
 * - Filtering and sorting capabilities
 * - No CRUD operations or import/export
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

"use client";

import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeaderboardTable } from "@/components/features/leaderboard/leaderboard-table";
import { LeaderboardFilters } from "@/components/features/leaderboard/leaderboard-filters";
import { getTeamLeaderboardColumns, TeamLeaderboardRow } from "@/components/features/leaderboard/team-leaderboard-columns";
import { useTeamsRoleAccess } from "@/hooks/teams/use-teams-role-access";
import { RoleGuard } from "@/components/features/auth/RoleGuard";
import type { Tournament } from "@/types/types";
import type { TeamColumn } from "@/utils/teams/team-data-filter";

interface RefTeamsViewProps {
  tournaments: Tournament[];
  selectedTournamentId: string;
  onTournamentChange: (id: string) => void;
  leaderboardRows: TeamLeaderboardRow[];
  isLoading: boolean;
  tournamentsLoading: boolean;
  columns: TeamColumn[];
}

export function RefTeamsView({
  tournaments,
  selectedTournamentId,
  onTournamentChange,
  leaderboardRows,
  isLoading,
  tournamentsLoading,
  columns,
}: RefTeamsViewProps) {
  const { currentRole, isReferee } = useTeamsRoleAccess();

  // State for leaderboard filters
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [rankRange, setRankRange] = useState<[number, number]>([1, 100]);
  const [totalScoreRange, setTotalScoreRange] = useState<[number, number]>([0, 1000]);

  // Filtering logic for leaderboard
  const filteredRows: TeamLeaderboardRow[] = useMemo(
    () =>
      leaderboardRows.filter(
        (row) =>
          (!teamName || row.teamName.toLowerCase().includes(teamName.toLowerCase())) &&
          (!teamCode || row.teamCode.toLowerCase().includes(teamCode.toLowerCase())) &&
          row.rank >= rankRange[0] &&
          row.rank <= rankRange[1] &&
          row.totalScore >= totalScoreRange[0] &&
          row.totalScore <= totalScoreRange[1]
      ),
    [leaderboardRows, teamName, teamCode, rankRange, totalScoreRange]
  );

  // Get columns based on referee role permissions
  const visibleColumns = useMemo(() => {
    return getTeamLeaderboardColumns(currentRole);
  }, [currentRole]);

  return (
    <RoleGuard
      feature="TEAM_MANAGEMENT"
      action="VIEW_ALL_READONLY"
      showUnauthorized={true}
      logFeature="referee-teams-view"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-100 tracking-tight mb-1">
              Teams Overview
            </h1>
            <p className="text-base text-gray-400">
              View all team information and statistics ({currentRole} access)
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            {/* Tournament Selection */}
            <Select value={selectedTournamentId} onValueChange={onTournamentChange}>
              <SelectTrigger className="w-full md:w-56 bg-blue-950 border-blue-700 text-blue-100">
                <SelectValue placeholder={tournamentsLoading ? "Loading tournaments..." : "Select a tournament"} />
              </SelectTrigger>
              <SelectContent>
                {tournaments?.map((tournament) => (
                  <SelectItem key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Role indicator */}
            <div className="px-3 py-2 bg-blue-800/50 rounded-md border border-blue-600">
              <span className="text-blue-200 text-sm font-medium">
                {isReferee ? "Referee View" : "Read-Only Access"}
              </span>
            </div>
          </div>
        </div>

        {/* Information Banner */}
        <div className="bg-blue-900/40 border border-blue-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-200">
                Referee Access Information
              </h3>
              <div className="mt-1 text-sm text-blue-300">
                <p>You have read-only access to all team information for officiating purposes.</p>
                <ul className="mt-2 list-disc list-inside space-y-1 text-blue-400">
                  <li>View all team details and member information</li>
                  <li>Access team statistics and performance data</li>
                  <li>Filter and sort teams for match preparation</li>
                  <li>No editing, creation, or deletion capabilities</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Teams Table */}
        <LeaderboardTable
          data={filteredRows}
          columns={visibleColumns}
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
          emptyMessage="No teams found for the selected tournament."
          tableMeta={{
            userRole: currentRole,
            userId: null, // Referees have read-only access
            userEmail: null
          }}
        />

        {/* Footer Information */}
        <div className="text-center text-sm text-gray-400 border-t border-gray-700 pt-4">
          <p>
            Displaying {filteredRows.length} of {leaderboardRows.length} teams
            {selectedTournamentId && tournaments?.find(t => t.id === selectedTournamentId) && (
              <span> in {tournaments.find(t => t.id === selectedTournamentId)?.name}</span>
            )}
          </p>
          <p className="mt-1">
            Referee view provides comprehensive team information for match officiating
          </p>
        </div>
      </div>
    </RoleGuard>
  );
}