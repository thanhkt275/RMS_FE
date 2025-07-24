import * as React from "react";
import { useMemo } from "react";
import { ScoreConfig } from "@/types/score-config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useReactTable, getCoreRowModel, flexRender, ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Edit, UserPlus, Trash2, Target, Trophy, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface Props {
  configs: ScoreConfig[];
  isLoading: boolean;
  onEdit: (config: ScoreConfig) => void;
  onAssign: (config: ScoreConfig) => void;
  onDelete: (id: string) => void;
}


const ScoreConfigTable: React.FC<Props> = ({
  configs,
  isLoading,
  onEdit,
  onAssign,
  onDelete,
}) => {
  const columns = useMemo<ColumnDef<ScoreConfig, any>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Configuration",
        cell: ({ row }) => {
          const config = row.original;
          return (
            <div className="space-y-1">
              <div className="font-medium text-gray-900">{config.name}</div>
              {config.description && (
                <div className="text-sm text-gray-500 line-clamp-2">
                  {config.description}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "structure",
        header: "Structure",
        cell: ({ row }) => {
          const config = row.original;
          const sections = config.scoreSections || [];
          const legacyElements = config.scoreElements || [];
          const hasSections = sections.length > 0;
          const hasFormula = config.totalScoreFormula && config.totalScoreFormula.trim();
          
          return (
            <div className="space-y-1">
              {hasSections ? (
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <Badge variant="secondary" className="text-xs">
                    {sections.length} section{sections.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-gray-400" />
                  <Badge variant="outline" className="text-xs">
                    {legacyElements.length} legacy element{legacyElements.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
              {hasFormula && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-green-600">🧮 Custom Formula</span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "conditions",
        header: "Conditions",
        cell: ({ row }) => {
          const bonus = row.original.bonusConditions?.length || 0;
          const penalty = row.original.penaltyConditions?.length || 0;
          return (
            <div className="flex items-center gap-2">
              {bonus > 0 && (
                <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                  +{bonus} bonus
                </Badge>
              )}
              {penalty > 0 && (
                <Badge variant="default" className="text-xs bg-red-100 text-red-800">
                  -{penalty} penalty
                </Badge>
              )}
              {bonus === 0 && penalty === 0 && (
                <span className="text-sm text-gray-400">None</span>
              )}
            </div>
          );
        },
      },
      {
        id: "tournament",
        header: "Assignment",
        cell: ({ row }) => {
          const config = row.original;
          return (
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              {config.tournamentId ? (
                <Badge variant="default" className="text-xs">
                  Assigned
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-gray-500">
                  Unassigned
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "lastUpdated",
        header: "Last Updated",
        cell: ({ row }) => {
          const config = row.original;
          if (!config.updatedAt) return <span className="text-sm text-gray-400">-</span>;
          return (
            <span className="text-sm text-gray-600">
              {format(new Date(config.updatedAt), 'MMM d, yyyy')}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAssign(row.original)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign to Tournament
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(row.original.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onEdit, onAssign, onDelete]
  );

  const table = useReactTable({
    data: configs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex space-x-4">
                  <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!configs.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="rounded-full bg-gray-100 p-3">
              <AlertTriangle className="h-8 w-8 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">
                No Score Configurations
              </h3>
              <p className="text-gray-500 max-w-md">
                Get started by creating your first score configuration. 
                Define scoring elements, bonus conditions, and penalties for your tournaments.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map(headerGroup => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <TableHead key={header.id}>
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map(row => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map(cell => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ScoreConfigTable;
