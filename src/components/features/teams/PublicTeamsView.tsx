"use client";

import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Eye, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { Tournament } from "@/types/types";
import type { Team } from "@/types/team.types";

interface PublicTeamsViewProps {
  tournaments: Tournament[];
  selectedTournamentId: string;
  onTournamentChange: (id: string) => void;
  teams: Team[];
  isLoading: boolean;
  tournamentsLoading: boolean;
  hasStoredPreference?: boolean;
}

/**
 * Public Teams Table - Read-only version for unauthenticated users
 */
function PublicTeamsTable({ teams, isLoading }: { teams: Team[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gray-800 px-6 py-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-400">Loading teams...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!teams.length) {
    return (
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gray-800 px-6 py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No teams found</h3>
          <p className="text-gray-500">
            No teams have been registered for this tournament yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Team
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Team Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Members
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Organization
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Registered
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-700">
            {Array.isArray(teams) ? teams.map((team) => {
              const memberCount = team.teamMemberCount ?? team._count?.teamMembers ?? team.teamMembers?.length ?? 0;
              const organization = team.teamMembers?.[0]?.organization || "Not specified";

              return (
                <tr key={team.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-100">
                          {team.name}
                        </div>
                        <div className="text-sm text-gray-400">
                          Public ID: {team.id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-100 font-mono">
                      {team.teamNumber || "TBD"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-100">{memberCount}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-100 max-w-xs truncate">
                      {organization}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-100">
                      {format(new Date(team.createdAt), "MMM d, yyyy")}
                    </div>
                  </td>
                </tr>
              );
            }) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PublicTeamsView({
  tournaments,
  selectedTournamentId,
  onTournamentChange,
  teams,
  isLoading,
  tournamentsLoading,
  hasStoredPreference,
}: PublicTeamsViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 tracking-tight mb-1">
            Tournament Teams
          </h1>
          <p className="text-base text-gray-400">
            Browse participating teams in the tournament
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          {/* Tournament Selection with Auto-save Indicator */}
          <div className="flex flex-col gap-1">
            <Select value={selectedTournamentId} onValueChange={onTournamentChange}>
              <SelectTrigger className="w-full md:w-56 bg-blue-950 border-blue-700 text-blue-100">
                <SelectValue placeholder={tournamentsLoading ? "Loading tournaments..." : "Select a tournament"} />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(tournaments) ? tournaments.map((tournament) => (
                  <SelectItem key={tournament.id} value={tournament.id}>
                    <div className="flex items-center gap-2">
                      <span>{tournament.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {tournament._count?.teams || 0} teams
                      </Badge>
                    </div>
                  </SelectItem>
                )) : null}
              </SelectContent>
            </Select>
            
            {/* Auto-save Status Indicator */}
            {hasStoredPreference && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Check className="h-3 w-3 text-green-400" />
                <span>Tournament auto-saved</span>
              </div>
            )}
          </div>

          {/* Public Access indicator */}
          <div className="px-3 py-2 bg-green-800/50 rounded-md border border-green-600">
            <span className="text-green-200 text-sm font-medium">
              Public View
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
              Public Tournament Information
            </h3>
            <div className="mt-1 text-sm text-blue-300">
              <p>This is a public view of tournament participants. You can browse team information without logging in.</p>
              <ul className="mt-2 list-disc list-inside space-y-1 text-blue-400">
                <li>View basic team information and participation details</li>
                <li>See team names, member counts, and organizations</li>
                <li>No login required for viewing</li>
                <li>
                  <a href="/login" className="text-blue-300 hover:text-blue-200 underline">
                    Log in
                  </a>{" "}
                  to access team management features
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Teams Table */}
      <PublicTeamsTable teams={teams} isLoading={isLoading} />

      {/* Footer Information */}
      <div className="text-center text-sm text-gray-400 border-t border-gray-700 pt-4">
        <p>
          Displaying {teams.length} teams
          {selectedTournamentId && tournaments?.find(t => t.id === selectedTournamentId) && (
            <span> in {tournaments.find(t => t.id === selectedTournamentId)?.name}</span>
          )}
        </p>
        <p className="mt-1">
          Want to participate?{" "}
          <a href="/register" className="text-blue-400 hover:text-blue-300 underline">
            Register your team
          </a>{" "}
          or{" "}
          <a href="/login" className="text-blue-400 hover:text-blue-300 underline">
            log in
          </a>{" "}
          to manage your teams
        </p>
      </div>
    </div>
  );
}