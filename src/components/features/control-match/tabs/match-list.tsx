"use client";

import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface MatchesListProps {
  isLoadingMatches: boolean;
  matchesData: any[]; // Type should be refined to match your Match[] type
  selectedMatch: any | null; // Type should be refined to match your Match type
  handleSelectMatch: (match: { id: string; matchNumber: string | number }) => void;
  getStatusBadgeColor: (status: string) => string;
  formatDate: (date: string) => string;
  matchScoresMap: Record<string, { redTotalScore: number, blueTotalScore: number }>;
  getRedTeams: (match: any) => string[];
  getBlueTeams: (match: any) => string[];
  setCurrentTab: (tab: string) => void;
}

export default function MatchesList({
  isLoadingMatches,
  matchesData,
  selectedMatch,
  handleSelectMatch,
  getStatusBadgeColor,
  formatDate,
  matchScoresMap,
  getRedTeams,
  getBlueTeams,
  setCurrentTab
}: MatchesListProps) {
  // React Query client for cache manipulation
  const queryClient = useQueryClient();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tournament Matches</CardTitle>
        <CardDescription>
          Select a match to control
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingMatches ? (
          <div className="text-center p-4">Loading matches...</div>
        ) : matchesData.length === 0 ? (
          <div className="text-center p-4">No matches found for this tournament</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Match #</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scores</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matchesData.map((match) => (
                <TableRow 
                  key={match.id} 
                  className={selectedMatch?.id === match.id ? 'bg-blue-50' : ''}
                >
                  <TableCell>{match.matchNumber}</TableCell>
                  <TableCell>{formatDate(match.scheduledTime || '')}</TableCell>
                  <TableCell>
                    <Badge 
                      className={getStatusBadgeColor(match.status)}
                    >
                      {match.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {matchScoresMap[match.id] ? (
                      <div className="text-sm">
                        <span className="text-red-700">{matchScoresMap[match.id].redTotalScore}</span>
                        <span className="mx-1">-</span>
                        <span className="text-blue-700">{matchScoresMap[match.id].blueTotalScore}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">No scores</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <div className="text-red-700">
                        Red: {getRedTeams(match).join(', ') || 'N/A'}
                      </div>
                      <div className="text-blue-700">
                        Blue: {getBlueTeams(match).join(', ') || 'N/A'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => handleSelectMatch(match)}
                    >
                      Select
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['matches'] })}
        >
          Refresh Matches
        </Button>
        
        {selectedMatch && (
          <Button 
            onClick={() => setCurrentTab('match')}
          >
            Control Selected Match
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}