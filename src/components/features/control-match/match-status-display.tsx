import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Trophy } from "lucide-react";

interface MatchStatusDisplayProps {
  selectedMatch: any;
  selectedMatchId: string;
  activeMatch: any;
  matchState: any;
  getRedTeams: (match: any) => string[];
  getBlueTeams: (match: any) => string[];
  formatDate: (dateString: string) => string;
  getStatusBadgeColor: (status: string) => string;
  redTotalScore: number;
  blueTotalScore: number;
  isLoading?: boolean;
}

export function MatchStatusDisplay({
  selectedMatch,
  selectedMatchId,
  activeMatch,
  matchState,
  getRedTeams,
  getBlueTeams,
  formatDate,
  getStatusBadgeColor,
  redTotalScore,
  blueTotalScore,
  isLoading = false,
}: MatchStatusDisplayProps) {
  if (!selectedMatchId) {
    return (
      <Card className="p-6 shadow-lg max-w-3xl mx-auto bg-white">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Match Status</h2>
        <div className="text-center text-gray-700 py-8 bg-gray-100 rounded-lg">
          <div className="text-lg font-medium">No match selected</div>
          <div className="text-sm text-gray-500 mt-2">Select a match to view details</div>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6 shadow-lg max-w-3xl mx-auto bg-white">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Match Status</h2>
        <div className="text-center text-gray-700 py-8 bg-gray-100 rounded-lg">
          <div className="animate-pulse text-lg font-medium">Loading match details...</div>
        </div>
      </Card>
    );
  }

  const match = selectedMatch || activeMatch;
  if (!match) {
    return (
      <Card className="p-6 shadow-lg max-w-3xl mx-auto bg-white">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Match Status</h2>
        <div className="text-center text-gray-700 py-8 bg-gray-100 rounded-lg">
          <div className="text-lg font-medium text-red-700">Match not found</div>
          <div className="text-sm text-gray-500 mt-2">The selected match could not be loaded</div>
        </div>
      </Card>
    );
  }

  const redTeams = getRedTeams(match);
  const blueTeams = getBlueTeams(match);
  // Determine winner or tie (always show this section)
  let resultBadge;
  if (match.status === 'COMPLETED') {
    if (redTotalScore > blueTotalScore) {
      resultBadge = (
        <span className="text-red-800 bg-red-100 px-4 py-2 rounded-lg">Red Alliance Wins!</span>
      );
    } else if (blueTotalScore > redTotalScore) {
      resultBadge = (
        <span className="text-blue-800 bg-blue-100 px-4 py-2 rounded-lg">Blue Alliance Wins!</span>
      );
    } else {
      resultBadge = (
        <span className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">Tie Game!</span>
      );
    }
  } else {
    // Not started or in progress: default to Tie
    resultBadge = (
      <span className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">Tie Game!</span>
    );
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-lg rounded-xl p-8 max-w-3xl mx-auto min-h-[500px] flex flex-col justify-between text-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">Match Status</h2>
      <div className="space-y-6 flex-1 flex flex-col justify-between">
        {/* Match Header */}
        <div className="flex justify-between items-start p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl border border-blue-200">
          <div>
            <h3 className="text-3xl font-bold text-gray-900">Match {match.matchNumber}</h3>
            {match.scheduledTime && (
              <div className="flex items-center gap-2 text-gray-800 mt-2">
                <Clock className="w-4 h-4 text-gray-700" />
                <span className="font-medium text-gray-900">{formatDate(match.scheduledTime)}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Badge
              variant="outline"
              className={`font-semibold px-3 py-1 rounded-full border-2 text-xs
                ${(matchState?.status || match.status) === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}
                ${(matchState?.status || match.status) === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 border-blue-300' : ''}
                ${(matchState?.status || match.status) === 'COMPLETED' ? 'bg-green-100 text-green-800 border-green-300' : ''}
              `}
            >
              {(matchState?.status || match.status).replace('_', ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
            </Badge>
            {/* Live indicator when WebSocket data is available */}
            {matchState && (
              <div className="flex items-center gap-1 text-xs text-green-700">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Live</span>
                {matchState.currentPeriod && (
                  <span className="ml-2 bg-green-100 px-2 py-0.5 rounded font-medium">
                    {matchState.currentPeriod}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Teams and Scores */}
        <div className="grid grid-cols-2 gap-6">
          {/* Red Alliance */}
          <div className={`space-y-4 p-4 rounded-xl border-2 transition-colors duration-300
            ${redTotalScore > blueTotalScore
              ? 'bg-red-700 border-red-700'
              : 'bg-red-50 border-red-200'}
          `}>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-red-700" />
              <h4 className={`text-xl font-bold ${redTotalScore > blueTotalScore ? 'text-white' : 'text-red-800'}`}>Red Alliance</h4>
            </div>
            <div className="space-y-2">
              {redTeams.length > 0 ? (
                redTeams.map((team, index) => (
                  <div key={index} className={`p-3 bg-white rounded-lg border shadow-sm ${redTotalScore > blueTotalScore ? 'border-red-700' : 'border-red-200'}`}> 
                    <span className={`font-bold text-gray-900`}>Team {team}</span>
                  </div>
                ))
              ) : (
                <div className={`text-sm font-medium p-2 rounded ${redTotalScore > blueTotalScore ? 'text-white bg-red-600' : 'text-red-800 bg-red-50'}`}>No teams assigned</div>
              )}
            </div>
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${redTotalScore > blueTotalScore ? 'bg-red-800 border-red-900' : 'bg-red-100 border-red-300'}`}> 
              <Trophy className={`w-6 h-6 ${redTotalScore > blueTotalScore ? 'text-white' : 'text-red-800'}`} />
              <span className={`text-xl font-bold ${redTotalScore > blueTotalScore ? 'text-white' : 'text-red-900'}`}>Score: {redTotalScore}</span>
            </div>
          </div>
          {/* Blue Alliance */}
          <div className={`space-y-4 p-4 rounded-xl border-2 transition-colors duration-300
            ${blueTotalScore > redTotalScore
              ? 'bg-blue-700 border-blue-700'
              : 'bg-blue-50 border-blue-200'}
          `}>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-700" />
              <h4 className={`text-xl font-bold ${blueTotalScore > redTotalScore ? 'text-white' : 'text-blue-800'}`}>Blue Alliance</h4>
            </div>
            <div className="space-y-2">
              {blueTeams.length > 0 ? (
                blueTeams.map((team, index) => (
                  <div key={index} className={`p-3 bg-white rounded-lg border shadow-sm ${blueTotalScore > redTotalScore ? 'border-blue-700' : 'border-blue-200'}`}> 
                    <span className={`font-bold text-gray-900`}>Team {team}</span>
                  </div>
                ))
              ) : (
                <div className={`text-sm font-medium p-2 rounded ${blueTotalScore > redTotalScore ? 'text-white bg-blue-600' : 'text-blue-800 bg-blue-50'}`}>No teams assigned</div>
              )}
            </div>
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${blueTotalScore > redTotalScore ? 'bg-blue-800 border-blue-900' : 'bg-blue-100 border-blue-300'}`}> 
              <Trophy className={`w-6 h-6 ${blueTotalScore > redTotalScore ? 'text-white' : 'text-blue-800'}`} />
              <span className={`text-xl font-bold ${blueTotalScore > redTotalScore ? 'text-white' : 'text-blue-900'}`}>Score: {blueTotalScore}</span>
            </div>
          </div>
        </div>
        {/* Always show Match Result Badge in a fixed-height section */}
        <div className="text-center min-h-[90px] flex flex-col justify-center">
          <h4 className="text-2xl font-bold text-yellow-900 mb-3">🏆 Match Result</h4>
          <div className="text-3xl font-extrabold mb-2">{resultBadge}</div>
          {match.status === 'COMPLETED' && (
            <div className="text-xl text-gray-900 font-bold bg-white px-4 py-2 rounded-lg inline-block">
              Final Score: Red {redTotalScore} - Blue {blueTotalScore}
            </div>
          )}
        </div>
        {/* Field Information */}
        {match.fieldId && (
          <div className="text-sm text-gray-700 text-center pt-4 border-t bg-gray-50 rounded">
            Field: {match.fieldId}
          </div>
        )}
      </div>
    </Card>
  );
}
