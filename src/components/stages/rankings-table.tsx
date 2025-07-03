import { TeamRanking } from "@/types/stage-advancement.types";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Medal, Award } from "lucide-react";

interface RankingsTableProps {
  rankings: TeamRanking[];
  highlightAdvancing?: number;
  className?: string;
}

/**
 * Component to display team rankings in a table format
 * Implements Single Responsibility Principle - only displays rankings
 */
export function RankingsTable({ rankings, highlightAdvancing = 0, className = "" }: RankingsTableProps) {
  
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-4 w-4 text-yellow-600" />;
      case 2:
        return <Medal className="h-4 w-4 text-gray-600" />;
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRankBadge = (rank: number, isAdvancing: boolean) => {
    const baseClasses = "font-semibold";
    
    if (isAdvancing) {
      return (
        <Badge className={`${baseClasses} bg-green-100 text-green-800 border-green-300`}>
          #{rank}
        </Badge>
      );
    }
    
    if (rank <= 3) {
      const colors = {
        1: "bg-yellow-100 text-yellow-800 border-yellow-300",
        2: "bg-gray-100 text-gray-800 border-gray-300", 
        3: "bg-amber-100 text-amber-800 border-amber-300"
      };
      return (
        <Badge className={`${baseClasses} ${colors[rank as keyof typeof colors]}`}>
          #{rank}
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className={`${baseClasses} border-gray-300 text-gray-700`}>
        #{rank}
      </Badge>
    );
  };

  return (
    <div className={`${className}`}>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 border-b border-gray-200">
            <TableHead className="text-gray-700 font-semibold w-16">Rank</TableHead>
            <TableHead className="text-gray-700 font-semibold">Team</TableHead>
            <TableHead className="text-gray-700 font-semibold text-center">Record</TableHead>
            <TableHead className="text-gray-700 font-semibold text-center">RP</TableHead>
            <TableHead className="text-gray-700 font-semibold text-center">Pts Diff</TableHead>
            <TableHead className="text-gray-700 font-semibold text-center">OWP</TableHead>
            {highlightAdvancing > 0 && (
              <TableHead className="text-gray-700 font-semibold text-center">Status</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((ranking) => {
            const isAdvancing = highlightAdvancing > 0 && (ranking.rank || 0) <= highlightAdvancing;
            return (
              <TableRow 
                key={ranking.teamId} 
                className={`
                  transition-colors border-b border-gray-100
                  ${isAdvancing ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}
                `}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {getRankIcon(ranking.rank || 0)}
                    {getRankBadge(ranking.rank || 0, isAdvancing)}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-semibold">
                        {ranking.teamNumber}
                      </span>
                      <span>{ranking.teamName}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="font-medium text-gray-900">
                    {ranking.wins}-{ranking.losses}-{ranking.ties}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="font-medium text-gray-900">
                    {ranking.rankingPoints}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className={`font-medium ${
                    ranking.pointDifferential > 0 ? 'text-green-600' : 
                    ranking.pointDifferential < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {ranking.pointDifferential > 0 ? '+' : ''}{ranking.pointDifferential}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="font-medium text-gray-900">
                    {(ranking.tiebreaker2 * 100).toFixed(1)}%
                  </div>
                </TableCell>
                {highlightAdvancing > 0 && (
                  <TableCell className="text-center">
                    {isAdvancing ? (
                      <Badge className="bg-green-100 text-green-800 border-green-300 font-semibold">
                        Advancing
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-gray-300 text-gray-600">
                        Eliminated
                      </Badge>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
