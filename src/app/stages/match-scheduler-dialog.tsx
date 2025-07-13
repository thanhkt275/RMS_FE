"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchIcon, CheckIcon, ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/query-keys";

interface Team {
  id: string;
  teamNumber: string;
  name: string;
  organization?: string;
}

interface MatchSchedulerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stageId: string;
  stageName: string;
  stageType: string;
  tournamentId: string;
}

export default function MatchSchedulerDialog({
  isOpen,
  onClose,
  stageId,
  stageName,
  stageType,
  tournamentId,
}: MatchSchedulerDialogProps) {
  const queryClient = useQueryClient();
  
  // Basic state
  const [activeView, setActiveView] = useState<"config" | "teams" | "results">("config");
  const [schedulerType, setSchedulerType] = useState<string>(stageType === "SWISS" ? "swiss" : "playoff");
  const [currentRoundNumber, setCurrentRoundNumber] = useState<number>(0);
  const [numberOfRounds, setNumberOfRounds] = useState<number>(3);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [scheduledMatches, setScheduledMatches] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state for results view
  const [currentPage, setCurrentPage] = useState<number>(1);
  const matchesPerPage = 10;
  const paginatedMatches = scheduledMatches.slice(
    (currentPage - 1) * matchesPerPage,
    currentPage * matchesPerPage
  );
  const totalPages = Math.ceil(scheduledMatches.length / matchesPerPage);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setActiveView("config");
      setSchedulerType(stageType === "SWISS" ? "swiss" : "playoff");
      setCurrentRoundNumber(0);
      setNumberOfRounds(3);
      setSelectedTeams([]);
      setSearchQuery("");
      setScheduledMatches([]);
      setCurrentPage(1);
      setError(null);
    }
  }, [isOpen, stageType]);
  // Fetch teams by stage ID - only when teams view is active AND not Swiss
  const { 
    data: teams = [], 
    isLoading: isLoadingTeams, 
    refetch: refetchTeams 
  } = useQuery({
    queryKey: ["stage-teams", stageId],
    queryFn: async () => {
      try {
        // Fetch only teams assigned to this stage
        const response = await apiClient.get<any>(`/stages/${stageId}/teams`);
        // The response is expected to be { success, data: Team[] }
        if (response.success && Array.isArray(response.data)) {
          return response.data.map((t: any) => ({
            id: t.teamId,
            teamNumber: t.teamNumber,
            name: t.teamName,
            organization: t.organization || undefined,
          }));
        }
        return [];
      } catch (error: any) {
        console.error("Error fetching stage teams:", error);
        toast.error(`Failed to load teams: ${error.message}`);
        return [];
      }
    },
    enabled: !!stageId && isOpen && activeView === "teams" && schedulerType !== "swiss",
    staleTime: 1000 * 60,
  });

  // Filter teams based on search query
  const filteredTeams = teams.filter((team: Team) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      team.teamNumber.toLowerCase().includes(query) || 
      team.name.toLowerCase().includes(query) || 
      (team.organization && team.organization.toLowerCase().includes(query))
    );
  });

  // Toggle team selection
  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId) 
        : [...prev, teamId]
    );
  };

  // Select/deselect all filtered teams
  const handleSelectAllFiltered = () => {
    if (filteredTeams.length === 0) return;
    
    const filteredIds = filteredTeams.map((team: Team) => team.id);
    const allSelected = filteredIds.every((id: string) => selectedTeams.includes(id));
    
    if (allSelected) {
      // Deselect all filtered teams
      setSelectedTeams(prev => prev.filter((id: string) => !filteredIds.includes(id)));
    } else {
      // Select all filtered teams
      setSelectedTeams(prev => {
        const newSelection = [...prev];
        filteredIds.forEach((id: string) => {
          if (!newSelection.includes(id)) newSelection.push(id);
        });
        return newSelection;
      });
    }
  };
  // Function to schedule matches
  const handleSchedule = async () => {
    // For Swiss tournaments, no team selection is required
    if (schedulerType !== "swiss" && selectedTeams.length === 0) {
      toast.error("Please select at least one team");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      let endpoint = "";
      let requestBody: any = {
        stageId
      };
      
      if (schedulerType === "swiss") {
        endpoint = "/match-scheduler/generate-swiss-round";
        requestBody.currentRoundNumber = currentRoundNumber;
        // Swiss tournaments don't require team selection - backend uses all teams
      } else if (schedulerType === "playoff") {
        endpoint = "/match-scheduler/generate-playoff";
        requestBody.numberOfRounds = numberOfRounds;
        requestBody.teamIds = selectedTeams; // Only add teamIds for non-Swiss tournaments
      }

      const response = await apiClient.post(endpoint, requestBody);
      
      if (response?.matches) {
        setScheduledMatches(response.matches);
        setActiveView("results");
        toast.success(`Successfully created ${response.matches.length} matches`);
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: QueryKeys.matches.all() });
        queryClient.invalidateQueries({ queryKey: QueryKeys.matches.byStage(stageId) });
      } else {
        setError("No matches were returned from the server");
      }
    } catch (err: any) {
      console.error("Error scheduling matches:", err);
      setError(err.message || "Failed to schedule matches");
      toast.error(`Failed to schedule matches: ${err.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-[550px] bg-white border border-gray-200 rounded-xl shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Match Scheduler</DialogTitle>
          <DialogDescription className="text-gray-600">
            Generate matches for {stageName} ({stageType.toLowerCase()} stage)
          </DialogDescription>
        </DialogHeader>        {/* Navigation tabs */}
        <div className="flex border-b border-gray-200">
          <div
            className={`px-4 py-2 cursor-pointer rounded-t-lg transition-colors ${
              activeView === "config" 
                ? "border-b-2 border-blue-500 font-semibold text-blue-600" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
            onClick={() => setActiveView("config")}
          >
            1. Configuration
          </div>
          {schedulerType !== "swiss" && (
            <div
              className={`px-4 py-2 cursor-pointer rounded-t-lg transition-colors ${
                activeView === "teams" 
                  ? "border-b-2 border-blue-500 font-semibold text-blue-600" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
              onClick={() => setActiveView("teams")}
            >
              2. Select Teams
            </div>
          )}
          {scheduledMatches.length > 0 && (
            <div
              className={`px-4 py-2 cursor-pointer rounded-t-lg transition-colors ${
                activeView === "results" 
                  ? "border-b-2 border-blue-500 font-semibold text-blue-600" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
              onClick={() => setActiveView("results")}
            >
              {schedulerType === "swiss" ? "2. Results" : "3. Results"}
            </div>
          )}
        </div>{/* Content based on active view */}
        {activeView === "config" && (
          <div className="py-2 space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Scheduler Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <div
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    schedulerType === "swiss" 
                      ? "bg-blue-50 border-blue-200 text-blue-900" 
                      : stageType !== "SWISS"
                        ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400"
                        : "hover:bg-gray-50 border-gray-300 text-gray-900"
                  }`}
                  onClick={() => {
                    if (stageType === "SWISS") setSchedulerType("swiss");
                  }}
                >                  <div className="font-medium">Swiss Tournament</div>
                  <div className="text-xs text-gray-600">
                    Automatic pairing based on team performance - no team selection needed
                  </div>
                </div>
                <div
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    schedulerType === "playoff" 
                      ? "bg-blue-50 border-blue-200 text-blue-900" 
                      : stageType !== "PLAYOFF"
                        ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400"
                        : "hover:bg-gray-50 border-gray-300 text-gray-900"
                  }`}
                  onClick={() => {
                    if (stageType === "PLAYOFF") setSchedulerType("playoff");
                  }}
                >
                  <div className="font-medium">Playoff Bracket</div>
                  <div className="text-xs text-gray-600">
                    Elimination tournament with advancing winners
                  </div>
                </div>
              </div>
            </div>
              {schedulerType === "swiss" && (
              <div className="space-y-2">
                <Label htmlFor="currentRoundNumber" className="text-gray-700 font-medium">Current Round Number</Label>
                <Input
                  id="currentRoundNumber"
                  type="number"
                  min={0}
                  value={currentRoundNumber}
                  onChange={(e) => setCurrentRoundNumber(Number(e.target.value))}
                  placeholder="Enter the current round number (0 for first round)"
                  className="bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg"
                />
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">Swiss Tournament Guide:</div>
                    <ul className="text-xs space-y-1 text-blue-700">
                      <li>• Enter <strong>0</strong> for the very first round</li>
                      <li>• For subsequent rounds, enter the <strong>last completed round number</strong></li>
                      <li>• Teams are automatically paired based on their performance</li>
                      <li>• No team selection is required - all teams participate</li>
                      <li>• Update rankings after each round before generating the next</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {schedulerType === "playoff" && (
              <div className="space-y-2">
                <Label htmlFor="numberOfRounds" className="text-gray-700 font-medium">Number of Rounds</Label>
                <Select
                  value={numberOfRounds.toString()}
                  onValueChange={(value) => setNumberOfRounds(Number(value))}
                >
                  <SelectTrigger id="numberOfRounds" className="bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg">
                    <SelectValue placeholder="Select number of rounds" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                    <SelectItem value="2" className="text-gray-900 hover:bg-gray-50">2 rounds (4 teams)</SelectItem>
                    <SelectItem value="3" className="text-gray-900 hover:bg-gray-50">3 rounds (8 teams)</SelectItem>
                    <SelectItem value="4" className="text-gray-900 hover:bg-gray-50">4 rounds (16 teams)</SelectItem>
                    <SelectItem value="5" className="text-gray-900 hover:bg-gray-50">5 rounds (32 teams)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600">
                  Number of rounds determines the bracket size (2^rounds teams).
                </p>
              </div>
            )}
          </div>
        )}        {activeView === "teams" && (
          <div className="py-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">{selectedTeams.length}</span> of {teams.length} teams selected
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search teams..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 w-[180px] bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSelectAllFiltered}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 rounded-lg"
                >
                  {searchQuery ? "Select Filtered" : "Select All"}
                </Button>
              </div>
            </div>

            {isLoadingTeams ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : teams.length === 0 ? (
              <div className="text-center py-6 text-gray-600">
                No teams found for this tournament
              </div>
            ) : (
              <ScrollArea className="h-[300px] border border-gray-200 rounded-lg">
                <div className="p-2">
                  {filteredTeams.map((team: Team) => (
                    <div
                      key={team.id}
                      className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedTeams.includes(team.id) ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"
                      }`}
                      onClick={() => toggleTeam(team.id)}
                    >
                      <Checkbox
                        checked={selectedTeams.includes(team.id)}
                        onCheckedChange={() => toggleTeam(team.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-2"
                      />
                      <div>
                        <div className="font-medium flex items-center gap-2 text-gray-900">
                          <span className="bg-gray-100 text-gray-700 px-1 rounded text-xs font-semibold">{team.teamNumber}</span>
                          <span>{team.name}</span>
                        </div>
                        {team.organization && (
                          <div className="text-xs text-gray-600">{team.organization}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {error && (
              <div className="bg-red-50 text-red-800 border border-red-200 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}        {activeView === "results" && (
          <div className="py-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">
                Created {scheduledMatches.length} matches
              </h3>
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
                Success
              </Badge>
            </div>

            <ScrollArea className="h-[300px] border border-gray-200 rounded-lg">
              <div className="divide-y divide-gray-100">
                {paginatedMatches.map(match => (
                  <div key={match.id} className="p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-medium text-gray-900">
                        Match #{match.matchNumber}
                      </div>
                      <Badge variant="outline" className="border-gray-300 text-gray-700">{match.status || "PENDING"}</Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Round: {match.roundNumber}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-xs font-semibold text-red-600">Red Alliance</div>
                        <div className="text-gray-900">
                          {match.alliances
                            .find((a: any) => a.color === "RED")
                            ?.teamAlliances.map((ta: any) => ta.team?.teamNumber || "TBD")
                            .join(", ") || "No teams"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-blue-600">Blue Alliance</div>
                        <div className="text-gray-900">
                          {match.alliances
                            .find((a: any) => a.color === "BLUE")
                            ?.teamAlliances.map((ta: any) => ta.team?.teamNumber || "TBD")
                            .join(", ") || "No teams"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 rounded-lg"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 rounded-lg"
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}        <DialogFooter className="gap-2">
          {/* Navigation buttons based on active view */}
          {activeView === "config" && (
            <>
              <Button variant="outline" onClick={onClose} className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 rounded-lg">
                Cancel
              </Button>
              {schedulerType === "swiss" ? (
                <Button
                  onClick={handleSchedule}
                  disabled={isLoading}
                  className="bg-blue-500 text-white font-semibold rounded-lg px-5 py-2.5 shadow-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    "Generate Swiss Round"
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={() => setActiveView("teams")}
                  className="bg-blue-500 text-white font-semibold rounded-lg px-5 py-2.5 shadow-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200"
                >
                  <ArrowRightIcon className="h-4 w-4 mr-1" />
                  Next: Select Teams
                </Button>
              )}
            </>
          )}

          {activeView === "teams" && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setActiveView("config")}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 rounded-lg"
              >
                Back
              </Button>
              <Button
                onClick={handleSchedule}
                disabled={isLoading || selectedTeams.length === 0}
                className="bg-blue-500 text-white font-semibold rounded-lg px-5 py-2.5 shadow-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                    Creating...
                  </>
                ) : (
                  "Create Matches"
                )}
              </Button>
            </>
          )}

          {activeView === "results" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setActiveView("config");
                  setScheduledMatches([]);
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 rounded-lg"
              >
                Create More
              </Button>
              <Button onClick={onClose} className="bg-blue-500 text-white font-semibold rounded-lg px-5 py-2.5 shadow-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200">
                Close
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}