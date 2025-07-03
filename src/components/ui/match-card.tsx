"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Match, MatchStatus } from "@/lib/types";
import { formatDate, getMatchStatusColor } from "@/lib/utils";
import { useUpdateMatchScores } from "@/hooks/api/use-matches";

interface MatchCardProps {
  match: Match;
  showScoreUpdate?: boolean;
}

export function MatchCard({ match, showScoreUpdate = false }: MatchCardProps) {
  // Get red and blue alliances
  const redAlliance = match.alliances?.find(a => a.color === "RED");
  const blueAlliance = match.alliances?.find(a => a.color === "BLUE");
  
  // Get initial scores from alliances
  const initialRedScore = redAlliance?.allianceScoring?.totalScore || 0;
  const initialBlueScore = blueAlliance?.allianceScoring?.totalScore || 0;
  
  const [redScore, setRedScore] = useState<number>(initialRedScore);
  const [blueScore, setBlueScore] = useState<number>(initialBlueScore);
  const [isEditing, setIsEditing] = useState(false);
  
  const updateMatchScore = useUpdateMatchScores();
  const statusColor = getMatchStatusColor(match.status);

  // Get team names from alliances
  const redTeam = redAlliance?.teamAlliances?.[0]?.team;
  const blueTeam = blueAlliance?.teamAlliances?.[0]?.team;

  const handleUpdateScore = async () => {
    // We need to get or create match scores first
    // For now, let's assume we have a match scores ID
    // This would typically come from the match or be created
    const matchScoresId = redAlliance?.allianceScoring?.id || blueAlliance?.allianceScoring?.id;
    
    if (!matchScoresId) {
      console.error("No match scores ID found");
      return;
    }
    
    try {
      await updateMatchScore.mutateAsync({
        id: matchScoresId,
        matchId: match.id,
        redTotalScore: redScore,
        blueTotalScore: blueScore,
        redAutoScore: 0,
        redDriveScore: 0,
        blueAutoScore: 0,
        blueDriveScore: 0,
        redTeamCount: redAlliance?.teamAlliances?.length || 0,
        blueTeamCount: blueAlliance?.teamAlliances?.length || 0
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating match score:", error);
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
          {formatDate(match.scheduledTime || null)} • Field: {match.startTime || "TBD"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="flex flex-col items-center">
            <span className="font-bold">{redTeam?.name || "TBD"}</span>
            {isEditing ? (
              <Input
                type="number"
                value={redScore}
                onChange={(e) => setRedScore(Number(e.target.value))}
                className="w-16 mt-1 text-center"
                min={0}
              />
            ) : (
              <span className="text-2xl font-bold">{initialRedScore}</span>
            )}
          </div>
          
          <span className="text-lg font-bold mx-4">VS</span>
          
          <div className="flex flex-col items-center">
            <span className="font-bold">{blueTeam?.name || "TBD"}</span>
            {isEditing ? (
              <Input
                type="number"
                value={blueScore}
                onChange={(e) => setBlueScore(Number(e.target.value))}
                className="w-16 mt-1 text-center"
                min={0}
              />
            ) : (
              <span className="text-2xl font-bold">{initialBlueScore}</span>
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