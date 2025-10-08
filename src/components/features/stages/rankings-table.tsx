import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  Row,
  Cell,
} from "@tanstack/react-table";
import { TeamRanking as BaseTeamRanking } from "@/types/stage-advancement.types";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Medal, Award, ArrowUp, ArrowDown } from "lucide-react";

// Extend TeamRanking to include optional OWP and matchesPlayed for Swiss-style tiebreakers
interface TeamRanking extends BaseTeamRanking {
  opponentWinPercentage?: number;
  matchesPlayed?: number;
}

interface RankingsTableProps {
  rankings?: TeamRanking[];
  highlightAdvancing?: number;
  className?: string;
  showSorting?: boolean;
  showFilters?: boolean;
}

/**
 * Component to display team rankings in a table format with TanStack React Table
 * Implements Single Responsibility Principle - only displays rankings
 */
export function RankingsTable({ 
  rankings, 
  highlightAdvancing = 0, 
  className = "",
  showSorting = true,
  showFilters = false
}: RankingsTableProps) {
  
  // Ensure rankings is an array
  const safeRankings = Array.isArray(rankings) ? rankings : [];
  
  // Default sorting: rankingPoints desc, then OWP desc, then pointDifferential desc, then matchesPlayed desc
  const [sorting, setSorting] = useState<SortingState>([
    { id: "rankingPoints", desc: true },
    { id: "opponentWinPercentage", desc: true },
    { id: "pointDifferential", desc: true },
    { id: "matchesPlayed", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // const getRankIcon = (rank: number) => {
  //   switch (rank) {
  //     case 1:
  //       return <Trophy className="h-4 w-4 text-yellow-600" />;
  //     case 2:
  //       return <Medal className="h-4 w-4 text-gray-600" />;
  //     case 3:
  //       return <Award className="h-4 w-4 text-amber-600" />;
  //     default:
  //       return null;
  //   }
  // };

  const getRankBadge = (rank: number, isAdvancing: boolean) => {
    const baseClasses = "font-semibold";
    
    if (isAdvancing) {
      return (
        <Badge className={`${baseClasses} bg-green-100 text-green-800 border-green-300`}>
          #{rank}
        </Badge>
      );
    }
    
    // if (rank <= 3) {
    //   const colors = {
    //     1: "bg-yellow-100 text-yellow-800 border-yellow-300",
    //     2: "bg-gray-100 text-gray-800 border-gray-300", 
    //     3: "bg-amber-100 text-amber-800 border-amber-300"
    //   };
    //   return (
    //     <Badge className={`${baseClasses} ${colors[rank as keyof typeof colors]}`}>
    //       #{rank}
    //     </Badge>
    //   );
    // }
    
    return (
      <Badge variant="outline" className={`${baseClasses} border-gray-300 text-gray-700`}>
        #{rank}
      </Badge>
    );
  };

  // Define columns with TanStack React Table
  const columns = useMemo<ColumnDef<TeamRanking>[]>(() => [
    {
      accessorKey: "rank",
      header: "Rank",
      cell: ({ row }: { row: Row<TeamRanking> }) => {
        const rank = row.getValue("rank") as number;
        const isAdvancing = highlightAdvancing > 0 && rank <= highlightAdvancing;
        return (
          <div className="flex items-center justify-center gap-2">
            {/* {getRankIcon(rank)} */}
            {getRankBadge(rank, isAdvancing)}
          </div>
        );
      },
      enableSorting: showSorting,
      enableColumnFilter: showFilters,
    },
    {
      accessorKey: "teamNumber",
      header: "Team Number",
      cell: ({ row }: { row: Row<TeamRanking> }) => {
        const teamNumber = row.getValue("teamNumber") as string;
        return (
          <div className="font-medium text-gray-900 text-center">
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm font-semibold">
              {teamNumber}
            </span>
          </div>
        );
      },
      enableSorting: showSorting,
      enableColumnFilter: showFilters,
    },
    {
      accessorKey: "teamName",
      header: "Team Name",
      cell: ({ row }: { row: Row<TeamRanking> }) => {
        const teamName = row.original.teamName;
        return (
          <div className="font-medium text-gray-900 text-left text-lg">
            <span className="truncate">{teamName}</span>
          </div>
        );
      },
      enableSorting: showSorting,
      enableColumnFilter: showFilters,
    },
    {
      accessorKey: "wins",
      header: "Record",
      cell: ({ row }: { row: Row<TeamRanking> }) => {
        const wins = row.getValue("wins") as number;
        const losses = row.original.losses;
        const ties = row.original.ties;
        return (
          <div className="text-center font-medium text-gray-900 text-lg">
            {wins}-{losses}-{ties}
          </div>
        );
      },
      enableSorting: showSorting,
      enableColumnFilter: showFilters,
    },
    {
      accessorKey: "pointsScored",
      header: "Points Scored",
      cell: ({ row }: { row: Row<TeamRanking> }) => {
        const value = row.getValue("pointsScored") as number;
        return (
          <div className="text-center font-medium text-gray-900 text-lg">
            {value}
          </div>
        );
      },
      enableSorting: showSorting,
      enableColumnFilter: showFilters,
    },
    {
      accessorKey: "rankingPoints",
      header: "Ranking Points",
      cell: ({ row }: { row: Row<TeamRanking> }) => {
        const value = row.getValue("rankingPoints") as number;
        return (
          <div className="text-center font-medium text-gray-900 text-lg">
            {value}
          </div>
        );
      },
      enableSorting: showSorting,
      enableColumnFilter: showFilters,
    },
    {
      accessorKey: "opponentWinPercentage",
      header: "OWP",
      cell: ({ row }: { row: Row<TeamRanking> }) => {
        // Always show a number, default to 0
        const value = row.original.opponentWinPercentage;
        return (
          <div className="text-center font-medium text-blue-900 text-lg">
            {((value ?? 0) * 100).toFixed(1)}%
          </div>
        );
      },
      enableSorting: showSorting,
      enableColumnFilter: showFilters,
    },
    {
      accessorKey: "pointDifferential",
      header: "Pts Diff",
      cell: ({ row }: { row: Row<TeamRanking> }) => {
        const value = row.getValue("pointDifferential") as number;
        return (
          <div className={`text-center font-medium text-lg ${
            value > 0 ? 'text-green-600' : 
            value < 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {value > 0 ? '+' : ''}{value}
          </div>
        );
      },
      enableSorting: showSorting,
      enableColumnFilter: showFilters,
    },
    {
      accessorKey: "matchesPlayed",
      header: "Matches Played",
      cell: ({ row }: { row: Row<TeamRanking> }) => {
        // Always show a number, default to 0
        const value = row.original.matchesPlayed;
        return (
          <div className="text-center font-medium text-gray-900 text-lg">
            {value ?? 0}
          </div>
        );
      },
      enableSorting: showSorting,
      enableColumnFilter: showFilters,
    },
    ...(highlightAdvancing > 0 ? [{
      accessorKey: "rank",
      id: "status",
      header: "Status",
      cell: ({ row }: { row: Row<TeamRanking> }) => {
        const rank = row.getValue("rank") as number;
        const isAdvancing = rank <= highlightAdvancing;
        return (
          <div className="text-center">
            {isAdvancing ? (
              <Badge className="bg-green-100 text-green-800 border-green-300 font-semibold">
                Advancing
              </Badge>
            ) : (
              <Badge variant="outline" className="border-gray-300 text-gray-600">
                Eliminated
              </Badge>
            )}
          </div>
        );
      },
      enableSorting: false,
      enableColumnFilter: showFilters,
    }] : []),
  ], [highlightAdvancing, showSorting, showFilters]);

  const table = useReactTable({
    data: safeRankings,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    debugTable: false,
  });

  return (
    <div className={`${className}`}>
      <Table className="w-full">
        <TableHeader>
          <TableRow className="bg-gray-50 border-b border-gray-200">
            {table.getAllLeafColumns().map((column) => {
              const header = column.columnDef.header;
              const isSorted = column.getIsSorted();
              const canSort = column.getCanSort();
              
              return (
                <TableHead 
                  key={column.id}
                  className={`text-gray-700 font-semibold text-center text-lg ${
                    column.id === "rank" ? "w-20" :
                    column.id === "teamNumber" ? "w-32" :
                    column.id === "teamName" ? "min-w-[150px] text-left" :
                    column.id === "wins" ? "w-32" :
                    column.id === "pointsScored" ? "w-32" :
                    column.id === "rankingPoints" ? "w-32" :
                    column.id === "pointDifferential" ? "w-36" :
                    column.id === "opponentWinPercentage" ? "w-28" :
                    column.id === "matchesPlayed" ? "w-32" :
                    column.id === "status" ? "w-32" : ""
                  } ${
                    canSort ? "cursor-pointer select-none hover:bg-gray-100" : "cursor-default"
                  }`}
                  onClick={canSort ? column.getToggleSortingHandler() : undefined}
                >
                  <div className="relative text-center">
                    <span>{typeof header === "string" ? header : column.id}</span>
                    {canSort && (
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-4 inline-flex justify-center">
                        {isSorted === "asc" && <ArrowUp size={14} className="text-blue-600" />}
                        {isSorted === "desc" && <ArrowDown size={14} className="text-blue-600" />}
                        {!isSorted && <span className="opacity-0">•</span>}
                      </span>
                    )}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center text-gray-500 py-8"
              >
                No teams available
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row: Row<TeamRanking>, index) => {
              const isAdvancing = highlightAdvancing > 0 && (row.getValue("rank") as number) <= highlightAdvancing;
              
              return (
                <TableRow 
                  key={row.id} 
                  className={`
                    transition-colors border-b border-gray-100 h-14
                    ${isAdvancing ? 'bg-green-50 hover:bg-green-100' : index % 2 === 0 ? 'bg-gray-50 hover:bg-gray-100' : 'hover:bg-gray-50'}
                  `}
                >
                  {row.getVisibleCells().map((cell: Cell<TeamRanking, unknown>) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
