import { ColumnDef } from "@tanstack/react-table";

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

export const teamLeaderboardColumns: ColumnDef<TeamLeaderboardRow, any>[] = [
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
  
];
