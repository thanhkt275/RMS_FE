import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/common/use-auth";
import { useTeamsRoleAccess } from "./use-teams-role-access";
import { TeamDataFilterService } from "@/utils/teams/team-data-filter";
import { teamErrorUtils, TeamErrorHandler } from "@/utils/teams/team-error-handler";
import TeamService from "@/services/team.service";
import type { Team } from "@/types/team.types";
import { UserRole } from "@/types/types";
import { TeamResponseDto } from "@/types/team-dto.types";
import { toast } from "sonner";

export interface ImportResult {
  success: boolean;
  message: string;
  importedCount?: number;
  skippedCount?: number;
  errors?: string[];
}

/**
 * Enhanced Team Management Hook with Role-Based Access Control
 * 
 * Integrates existing team management functionality with the new RBAC system.
 * Provides backward compatibility while adding role-based security.
 */
export function useTeamManagement() {
  const { user } = useAuth();
  const userRole = user?.role as UserRole | null;
  const userId = user?.id;
  const roleAccess = useTeamsRoleAccess();

  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  /**
   * Import teams with role-based access control
   */
  const importTeams = useCallback(async (
    content: string,
    tournamentId: string,
    delimiter: string = ","
  ): Promise<ImportResult> => {
    // Check permissions before attempting import
    if (!TeamDataFilterService.canPerformTeamAction('import', userRole)) {
      const errorMessage = roleAccess.getAccessDeniedMessage('import_export');
      const result = {
        success: false,
        message: errorMessage
      };
      setImportResult(result);

      // Use enhanced error handler for logging and user feedback
      await TeamErrorHandler.handleTeamOperationDenied({
        userId: user?.id,
        userRole: (user?.role as UserRole) || undefined,
        operation: 'import'
      }, errorMessage);

      return result;
    }

    if (!tournamentId) {
      const result = { success: false, message: "Please select a tournament before importing teams." };
      setImportResult(result);
      return result;
    }

    if (!content) {
      const result = { success: false, message: "Please provide CSV content before importing teams." };
      setImportResult(result);
      return result;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      // Use the enhanced team service for import
      const result = await apiClient.post("/teams/import", {
        content,
        format: "csv",
        hasHeader: true,
        tournamentId,
        delimiter,
        // Add user context for backend validation
        userRole,
        userId,
      });

      const enhancedResult: ImportResult = {
        success: result.success,
        message: result.message,
        importedCount: result.importedCount || 0,
        skippedCount: result.skippedCount || 0,
        errors: result.errors || [],
      };

      setImportResult(enhancedResult);

      if (enhancedResult.success) {
        toast.success(`Successfully imported ${enhancedResult.importedCount} teams`);
      } else {
        toast.error(enhancedResult.message);
      }

      return enhancedResult;
    } catch (e: any) {
      const result = {
        success: false,
        message: e.message || 'Failed to import teams',
        errors: [e.message]
      };
      setImportResult(result);

      // Use enhanced error handler
      await teamErrorUtils.handleImportError(e, user?.id, user?.role as UserRole || undefined);

      return result;
    } finally {
      setIsImporting(false);
    }
  }, [userRole, userId, roleAccess]);

  /**
   * Export teams with role-based access control and filtering
   */
  const exportTeams = useCallback(async (teams: Team[] | TeamResponseDto[]) => {
    // Check permissions before attempting export
    if (!TeamDataFilterService.canPerformTeamAction('export', userRole)) {
      const errorMessage = roleAccess.getAccessDeniedMessage('import_export');
      await TeamErrorHandler.handleTeamOperationDenied({
        userId: user?.id,
        userRole: userRole || undefined,
        operation: 'export'
      }, errorMessage);
      return;
    }

    setIsExporting(true);

    try {
      // Filter teams based on user role before export
      const filteredTeams = teams.map(team => {
        if ('isUserTeam' in team) {
          // Already a DTO, use as-is
          return team;
        } else {
          // Convert Team to DTO with role-based filtering
          return TeamDataFilterService.convertTeamToDto(team as Team, userRole, userId);
        }
      });

      // Determine columns based on user role
      const columns = TeamDataFilterService.getTeamColumnsForRole(userRole);
      const visibleColumns = columns.filter(col => col.visible);

      // Create CSV header
      const header = visibleColumns.map(col => col.label);

      // Create CSV rows with role-appropriate data
      const rows = filteredTeams.map(team => {
        return visibleColumns.map(col => {
          switch (col.key) {
            case 'name':
              return team.name;
            case 'organization':
              return team.organization;
            case 'memberCount':
              return team.memberCount?.toString() || '0';
            case 'teamNumber':
              return 'teamNumber' in team ? team.teamNumber : '';
            case 'description':
              return 'description' in team ? team.description || '' : '';
            case 'createdAt':
              return 'createdAt' in team ? new Date(team.createdAt).toLocaleDateString() : '';
            case 'createdBy':
              return 'userId' in team ? team.userId : '';
            default:
              return '';
          }
        });
      });

      // Generate CSV content
      const csv = [header, ...rows]
        .map(row => row.map(value => `"${(value ?? "").toString().replace(/"/g, '""')}"`).join(","))
        .join("\n");

      // Download CSV file
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `teams-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${filteredTeams.length} teams successfully`);
    } catch (error: any) {
      toast.error(`Failed to export teams: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  }, [userRole, userId, roleAccess]);

  /**
   * Export teams using backend service (for larger datasets)
   */
  const exportTeamsViaService = useCallback(async (tournamentId: string) => {
    // Check permissions before attempting export
    if (!TeamDataFilterService.canPerformTeamAction('export', userRole)) {
      toast.error(roleAccess.getAccessDeniedMessage('import_export'));
      return;
    }

    setIsExporting(true);

    try {
      const blob = await TeamService.exportTeams(tournamentId);

      // Download the blob
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `teams-${tournamentId}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Teams exported successfully');
    } catch (error: any) {
      toast.error(`Failed to export teams: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  }, [userRole, roleAccess]);

  /**
   * Get filtered teams for display based on user role
   */
  const getFilteredTeamsForDisplay = useCallback((teams: Team[]): TeamResponseDto[] => {
    return TeamDataFilterService.filterTeamsForRole(teams, userRole, userId);
  }, [userRole, userId]);

  /**
   * Check if user can perform import/export operations
   */
  const canImportExport = TeamDataFilterService.canPerformTeamAction('import', userRole) &&
    TeamDataFilterService.canPerformTeamAction('export', userRole);

  return {
    // Legacy interface (backward compatibility)
    isImporting,
    importResult,
    importTeams,
    exportTeams,
    setImportResult,

    // Enhanced interface with role-based features
    isExporting,
    exportTeamsViaService,
    getFilteredTeamsForDisplay,
    canImportExport,

    // Role and permission information
    userRole,
    permissions: {
      canImport: TeamDataFilterService.canPerformTeamAction('import', userRole),
      canExport: TeamDataFilterService.canPerformTeamAction('export', userRole),
      canCreate: TeamDataFilterService.canPerformTeamAction('create', userRole),
      canEdit: (team: Team) => TeamDataFilterService.canPerformTeamAction('edit', userRole, team, userId),
      canDelete: (team: Team) => TeamDataFilterService.canPerformTeamAction('delete', userRole, team, userId),
    },
  };
}
