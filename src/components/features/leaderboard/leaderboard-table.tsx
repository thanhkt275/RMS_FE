import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";

export interface LeaderboardTableProps<TData extends object> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  initialSorting?: SortingState;
  initialFilters?: ColumnFiltersState;
  filterUI?: React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  tableMeta?: any;
}

export function LeaderboardTable<TData extends object>({
  data,
  columns,
  initialSorting = [],
  initialFilters = [],
  filterUI,
  loading,
  emptyMessage = "No data found.",
  tableMeta,
}: LeaderboardTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>(initialFilters);

  const table = useReactTable({
    data,
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
    meta: tableMeta,
    debugTable: false,
  });

  return (
    <Card className="shadow-none border border-gray-800 bg-gray-900">
      {filterUI && (
        <div className="p-4 border-b border-gray-800">{filterUI}</div>
      )}
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-800 border-b border-gray-700">
              {table.getAllLeafColumns().map((column) => {
                const header = column.columnDef.header;
                const isSorted = column.getIsSorted();
                return (                  <TableHead
                    key={column.id}
                    className={
                      "text-gray-300 font-semibold text-sm cursor-pointer select-none whitespace-nowrap" +
                      (column.getCanSort() ? "" : " cursor-default")
                    }
                    onClick={column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center justify-between">
                      <span>{typeof header === "string" ? header : column.id}</span>
                      <span className="w-4 inline-flex justify-center">
                        {isSorted === "asc" && <ArrowUp size={14} />}
                        {isSorted === "desc" && <ArrowDown size={14} />}
                        {!isSorted && <span className="opacity-0">•</span>}
                      </span>
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-gray-400"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-gray-400"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-gray-800/70 transition"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-gray-100">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
