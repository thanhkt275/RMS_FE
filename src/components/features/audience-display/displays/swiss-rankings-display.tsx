import React from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, ColumnDef, SortingState } from '@tanstack/react-table';

interface TeamInfo {
  teamNumber?: string;
  name?: string;
}

interface RankingRow {
  teamId: string;
  team?: TeamInfo;
  wins: number;
  losses: number;
  ties: number;
  rankingPoints: number;
  opponentWinPercentage: number;
  pointDifferential: number;
  matchesPlayed: number;
  highestScore?: number;
  totalScore?: number;
  // For display purposes, not directly in data
  rank?: number;
}

export function SwissRankingsDisplay({ rankings: rawRankings, isLoading }: { rankings: any[], isLoading?: boolean }) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'rank', desc: false }]);

  // Auto-calculate rank by totalScore (pointsScored), then wins
  const rankings = React.useMemo(() => {
    if (!Array.isArray(rawRankings)) return [];
    // Sort by totalScore (pointsScored) desc, then wins desc
    const sorted = [...rawRankings].sort((a, b) => {
      const aScore = a.totalScore ?? a.pointsScored ?? 0;
      const bScore = b.totalScore ?? b.pointsScored ?? 0;
      if (bScore !== aScore) return bScore - aScore;
      if ((b.wins ?? 0) !== (a.wins ?? 0)) return (b.wins ?? 0) - (a.wins ?? 0);
      return 0;
    });
    return sorted.map((r, idx) => ({ ...r, rank: idx + 1 }));
  }, [rawRankings]);

  // Update columns: display totalScore as pointsScored, display wins
  const columns = React.useMemo<ColumnDef<RankingRow>[]>(() => [
    {
      accessorKey: 'rank',
      header: () => <span className="text-slate-300">Rank</span>,
      cell: info => <div className="flex items-center justify-center font-extrabold text-blue-900 text-lg">{info.getValue() as number}</div>,
      size: 70,
    },
    {
      accessorKey: 'teamNumber',
      header: () => <span className="text-slate-300">Team #</span>,
      cell: info => {
        const value = info.getValue() as string | undefined;
        return (
          <div className="flex items-center justify-center">
            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm border border-blue-200 shadow-sm">
              {value || '—'}
            </div>
          </div>
        );
      },
      size: 90,
    },
    {
      accessorKey: 'teamName',
      header: () => <span className="text-slate-300">Team Name</span>,
      cell: info => <div className="text-sm font-bold text-slate-900">{info.getValue() as string || '-'}</div>,
      size: 180,
    },
    {
      accessorKey: 'totalScore',
      header: () => <span className="text-slate-300">Total Score</span>,
      cell: info => {
        // Show totalScore if present, else pointsScored if present, else '-'
        const val = info.getValue();
        const fallback = (info.row.original as any).pointsScored;
        return <span className="text-blue-900 font-bold">{val ?? fallback ?? '-'}</span>;
      },
      size: 110,
    },
    {
      accessorKey: 'wins',
      header: () => <span className="text-green-300">Wins</span>,
      cell: info => <span className="font-extrabold text-green-700 text-lg">{info.getValue() as number}</span>,
      size: 90,
    },
    {
      accessorKey: 'matchesPlayed',
      header: () => <span className="text-slate-300">Matches</span>,
      cell: info => <span className="text-blue-700 font-semibold">{info.getValue() as number}</span>,
      size: 90,
    },
    {
      id: 'wlt',
      header: () => <span className="text-blue-100 text-sm">W-L-T</span>,
      accessorFn: row => `${row.wins}-${row.losses}-${row.ties}`,
      cell: info => <span className="text-blue-600 text-sm">{info.getValue() as string}</span>,
      size: 90,
    },
    {
      accessorKey: 'opponentWinPercentage',
      header: () => <span className="text-blue-100 text-sm">OWP</span>,
      cell: info => <span className="text-blue-500 text-xs">{((info.getValue() as number) * 100).toFixed(1)}%</span>,
      size: 80,
    },
    {
      accessorKey: 'pointDifferential',
      header: () => <span className="text-blue-100 text-sm">Pt Diff</span>,
      cell: info => <span className="text-blue-500 text-xs">{info.getValue() as number}</span>,
      size: 80,
    },
  ], []);

  const table = useReactTable({
    data: rankings,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    debugTable: false,
  });

  return (
    <div className="flex flex-col h-full bg-slate-100">
      {/* Rankings Page Header */}
      <div className="bg-slate-800 shadow-lg text-white p-3 sm:p-4 lg:p-6 xl:p-8 rounded-b-xl animate-fade-in">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-center w-full">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-1">Tournament Rankings</h1>
            <p className="text-xs sm:text-sm lg:text-base text-slate-300 animate-fade-in-slow">
              <span className="text-sky-400 font-semibold">{rankings.length}</span> {rankings.length === 1 ? 'team' : 'teams'} ranked
            </p>
          </div>
        </div>
      </div>
      
      {/* Rankings Content Area */}
      <div className="flex-1 p-2 sm:p-3 lg:p-4 xl:p-6 overflow-auto">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-full min-h-[200px] sm:min-h-[300px] bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 animate-pulse">
            <div className="text-base sm:text-lg lg:text-xl text-slate-500 font-semibold mb-2 sm:mb-3">Loading rankings...</div>
            <div className="w-12 sm:w-16 h-12 sm:h-16 border-4 border-sky-500 border-dashed rounded-full animate-spin"></div>
          </div>
        ) : rankings.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in">
            {/* Mobile Card View - Hidden on desktop */}
            <div className="block lg:hidden">
              <div className="space-y-2 sm:space-y-3 p-3 sm:p-4">
                {table.getRowModel().rows.map((row, rowIndex) => {
                  const ranking = row.original;
                  return (
                    <div key={row.id} className={`p-3 sm:p-4 rounded-lg border ${rowIndex % 2 === 0 ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-300'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 text-blue-800 font-bold text-sm border-2 border-blue-200">
                            #{ranking.rank}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <div className="flex-shrink-0 h-6 w-6 sm:h-8 sm:w-8 flex items-center justify-center rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                                {ranking.teamNumber || '—'}
                              </div>
                              <h3 className="text-sm sm:text-base font-bold text-slate-900">{ranking.teamName || '-'}</h3>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg sm:text-xl font-bold text-blue-900">{ranking.totalScore ?? ranking.pointsScored ?? '-'}</div>
                          <div className="text-xs sm:text-sm text-slate-600">Total Score</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                        <div className="bg-green-50 rounded p-2 border border-green-200">
                          <div className="text-lg sm:text-xl font-bold text-green-700">{ranking.wins}</div>
                          <div className="text-xs text-green-600">Wins</div>
                        </div>
                        <div className="bg-blue-50 rounded p-2 border border-blue-200">
                          <div className="text-lg sm:text-xl font-semibold text-blue-700">{ranking.matchesPlayed}</div>
                          <div className="text-xs text-blue-600">Matches</div>
                        </div>
                        <div className="bg-slate-50 rounded p-2 border border-slate-200 col-span-2 sm:col-span-1">
                          <div className="text-sm font-semibold text-slate-700">{ranking.wins}-{ranking.losses}-{ranking.ties}</div>
                          <div className="text-xs text-slate-600">W-L-T</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Desktop Table View - Hidden on mobile */}
            <div className="hidden lg:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-700">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className="px-3 sm:px-4 lg:px-5 py-2 sm:py-3 lg:py-3.5 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                          onClick={header.column.getToggleSortingHandler()}
                          style={{ width: header.getSize() }}
                        >
                          <div className="flex items-center text-slate-300">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <span className="ml-1.5 inline-block w-4 text-center">
                              {header.column.getIsSorted() === 'asc' ? '▲' : header.column.getIsSorted() === 'desc' ? '▼' : <span className="opacity-30">▲</span>}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {table.getRowModel().rows.map((row, rowIndex) => (
                    <tr key={row.id} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-sky-50/70 transition-colors duration-150`}>
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          className="px-3 sm:px-4 lg:px-5 py-3 sm:py-4 whitespace-nowrap text-sm"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] sm:min-h-[300px] bg-white rounded-xl shadow-lg p-6 sm:p-8 lg:p-12 text-center animate-fade-in">
            <svg className="w-12 sm:w-16 h-12 sm:h-16 text-slate-300 mb-3 sm:mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM12 12.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            <h3 className="text-lg sm:text-xl font-semibold text-slate-700 mb-1 sm:mb-2">No Rankings Available</h3>
            <p className="text-xs sm:text-sm text-slate-500">Rankings for this tournament will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
