import React, { useMemo, memo, useCallback } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, ColumnDef, SortingState } from '@tanstack/react-table';
import { colors, typography, spacing, components, responsive, layout, cn } from "../design-system";
import { TeamsSkeleton } from "../components/enhanced-loading";
import { usePerformanceOptimizedDisplay } from "@/hooks/audience-display/use-performance-optimized-display";

// Define Team interface
export interface Team {
  id: string;
  name: string;
  teamNumber?: string;
  organization?: string;
  location?: string;
}

interface TeamsDisplayProps {
  teams: Team[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}



// Enhanced error state component
const TeamsError = ({ error, onRetry }: { error: string; onRetry?: () => void }) => (
  <div className="bg-white border border-red-200 rounded-xl shadow-lg p-8 text-center">
    <div className="w-16 h-16 mx-auto mb-4 text-red-500">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Teams</h3>
    <p className="text-gray-600 mb-4">{error}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        Try Again
      </button>
    )}
  </div>
);

// Enhanced empty state component
const TeamsEmpty = () => (
  <div className={cn(components.card.base, responsive.spacing.component, "text-center")}>
    <div className="w-20 h-20 mx-auto mb-4 text-gray-400">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    </div>
    <h3 className={cn(responsive.text.heading, colors.text.primary, "mb-2")}>No Teams Registered</h3>
    <p className={cn(responsive.text.body, colors.text.secondary)}>Teams will appear here once they register for the tournament.</p>
  </div>
);

// Memoized mobile team card component for performance
const TeamCard = memo(({ team }: { team: Team }) => (
  <div
    className={cn(
      components.card.base,
      "p-4 mb-4 group transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] focus-within:ring-2 ring-blue-400"
    )}
    role="listitem"
    aria-label={`Team ${team.teamNumber ?? ''} ${team.name}`}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-full bg-blue-50 text-blue-800 font-bold border border-blue-200">
          {team.teamNumber || '—'}
        </div>
        <div>
          <h3 className={cn(typography.heading.sm, colors.text.primary)}>{team.name}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {team.organization && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
                <svg className="w-3 h-3 mr-1" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 2a6 6 0 016 6c0 5-6 10-6 10S4 13 4 8a6 6 0 016-6zm0 8a2 2 0 100-4 2 2 0 000 4z"/></svg>
                {team.organization}
              </span>
            )}
            {team.location && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
                <svg className="w-3 h-3 mr-1" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5.05 4.05a7 7 0 119.9 9.9L10 19l-4.95-5.05a7 7 0 010-9.9zM10 11a3 3 0 100-6 3 3 0 000 6z"/></svg>
                {team.location}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
));

TeamCard.displayName = 'TeamCard';

const columns: ColumnDef<Team>[] = [
  {
    accessorKey: 'teamNumber',
    header: () => <span className={cn(typography.label.md, colors.text.primary)}>Team #</span>,
    cell: info => {
      const value = info.getValue() as string | undefined;
      return (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-50 text-blue-800 font-bold text-sm border border-blue-200 shadow-sm">
            {value || '—'}
          </div>
        </div>
      );
    },
    size: 100,
    meta: { responsiveClass: 'pl-6' },
  },
  {
    accessorKey: 'name',
    header: () => <span className={cn(typography.label.md, colors.text.primary)}>Team Name</span>,
    cell: info => {
      const value = info.getValue() as string | undefined;
      return <div className={cn(typography.body.sm, 'font-medium', colors.text.primary)}>{value}</div>;
    },
    size: 220,
    meta: { responsiveClass: '' },
  },
  {
    accessorKey: 'organization',
    header: () => <span className={cn(typography.label.md, colors.text.primary)}>Organization</span>,
    cell: info => {
      const value = info.getValue() as string | undefined;
      return <div className={cn(typography.body.sm, colors.text.secondary)}>{value || '—'}</div>;
    },
    size: 200,
    meta: { responsiveClass: responsive.table.hideColumns.md },
  },
  {
    accessorKey: 'location',
    header: () => <span className={cn(typography.label.md, colors.text.primary)}>Location</span>,
    cell: info => {
      const value = info.getValue() as string | undefined;
      return <div className={cn(typography.body.sm, colors.text.secondary)}>{value || '—'}</div>;
    },
    size: 180,
    meta: { responsiveClass: responsive.table.hideColumns.lg },
  },
];

export const TeamsDisplay: React.FC<TeamsDisplayProps> = memo(({
  teams,
  isLoading,
  error,
  onRetry
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'teamNumber', desc: false }]);

  // Performance optimization hooks (reserved for future filtering/sorting)
  usePerformanceOptimizedDisplay();

  // Memoized team count for performance
  const teamCount = useMemo(() => teams.length, [teams.length]);

  // Memoized columns to prevent unnecessary re-renders
  const memoizedColumns = useMemo(() => columns, []);

  // Memoized table configuration for performance
  const table = useReactTable({
    data: teams,
    columns: memoizedColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    debugTable: false,
  });

  // Memoized retry handler to prevent unnecessary re-renders
  const handleRetry = useCallback(() => {
    onRetry?.();
  }, [onRetry]);
  return (
    <div className={cn("flex flex-col h-full", colors.gray[50])}>
      {/* Teams Page Header */}
      <div className={cn(components.card.header, responsive.spacing.component, "rounded-xl mb-6")}>
        <div className={cn(layout.container, responsive.layout.stackToRow)}>
          <div className={cn(responsive.layout.centerOnMobile, "flex-1")}>
            <h1 className={cn(responsive.text.display, "text-white mb-1")}>Tournament Teams</h1>
            <p className={cn(responsive.text.body, "text-blue-100")}>
              <span className="text-white font-semibold">{teamCount}</span> {teamCount === 1 ? 'team' : 'teams'} registered
            </p>
          </div>
          {!isLoading && !error && (
            <div className={cn("flex items-center space-x-2 bg-green-500/20 px-3 py-1 rounded-full border border-green-400/30", responsive.layout.mobileFullWidth, "sm:w-auto justify-center sm:justify-start")}>
              <span className="inline-block w-3 h-3 rounded-full bg-green-400 animate-pulse shadow-md"></span>
              <span className={cn(typography.label.sm, "text-green-100")}>Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Teams List Area */}
      <div className={cn("flex-1", responsive.containerPadding, "overflow-auto")}>
        {error ? (
          <TeamsError error={error} onRetry={handleRetry} />
        ) : isLoading ? (
          <TeamsSkeleton />
        ) : teamCount === 0 ? (
          <TeamsEmpty />
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className={responsive.table.mobileCard}>
              {teams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>

            {/* Desktop Table View */}
            <div className={cn(responsive.table.desktopTable, components.table.container, "animate-fade-in")}>
              <table className="min-w-full divide-y divide-gray-200" role="table" aria-label="Teams table">
                <thead className={components.table.header}>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th
                          key={header.id}
                          scope="col"
                          className={cn(
                            components.table.cell,
                            typography.label.md,
                            colors.text.primary,
                            "cursor-pointer select-none group/col",
                            (header.column.columnDef.meta as any)?.responsiveClass || ''
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                          style={{ width: header.getSize() }}
                          aria-sort={header.column.getIsSorted() ? (header.column.getIsSorted() === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <div className="flex items-center">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <span className="ml-1.5 inline-block w-4 text-center text-gray-400 group-hover/col:text-gray-600 transition-colors">
                              {header.column.getIsSorted() === 'asc' ? '▲' : header.column.getIsSorted() === 'desc' ? '▼' : <span className="opacity-30">▲</span>}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {table.getRowModel().rows.map((row, rowIndex) => (
                    <tr
                      key={row.id}
                      className={cn(
                        components.table.row,
                        'focus:outline-none focus-visible:ring-2 ring-blue-400',
                        {
                          'bg-white': rowIndex % 2 === 0,
                          'bg-gray-50': rowIndex % 2 !== 0,
                        }
                      )}
                      tabIndex={0}
                      role="row"
                    >
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          className={cn(
                            components.table.cell,
                            (cell.column.columnDef.meta as any)?.responsiveClass || ''
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

TeamsDisplay.displayName = 'TeamsDisplay';

export default TeamsDisplay;