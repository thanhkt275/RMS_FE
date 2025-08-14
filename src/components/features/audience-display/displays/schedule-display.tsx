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
import { colors, typography, spacing, components, cn } from "../design-system";

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
  round?: number;
  bracket?: string;
  stage?: {
    id: string;
    name: string;
    tournamentId: string;
    type: 'SWISS' | 'PLAYOFF' | 'FINAL';
  };
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

const formatDate = (timeString: string) => {
  const date = new Date(timeString);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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

// Table for matches (SRP)
const MatchesTable: React.FC<{ matches: Match[] }> = ({ matches }) => (
  <div className="overflow-hidden shadow-lg rounded-lg">
    <table className="min-w-full bg-white divide-y divide-gray-200">
      <thead className="bg-gray-800 text-white">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Match #</th>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Time</th>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Red Alliance</th>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Blue Alliance</th>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Result</th>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {matches.map((match, index) => (
          <MatchTableRow key={match.id} match={match} index={index} />
        ))}
      </tbody>
    </table>
  </div>
);

// Swiss format section (SRP)
const SwissFormat: React.FC<{ rounds: { [roundNumber: number]: Match[] } }> = ({ rounds }) => (
  <div className="space-y-6">
    {Object.keys(rounds)
      .map(Number)
      .sort((a, b) => a - b)
      .map(roundNumber => (
        <div key={roundNumber} className="bg-white rounded-lg shadow">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-3 rounded-t-lg">
            <h3 className="text-lg font-bold">Round {roundNumber}</h3>
          </div>
          <div className="overflow-x-auto">
            <MatchesTable matches={rounds[roundNumber]} />
          </div>
        </div>
      ))}
  </div>
);

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
  const [groupedMatches, setGroupedMatches] = useState<{
    [stageId: string]: {
      stageName: string;
      stageType: 'SWISS' | 'PLAYOFF' | 'FINAL';
      rounds: {
        [roundNumber: number]: Match[];
      };
    };
  }>({});

  // State to track which tab is active
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  
  // Table state for sorting/filtering
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [teamFilter, setTeamFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Prepare table data
  const tableData = useMemo(() => {
    return matches.map(m => ({
      ...m,
      redAlliance: getTeams(m, 'RED').join(', '),
      blueAlliance: getTeams(m, 'BLUE').join(', ')
    }));
  }, [matches]);

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

  useEffect(() => {
    if (matches && matches.length > 0) {
      const grouped: {
        [stageId: string]: {
          stageName: string;
          stageType: 'SWISS' | 'PLAYOFF' | 'FINAL';
          rounds: {
            [roundNumber: number]: Match[];
          };
        };
      } = {};
      
      // First, group matches by stage and round
      matches.forEach(match => {
        const stageId = match.stage?.id || 'unknown';
        const stageName = match.stage?.name || 'Unknown Stage';
        const stageType = match.stage?.type || 'PLAYOFF';
        const roundNumber = match.round || 1;
        
        if (!grouped[stageId]) {
          grouped[stageId] = {
            stageName,
            stageType,
            rounds: {}
          };
        }
        
        if (!grouped[stageId].rounds[roundNumber]) {
          grouped[stageId].rounds[roundNumber] = [];
        }
        
        grouped[stageId].rounds[roundNumber].push(match);
      });
      
      // Sort each round's matches by match number
      Object.keys(grouped).forEach(stageId => {
        Object.keys(grouped[stageId].rounds).forEach(roundNumber => {
          grouped[stageId].rounds[Number(roundNumber)].sort((a, b) => {
            return Number(a.matchNumber) - Number(b.matchNumber);
          });
        });
      });
      
      setGroupedMatches(grouped);
      
      // Set the first stage as active if none is selected
      if (!activeStageId && Object.keys(grouped).length > 0) {
        setActiveStageId(Object.keys(grouped)[0]);
      }
    }
  }, [matches, activeStageId]);

  // Render a bracket visualization for elimination rounds
  const renderEliminationBracket = (matches: Match[], stageType: string) => {
    if (stageType !== 'PLAYOFF') return null;
    // Group matches by round for the bracket
    const roundMatches: {[key: number]: Match[]} = {};
    matches.forEach(match => {
      const round = match.round || 1;
      if (!roundMatches[round]) roundMatches[round] = [];
      roundMatches[round].push(match);
    });
    
    const rounds = Object.keys(roundMatches).map(Number).sort((a, b) => b - a);
    
    // Calculate bracket size
    const finalRound = rounds[0] || 1;
    const bracketSize = Math.pow(2, finalRound);
    
    return (
      <div className="overflow-x-auto">
        <div className="flex space-x-8 p-4 min-w-max">
          {rounds.map(roundNumber => (
            <div key={roundNumber} className="flex flex-col space-y-4">
              <div className="text-center font-bold">
                {roundNumber === 1 ? 'Finals' : 
                 roundNumber === 2 ? 'Semifinals' : 
                 roundNumber === 3 ? 'Quarterfinals' : 
                 `Round of ${Math.pow(2, roundNumber)}`}
              </div>
              <div className="flex flex-col space-y-8">
                {roundMatches[roundNumber].map((match, idx) => {
                  const spacingMultiplier = Math.pow(2, roundNumber - 1);
                  return (
                    <div 
                      key={match.id} 
                      className="relative"
                      style={{ 
                        marginTop: idx % 2 === 1 ? `${spacingMultiplier * 4}rem` : '0'
                      }}
                    >
                      <div className="w-48 border border-gray-300 rounded shadow bg-white">
                        <div className="p-2 border-b text-xs font-semibold bg-gray-50">
                          Match {match.matchNumber} • {formatTime(match.scheduledTime)}
                        </div>
                        <div className={`p-2 border-b ${match.winningAlliance === 'RED' ? 'bg-red-50' : ''}`}>
                          <div className="text-sm font-medium">
                            {getTeams(match, 'RED')[0]} 
                          </div>
                          {match.redScore !== undefined && (
                            <div className="text-xs text-right font-bold">{match.redScore}</div>
                          )}
                        </div>
                        <div className={`p-2 ${match.winningAlliance === 'BLUE' ? 'bg-blue-50' : ''}`}>
                          <div className="text-sm font-medium">
                            {getTeams(match, 'BLUE')[0]}
                          </div>
                          {match.blueScore !== undefined && (
                            <div className="text-xs text-right font-bold">{match.blueScore}</div>
                          )}
                        </div>
                      </div>
                      
                      {/* Draw connecting lines for brackets */}
                      {roundNumber < finalRound && (
                        <div className="absolute w-8 h-full -right-8 flex items-center justify-end">
                          <div className="border-t border-gray-300 w-full"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-800 to-purple-900 shadow-xl text-white p-8 text-center rounded-b-3xl border-b-4 border-blue-400 relative">
        <h2 className="text-5xl font-extrabold tracking-tight drop-shadow-lg mb-2 animate-fade-in">Match Schedule</h2>
        <p className="text-lg text-blue-200 font-medium animate-fade-in-slow">Tournament ID: {tournamentId}</p>
        <div className="absolute right-8 top-8 flex items-center space-x-2"></div>
      </div>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end p-4 bg-white border-b border-blue-100">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Team Name/Number</label>
          <input
            value={teamFilter}
            onChange={e => setTeamFilter(e.target.value)}
            placeholder="Search by team name or number"
            className="w-40 px-2 py-1 rounded border border-blue-200"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-32 px-2 py-1 rounded border border-blue-200"
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>
      {/* Table */}
      <div className="flex-1 p-8 overflow-auto bg-gradient-to-b from-gray-50 to-blue-50">
        <div className="overflow-hidden shadow-lg rounded-lg border border-blue-100 bg-white">
          <table className="min-w-full divide-y divide-blue-100">
            <thead className="bg-gray-800 text-white">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none"
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
                      <td key={cell.id} className="px-4 py-3 whitespace-nowrap text-blue-900">
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
  );
};

export default ScheduleDisplay;