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
 * - Auto-save tournament selection
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

"use client";

import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { TeamsTable } from "./TeamsTable";
import { useTeamsRoleAccess } from "@/hooks/teams/use-teams-role-access";
import { useTeamActions } from "@/hooks/teams/use-team-actions";
import { useAuth } from "@/hooks/common/use-auth";
import { RoleGuard } from "@/components/features/auth/RoleGuard";
import type { Tournament } from "@/types/types";
import type { Team } from "@/types/team.types";

interface RefTeamsViewProps {
  tournaments: Tournament[];
  selectedTournamentId: string;
  onTournamentChange: (id: string) => void;
  teams: Team[];
  isLoading: boolean;
  tournamentsLoading: boolean;
  hasStoredPreference?: boolean;
}

export function RefTeamsView({
  tournaments,
  selectedTournamentId,
  onTournamentChange,
  teams,
  isLoading,
  tournamentsLoading,
  hasStoredPreference,
}: RefTeamsViewProps) {
  const { currentRole, isReferee } = useTeamsRoleAccess();
  const { user } = useAuth();
  
  // Team actions hook for handling view functionality
  const { handleViewTeamById } = useTeamActions();

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
            {/* Tournament Selection with Auto-save Indicator */}
            <div className="flex flex-col gap-1">
              <Select value={selectedTournamentId} onValueChange={onTournamentChange}>
                <SelectTrigger className="w-full md:w-56 bg-blue-950 border-blue-700 text-blue-100">
                  <SelectValue placeholder={tournamentsLoading ? "Loading tournaments..." : "Select a tournament"} />
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
              
              {/* Auto-save Status Indicator */}
              {hasStoredPreference && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="h-3 w-3 text-green-400" />
                  <span>Tournament auto-saved</span>
                </div>
              )}
            </div>

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
        <TeamsTable
          teams={teams}
          isLoading={isLoading}
          selectedTournamentId={selectedTournamentId}
          userRole={currentRole}
          userId={user?.id}
          userEmail={user?.email}
          onViewTeam={handleViewTeamById}
          // Referees have read-only access, no edit/delete
        />

        {/* Footer Information */}
        <div className="text-center text-sm text-gray-400 border-t border-gray-700 pt-4">
          <p>
            Displaying {teams.length} teams
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