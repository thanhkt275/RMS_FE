/**
 * MobileMatchCard Component
 * Mobile-optimized card layout for displaying match information
 */

import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Clock, Eye, Trash2 } from 'lucide-react';


interface MobileMatchCardProps {
  match: any;
  matchScore?: { redTotalScore: number; blueTotalScore: number };
  onViewMatch: (matchId: string) => void;
  onTimeManagement: (match: any) => void;
  onDeleteMatch: (match: any) => void;
  formatDate: (dateString: string) => string;
  getMatchStatusBadge: (status: string) => React.ReactNode;
}

export const MobileMatchCard: React.FC<MobileMatchCardProps> = ({
  match,
  matchScore,
  onViewMatch,
  onTimeManagement,
  onDeleteMatch,
  formatDate,
  getMatchStatusBadge,
}) => {
  return (
    <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 text-blue-600 font-bold text-lg px-3 py-1 rounded-lg border border-blue-200">
              #{match.matchNumber}
            </div>
            <div className="text-sm">
              <div className="font-medium text-gray-900">Round {match.roundNumber}</div>
              <div className="text-gray-500">
                {match.scheduledTime ? formatDate(match.scheduledTime) : "Not scheduled"}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getMatchStatusBadge(match.status)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Teams */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <div className="text-xs font-semibold text-red-600 mb-1">RED ALLIANCE</div>
            {match.alliances?.find((a: any) => a.color === 'RED')?.teamAlliances?.map((ta: any, idx: number) => (
              <div key={ta.team.id || idx} className="text-sm text-gray-900 truncate">
                {ta.team?.name ?? '-'}
              </div>
            )) || <div className="text-sm text-gray-500">No teams assigned</div>}
          </div>
          
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="text-xs font-semibold text-blue-600 mb-1">BLUE ALLIANCE</div>
            {match.alliances?.find((a: any) => a.color === 'BLUE')?.teamAlliances?.map((ta: any, idx: number) => (
              <div key={ta.team.id || idx} className="text-sm text-gray-900 truncate">
                {ta.team?.name ?? '-'}
              </div>
            )) || <div className="text-sm text-gray-500">No teams assigned</div>}
          </div>
        </div>

        {/* Score and Result */}
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="text-gray-600">Score: </span>
            {matchScore ? (
              <span className="font-medium">
                <span className="text-red-600">{matchScore.redTotalScore}</span>
                <span className="text-gray-400 mx-1">-</span>
                <span className="text-blue-600">{matchScore.blueTotalScore}</span>
              </span>
            ) : (
              <span className="text-gray-500">-</span>
            )}
          </div>
          
          <div className="text-sm">
            {match.status === "COMPLETED" ? (
              <div>
                {match.winningAlliance === "RED" && (
                  <span className="text-red-600 font-semibold">Red Wins</span>
                )}
                {match.winningAlliance === "BLUE" && (
                  <span className="text-blue-600 font-semibold">Blue Wins</span>
                )}
                {!match.winningAlliance && <span className="text-gray-600">Draw</span>}
              </div>
            ) : (
              <span className="text-gray-500">Pending</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 min-h-[40px] touch-target"
            onClick={() => onViewMatch(match.id)}
          >
            <Eye size={16} className="mr-1" />
            View
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            disabled={match.status !== "PENDING"}
            className={`border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700 min-h-[40px] touch-target ${
              match.status !== "PENDING" ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={() => onTimeManagement(match)}
            title="Update match time"
          >
            <Clock size={16} />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            disabled={match.status !== "PENDING"}
            className={`border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 min-h-[40px] touch-target ${
              match.status !== "PENDING" ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={() => onDeleteMatch(match)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
