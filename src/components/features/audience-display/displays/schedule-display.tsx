import React, { useEffect, useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { useNormalizedStageBracket } from "@/hooks/stages/use-normalized-stage-bracket";
import BracketView from "@/components/features/bracket/bracket-view";

// Define Schedule interface
export interface Match {
  id: string;
  matchNumber: string | number;
  scheduledTime: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  winningAlliance?: 'RED' | 'BLUE' | 'TIE' | null;
  redScore?: number;
  blueScore?: number;
  alliances?: Array<{
    color: 'RED' | 'BLUE';
    teamAlliances: Array<{
      teamId: string;
      team?: {
        id: string;
        name: string;
        teamNumber?: string;
      };
    }>;
  }>;
  roundNumber?: number | null;
  bracket?: string;
  stage?: {
    id: string;
    name: string;
    tournamentId: string;
    type: 'SWISS' | 'PLAYOFF' | 'FINAL';
  };
}

type AudienceStageType = 'SWISS' | 'PLAYOFF' | 'FINAL' | 'UNKNOWN';

interface StageSummary {
  stageId: string;
  stageName: string;
  stageType: AudienceStageType;
  matches: Match[];
}

interface ScheduleDisplayProps {
  matches: Match[];
  isLoading: boolean;
  tournamentId: string;
}

// Utility functions (SRP)
const formatTime = (timeString: string) => {
  const date = new Date(timeString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getTeamDisplay = (team: { name: string, teamNumber?: string } | undefined) => {
  if (!team) return 'TBD';
  return team.teamNumber ? `#${team.teamNumber} ${team.name}` : team.name;
};

const getTeams = (match: Match, color: 'RED' | 'BLUE') => {
  const alliance = match.alliances?.find(a => a.color === color);
  if (!alliance?.teamAlliances) return ['TBD'];
  return alliance.teamAlliances.map(ta => getTeamDisplay(ta.team));
};

// Table row for a match (SRP)
const MatchTableRow: React.FC<{ match: Match; index: number }> = ({ match, index }) => {
  // Highlight color helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800 border-yellow-400';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-400';
      case 'PENDING':
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };
  return (
    <tr 
      key={match.id} 
      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
    >
      <td className="px-4 py-3 whitespace-nowrap font-bold text-blue-900 text-lg">{match.matchNumber}</td>
      <td className="px-4 py-3 whitespace-nowrap text-blue-700 font-semibold">{formatTime(match.scheduledTime)}</td>
      <td className="px-4 py-3 whitespace-nowrap text-red-700 font-bold">{getTeams(match, 'RED').join(', ')}</td>
      <td className="px-4 py-3 whitespace-nowrap text-blue-700 font-bold">{getTeams(match, 'BLUE').join(', ')}</td>
      <td className={`px-4 py-3 whitespace-nowrap font-bold rounded ${getStatusColor(match.status)}`}>{match.winningAlliance ? match.winningAlliance : '-'}</td>
      <td className={`px-4 py-3 whitespace-nowrap text-xs rounded ${getStatusColor(match.status)}`}>{match.status.replace('_', ' ')}</td>
    </tr>
  );
};

// Table columns for matches
const getMatchColumns = (teamFilter: string): ColumnDef<Match, any>[] => [
  {
    accessorKey: 'matchNumber',
    header: 'Match #',
    cell: info => info.getValue(),
    enableSorting: true,
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue) return true;
      return String(row.getValue(columnId)).includes(filterValue);
    },
  },
  {
    accessorKey: 'scheduledTime',
    header: 'Time',
    cell: info => formatTime(info.getValue()),
    enableSorting: true,
  },
  {
    accessorKey: 'redAlliance',
    header: 'Red Alliance',
    cell: info => getTeams(info.row.original, 'RED').join(', '),
    enableSorting: false,
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue) return true;
      return getTeams(row.original, 'RED').join(', ').toLowerCase().includes(filterValue.toLowerCase());
    },
  },
  {
    accessorKey: 'blueAlliance',
    header: 'Blue Alliance',
    cell: info => getTeams(info.row.original, 'BLUE').join(', '),
    enableSorting: false,
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue) return true;
      return getTeams(row.original, 'BLUE').join(', ').toLowerCase().includes(filterValue.toLowerCase());
    },
  },
  {
    accessorKey: 'winningAlliance',
    header: 'Result',
    cell: info => info.getValue() || '-',
    enableSorting: true,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: info => info.getValue().replace('_', ' '),
    enableSorting: true,
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue) return true;
      return row.getValue(columnId) === filterValue;
    },
  },
];

export const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({ 
  matches, 
  isLoading,
  tournamentId 
}) => {
  // Group matches by stage and round for visualization
  // State to track which tab is active
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  
  // Table state for sorting/filtering
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [teamFilter, setTeamFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const stageSummaries: StageSummary[] = useMemo(() => {
    if (!matches.length) return [];

    const grouped = new Map<string, StageSummary>();

    matches.forEach((match) => {
      const stageId = match.stage?.id || 'unknown';
      const existing = grouped.get(stageId);

      if (existing) {
        existing.matches.push(match);
        return;
      }

      grouped.set(stageId, {
        stageId,
        stageName: match.stage?.name || 'Unknown Stage',
        stageType: match.stage?.type || 'UNKNOWN',
        matches: [match],
      });
    });

    return Array.from(grouped.values());
  }, [matches]);

  useEffect(() => {
    if (!stageSummaries.length) {
      setActiveStageId(null);
      return;
    }

    if (!activeStageId || !stageSummaries.some((stage) => stage.stageId === activeStageId)) {
      setActiveStageId(stageSummaries[0].stageId);
    }
  }, [activeStageId, stageSummaries]);

  const activeStage = useMemo(
    () => stageSummaries.find((stage) => stage.stageId === activeStageId) || stageSummaries[0] || null,
    [activeStageId, stageSummaries]
  );

  const stageMatches = useMemo(() => {
    if (activeStage) return activeStage.matches;
    return matches;
  }, [activeStage, matches]);

  // Prepare table data
  const tableData = useMemo(() => {
    return stageMatches.map(m => ({
      ...m,
      redAlliance: getTeams(m, 'RED').join(', '),
      blueAlliance: getTeams(m, 'BLUE').join(', ')
    }));
  }, [stageMatches]);

  const columns = useMemo(() => getMatchColumns(teamFilter), [teamFilter]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    debugTable: false,
  });

  useEffect(() => {
    // Filter by status
    if (statusFilter) {
      setColumnFilters((prev) => [
        ...prev.filter(f => f.id !== 'status'),
        { id: 'status', value: statusFilter }
      ]);
    } else {
      setColumnFilters((prev) => prev.filter(f => f.id !== 'status'));
    }
  }, [statusFilter]);

  useEffect(() => {
    // Filter by team name/number (red or blue alliance)
    if (teamFilter) {
      setColumnFilters((prev) => [
        ...prev.filter(f => f.id !== 'redAlliance' && f.id !== 'blueAlliance'),
        { id: 'redAlliance', value: teamFilter },
        { id: 'blueAlliance', value: teamFilter },
      ]);
    } else {
      setColumnFilters((prev) => prev.filter(f => f.id !== 'redAlliance' && f.id !== 'blueAlliance'));
    }
  }, [teamFilter]);

  const shouldLoadBracket =
    !!activeStage &&
    activeStage.stageId !== 'unknown' &&
    (activeStage.stageType === 'PLAYOFF' || activeStage.stageType === 'SWISS');

  const {
    normalizedBracket,
    isLoading: bracketLoading,
    error: bracketError,
    errorMessage: bracketErrorMessage,
    hasData: bracketHasData,
    isEmpty: bracketEmpty,
    data: bracketData,
  } = useNormalizedStageBracket(shouldLoadBracket ? activeStage?.stageId : undefined, {
    enabled: Boolean(shouldLoadBracket && activeStage?.stageId),
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-800 to-purple-900 shadow-xl text-white p-3 sm:p-4 lg:p-6 xl:p-8 text-center rounded-b-3xl border-b-4 border-blue-400 relative">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight drop-shadow-lg mb-1 sm:mb-2 animate-fade-in">Match Schedule</h2>
        <p className="text-sm sm:text-base lg:text-lg text-blue-200 font-medium animate-fade-in-slow">Tournament ID: {tournamentId}</p>
        <div className="absolute right-2 sm:right-4 lg:right-8 top-2 sm:top-4 lg:top-8 flex items-center space-x-1 sm:space-x-2"></div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 lg:gap-4 items-start sm:items-end p-2 sm:p-3 lg:p-4 bg-white border-b border-blue-100">
        <div className="flex-1 min-w-0 sm:flex-initial sm:w-auto">
          <label className="block text-xs text-gray-400 mb-1">Team Name/Number</label>
          <input
            value={teamFilter}
            onChange={e => setTeamFilter(e.target.value)}
            placeholder="Search teams..."
            className="w-full sm:w-40 px-2 py-1 text-sm rounded border border-blue-200"
          />
        </div>
        <div className="flex-1 min-w-0 sm:flex-initial sm:w-auto">
          <label className="block text-xs text-gray-400 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full sm:w-32 px-2 py-1 text-sm rounded border border-blue-200"
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-2 sm:p-4 lg:p-6 xl:p-8 overflow-auto bg-gradient-to-b from-gray-50 to-blue-50">
        {stageSummaries.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {stageSummaries.map((stage) => (
              <button
                key={stage.stageId}
                onClick={() => setActiveStageId(stage.stageId)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                  stage.stageId === activeStage?.stageId
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                }`}
                aria-pressed={stage.stageId === activeStage?.stageId}
              >
                {stage.stageName}
              </button>
            ))}
          </div>
        )}

        {shouldLoadBracket && (
          <div className="mb-6">
            <div className="bg-white border border-blue-100 rounded-xl shadow-sm p-4 sm:p-6">
              {bracketLoading ? (
                <div className="flex justify-center py-6">
                  <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : bracketError ? (
                <div className="text-sm text-red-600">
                  {bracketErrorMessage || 'Unable to load bracket'}
                </div>
              ) : !bracketHasData || bracketEmpty || !normalizedBracket ? (
                <div className="text-sm text-gray-600">
                  Bracket data not available yet. Matches will appear here once generated.
                </div>
              ) : (
                <BracketView
                  normalizedBracket={normalizedBracket}
                  stageName={activeStage?.stageName}
                  stageType={activeStage?.stageType}
                  generatedAt={bracketData?.generatedAt}
                />
              )}
            </div>
          </div>
        )}

        {/* Mobile Card View - Hidden on desktop */}
        <div className="block lg:hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-blue-600">Loading matches...</div>
            </div>
          ) : table.getRowModel().rows.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-blue-600">No matches found.</div>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {table.getRowModel().rows.map((row, index) => {
                const match = row.original;
                const getStatusColor = (status: string) => {
                  switch (status) {
                    case 'IN_PROGRESS':
                      return 'bg-yellow-100 text-yellow-800 border-yellow-400';
                    case 'COMPLETED':
                      return 'bg-green-100 text-green-800 border-green-400';
                    case 'PENDING':
                    default:
                      return 'bg-gray-100 text-gray-700 border-gray-300';
                  }
                };

                return (
                  <div key={row.id} className="bg-white rounded-lg shadow border border-blue-100 p-3 sm:p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <span className="text-lg sm:text-xl font-bold text-blue-900">Match {match.matchNumber}</span>
                        <span className="text-sm text-blue-700 font-semibold">{formatTime(match.scheduledTime)}</span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(match.status)}`}>
                        {match.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-2 px-3 bg-red-50 rounded border-l-4 border-red-500">
                        <div className="text-sm font-semibold text-red-800">Red Alliance</div>
                        <div className="text-sm font-bold text-red-700">{getTeams(match, 'RED').join(', ')}</div>
                      </div>
                      
                      <div className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded border-l-4 border-blue-500">
                        <div className="text-sm font-semibold text-blue-800">Blue Alliance</div>
                        <div className="text-sm font-bold text-blue-700">{getTeams(match, 'BLUE').join(', ')}</div>
                      </div>
                    </div>

                    {match.winningAlliance && (
                      <div className="mt-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          match.winningAlliance === 'RED' ? 'bg-red-100 text-red-800' : 
                          match.winningAlliance === 'BLUE' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {match.winningAlliance} Alliance Wins
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop Table View - Hidden on mobile */}
        <div className="hidden lg:block">
          <div className="overflow-hidden shadow-lg rounded-lg border border-blue-100 bg-white">
            <table className="min-w-full divide-y divide-blue-100">
              <thead className="bg-gray-800 text-white">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span className="ml-1 inline-block w-3 text-center">
                            {header.column.getIsSorted() === 'asc' ? '▲' : header.column.getIsSorted() === 'desc' ? '▼' : <span className="opacity-0">▲</span>}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-blue-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={table.getAllLeafColumns().length} className="text-center text-blue-400 py-8">Loading matches...</td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={table.getAllLeafColumns().length} className="text-center text-blue-400 py-8">No matches found.</td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-blue-50 transition-colors">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-blue-900 text-sm">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleDisplay;
