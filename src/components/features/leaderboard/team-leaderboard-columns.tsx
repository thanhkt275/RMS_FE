import { ColumnDef } from "@tanstack/react-table";
import { PermissionService } from "@/config/permissions";
import { UserRole } from "@/types/types";
import { Button } from "@/components/ui/button";
import { Eye, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTeamsRoleAccess } from "@/hooks/teams/use-teams-role-access";
import { canUserEditTeam, canUserViewTeam } from "@/hooks/teams/use-teams";
import { toast } from "sonner";

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
  // Additional fields for permission checking
  userId?: string;
  tournamentId?: string;
  tournament?: string;
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

/**
 * Team Actions Component
 *
 * Handles navigation and permission checking for team actions.
 * Separated into its own component to use React hooks.
 *
 * Features:
 * - View button: Navigates to /teams/[id] for team details
 * - Edit button: Navigates to /teams/[id]/edit for team editing
 * - Role-based access control using useTeamsRoleAccess hook
 * - Permission checking before navigation
 * - Error handling with toast notifications
 * - Proper button states (disabled for unauthorized actions)
 */
interface TeamActionsProps {
  team: TeamLeaderboardRow;
}

function TeamActions({ team }: TeamActionsProps) {
  const router = useRouter();
  const { getAccessDeniedMessage, currentRole, currentUser } = useTeamsRoleAccess();

  // Create a minimal team object for permission checking
  const teamForPermissions = {
    id: team.id,
    userId: team.userId || '', // Use the userId from the team data
    name: team.teamName,
    teamNumber: team.teamCode,
    tournamentId: team.tournamentId,
    teamMembers: [], // We don't have member data in leaderboard rows
  } as any;

  // Use the new helper functions for consistent permission checking
  const showViewButton = canUserViewTeam(
    teamForPermissions,
    currentRole,
    currentUser?.id,
    currentUser?.email
  );

  const showEditButton = canUserEditTeam(
    teamForPermissions,
    currentRole,
    currentUser?.id
  );

  const handleViewTeam = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Check if user can access this team using the helper function
    if (!showViewButton) {
      toast.error("Access Denied", {
        description: getAccessDeniedMessage('view')
      });
      return;
    }

    try {
      router.push(`/teams/${team.id}`);
    } catch (error) {
      toast.error("Navigation Error", {
        description: "Failed to navigate to team details page"
      });
    }
  };

  const handleEditTeam = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Check if user can edit this team using the helper function
    if (!showEditButton) {
      toast.error("Access Denied", {
        description: getAccessDeniedMessage('edit')
      });
      return;
    }

    try {
      // Navigate to the dedicated team edit page
      router.push(`/teams/${team.id}/edit`);
    } catch (error) {
      toast.error("Navigation Error", {
        description: "Failed to navigate to team edit page"
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {showViewButton && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
          onClick={handleViewTeam}
          title="View team details"
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
      )}
      {showEditButton && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
          onClick={handleEditTeam}
          title="Edit team"
        >
          <Edit className="h-3 w-3 mr-1" />
          Edit
        </Button>
      )}
    </div>
  );
}

// Actions column for admin and users with edit permissions
const actionsColumn: ColumnDef<TeamLeaderboardRow, any> = {
  id: "actions",
  header: "Actions",
  cell: ({ row }) => {
    const team = row.original;
    return <TeamActions team={team} />;
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

  // Add actions column based on specific role requirements
  const shouldShowActionsColumn =
    // ADMIN: Show Actions column with View and Edit buttons
    userRole === 'ADMIN' ||
    // REFEREE roles: Show Actions column with View button only
    userRole === 'HEAD_REFEREE' ||
    userRole === 'ALLIANCE_REFEREE' ||
    // TEAM roles: Show Actions column (buttons will be filtered in component)
    userRole === 'TEAM_LEADER' ||
    userRole === 'TEAM_MEMBER' ||
    userRole === 'COMMON';

  if (shouldShowActionsColumn) {
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
