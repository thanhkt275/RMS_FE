"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Match, MatchStatus, Team } from "@/lib/types";
import { formatDate, getMatchStatusColor } from "@/lib/utils";
import { useUpdateMatchScore } from "@/hooks/use-matches";

interface MatchCardProps {
  match: Match;
  showScoreUpdate?: boolean;
  teams: Record<string, Team>;
}

export function MatchCard({ match, showScoreUpdate = false, teams }: MatchCardProps) {
  const [redScore, setredScore] = useState<number>(match.redScore || 0);
  const [blueScore, setblueScore] = useState<number>(match.blueScore || 0);
  const [isEditing, setIsEditing] = useState(false);
  
  const updateMatchScore = useUpdateMatchScore(match.stageId);
  const statusColor = getMatchStatusColor(match.status);

  const team1 = teams[match.redId];
  const team2 = teams[match.blueId];

  const handleUpdateScore = async () => {
    try {
      await updateMatchScore.mutateAsync({
        matchId: match.id,
        // Set redTotalScore directly with alliance1Score
        redTotalScore: redScore,
        // Set blueTotalScore directly with alliance2Score
        blueTotalScore: blueScore,
        // Set these to 0 since we're using total scores directly
        redAutoScore: 0,
        redDriveScore: 0,
        blueAutoScore: 0,
        blueDriveScore: 0,
        // Include team counts which are needed for multiplier calculations
        redTeamCount: match.alliances.find(a => a.color === "RED")?.teamAlliances.length || 0,
        blueTeamCount: match.alliances.find(a => a.color === "BLUE")?.teamAlliances.length || 0
      });
      
      // After successful update, exit editing mode
      setIsEditing(false);
    } catch (error) {
      // Log error but don't swallow it - the error handling is in the mutation
      console.error("Error updating match score:", error);
      // Error will be displayed by toast from the mutation's onError handler
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Match {match.matchNumber}</CardTitle>
          <Badge variant="outline" style={{ backgroundColor: statusColor, color: 'white' }}>
            {match.status}
          </Badge>
        </div>
        <CardDescription>
          {formatDate(match.scheduledTime)} • Field: {match.actualStartTime || "TBD"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="flex flex-col items-center">
            <span className="font-bold">{team1?.name || "TBD"}</span>
            {isEditing ? (
              <Input
                type="number"
                value={redScore}
                onChange={(e) => setredScore(Number(e.target.value))}
                className="w-16 mt-1 text-center"
                min={0}
              />
            ) : (
              <span className="text-2xl font-bold">{match.redScore ?? 0}</span>
            )}
          </div>
          
          <span className="text-lg font-bold mx-4">VS</span>
          
          <div className="flex flex-col items-center">
            <span className="font-bold">{team2?.name || "TBD"}</span>
            {isEditing ? (
              <Input
                type="number"
                value={blueScore}
                onChange={(e) => setblueScore(Number(e.target.value))}
                className="w-16 mt-1 text-center"
                min={0}
              />
            ) : (
              <span className="text-2xl font-bold">{match.blueScore ?? 0}</span>
            )}
          </div>
        </div>
      </CardContent>

      {showScoreUpdate && match.status !== MatchStatus.COMPLETED && (
        <CardFooter className="flex justify-end">
          {isEditing ? (
            <div className="space-x-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={handleUpdateScore} disabled={updateMatchScore.isPending}>
                {updateMatchScore.isPending ? "Saving..." : "Save Score"}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Update Score</Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}