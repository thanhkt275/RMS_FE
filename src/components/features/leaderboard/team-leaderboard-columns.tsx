import { ColumnDef } from "@tanstack/react-table";
import { PermissionService } from "@/config/permissions";
import { UserRole } from "@/types/types";
import { Eye, Edit } from "lucide-react";

export interface TeamLeaderboardRow {
  id: string;
  teamName: string;
  teamCode: string;
  rank: number;
  totalScore: number;
  highestScore: number;
  wins: number;
  losses: number;
  ties: number;
  matchesPlayed: number;
  rankingPoints: number;
  opponentWinPercentage: number;
  pointDifferential: number;
  componentScores?: Record<string, number>;
}

// Base columns available to all users
const baseColumns: ColumnDef<TeamLeaderboardRow, any>[] = [
  {
    accessorKey: "rank",
    header: "Rank",
    cell: info => info.getValue(),
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    accessorKey: "teamName",
    header: "Team Name",
    cell: info => info.getValue(),
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    accessorKey: "teamCode",
    header: "Team Code",
    cell: info => info.getValue(),
    enableSorting: true,
    enableColumnFilter: true,
  },
];

// Detailed columns for users with appropriate permissions
const detailedColumns: ColumnDef<TeamLeaderboardRow, any>[] = [
  {
    accessorKey: "totalScore",
    header: "Points Scored",
    cell: info => {
      const value = info.getValue();
      return typeof value === 'number' ? value : (value || 0);
    },
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    accessorKey: "highestScore",
    header: "Avg Points",
    cell: info => {
      const value = info.getValue();
      return typeof value === 'number' ? value.toFixed(1) : (value || 0);
    },
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    accessorKey: "wins",
    header: "Wins",
    cell: info => info.getValue(),
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    accessorKey: "losses",
    header: "Losses",
    cell: info => info.getValue(),
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    accessorKey: "ties",
    header: "Ties",
    cell: info => info.getValue(),
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    accessorKey: "matchesPlayed",
    header: "Matches",
    cell: info => info.getValue(),
    enableSorting: true,
    enableColumnFilter: true,
  },
];

// Advanced columns for admin and referees
const advancedColumns: ColumnDef<TeamLeaderboardRow, any>[] = [
  {
    accessorKey: "rankingPoints",
    header: "Ranking Points",
    cell: info => {
      const value = info.getValue();
      return typeof value === 'number' ? value.toFixed(2) : value;
    },
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    accessorKey: "opponentWinPercentage",
    header: "OPP Win %",
    cell: info => {
      const value = info.getValue();
      return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : value;
    },
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    accessorKey: "pointDifferential",
    header: "Point Diff",
    cell: info => {
      const value = info.getValue();
      return typeof value === 'number' ? (value > 0 ? `+${value}` : value.toString()) : value;
    },
    enableSorting: true,
    enableColumnFilter: true,
  },
];

// Actions column for team management
const actionsColumn: ColumnDef<TeamLeaderboardRow, any> = {
  id: "actions",
  header: "Actions",
  cell: ({ row, table }) => {
    const team = row.original;

    // Get user role from table meta (we'll pass it from the component)
    const userRole = (table.options.meta as any)?.userRole;
    const userId = (table.options.meta as any)?.userId;
    const userEmail = (table.options.meta as any)?.userEmail;

    // Check if user can edit this team
    const canEditAny = PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'EDIT_ANY');
    const canManageOwn = PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'MANAGE_OWN');

    // Check if this is user's own team (simplified check using team ID)
    const isOwnTeam = team.id === userId; // This might need adjustment based on your data structure

    const canEdit = canEditAny || (canManageOwn && isOwnTeam);

    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.href = `/teams/${team.id}`;
            }
          }}
          className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:text-blue-700 transition-colors"
          title="View team details"
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </button>

        {canEdit && (
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = `/teams/${team.id}/edit`;
              }
            }}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="Edit team"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </button>
        )}
      </div>
    );
  },
  enableSorting: false,
  enableColumnFilter: false,
};

/**
 * Get team leaderboard columns based on user role and permissions
 */
export function getTeamLeaderboardColumns(userRole: UserRole | null): ColumnDef<TeamLeaderboardRow, any>[] {
  // Start with base columns
  let columns = [...baseColumns];

  // Add detailed columns for users who can view team data
  if (PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL') ||
    PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL_READONLY') ||
    PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_LIMITED')) {
    columns = [...columns, ...detailedColumns];
  }

  // Add advanced columns for admin and referees
  if (PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_SENSITIVE_DATA')) {
    columns = [...columns, ...advancedColumns];
  }

  // Add actions column for users who can view teams
  if (PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL') ||
    PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL_READONLY') ||
    PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_OWN') ||
    PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_LIMITED')) {
    columns = [...columns, actionsColumn];
  }

  return columns;
}

// Legacy export for backward compatibility
export const teamLeaderboardColumns: ColumnDef<TeamLeaderboardRow, any>[] = [
  ...baseColumns,
  ...detailedColumns,
  ...advancedColumns,
];
