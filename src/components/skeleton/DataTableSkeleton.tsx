"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DataTableSkeleton = ({
  numberOfColumns,
}: {
  numberOfColumns: number;
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {Array.from({ length: numberOfColumns }).map((_, idx) => (
            <TableHead key={idx}>
              <Skeleton className={"h-6 w-32"} />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 10 }).map((_, idx) => (
          <TableRow key={idx}>
            {Array.from({ length: numberOfColumns }).map((_, idx) => (
              <TableCell key={idx}>
                <Skeleton className={"h-8 w-full"} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default DataTableSkeleton;
