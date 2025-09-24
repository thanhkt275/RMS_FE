"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMatch, useMatchScores } from "@/hooks/matches/use-matches";
import { useAuth } from "@/hooks/common/use-auth";
import { useUserTeams } from "@/hooks/teams/use-teams";
import { cn } from "@/lib/utils";
import { MatchStatus, UserRole } from "@/types/types";
import { format, parseISO } from "date-fns";
import type { Alliance, TeamAlliance } from "@/types/types";

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
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  
  // Convert id to string safely
  const matchId = Array.isArray(id) ? id[0] : id as string;
  
  const { data: match, isLoading, error } = useMatch(matchId);
  const { data: matchScores, isLoading: scoresLoading } = useMatchScores(matchId);
  const { data: userTeams = [] } = useUserTeams();
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

  // Check if user has any teams participating in this match
  const isUserParticipating = () => {
    if (!userTeams || userTeams.length === 0 || !match) return false;
    
    // Extract all team IDs from the user's teams
    const userTeamIds = userTeams.map(team => team.id);
    
    // Check if any team in the match belongs to the user
    return match.alliances?.some((alliance: any) => 
      alliance.teamAlliances?.some((ta: any) => 
        userTeamIds.includes(ta.team?.id)
      )
    ) || false;
  };

  const userIsParticipating = isUserParticipating();

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
    <div className="container mx-auto py-4 px-3 sm:py-6 sm:px-4 lg:py-8">
      {/* User Participation Banner */}
      {userIsParticipating && (
        <div className="mb-4 sm:mb-6 rounded-lg bg-gradient-to-r from-green-900/80 to-green-800/60 border border-green-600 p-3 sm:p-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex-shrink-0 mt-0.5 sm:mt-0">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-green-100 break-words">You're participating in this match!</h3>
              <p className="text-xs sm:text-sm text-green-200 break-words">Your team is scheduled to compete in this match.</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:gap-4">
        {/* Header Row */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="outline" size="sm" asChild className="flex-shrink-0">
            <Link href="/matches">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold break-words">
              Match #{match.matchNumber}
            </h1>
            {getStatusBadge(match.status)}
          </div>
        </div>
        
        {/* Action Buttons Row */}
        <div className="flex flex-col xs:flex-row gap-2 overflow-x-auto">
          <Button variant="outline" size="sm" asChild className="whitespace-nowrap">
            <Link href={match.stage ? `/stages/${match.stage.id}` : "/stages"}>
              View Stage
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="whitespace-nowrap">
            <Link href={match.stage && match.stage.tournament ? `/tournaments/${match.stage.tournament.id}` : "/tournaments"}>
              View Tournament
            </Link>
          </Button>
          {isAdmin && match.status === MatchStatus.PENDING && (
            <Button size="sm" className="whitespace-nowrap">
              Start Match
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">
        {/* Match Information */}
        <div className="xl:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="teams" className="text-xs sm:text-sm">Teams</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-3 sm:mt-4">
              <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-base sm:text-lg">
                      <Calendar className="mr-2 size-4 sm:size-5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">Match Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Tournament</p>
                      <p className="font-medium text-sm sm:text-base break-words">{match.stage?.tournament?.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Stage</p>
                      <p className="font-medium text-sm sm:text-base break-words">{match.stage?.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Round Number</p>
                      <p className="font-medium text-sm sm:text-base">{match.roundNumber || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Stage Type</p>
                      <p className="font-medium text-sm sm:text-base">N/A</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-base sm:text-lg">
                      <Clock className="mr-2 size-4 sm:size-5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">Time Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Scheduled Time</p>
                      <p className="font-medium text-sm sm:text-base break-words">{formatDateTime(match.scheduledTime ?? null)}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Start Time</p>
                      <p className="font-medium text-sm sm:text-base break-words">{formatDateTime(match.startTime ?? null)}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">End Time</p>
                      <p className="font-medium text-sm sm:text-base break-words">{formatDateTime(match.endTime ?? null)}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium text-sm sm:text-base">
                        {('duration' in match && match.duration != null) ? `${match.duration} seconds` : "Not completed"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {((match.status === MatchStatus.COMPLETED) && (calculatedWinningAlliance)) && (
                  <Card className="lg:col-span-2 border-t-2 border-t-gray-700 shadow-lg bg-gray-900 border-gray-800">
                    <CardHeader className="pb-2 bg-gradient-to-r from-gray-900 to-gray-800">
                      <CardTitle className="flex items-center text-base sm:text-lg text-gray-100">
                        <Trophy className="mr-2 size-4 sm:size-5 text-yellow-500 flex-shrink-0" />
                        <span className="truncate">Match Results</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-6 pt-3 sm:pt-4">
                      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
                        {/* Red Alliance */}
                        <div className={cn(
                          "flex flex-col items-center justify-center space-y-2 rounded-lg p-3 sm:p-4 border",
                          calculatedWinningAlliance === "RED" 
                            ? "bg-gradient-to-b from-red-950 to-red-900 border-red-500 shadow-md shadow-red-900/30 ring-1 ring-red-500/30" 
                            : "border-gray-800 bg-gray-900/30"
                        )}>
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="size-3 sm:size-4 rounded-full flex-shrink-0" style={{ backgroundColor: "#ef4444" }} />
                            <h3 className="text-sm sm:text-base font-semibold text-gray-200 truncate">Red Alliance</h3>
                          </div>
                          <div className="w-full px-2 py-2 sm:py-3 rounded-md bg-black/30 flex flex-col items-center">
                            <span className={cn(
                              "text-2xl sm:text-3xl lg:text-4xl font-bold",
                              calculatedWinningAlliance === "RED" ? "text-red-400" : "text-gray-300"
                            )}>
                              {redScore}
                            </span>
                            <span className="text-xs text-gray-400 mt-1 text-center">TOTAL POINTS</span>
                          </div>
                          {(redAlliance?.teamAlliances && Array.isArray(redAlliance.teamAlliances)) ?
                            (redAlliance.teamAlliances as TeamAlliance[])
                              .sort((a, b) => a.stationPosition - b.stationPosition)
                              .map((ta) => (
                                <div key={ta.id} className="text-center w-full bg-black/20 rounded px-2 py-1">
                                  <p className={cn(
                                    "text-xs sm:text-sm break-words",
                                    calculatedWinningAlliance === "RED" ? "text-red-300" : "text-gray-400"
                                  )}>
                                    Team #{ta.team.teamNumber}
                                  </p>
                                  <p className={cn(
                                    "text-xs break-words mt-1",
                                    calculatedWinningAlliance === "RED" ? "text-red-200" : "text-gray-500"
                                  )}>
                                    {ta.team.name}
                                  </p>
                                </div>
                              ))
                            : null}
                        </div>
                        
                        {/* Match Result */}
                        <div className="flex flex-col items-center justify-center space-y-2 sm:space-y-3 lg:order-none order-last">
                          {calculatedWinningAlliance && (
                            <div className="text-center w-full">
                              <div className="flex flex-col items-center justify-center gap-2 mb-2">
                                <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 flex-shrink-0" />
                                <div className={cn(
                                  "text-white text-sm sm:text-lg font-bold px-3 sm:px-6 py-1 sm:py-2 rounded-md",
                                  calculatedWinningAlliance === "RED" 
                                    ? "bg-gradient-to-r from-red-800 to-red-700" 
                                    : calculatedWinningAlliance === "BLUE"
                                      ? "bg-gradient-to-r from-blue-800 to-blue-700"
                                      : "bg-gradient-to-r from-amber-800 to-amber-700"
                                )}>
                                  <span className="break-words text-center">
                                    {calculatedWinningAlliance === "TIE" ? "TIE MATCH" : `${calculatedWinningAlliance} WINS`}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-400 text-center">
                                Score Difference:
                                <span className="font-semibold text-white ml-1">
                                  {Math.abs(redScore - blueScore)} points
                                </span>
                              </div>
                              {calculatedWinningAlliance === "TIE" && (
                                <Badge className="mt-2 bg-amber-700 text-amber-100 text-xs">
                                  TIE MATCH
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Blue Alliance */}
                        <div className={cn(
                          "flex flex-col items-center justify-center space-y-2 rounded-lg p-3 sm:p-4 border",
                          calculatedWinningAlliance === "BLUE" 
                            ? "bg-gradient-to-b from-blue-950 to-blue-900 border-blue-500 shadow-md shadow-blue-900/30 ring-1 ring-blue-500/30" 
                            : "border-gray-800 bg-gray-900/30"
                        )}>
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="size-3 sm:size-4 rounded-full flex-shrink-0" style={{ backgroundColor: "#3b82f6" }} />
                            <h3 className="text-sm sm:text-base font-semibold text-gray-200 truncate">Blue Alliance</h3>
                          </div>
                          <div className="w-full px-2 py-2 sm:py-3 rounded-md bg-black/30 flex flex-col items-center">
                            <span className={cn(
                              "text-2xl sm:text-3xl lg:text-4xl font-bold",
                              calculatedWinningAlliance === "BLUE" ? "text-blue-400" : "text-gray-300"
                            )}>
                              {blueScore}
                            </span>
                            <span className="text-xs text-gray-400 mt-1 text-center">TOTAL POINTS</span>
                          </div>
                          {(blueAlliance?.teamAlliances && Array.isArray(blueAlliance.teamAlliances)) ?
                            (blueAlliance.teamAlliances as TeamAlliance[])
                              .sort((a, b) => a.stationPosition - b.stationPosition)
                              .map((ta) => (
                                <div key={ta.id} className="text-center w-full bg-black/20 rounded px-2 py-1">
                                  <p className={cn(
                                    "text-xs sm:text-sm break-words",
                                    calculatedWinningAlliance === "BLUE" ? "text-blue-300" : "text-gray-400"
                                  )}>
                                    Team #{ta.team.teamNumber}
                                  </p>
                                  <p className={cn(
                                    "text-xs break-words mt-1",
                                    calculatedWinningAlliance === "BLUE" ? "text-blue-200" : "text-gray-500"
                                  )}>
                                    {ta.team.name}
                                  </p>
                                </div>
                              ))
                            : null}
                        </div>
                      </div>
                      {/* Additional match statistics - only shown if match is completed */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4 border-t border-gray-800 pt-3 sm:pt-4">
                        <div className="bg-gray-900/60 rounded-md p-2 sm:p-3">
                          <div className="text-xs uppercase text-gray-500 mb-1">Match Duration</div>
                          <div className="text-sm sm:text-lg font-semibold text-gray-100 break-words">{('duration' in match && match.duration != null) ? `${match.duration} seconds` : "Not completed"}</div>
                        </div>
                        <div className="bg-gray-900/60 rounded-md p-2 sm:p-3">
                          <div className="text-xs uppercase text-gray-500 mb-1">Scheduled Time</div>
                          <div className="text-sm sm:text-lg font-semibold text-gray-100 break-words">{formatDateTime(match.scheduledTime ?? null)}</div>
                        </div>
                        <div className="bg-gray-900/60 rounded-md p-2 sm:p-3">
                          <div className="text-xs uppercase text-gray-500 mb-1">Start Time</div>
                          <div className="text-sm sm:text-lg font-semibold text-gray-100 break-words">{formatDateTime(match.startTime ?? null)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="teams" className="mt-3 sm:mt-4">
              <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                <Card className={cn(
                  "border-t-4",
                  redAlliance ? "border-t-red-500" : "border-t-gray-300"
                )}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-base sm:text-lg">
                      <Users className="mr-2 size-4 sm:size-5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">Red Alliance Teams</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!redAlliance || !Array.isArray(redAlliance.teamAlliances) || redAlliance.teamAlliances.length === 0 ? (
                      <p className="py-4 text-center text-muted-foreground text-sm">No teams assigned</p>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        {(redAlliance.teamAlliances as TeamAlliance[])
                          .sort((a, b) => a.stationPosition - b.stationPosition)
                          .map((ta) => (
                            <div key={ta.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3 gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm sm:text-base break-words">{ta.team.name}</p>
                                <p className="text-xs sm:text-sm text-muted-foreground">#{ta.team.teamNumber}</p>
                              </div>
                              <div className="flex flex-wrap gap-2 sm:text-right">
                                <Badge variant="outline" className="text-xs">Station {ta.stationPosition}</Badge>
                                {ta.isSurrogate && (
                                  <Badge variant="secondary" className="text-xs">Surrogate</Badge>
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
                    <CardTitle className="flex items-center text-base sm:text-lg">
                      <Users className="mr-2 size-4 sm:size-5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">Blue Alliance Teams</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!blueAlliance || !Array.isArray(blueAlliance.teamAlliances) || blueAlliance.teamAlliances.length === 0 ? (
                      <p className="py-4 text-center text-muted-foreground text-sm">No teams assigned</p>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        {(blueAlliance.teamAlliances as TeamAlliance[])
                          .sort((a, b) => a.stationPosition - b.stationPosition)
                          .map((ta) => (
                            <div key={ta.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3 gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm sm:text-base break-words">{ta.team.name}</p>
                                <p className="text-xs sm:text-sm text-muted-foreground">#{ta.team.teamNumber}</p>
                              </div>
                              <div className="flex flex-wrap gap-2 sm:text-right">
                                <Badge variant="outline" className="text-xs">Station {ta.stationPosition}</Badge>
                                {ta.isSurrogate && (
                                  <Badge variant="secondary" className="text-xs">Surrogate</Badge>
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
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center text-base sm:text-lg">
                        <BarChart3 className="mr-2 size-4 sm:size-5 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">Team Performance</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* You can add detailed team performance stats here if available */}
                      <p className="text-center text-muted-foreground text-sm">
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
          <div className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Match Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                    <span className="text-muted-foreground text-xs sm:text-sm">Status:</span>
                    {getStatusBadge(match.status)}
                  </div>
                  <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                    <span className="text-muted-foreground text-xs sm:text-sm">Tournament:</span>
                    <span className="font-medium text-xs sm:text-sm break-words text-right">{match.stage?.tournament?.name || "N/A"}</span>
                  </div>
                  <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                    <span className="text-muted-foreground text-xs sm:text-sm">Stage:</span>
                    <span className="font-medium text-xs sm:text-sm break-words text-right">{match.stage?.name || "N/A"}</span>
                  </div>
                  {match.scheduledTime && (
                    <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                      <span className="text-muted-foreground text-xs sm:text-sm">Scheduled:</span>
                      <span className="font-medium text-xs sm:text-sm break-words text-right">
                        {format(parseISO(match.scheduledTime), "MMM d, h:mm a")}
                      </span>
                    </div>
                  )}
                </div>
                
                {match.status === MatchStatus.COMPLETED && calculatedWinningAlliance && (
                  <div className="mt-4">
                    <div className={cn(
                      "rounded-lg p-3 sm:p-4 text-center",
                      calculatedWinningAlliance === "RED" 
                        ? "bg-gradient-to-br from-red-950 to-red-900 border border-red-800 shadow-inner shadow-red-800/10" 
                        : calculatedWinningAlliance === "BLUE"
                          ? "bg-gradient-to-br from-blue-950 to-blue-900 border border-blue-800 shadow-inner shadow-blue-800/10"
                          : "bg-gradient-to-br from-amber-950 to-amber-900 border border-amber-800"
                    )}>
                      <div className="flex items-center justify-center gap-2 mb-2 sm:mb-3">
                        <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0" />
                        <p className="text-xs sm:text-sm uppercase tracking-wider text-gray-300 font-medium">Winner</p>
                      </div>
                      
                      <div className={cn(
                        "text-sm sm:text-xl font-bold mb-2 sm:mb-3 py-1 px-2 sm:px-3 rounded-md inline-block break-words",
                        calculatedWinningAlliance === "RED" 
                          ? "text-white bg-red-800/50" 
                          : calculatedWinningAlliance === "BLUE"
                            ? "text-white bg-blue-800/50"
                            : "text-amber-100 bg-amber-800/50"
                      )}>
                        {calculatedWinningAlliance === "TIE" ? "TIE MATCH" : `${calculatedWinningAlliance} ALLIANCE`}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-700/50">
                        <div className={cn(
                          "text-center p-2 rounded-md",
                          calculatedWinningAlliance === "RED" ? "bg-red-800/30 ring-1 ring-red-700" : "bg-gray-800/40"
                        )}>
                          <p className="text-xs text-gray-400">RED</p>
                          <p className={cn(
                            "text-lg sm:text-xl font-semibold",
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
                            "text-lg sm:text-xl font-semibold",
                            calculatedWinningAlliance === "BLUE" ? "text-blue-300" : "text-gray-300"
                          )}>
                            {blueScore}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-2 sm:mt-3 text-xs text-gray-400">
                        Score Difference: <span className="font-semibold text-white">
                          {Math.abs(redScore - blueScore)} points
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {isAdmin && match.status !== MatchStatus.COMPLETED && (
                  <div className="mt-4">
                    <Button className="w-full text-sm" size="sm">
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
                <CardTitle className="text-base sm:text-lg">Tournament Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Description</p>
                  <p className="font-medium text-xs sm:text-sm break-words">
                    {match.stage?.tournament && 'description' in match.stage.tournament ? (match.stage.tournament as any).description : "No description available"}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Tournament Dates</p>
                  <p className="font-medium text-xs sm:text-sm break-words">
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