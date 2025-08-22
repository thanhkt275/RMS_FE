/**
 * Admin Teams View Component
 *
 * Provides full CRUD operations for administrators using existing permission checks.
 * Integrates with existing team management hooks and UI patterns.
 *
 * Features:
 * - Full team management capabilities
 * - Import/export functionality
 * - Comprehensive team data display
 * - Integration with existing hooks and services
 *
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadIcon, DownloadIcon, PlusIcon, Check, Clock } from "lucide-react";
import { TeamsTable } from "./TeamsTable";
import { ResponsiveTeamsDisplay } from "./ResponsiveTeamsDisplay";
import { DeleteTeamDialog } from "@/components/dialogs/DeleteTeamDialog";
import { EditTeamDialog } from "@/components/dialogs/EditTeamDialog";

import { useTeamManagement } from "@/hooks/teams/use-team-management";
import { useTeamsRoleAccess } from "@/hooks/teams/use-teams-role-access";
import { useTeamActions } from "@/hooks/teams/use-team-actions";
import { useAuth } from "@/hooks/common/use-auth";
import { TeamErrorHandler } from "@/utils/teams/team-error-handler";
import { RoleGuard } from "@/components/features/auth/RoleGuard";
import type { Tournament } from "@/types/types";
import type { Team } from "@/types/team.types";
import type { CreateTeamDto, UpdateTeamDto } from "@/types/team-dto.types";

interface AdminTeamsViewProps {
  tournaments: Tournament[];
  selectedTournamentId: string;
  onTournamentChange: (id: string) => void;
  teams: Team[];
  isLoading: boolean;
  tournamentsLoading: boolean;
  hasStoredPreference?: boolean;
  lastSavedAt?: number | null;
  onCreateTeam?: (team: CreateTeamDto) => void;
  onUpdateTeam?: (team: UpdateTeamDto) => void;
  onDeleteTeam?: (id: string) => void;
}

export const AdminTeamsView = React.memo(function AdminTeamsView({
  tournaments,
  selectedTournamentId,
  onTournamentChange,
  teams,
  isLoading,
  tournamentsLoading,
  hasStoredPreference,
  lastSavedAt,
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam,
}: AdminTeamsViewProps) {
  const {
    isImporting,
    importResult,
    importTeams,
    exportTeams,
    setImportResult,
    canImportExport,
  } = useTeamManagement();

  const { getAccessDeniedMessage, currentRole } = useTeamsRoleAccess();
  const { user } = useAuth();
  
  // Team actions hook for handling view, edit, delete
  const {
    selectedTeam,
    showEditDialog,
    showDeleteDialog,
    handleViewTeamById,
    handleEditTeam,
    handleDeleteTeam,
    confirmDeleteTeam,
    closeDialogs,
    isDeleting,
    setShowEditDialog,
    setShowDeleteDialog,
  } = useTeamActions();

  // Local UI state for import functionality
  const [showImportCard, setShowImportCard] = useState(false);
  const [importContent, setImportContent] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [delimiter, setDelimiter] = useState<string>(",");

  // Optimized event handlers with useCallback
  const handleImport = useCallback(async () => {
    const result = await importTeams(
      importContent,
      selectedTournamentId,
      delimiter
    );
    if (result.success) {
      // Success is handled by the hook
    }
  }, [importTeams, importContent, selectedTournamentId, delimiter]);

  const handleExport = useCallback(() => {
    exportTeams(teams);
  }, [exportTeams, teams]);

  const handleCreateTeam = useCallback(() => {
    // TODO: Implement create team dialog
    console.log("Create team functionality to be implemented");
  }, []);

  const handleImportContentChange = useCallback((content: string) => {
    setImportContent(content);
  }, []);

  const handleDelimiterChange = useCallback((newDelimiter: string) => {
    setDelimiter(newDelimiter);
  }, []);

  const handleToggleImportCard = useCallback(() => {
    setShowImportCard(prev => !prev);
  }, []);

  const handleClearImportResult = useCallback(() => {
    setImportResult(null);
  }, [setImportResult]);

  // Memoized callbacks for TeamsTable
  const handleEditTeamById = useCallback((teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      handleEditTeam(team);
    }
  }, [teams, handleEditTeam]);

  const handleDeleteTeamById = useCallback((teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      handleDeleteTeam(team);
    }
  }, [teams, handleDeleteTeam]);

  const handleEditDialogChange = useCallback((open: boolean) => {
    setShowEditDialog(open);
    if (!open) closeDialogs();
  }, [closeDialogs]);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    setShowDeleteDialog(open);
    if (!open) closeDialogs();
  }, [closeDialogs]);

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 tracking-tight mb-1">
            Teams Management
          </h1>
          <p className="text-base text-gray-400">
            Full administrative control over teams, import/export, and
            management
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          {/* Tournament Selection with Auto-save Indicator */}
          <div className="flex flex-col gap-1">
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
            
            {/* Auto-save Status Indicator */}
            {hasStoredPreference && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Check className="h-3 w-3 text-green-400" />
                <span>Tournament auto-saved</span>
              </div>
            )}
          </div>

          {/* Admin Actions */}
          <RoleGuard
            feature="TEAM_MANAGEMENT"
            action="CREATE_ANY"
            fallback={null}
          >
            <Button
              onClick={handleCreateTeam}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-800"
            >
              <PlusIcon size={16} /> Create Team
            </Button>
          </RoleGuard>

          <RoleGuard
            feature="TEAM_MANAGEMENT"
            action="IMPORT_EXPORT"
            fallback={
              <Button
                variant="outline"
                disabled
                title={TeamErrorHandler.getTooltipMessage(
                  "export",
                  currentRole
                )}
                className="flex items-center gap-2"
              >
                <DownloadIcon size={16} /> Export
              </Button>
            }
          >
            <Button
              onClick={handleExport}
              variant="outline"
              className="flex items-center gap-2"
            >
              <DownloadIcon size={16} /> Export
            </Button>
          </RoleGuard>

          <RoleGuard
            feature="TEAM_MANAGEMENT"
            action="IMPORT_EXPORT"
            fallback={
              <Button
                variant="outline"
                disabled
                title={TeamErrorHandler.getTooltipMessage(
                  "import",
                  currentRole
                )}
                className="flex items-center gap-2"
              >
                <UploadIcon size={16} /> Import
              </Button>
            }
          >
            <Button
              onClick={() => {
                setShowImportCard(!showImportCard);
                if (!showImportCard) {
                  // Reset form when opening
                  setImportContent("");
                  setImportResult(null);
                  setImportError(null);
                  setDelimiter(",");
                }
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <UploadIcon size={16} /> Import
            </Button>
          </RoleGuard>


        </div>
      </div>

      {/* Import Card */}
      {showImportCard && canImportExport && (
        <Card className="border-2 border-blue-700 bg-gradient-to-br from-blue-950 to-blue-900 shadow-xl">
          <CardContent className="py-6">
            <div className="flex items-center gap-2 mb-4">
              <UploadIcon size={22} className="text-blue-400" />
              <h3 className="font-bold text-lg text-blue-200 tracking-wide">
                Import Teams from CSV
              </h3>
            </div>

            {/* Tournament Selection */}
            <div className="mb-4">
              <label className="block mb-2 font-semibold text-blue-300">
                Select Tournament
              </label>
              <Select
                value={selectedTournamentId}
                onValueChange={onTournamentChange}
              >
                <SelectTrigger className="w-full bg-blue-950 border-blue-700 text-blue-100">
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
              {!selectedTournamentId ? (
                <p className="text-blue-400 text-xs mt-1">
                  ⚠️ A tournament must be selected to import teams
                </p>
              ) : (
                <p className="text-green-400 text-xs mt-1">
                  ✓ Tournament selected:{" "}
                  {
                    tournaments?.find((t) => t.id === selectedTournamentId)
                      ?.name
                  }
                </p>
              )}
            </div>

            {/* CSV Delimiter Selection */}
            <div className="mb-4">
              <label className="block mb-2 font-semibold text-blue-300">
                CSV Delimiter
              </label>
              <Select value={delimiter} onValueChange={setDelimiter}>
                <SelectTrigger className="w-full bg-blue-950 border-blue-700 text-blue-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=",">, (Comma)</SelectItem>
                  <SelectItem value=";">; (Semicolon)</SelectItem>
                  <SelectItem value={"\t"}>Tab</SelectItem>
                  <SelectItem value="|">| (Pipe)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Instructions */}
            <div className="mb-4 text-blue-100 text-sm">
              <span className="font-semibold text-blue-300">Instructions:</span>{" "}
              Follow these steps to import teams:
              <ol className="mt-2 ml-4 space-y-1 text-blue-200">
                <li>
                  1.{" "}
                  <span className="font-semibold text-blue-300">
                    Select a tournament
                  </span>{" "}
                  from the dropdown above
                </li>
                <li>
                  2.{" "}
                  <span className="font-semibold text-blue-300">
                    Choose CSV delimiter
                  </span>{" "}
                  that matches your file format
                </li>
                <li>
                  3.{" "}
                  <span className="font-semibold text-blue-300">
                    Upload a CSV file
                  </span>{" "}
                  or paste CSV content below
                </li>
                <li>
                  4.{" "}
                  <span className="font-semibold text-blue-300">
                    Click Import
                  </span>{" "}
                  when all fields are filled
                </li>
              </ol>
              <div className="mt-3 p-2 bg-blue-800/40 rounded border border-blue-600">
                <span className="text-blue-300 font-semibold">
                  Required CSV columns:
                </span>
                <span className="font-mono bg-blue-800/60 px-1 rounded ml-1">
                  Name
                </span>
                ,
                <span className="font-mono bg-blue-800/60 px-1 rounded ml-1">
                  Organization
                </span>
                ,
                <span className="font-mono bg-blue-800/60 px-1 rounded ml-1">
                  Description
                </span>
              </div>
            </div>

            {/* File Upload */}
            <label className="block mb-2 font-semibold text-blue-300">
              Upload CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              className="mb-4 block w-full text-sm text-blue-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-800/80 file:text-blue-200 hover:file:bg-blue-700/80"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                handleImportContentChange(text);
                setImportError(null);
              }}
            />

            {/* Text Area */}
            <label className="block mb-2 font-semibold text-blue-300 mt-4">
              Or Paste CSV Content
            </label>
            <textarea
              className="w-full h-32 p-2 rounded border border-blue-700 bg-blue-950 text-blue-100 mb-2 focus:ring-2 focus:ring-blue-400"
              placeholder="Paste CSV content here. Columns: Name, Organization, Description."
              value={importContent}
              onChange={(e) => handleImportContentChange(e.target.value)}
            />

            {/* Error Display */}
            {importError && (
              <div className="text-red-400 text-sm mb-2 font-semibold border-l-4 border-red-500 pl-2 bg-red-950/60 py-1">
                {importError}
              </div>
            )}

            {/* Success indicator */}
            {importContent && !importError && (
              <div className="text-green-400 text-sm mb-2 font-semibold border-l-4 border-green-500 pl-2 bg-green-950/60 py-1">
                ✓ CSV content loaded ({importContent.split("\n").length} rows)
              </div>
            )}

            {/* Preview */}
            {importContent && (
              <div className="bg-blue-900/80 text-blue-100 rounded p-3 mb-3 text-xs border border-blue-700">
                <div className="font-bold mb-1 text-blue-300">Preview:</div>
                {importContent
                  .split("\n")
                  .slice(0, 3)
                  .map((row, i) => (
                    <div key={i} className="font-mono text-blue-200">
                      {row}
                    </div>
                  ))}
                {importContent.split("\n").length > 3 && (
                  <div className="text-blue-400">...</div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleImport}
                disabled={
                  isImporting || !importContent.trim() || !selectedTournamentId
                }
                className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-6 py-2 rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UploadIcon size={16} className="mr-2" />
                {isImporting ? "Importing..." : "Import"}
              </Button>

              <Button
                variant="outline"
                onClick={handleClearImportResult}
                className="border-blue-700 text-blue-200 hover:bg-blue-800/30"
              >
                Reset
              </Button>
            </div>

            {/* Import Status */}
            {importResult && (
              <div
                className={`mt-4 text-sm font-semibold px-3 py-2 rounded ${
                  importResult.success
                    ? "bg-green-900/80 text-green-300 border-l-4 border-green-500"
                    : "bg-red-900/80 text-red-300 border-l-4 border-red-500"
                }`}
              >
                {importResult.message}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Teams Display - Responsive */}
      <ResponsiveTeamsDisplay
        teams={teams}
        isLoading={isLoading}
        selectedTournamentId={selectedTournamentId}
        userRole={currentRole}
        userId={user?.id}
        userEmail={user?.email}
        onViewTeam={handleViewTeamById}
        onEditTeam={handleEditTeamById}
        onDeleteTeam={handleDeleteTeamById}
      />

      {/* Edit Team Dialog */}
      <EditTeamDialog
        open={showEditDialog}
        onOpenChange={handleEditDialogChange}
        team={selectedTeam}
        tournamentId={selectedTournamentId}
      />

      {/* Delete Team Dialog */}
      <DeleteTeamDialog
        open={showDeleteDialog}
        onOpenChange={handleDeleteDialogChange}
        team={selectedTeam}
        onConfirm={confirmDeleteTeam}
        isDeleting={isDeleting}
      />
    </div>
  );
});
