"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useAuth } from "@/hooks/common/use-auth";
import { useTournaments } from "@/hooks/api/use-tournaments";
import { useStage, useDeleteStage, useStagesByTournament } from "@/hooks/api/use-stages";
import { useMatchesByStage, useDeleteMatch } from "@/hooks/api/use-matches";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserRole } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PlusIcon, PencilIcon, TrashIcon, InfoIcon, CalendarIcon, ArrowLeftIcon, ListIcon, ClipboardIcon, BarChart3Icon, AlarmClock, Medal, Crown } from "lucide-react";
import StageDialog from "./stage-dialog";
import MatchSchedulerDialog from "./match-scheduler-dialog";
import EndStageDialog from "@/components/stages/end-stage-dialog";
import DeleteMatchDialog from "@/components/stages/delete-match-dialog";
import { MatchService } from "@/services/match-service";

export default function StagesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { data: tournaments, isLoading: tournamentsLoading } = useTournaments();
  
  // State for selected tournament and stages
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const { 
    data: stagesData, 
    isLoading: stagesLoading, 
    error: stagesError 
  } = useStagesByTournament(selectedTournamentId);
  // Use useMemo to filter stages by selectedTournamentId for extra safety
  const stages = useMemo(
    () =>
      selectedTournamentId && stagesData
        ? stagesData.filter((stage) => stage.tournamentId === selectedTournamentId)
        : [],
    [selectedTournamentId, stagesData]
  );
  
  // State for selected stage
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const { 
    data: stageDetails,
    isLoading: stageDetailsLoading,
  } = useStage(selectedStageId);
  
  // Fetch matches for the selected stage
  const {
    data: stageMatches,
    isLoading: matchesLoading,
    error: matchesError
  } = useMatchesByStage(selectedStageId);

  // Filter matches by selectedStageId for extra safety
  const filteredStageMatches = useMemo(
    () =>
      stageMatches && selectedStageId
        ? stageMatches.filter((match) => match.stageId === selectedStageId)
        : [],
    [stageMatches, selectedStageId]
  );
  
  const deleteMutation = useDeleteStage(selectedTournamentId);
  
  // State for dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<any>(null);

  // State for match scheduler dialog
  const [isMatchSchedulerDialogOpen, setIsMatchSchedulerDialogOpen] = useState(false);

  // State for end stage dialog
  const [isEndStageDialogOpen, setIsEndStageDialogOpen] = useState(false);

  // State for match delete dialog
  const [isDeleteMatchDialogOpen, setIsDeleteMatchDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<{
    id: string;
    matchNumber: number;
    roundNumber?: number;
    status: string;
  } | null>(null);

  // Add state for match scores map
  const [matchScoresMap, setMatchScoresMap] = useState<Record<string, { redTotalScore: number, blueTotalScore: number }>>({});

  // Reset selected stage when tournament changes
  useEffect(() => {
    setSelectedStageId("");
    setSelectedStage(null);
  }, [selectedTournamentId]);

  // Check if user is admin for access control
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!authLoading && user && user.role !== UserRole.ADMIN && !hasRedirected.current) {
      hasRedirected.current = true;
      toast.error("You don't have permission to access this page", {
        duration: 5000,
        id: "admin-access-denied",
      });
      router.push("/");
    }
  }, [user, authLoading, router]);
  
  // Fetch match scores for all matches in the current stage
  useEffect(() => {
    async function fetchScores() {
      if (!filteredStageMatches || filteredStageMatches.length === 0) {
        setMatchScoresMap({});
        return;
      }
      const scores: Record<string, { redTotalScore: number, blueTotalScore: number }> = {};
      await Promise.all(
        filteredStageMatches.map(async (match) => {
          try {
            const score = await MatchService.getMatchScores(match.id);
            if (score) {
              scores[match.id] = {
                redTotalScore: score.redTotalScore,
                blueTotalScore: score.blueTotalScore,
              };
            }
          } catch (e) {
            // ignore errors for missing scores
          }
        })
      );
      setMatchScoresMap(scores);
    }
    fetchScores();
  }, [filteredStageMatches]);

  // Return null during authentication check to prevent flash of content
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          <p className="text-gray-500">Please wait while we verify your credentials</p>
        </div>
      </div>
    );
  }

  // Only allow admins to access this page
  if (user.role !== UserRole.ADMIN) {
    return null;
  }

  // Handler for opening edit dialog
  const handleEditStage = (stage: any) => {
    setSelectedStage(stage);
    setIsEditDialogOpen(true);
  };

  // Handler for opening delete dialog
  const handleDeleteClick = (stage: any) => {
    setSelectedStage(stage);
    setIsDeleteDialogOpen(true);
  };

  // Handler for confirming delete
  const handleConfirmDelete = async () => {
    if (!selectedStage) return;
    
    try {
      await deleteMutation.mutateAsync(selectedStage.id);
      setIsDeleteDialogOpen(false);
      setSelectedStage(null);
      // Clear selected stage if we just deleted it
      if (selectedStageId === selectedStage.id) {
        setSelectedStageId("");
      }
    } catch (error) {
      console.error("Failed to delete stage:", error);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP p");
    } catch (e) {
      return dateString;
    }
  };

  // Get selected tournament (for validation)
  const selectedTournament = tournaments?.find(t => t.id === selectedTournamentId);

  // Determine stage type badge color
  const getStageTypeBadge = (type: string) => {
    switch (type) {
      case 'SWISS':
        return <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">SWISS</span>;
      case 'PLAYOFF':
        return <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">PLAYOFF</span>;
      case 'FINAL':
        return <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">FINAL</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">{type}</span>;
    }
  };
  
  // Get match status badge
  const getMatchStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800 border border-yellow-300 font-semibold">Pending</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="default" className="bg-blue-600 text-white border border-blue-700 font-semibold">In Progress</Badge>;
      case "COMPLETED":
        return <Badge variant="default" className="bg-green-600 text-white border border-green-700 font-semibold">Completed</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border border-gray-300 font-semibold">{status}</Badge>;
    }
  };

  // Back button handler - clears selected stage
  const handleBackClick = () => {
    setSelectedStageId("");
    setSelectedStage(null);
  };

  // Handle match delete click
  const handleDeleteMatchClick = (match: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    setSelectedMatch({
      id: match.id,
      matchNumber: match.matchNumber ?? 0,
      roundNumber: match.roundNumber,
      status: match.status
    });
    setIsDeleteMatchDialogOpen(true);
  };

  // Handle match view click
  const handleViewMatchClick = (matchId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    router.push(`/matches/${matchId}`);
  };

  // Find the latest round number and check if all matches in that round are completed
  const isSwissStage = stageDetails?.type === 'SWISS';
  let latestRoundNumber = 0;
  let allMatchesCompleted = false;
  if (isSwissStage && filteredStageMatches.length > 0) {
    latestRoundNumber = Math.max(...filteredStageMatches.map(m => m.roundNumber || 0));
    const matchesInLatestRound = filteredStageMatches.filter(m => (m.roundNumber || 0) === latestRoundNumber);
    allMatchesCompleted = matchesInLatestRound.length > 0 && matchesInLatestRound.every(m => m.status === 'COMPLETED');
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">

      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">Stages</h1>
            <p className="text-base text-gray-600">Manage tournament stages</p>
          </div>
        </div>

        {/* Tournament selection - only show if no stage is selected */}
        {!selectedStageId && (
          <Card className="mb-8 bg-white border border-gray-200 shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle className="text-gray-900">Select Tournament</CardTitle>
              <CardDescription className="text-gray-600">Choose a tournament to manage its stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div className="flex flex-col space-y-3">
                  <Select
                    value={selectedTournamentId}
                    onValueChange={setSelectedTournamentId}
                    disabled={tournamentsLoading}
                  >
                    <SelectTrigger className="w-full md:w-[400px] bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg">
                      <SelectValue placeholder="Select a tournament" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                      {tournaments && tournaments.map((tournament) => (
                        <SelectItem key={tournament.id} value={tournament.id} className="text-gray-900 hover:bg-gray-50">
                          {tournament.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {tournamentsLoading && (
                    <p className="text-sm text-gray-600">Loading tournaments...</p>
                  )}
                  {!tournamentsLoading && tournaments?.length === 0 && (
                    <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <InfoIcon size={16} />
                      <p className="text-sm">No tournaments found. Create a tournament first.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            {selectedTournament && (
              <CardFooter className="bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Selected:</span> {selectedTournament.name}
                  <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                    <CalendarIcon size={12} />
                    {formatDate(selectedTournament.startDate)} - {formatDate(selectedTournament.endDate)}
                  </div>
                </div>
                {selectedTournamentId && (
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="flex items-center gap-2 bg-blue-500 text-white font-semibold rounded-lg px-5 py-2.5 shadow-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200"
                  >
                    <PlusIcon size={16} />
                    Add Stage
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>
        )}

        {/* Error alert */}
        {stagesError && (
          <Alert variant="destructive" className="mb-6 bg-red-50 border border-red-200 text-red-800">
            <AlertTitle className="font-semibold text-red-800">Error</AlertTitle>
            <AlertDescription className="text-red-700">
              Failed to load stages. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {/* Stage Detail View - show when a stage is selected */}
        {selectedStageId && stageDetails ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBackClick} 
                className="flex items-center gap-1 mb-4 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeftIcon size={16} />
              Back to Stages
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                onClick={() => handleEditStage(stageDetails)}
              >
                <PencilIcon size={16} className="mr-1" />
                Edit Stage
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700 focus:ring-2 focus:ring-green-100 focus:border-green-400"
                onClick={() => setIsEndStageDialogOpen(true)}
              >
                <Crown size={16} className="mr-1" />
                End Stage
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 focus:ring-2 focus:ring-red-100 focus:border-red-400"
                onClick={() => handleDeleteClick(stageDetails)}
              >
                <TrashIcon size={16} className="mr-1" />
                Delete Stage
              </Button>
            </div>
          </div>

          {/* Stage Info Card */}
          <Card className="bg-white border border-gray-200 shadow-lg rounded-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-gray-900">{stageDetails.name}</CardTitle>
                    {getStageTypeBadge(stageDetails.type)}
                  </div>
                  <CardDescription className="text-gray-600">
                    Part of {stageDetails?.tournament?.name || "tournament"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">Start Date</div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className="text-blue-500" />
                    <span className="text-gray-900">{formatDate(stageDetails.startDate)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">End Date</div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className="text-blue-500" />
                    <span className="text-gray-900">{formatDate(stageDetails.endDate)}</span>
                  </div>
                </div>
              </div>
              <Separator className="bg-gray-200" />
              <div className="space-y-1">
                <div className="text-sm text-gray-600">Stage Type</div>
                <div className="font-medium text-gray-900">
                  {stageDetails.type === "SWISS" && "Swiss Tournament System"}
                  {stageDetails.type === "PLAYOFF" && "Playoff Elimination Bracket"}
                  {stageDetails.type === "FINAL" && "Finals"}
                </div>
                <p className="text-sm text-gray-700 mt-1">
                  {stageDetails.type === "SWISS" && "Teams are paired based on their win-loss record. Teams with similar records play against each other."}
                  {stageDetails.type === "PLAYOFF" && "Single elimination bracket where winners advance to the next round."}
                  {stageDetails.type === "FINAL" && "Final matches to determine the tournament champions."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Matches List */}
          <Card className="bg-white border border-gray-200 shadow-lg rounded-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <ListIcon size={20} />
                    Matches in this Stage
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    All scheduled matches for {stageDetails.name}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setIsMatchSchedulerDialogOpen(true)} 
                    className="flex items-center gap-2 bg-blue-500 text-white font-semibold rounded-lg px-5 py-2.5 shadow-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200"
                  >
                    <PlusIcon size={16} />
                    Schedule Matches
                  </Button>
                  {/* Show Generate Next Swiss Round button if all matches in latest round are completed */}
                  {isSwissStage && allMatchesCompleted && (
                    <Button
                      onClick={() => {
                        setIsMatchSchedulerDialogOpen(true);
                        // Optionally, you could pass latestRoundNumber as a prop or context to the dialog
                      }}
                      className="flex items-center gap-2 bg-blue-600 text-white font-semibold rounded-lg px-5 py-2.5 shadow-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200"
                    >
                      <Medal size={16} />
                      Generate Next Swiss Round
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            {matchesLoading ? (
              <div className="flex justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading matches...</p>
                </div>
              </div>
            ) : matchesError ? (
              <Alert variant="destructive" className="bg-red-50 border border-red-200 text-red-800">
                <AlertTitle className="font-semibold text-red-800">Error</AlertTitle>
                <AlertDescription className="text-red-700">
                  Failed to load matches for this stage. Please try again later.
                </AlertDescription>
              </Alert>
            ) : filteredStageMatches && filteredStageMatches.length > 0 ? (
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 border-b border-gray-200">
                      <TableHead className="text-gray-700">Match #</TableHead>
                      <TableHead className="text-gray-700">Round</TableHead>
                      <TableHead className="text-gray-700">Status</TableHead>
                      <TableHead className="text-gray-700">Scheduled Time</TableHead>
                      <TableHead className="text-gray-700">Teams</TableHead>
                      <TableHead className="text-gray-700">Scores</TableHead>
                      <TableHead className="text-gray-700">Result</TableHead>
                      <TableHead className="text-right text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStageMatches.map((match) => (
                      <TableRow key={match.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                        <TableCell className="font-medium text-gray-900">{match.matchNumber}</TableCell>
                        <TableCell className="text-gray-600">{match.roundNumber}</TableCell>
                        <TableCell>{getMatchStatusBadge(match.status)}</TableCell>
                        <TableCell className="text-gray-600">{match.scheduledTime ? formatDate(match.scheduledTime) : "Not scheduled"}</TableCell>
                        <TableCell>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="text-xs font-semibold text-red-600">Red</div>
                              {match.alliances?.find(a => a.color === 'RED')?.teamAlliances?.map((ta, idx) => (
                                <div key={ta.team.id || idx} className="text-xs text-gray-900">{ta.team?.name ?? '-'}</div>
                              ))}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-blue-600">Blue</div>
                              {match.alliances?.find(a => a.color === 'BLUE')?.teamAlliances?.map((ta, idx) => (
                                <div key={ta.team.id || idx} className="text-xs text-gray-900">{ta.team?.name ?? '-'}</div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {matchScoresMap[match.id] ? (
                            <div className="flex items-center space-x-1">
                              <span className="text-red-600 font-medium">{matchScoresMap[match.id].redTotalScore}</span>
                              <span className="text-gray-500">-</span>
                              <span className="text-blue-600 font-medium">{matchScoresMap[match.id].blueTotalScore}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {match.status === "COMPLETED" ? (
                            <div className="text-sm">
                              {match.winningAlliance === "RED" && (
                                <span className="text-red-600 font-semibold">Red Wins</span>
                              )}
                              {match.winningAlliance === "BLUE" && (
                                <span className="text-blue-600 font-semibold">Blue Wins</span>
                              )}
                              {!match.winningAlliance && <span className="text-gray-600">No winner</span>}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Pending</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-600 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                              onClick={(e) => handleViewMatchClick(match.id, e)}
                            >
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={match.status !== "PENDING"}
                              className={`${
                                match.status === "PENDING"
                                  ? "border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  : "border-gray-300 text-gray-400 cursor-not-allowed opacity-50"
                              }`}
                              onClick={(e) => handleDeleteMatchClick(match, e)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            ) : (
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">No matches found</h3>
                    <p className="text-gray-600">This stage doesn't have any scheduled matches yet</p>
                  </div>
                  <Button onClick={() => router.push(`/match-scheduler?stageId=${stageDetails.id}`)} className="bg-blue-500 text-white font-semibold rounded-lg px-5 py-2.5 shadow-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200">
                    Create Matches
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      ) : (
        // Stages table - show when no stage is selected
        <>
          {selectedTournamentId ? (
            stagesLoading ? (
              <Card className="bg-white border border-gray-200 shadow-lg rounded-xl">
                <CardContent className="flex justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading stages...</p>
                  </div>
                </CardContent>
              </Card>
            ) : stages && stages.length > 0 ? (
              <Card className="bg-white border border-gray-200 shadow-lg rounded-xl">
                <CardHeader>
                  <CardTitle className="text-gray-900">Stages for {selectedTournament?.name}</CardTitle>
                  <CardDescription className="text-gray-600">Manage qualification, playoff, and final stages</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 border-b border-gray-200">
                        <TableHead className="text-gray-700">Name</TableHead>
                        <TableHead className="text-gray-700">Type</TableHead>
                        <TableHead className="text-gray-700">Start Date</TableHead>
                        <TableHead className="text-gray-700">End Date</TableHead>
                        <TableHead className="text-gray-700 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stages.map((stage) => (
                        <TableRow 
                          key={stage.id}
                          className="cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
                          onClick={() => setSelectedStageId(stage.id)}
                        >
                          <TableCell className="font-medium text-gray-900">{stage.name}</TableCell>
                          <TableCell>{getStageTypeBadge(stage.type)}</TableCell>
                          <TableCell className="text-gray-700">{formatDate(stage.startDate)}</TableCell>
                          <TableCell className="text-gray-700">{formatDate(stage.endDate)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditStage(stage);
                              }}
                            >
                              <PencilIcon size={16} />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 focus:ring-2 focus:ring-red-100 focus:border-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(stage);
                              }}
                            >
                              <TrashIcon size={16} />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white border border-gray-200 shadow-lg rounded-xl">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">No stages found</h3>
                    <p className="text-gray-600">Create your first stage for this tournament</p>
                  </div>
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-blue-500 text-white font-semibold rounded-lg px-5 py-2.5 shadow-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200"
                  >
                    Create Stage
                  </Button>
                </CardContent>
              </Card>
            )
          ) : (
            <Card className="bg-white border border-gray-200 shadow-lg rounded-xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">Select a Tournament</h3>
                  <p className="text-gray-600">Please select a tournament to view and manage its stages</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
      </div>

      {/* Create Stage Dialog */}
      {selectedTournament && (
        <StageDialog 
          isOpen={isCreateDialogOpen} 
          onClose={() => setIsCreateDialogOpen(false)}
          mode="create"
          tournament={selectedTournament}
        />
      )}

      {/* Edit Stage Dialog */}
      {selectedStage && selectedTournament && (
        <StageDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setSelectedStage(null);
          }}
          mode="edit"
          tournament={selectedTournament}
          stage={selectedStage}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-white border border-gray-200 rounded-xl shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">Delete Stage</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900">{selectedStage?.name}</span>?
              This action cannot be undone and will also delete all associated matches.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 text-white hover:bg-red-600 focus:ring-2 focus:ring-red-400 rounded-lg"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Match Scheduler Dialog */}
      {stageDetails && (
        <MatchSchedulerDialog
          isOpen={isMatchSchedulerDialogOpen}
          onClose={() => setIsMatchSchedulerDialogOpen(false)}
          stageId={stageDetails.id}
          stageName={stageDetails.name}
          stageType={stageDetails.type}
          tournamentId={stageDetails.tournamentId || selectedTournamentId}
        />
      )}

      {/* End Stage Dialog */}
      {stageDetails && (
        <EndStageDialog
          isOpen={isEndStageDialogOpen}
          onClose={() => setIsEndStageDialogOpen(false)}
          stageId={stageDetails.id}
          stageName={stageDetails.name}
          stageType={stageDetails.type}
          tournamentId={stageDetails.tournamentId || selectedTournamentId}
          onAdvancementComplete={() => {
            // Refresh stage data and potentially navigate to the new stage
            setIsEndStageDialogOpen(false);
            // Optionally refresh the page or navigate to tournaments
            window.location.reload();
          }}
        />
      )}

      {/* Delete Match Dialog */}
      <DeleteMatchDialog
        isOpen={isDeleteMatchDialogOpen}
        onClose={() => {
          setIsDeleteMatchDialogOpen(false);
          setSelectedMatch(null);
        }}
        match={selectedMatch}
      />
    </div>
  );
}