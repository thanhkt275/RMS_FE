import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Match {
  id: string;
  matchNumber: string | number;
  fieldId?: string;
  status: string;
  scheduledTime?: string;
}

interface MatchSelectorProps {
  matches: Match[];
  selectedMatchId: string;
  onSelectMatch: (match: Match) => void;
  getStatusBadgeColor: (status: string) => string;
  formatDate: (dateString: string) => string;
  getRedTeams: (match: any) => string[];
  getBlueTeams: (match: any) => string[];
  matchScoresMap: Record<string, { redTotalScore: number; blueTotalScore: number }>;
  isLoading?: boolean;
}

export function MatchSelector({
  matches,
  selectedMatchId,
  onSelectMatch,
  getStatusBadgeColor,
  formatDate,
  getRedTeams,
  getBlueTeams,
  matchScoresMap,
  isLoading = false,
}: MatchSelectorProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  const filteredMatches = useMemo(() => {
    if (!selectedStatus) return matches;
    return matches.filter((m) => m.status === selectedStatus);
  }, [matches, selectedStatus]);

  if (isLoading) {
    return (
      <Card className="p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Select Match</h2>
        <div className="text-center text-gray-600 py-8 bg-gray-50 rounded-lg">
          <div className="animate-pulse">Loading matches...</div>
        </div>
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card className="p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Select Match</h2>
        <div className="text-center text-gray-600 py-8 bg-gray-50 rounded-lg">
          No matches found for this field
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-lg rounded-xl p-8 min-h-[700px] flex flex-col justify-between text-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">Select Match</h2>
      {/* Status Filter */}
      <div className="flex justify-center mb-6 gap-2">
        {['PENDING', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
          <Button
            key={status}
            variant={selectedStatus === status ? 'default' : 'outline'}
            className={
              selectedStatus === status
                ? 'font-bold bg-blue-500 text-white border-blue-500 hover:bg-blue-600 hover:text-white'
                : 'border border-blue-500 text-blue-500 bg-white hover:bg-blue-50'
            }
            onClick={() => setSelectedStatus(status)}
          >
            {status.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
          </Button>
        ))}
        <Button
          variant={!selectedStatus ? 'default' : 'outline'}
          className={!selectedStatus ? 'font-bold bg-blue-500 text-white border-blue-500 hover:bg-blue-600 hover:text-white' : 'border border-blue-500 text-blue-500 bg-white hover:bg-blue-50'}
          onClick={() => setSelectedStatus(undefined)}
        >
          All
        </Button>
      </div>
      <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-gray-100">
        {filteredMatches.map((match) => {
          const redTeams = getRedTeams(match);
          const blueTeams = getBlueTeams(match);
          const scores = matchScoresMap[match.id];
          const isSelected = selectedMatchId === match.id;

          return (
            <div
              key={match.id}
              className={`
                border-2 rounded-xl p-6 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200' 
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                }
              `}
              onClick={() => onSelectMatch(match)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg text-gray-900">
                    Match {match.matchNumber}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={`font-semibold px-3 py-1 rounded-full border-2 text-xs
                      ${match.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}
                      ${match.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 border-blue-300' : ''}
                      ${match.status === 'COMPLETED' ? 'bg-green-100 text-green-800 border-green-300' : ''}
                    `}
                  >
                    {match.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                  </Badge>
                </div>
                {match.scheduledTime && (
                  <span className="text-sm text-gray-700 bg-gray-100 px-3 py-1 rounded font-medium">
                    {formatDate(match.scheduledTime)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2 p-4 bg-red-50 rounded-md border border-red-200">
                  <div className="font-bold text-red-800 text-xs uppercase tracking-wide">Red Alliance</div>
                  <div className="text-gray-800 font-medium">
                    {redTeams.length > 0 ? redTeams.join(", ") : "No teams assigned"}
                  </div>
                  {scores && (
                    <div className="font-bold text-red-700 bg-red-100 px-2 py-1 rounded text-center">
                      Score: {scores.redTotalScore}
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-4 bg-blue-50 rounded-md border border-blue-200">
                  <div className="font-bold text-blue-800 text-xs uppercase tracking-wide">Blue Alliance</div>
                  <div className="text-gray-800 font-medium">
                    {blueTeams.length > 0 ? blueTeams.join(", ") : "No teams assigned"}
                  </div>
                  {scores && (
                    <div className="font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded text-center">
                      Score: {scores.blueTotalScore}
                    </div>
                  )}
                </div>
              </div>
              {isSelected && (
                <div className="mt-4 pt-3 border-t-2 border-blue-300">
                  <div className="flex items-center gap-2 text-blue-800 font-bold">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Currently Selected Match
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
