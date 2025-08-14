import { ColumnDef } from "@tanstack/react-table";
import { PermissionService } from "@/config/permissions";
import { UserRole } from "@/types/types";
import { Button } from "@/components/ui/button";
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

// Actions column for admin and users with edit permissions
const actionsColumn: ColumnDef<TeamLeaderboardRow, any> = {
  id: "actions",
  header: "Actions",
  cell: ({ row }) => {
    const team = row.original;

    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Implement view team functionality
            console.log('View team:', team.id);
          }}
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Implement edit team functionality
            console.log('Edit team:', team.id);
          }}
        >
          <Edit className="h-3 w-3 mr-1" />
          Edit
        </Button>
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

  // Add actions column for users with appropriate permissions
  if (PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'VIEW_ALL') ||
      PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'EDIT_ANY') ||
      PermissionService.hasPermission(userRole, 'TEAM_MANAGEMENT', 'MANAGE_OWN')) {
    columns = [...columns, actionsColumn];
  }

  return columns;
}

// Legacy export for backward compatibility
export const teamLeaderboardColumns: ColumnDef<TeamLeaderboardRow, any>[] = [
  ...baseColumns,
  ...detailedColumns,
  ...advancedColumns,
  actionsColumn,
];
