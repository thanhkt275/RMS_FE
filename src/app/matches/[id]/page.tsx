"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMatch, useMatchScores } from "@/hooks/api/use-matches";
import { cn } from "@/lib/utils";
import { MatchStatus } from "@/lib/types";
import { format, parseISO } from "date-fns";
import type { Alliance, TeamAlliance } from "@/lib/types";

// Components
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Clock,
  Calendar,
  Trophy,
  ArrowLeft,
  Users,
  BarChart3,
} from "lucide-react";

export default function MatchDetailsPage() {
  const { id } = useParams();
  const { data: match, isLoading, error } = useMatch(id as string);
  const { data: matchScores, isLoading: scoresLoading } = useMatchScores(id as string);
  const [activeTab, setActiveTab] = useState("overview");

  if (isLoading || scoresLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load match data. Please try again later.</p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => window.location.reload()}>Retry</Button>
              <Button variant="outline" asChild>
                <Link href="/matches">Back to Matches</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Find red and blue alliances
  const redAlliance = match.alliances?.find((a: Alliance) => a.color === "RED");
  const blueAlliance = match.alliances?.find((a: Alliance) => a.color === "BLUE");

  // Prefer scores from matchScores (scores table), fallback to alliance.score
  const redScore = typeof matchScores?.redTotalScore === "number"
    ? matchScores.redTotalScore
    : (typeof redAlliance?.score === "number" ? redAlliance.score : 0);
  const blueScore = typeof matchScores?.blueTotalScore === "number"
    ? matchScores.blueTotalScore
    : (typeof blueAlliance?.score === "number" ? blueAlliance.score : 0);

  // Determine match result based on scores from scores table (preferred)
  let calculatedWinningAlliance: string | null = null;
  if (typeof redScore === "number" && typeof blueScore === "number") {
    if (redScore > blueScore) {
      calculatedWinningAlliance = "RED";
    } else if (blueScore > redScore) {
      calculatedWinningAlliance = "BLUE";
    } else {
      calculatedWinningAlliance = "TIE";
    }
  }

  // Format time with date-fns
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "Not scheduled";
    try {
      return format(parseISO(dateString), "MMM d, yyyy • h:mm a");
    } catch (e) {
      return "Invalid date";
    }
  };

  // Format team names
  const formatTeams = (alliance: Alliance) => {
    if (!alliance?.teamAlliances || alliance.teamAlliances.length === 0) {
      return "No teams";
    }

    // Defensive: fallback to TeamAlliance if available, else fallback to minimal type
    return (alliance.teamAlliances as TeamAlliance[])
      .sort((a, b) => a.stationPosition - b.stationPosition)
      .map((ta) => ta.team);
  };

  // Get status badge with appropriate color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case MatchStatus.PENDING:
      case MatchStatus.PENDING:
        return <Badge variant="outline">Scheduled</Badge>;
      case MatchStatus.IN_PROGRESS:
        return <Badge className="bg-blue-500 text-white hover:bg-blue-600">In Progress</Badge>;
      case MatchStatus.COMPLETED:
        return <Badge className="bg-green-500 text-white hover:bg-green-600">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/matches">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">
            Match #{match.matchNumber}
          </h1>
          {getStatusBadge(match.status)}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={match.stage ? `/stages/${match.stage.id}` : "/stages"}>
              View Stage
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={match.stage && match.stage.tournament ? `/tournaments/${match.stage.tournament.id}` : "/tournaments"}>
              View Tournament
            </Link>
          </Button>
          {match.status === MatchStatus.PENDING && (
            <Button>
              Start Match
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Match Information */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-lg">
                      <Calendar className="mr-2 size-5 text-muted-foreground" />
                      Match Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Tournament</p>
                      <p className="font-medium">{match.stage?.tournament?.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stage</p>
                      <p className="font-medium">{match.stage?.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Round Number</p>
                      <p className="font-medium">{match.roundNumber || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stage Type</p>
                      <p className="font-medium">N/A</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-lg">
                      <Clock className="mr-2 size-5 text-muted-foreground" />
                      Time Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Scheduled Time</p>
                      <p className="font-medium">{formatDateTime(match.scheduledTime ?? null)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Start Time</p>
                      <p className="font-medium">{formatDateTime(match.startTime ?? null)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">End Time</p>
                      <p className="font-medium">{formatDateTime(match.endTime ?? null)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">
                        {('duration' in match && match.duration != null) ? `${match.duration} seconds` : "Not completed"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {((match.status === MatchStatus.COMPLETED) && (calculatedWinningAlliance)) && (
                  <Card className="md:col-span-2 border-t-2 border-t-gray-700 shadow-lg bg-gray-900 border-gray-800">
                    <CardHeader className="pb-2 bg-gradient-to-r from-gray-900 to-gray-800">
                      <CardTitle className="flex items-center text-lg text-gray-100">
                        <Trophy className="mr-2 size-5 text-yellow-500" />
                        Match Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {/* Red Alliance */}
                        <div className={cn(
                          "flex flex-col items-center justify-center space-y-2 rounded-lg p-4 border",
                          calculatedWinningAlliance === "RED" 
                            ? "bg-gradient-to-b from-red-950 to-red-900 border-red-500 shadow-md shadow-red-900/30 ring-1 ring-red-500/30" 
                            : "border-gray-800 bg-gray-900/30"
                        )}>
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="size-4 rounded-full" style={{ backgroundColor: "#ef4444" }} />
                            <h3 className="text-base font-semibold text-gray-200">Red Alliance</h3>
                          </div>
                          <div className="w-full px-2 py-3 rounded-md bg-black/30 flex flex-col items-center">
                            <span className={cn(
                              "text-4xl font-bold",
                              calculatedWinningAlliance === "RED" ? "text-red-400" : "text-gray-300"
                            )}>
                              {redScore}
                            </span>
                            <span className="text-xs text-gray-400 mt-1">TOTAL POINTS</span>
                          </div>
                          {(redAlliance?.teamAlliances && Array.isArray(redAlliance.teamAlliances)) ?
                            (redAlliance.teamAlliances as TeamAlliance[])
                              .sort((a, b) => a.stationPosition - b.stationPosition)
                              .map((ta) => (
                                <div key={ta.id} className="text-center w-full bg-black/20 rounded px-2 py-1">
                                  <p className={cn(
                                    "text-sm",
                                    calculatedWinningAlliance === "RED" ? "text-red-300" : "text-gray-400"
                                  )}>
                                    Team #{ta.team.teamNumber} · {ta.team.name}
                                  </p>
                                </div>
                              ))
                            : null}
                        </div>
                        {/* Match Result */}
                        <div className="flex flex-col items-center justify-center space-y-3">
                          {calculatedWinningAlliance && (
                            <div className="text-center">
                              <div className="flex flex-col items-center justify-center gap-2 mb-2">
                                <Trophy className="h-8 w-8 text-yellow-500" />
                                <div className={cn(
                                  "text-white text-lg font-bold px-6 py-2 rounded-md",
                                  calculatedWinningAlliance === "RED" 
                                    ? "bg-gradient-to-r from-red-800 to-red-700" 
                                    : calculatedWinningAlliance === "BLUE"
                                      ? "bg-gradient-to-r from-blue-800 to-blue-700"
                                      : "bg-gradient-to-r from-amber-800 to-amber-700"
                                )}>
                                  {calculatedWinningAlliance === "TIE" ? "TIE MATCH" : `${calculatedWinningAlliance} WINS`}
                                </div>
                              </div>
                              <div className="mt-4 text-sm text-gray-400">
                                Score Difference:
                                <span className="font-semibold text-white ml-1">
                                  {Math.abs(redScore - blueScore)} points
                                </span>
                              </div>
                              {calculatedWinningAlliance === "TIE" && (
                                <Badge className="mt-2 bg-amber-700 text-amber-100">
                                  TIE MATCH
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Blue Alliance */}
                        <div className={cn(
                          "flex flex-col items-center justify-center space-y-2 rounded-lg p-4 border",
                          calculatedWinningAlliance === "BLUE" 
                            ? "bg-gradient-to-b from-blue-950 to-blue-900 border-blue-500 shadow-md shadow-blue-900/30 ring-1 ring-blue-500/30" 
                            : "border-gray-800 bg-gray-900/30"
                        )}>
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="size-4 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
                            <h3 className="text-base font-semibold text-gray-200">Blue Alliance</h3>
                          </div>
                          <div className="w-full px-2 py-3 rounded-md bg-black/30 flex flex-col items-center">
                            <span className={cn(
                              "text-4xl font-bold",
                              calculatedWinningAlliance === "BLUE" ? "text-blue-400" : "text-gray-300"
                            )}>
                              {blueScore}
                            </span>
                            <span className="text-xs text-gray-400 mt-1">TOTAL POINTS</span>
                          </div>
                          {(blueAlliance?.teamAlliances && Array.isArray(blueAlliance.teamAlliances)) ?
                            (blueAlliance.teamAlliances as TeamAlliance[])
                              .sort((a, b) => a.stationPosition - b.stationPosition)
                              .map((ta) => (
                                <div key={ta.id} className="text-center w-full bg-black/20 rounded px-2 py-1">
                                  <p className={cn(
                                    "text-sm",
                                    calculatedWinningAlliance === "BLUE" ? "text-blue-300" : "text-gray-400"
                                  )}>
                                    Team #{ta.team.teamNumber} · {ta.team.name}
                                  </p>
                                </div>
                              ))
                            : null}
                        </div>
                      </div>
                      {/* Additional match statistics - only shown if match is completed */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 border-t border-gray-800 pt-4">
                        <div className="bg-gray-900/60 rounded-md p-3">
                          <div className="text-xs uppercase text-gray-500 mb-1">Match Duration</div>
                          <div className="text-lg font-semibold text-gray-100">{('duration' in match && match.duration != null) ? `${match.duration} seconds` : "Not completed"}</div>
                        </div>
                        <div className="bg-gray-900/60 rounded-md p-3">
                          <div className="text-xs uppercase text-gray-500 mb-1">Scheduled Time</div>
                          <div className="text-lg font-semibold text-gray-100">{formatDateTime(match.scheduledTime ?? null)}</div>
                        </div>
                        <div className="bg-gray-900/60 rounded-md p-3">
                          <div className="text-xs uppercase text-gray-500 mb-1">Start Time</div>
                          <div className="text-lg font-semibold text-gray-100">{formatDateTime(match.startTime ?? null)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="teams" className="mt-4">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card className={cn(
                  "border-t-4",
                  redAlliance ? "border-t-red-500" : "border-t-gray-300"
                )}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-lg">
                      <Users className="mr-2 size-5 text-muted-foreground" />
                      Red Alliance Teams
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!redAlliance || !Array.isArray(redAlliance.teamAlliances) || redAlliance.teamAlliances.length === 0 ? (
                      <p className="py-4 text-center text-muted-foreground">No teams assigned</p>
                    ) : (
                      <div className="space-y-4">
                        {(redAlliance.teamAlliances as TeamAlliance[])
                          .sort((a, b) => a.stationPosition - b.stationPosition)
                          .map((ta) => (
                            <div key={ta.id} className="flex items-center justify-between rounded-lg border p-3">
                              <div>
                                <p className="font-medium">{ta.team.name}</p>
                                <p className="text-sm text-muted-foreground">#{ta.team.teamNumber}</p>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline">Station {ta.stationPosition}</Badge>
                                {ta.isSurrogate && (
                                  <Badge variant="secondary" className="ml-2">Surrogate</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className={cn(
                  "border-t-4",
                  blueAlliance ? "border-t-blue-500" : "border-t-gray-300"
                )}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-lg">
                      <Users className="mr-2 size-5 text-muted-foreground" />
                      Blue Alliance Teams
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!blueAlliance || !Array.isArray(blueAlliance.teamAlliances) || blueAlliance.teamAlliances.length === 0 ? (
                      <p className="py-4 text-center text-muted-foreground">No teams assigned</p>
                    ) : (
                      <div className="space-y-4">
                        {(blueAlliance.teamAlliances as TeamAlliance[])
                          .sort((a, b) => a.stationPosition - b.stationPosition)
                          .map((ta) => (
                            <div key={ta.id} className="flex items-center justify-between rounded-lg border p-3">
                              <div>
                                <p className="font-medium">{ta.team.name}</p>
                                <p className="text-sm text-muted-foreground">#{ta.team.teamNumber}</p>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline">Station {ta.stationPosition}</Badge>
                                {ta.isSurrogate && (
                                  <Badge variant="secondary" className="ml-2">Surrogate</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Display additional team stats if available */}
                {(redAlliance?.allianceScoring || blueAlliance?.allianceScoring) && (
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center text-lg">
                        <BarChart3 className="mr-2 size-5 text-muted-foreground" />
                        Team Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* You can add detailed team performance stats here if available */}
                      <p className="text-center text-muted-foreground">
                        Detailed team performance data is available but not shown in this simple version.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar with Match Status */}
        <div>
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Match Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    {getStatusBadge(match.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tournament:</span>
                    <span className="font-medium">{match.stage?.tournament?.name || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stage:</span>
                    <span className="font-medium">{match.stage?.name || "N/A"}</span>
                  </div>
                  {match.scheduledTime && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scheduled:</span>
                      <span className="font-medium">
                        {format(parseISO(match.scheduledTime), "MMM d, h:mm a")}
                      </span>
                    </div>
                  )}
                </div>
                
                {match.status === MatchStatus.COMPLETED && calculatedWinningAlliance && (
                  <div className="mt-4">
                    <div className={cn(
                      "rounded-lg p-4 text-center",
                      calculatedWinningAlliance === "RED" 
                        ? "bg-gradient-to-br from-red-950 to-red-900 border border-red-800 shadow-inner shadow-red-800/10" 
                        : calculatedWinningAlliance === "BLUE"
                          ? "bg-gradient-to-br from-blue-950 to-blue-900 border border-blue-800 shadow-inner shadow-blue-800/10"
                          : "bg-gradient-to-br from-amber-950 to-amber-900 border border-amber-800"
                    )}>
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        <p className="text-sm uppercase tracking-wider text-gray-300 font-medium">Winner</p>
                      </div>
                      
                      <div className={cn(
                        "text-xl font-bold mb-3 py-1 px-3 rounded-md inline-block",
                        calculatedWinningAlliance === "RED" 
                          ? "text-white bg-red-800/50" 
                          : calculatedWinningAlliance === "BLUE"
                            ? "text-white bg-blue-800/50"
                            : "text-amber-100 bg-amber-800/50"
                      )}>
                        {calculatedWinningAlliance === "TIE" ? "TIE MATCH" : `${calculatedWinningAlliance} ALLIANCE`}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-700/50">
                        <div className={cn(
                          "text-center p-2 rounded-md",
                          calculatedWinningAlliance === "RED" ? "bg-red-800/30 ring-1 ring-red-700" : "bg-gray-800/40"
                        )}>
                          <p className="text-xs text-gray-400">RED</p>
                          <p className={cn(
                            "text-xl font-semibold",
                            calculatedWinningAlliance === "RED" ? "text-red-300" : "text-gray-300"
                          )}>
                            {redScore}
                          </p>
                        </div>
                        
                        <div className={cn(
                          "text-center p-2 rounded-md",
                          calculatedWinningAlliance === "BLUE" ? "bg-blue-800/30 ring-1 ring-blue-700" : "bg-gray-800/40"
                        )}>
                          <p className="text-xs text-gray-400">BLUE</p>
                          <p className={cn(
                            "text-xl font-semibold",
                            calculatedWinningAlliance === "BLUE" ? "text-blue-300" : "text-gray-300"
                          )}>
                            {blueScore}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-xs text-gray-400">
                        Score Difference: <span className="font-semibold text-white">
                          {Math.abs(redScore - blueScore)} points
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {match.status !== MatchStatus.COMPLETED && (
                  <div className="mt-4">
                    <Button className="w-full">
                      {match.status === MatchStatus.PENDING
                        ? "Start Match"
                        : "End Match"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Related Matches Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Tournament Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">
                    {match.stage?.tournament && 'description' in match.stage.tournament ? (match.stage.tournament as any).description : "No description available"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tournament Dates</p>
                  <p className="font-medium">
                    {match.stage?.tournament && 'startDate' in match.stage.tournament ? format(parseISO((match.stage.tournament as any).startDate), "MMM d") : "N/A"} - {match.stage?.tournament && 'endDate' in match.stage.tournament ? format(parseISO((match.stage.tournament as any).endDate), "MMM d, yyyy") : "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}