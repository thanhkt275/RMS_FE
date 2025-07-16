import * as React from "react";
import { useMemo } from "react";
import { ScoreConfig } from "@/types/score-config";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useReactTable, getCoreRowModel, flexRender, ColumnDef } from "@tanstack/react-table";

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
        header: "Name",
        cell: info => info.getValue(),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: info => info.getValue(),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button size="sm" className="mr-2" onClick={() => onEdit(row.original)}>Edit</Button>
            <Button size="sm" className="mr-2" onClick={() => onAssign(row.original)}>Assign</Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(row.original.id)}>Delete</Button>
          </div>
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

  if (isLoading) return <div>Loading...</div>;
  if (!configs.length) return <div>No score configs found.</div>;

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
