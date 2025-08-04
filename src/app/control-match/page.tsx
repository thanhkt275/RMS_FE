"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useMatch,
  useUpdateMatchStatus,
  useMatches,
} from "@/hooks/matches/use-matches";
import { useMatchesByTournament } from "@/hooks/matches/use-matches-by-tournament";
import { MatchStatus, UserRole } from "@/types/types";
import { useTournaments } from "@/hooks/tournaments/use-tournaments";
import { MatchData } from "@/types/types";
import { unifiedWebSocketService } from "@/lib/unified-websocket";
import { Card } from "@/components/ui/card";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import ConnectionStatus from "../../components/features/control-match/connection-status";
import { toast } from "sonner";
import DynamicFieldSelectDropdown from "@/components/features/fields/DynamicFieldSelectDropdown";
import { QueryKeys } from "@/lib/query-keys";
import { apiClient } from "@/lib/api-client";

// Import custom hooks
import { useTimerControl } from "@/hooks/control-match/use-timer-control";
import { useScoringControl } from "@/hooks/control-match/use-scoring-control";
import { useDisplayControl } from "@/hooks/control-match/use-display-control";
import { useRoleBasedAccess } from "@/hooks/control-match/use-role-based-access";
import { useUnifiedMatchControl } from "@/hooks/control-match/use-unified-match-control";
import { useUnifiedWebSocket } from "@/hooks/websocket/use-unified-websocket";

// Import components
import { TimerControlPanel } from "@/components/features/control-match/timer-control-panel";
import { MatchSelector } from "@/components/features/control-match/match-selector";
import { ScoringPanel } from "@/components/features/control-match/scoring-panel";
import { AnnouncementPanel } from "@/components/features/control-match/announcement-panel";
import { MatchStatusDisplay } from "@/components/features/control-match/match-status-display";
import {
  AccessDenied,
  AccessDeniedOverlay,
} from "@/components/features/control-match/access-denied";

export default function ControlMatchPage() {
  const queryClient = useQueryClient();

  // Initialize role-based access control
  const roleAccess = useRoleBasedAccess();

  // Tournament selection state
  const { data: tournaments = [], isLoading: tournamentsLoading } =
    useTournaments();

  // Initialize display control hook
  const {
    displayMode,
    setDisplayMode,
    showTimer,
    showScores,
    showTeams,
    setShowTimer,
    setShowScores,
    setShowTeams,
    announcementMessage,
    setAnnouncementMessage,
    selectedFieldId,
    setSelectedFieldId,
    selectedTournamentId,
    setSelectedTournamentId,
  } = useDisplayControl();

  // State for selected match
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");

  // Initialize unified match control hook
  const unifiedMatchControl = useUnifiedMatchControl({
    tournamentId: selectedTournamentId || "all",
    fieldId: selectedFieldId ?? undefined,
    selectedMatchId: selectedMatchId || undefined,
  });
  // Set default tournamentId on load (All Tournaments)
  useEffect(() => {
    if (
      !tournamentsLoading &&
      tournaments.length > 0 &&
      !selectedTournamentId
    ) {
      setSelectedTournamentId("all");
    }
  }, [
    tournaments,
    tournamentsLoading,
    selectedTournamentId,
    setSelectedTournamentId,
  ]); // Use selectedTournamentId for all tournament-specific logic
  const tournamentId = selectedTournamentId || "all";

  // Fetch matches based on tournament selection
  const { data: allMatchesData = [], isLoading: isLoadingMatches } =
    selectedTournamentId === "all" || !selectedTournamentId
      ? useMatches() // Fetch all matches when "All Tournaments" is selected
      : useMatchesByTournament(tournamentId);
  // Filter matches by selected field
  const matchesData = useMemo(() => {
    if (!selectedFieldId) return allMatchesData;
    return allMatchesData.filter(
      (match: any) => match.fieldId === selectedFieldId
    );
  }, [allMatchesData, selectedFieldId]);

  // Fetch all match scores at once for the matches list
  const { data: allMatchScores = [], isLoading: isLoadingAllScores } = useQuery(
    {
      queryKey: QueryKeys.matchScores.all(),
      queryFn: async () => {
        return await apiClient.get("/match-scores");
      },
      staleTime: 60 * 1000, // 1 minute
      enabled: !isLoadingMatches && matchesData.length > 0,
    }
  );

  // Build a map of matchId -> { redTotalScore, blueTotalScore }
  const matchScoresMap = useMemo(() => {
    if (!isLoadingAllScores && Array.isArray(allMatchScores)) {
      const scoresMap: Record<
        string,
        { redTotalScore: number; blueTotalScore: number }
      > = {};
      allMatchScores.forEach((score: any) => {
        if (
          score.matchId &&
          score.redTotalScore !== undefined &&
          score.blueTotalScore !== undefined
        ) {
          scoresMap[score.matchId] = {
            redTotalScore: score.redTotalScore,
            blueTotalScore: score.blueTotalScore,
          };
        }
      });
      return scoresMap;
    }
    return {};
  }, [allMatchScores, isLoadingAllScores]);

  // Fetch selected match details when a match is selected
  const { data: selectedMatch, isLoading: isLoadingMatchDetails } = useMatch(
    selectedMatchId || ""
  );

  // Send match update to audience display when selected match data loads using unified service
  useEffect(() => {
    if (!selectedMatch || !selectedMatchId || isLoadingMatchDetails) return;

    console.log(
      "📡 Broadcasting match update for selected match:",
      selectedMatchId,
      selectedMatch
    );

    const redTeams = getRedTeams(selectedMatch).map(
      (teamNumber: string | number) => ({
        name: teamNumber,
      })
    );

    const blueTeams = getBlueTeams(selectedMatch).map(
      (teamNumber: string | number) => ({
        name: teamNumber,
      })
    );

    // Send match update through unified service with field-specific filtering
    unifiedMatchControl.sendMatchUpdate({
      id: selectedMatchId,
      matchNumber:
        typeof selectedMatch.matchNumber === "string"
          ? parseInt(selectedMatch.matchNumber, 10)
          : selectedMatch.matchNumber,
      status: selectedMatch.status,
      tournamentId: selectedTournamentId || "all",
      fieldId: selectedFieldId,
      redTeams,
      blueTeams,
      scheduledTime: selectedMatch.scheduledTime,
    } as any);
  }, [
    selectedMatch,
    selectedMatchId,
    isLoadingMatchDetails,
    selectedFieldId,
    selectedTournamentId,
    unifiedMatchControl,
  ]);

  // Helper function to extract red teams from alliances
  const getRedTeams = (match?: any): string[] => {
    if (!match?.alliances) return [];
    const redAlliance = match.alliances.find(
      (alliance: any) => alliance.color === "RED"
    );
    if (!redAlliance?.teamAlliances) return [];
    return redAlliance.teamAlliances.map(
      (ta: any) => ta.team?.teamNumber || ta.team?.name || "Unknown"
    );
  };

  // Helper function to extract blue teams from alliances
  const getBlueTeams = (match?: any): string[] => {
    if (!match?.alliances) return [];
    const blueAlliance = match.alliances.find(
      (alliance: any) => alliance.color === "BLUE"
    );
    if (!blueAlliance?.teamAlliances) return [];
    return blueAlliance.teamAlliances.map(
      (ta: any) => ta.team?.teamNumber || ta.team?.name || "Unknown"
    );
  };

  // State for tracking active match and match state from WebSocket
  const [activeMatch, setActiveMatch] = useState<any>(null);
  const [matchState, setMatchState] = useState<any>(null);

  // Create stable callback functions to prevent unnecessary re-renders
  const handleTimerUpdate = useCallback((data: any) => {
    // Timer updates are handled by the timer control hook
  }, []);

  const handleScoreUpdate = useCallback((data: any) => {
    // Score updates are handled by the scoring control hook
  }, []);

  const handleMatchUpdate = useCallback(
    (data: any) => {
      setActiveMatch(data);
      // Auto-select this match if we don't have one selected yet
      if (!selectedMatchId && data.id) {
        setSelectedMatchId(data.id);
      }
    },
    [selectedMatchId]
  );

  const handleMatchStateChange = useCallback((data: any) => {
    setMatchState(data);
  }, []);

  // Initialize unified WebSocket connection
  const {
    isConnected,
    changeDisplayMode,
    sendAnnouncement,
    sendMatchUpdate: unifiedSendMatchUpdate,
    sendMatchStateChange: unifiedSendMatchStateChange,
    sendScoreUpdate: unifiedSendScoreUpdate,
    subscribe: unifiedSubscribe,
  } = useUnifiedWebSocket({
    tournamentId,
    fieldId: selectedFieldId || undefined,
    autoConnect: true,
    userRole: UserRole.HEAD_REFEREE,
  });

  // Subscribe to WebSocket events through unified service
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeTimer = unifiedSubscribe(
      "timer_update",
      handleTimerUpdate
    );
    const unsubscribeScore = unifiedSubscribe(
      "score_update",
      handleScoreUpdate
    );
    const unsubscribeMatch = unifiedSubscribe(
      "match_update",
      handleMatchUpdate
    );
    const unsubscribeMatchState = unifiedSubscribe(
      "match_state_change",
      handleMatchStateChange
    );

    return () => {
      unsubscribeTimer();
      unsubscribeScore();
      unsubscribeMatch();
      unsubscribeMatchState();
    };
  }, [
    isConnected,
    unifiedSubscribe,
    handleTimerUpdate,
    handleScoreUpdate,
    handleMatchUpdate,
    handleMatchStateChange,
  ]);

  // Create wrapper for sendMatchStateChange to match expected signature
  const sendMatchStateChangeWrapper = useCallback(
    (params: {
      matchId: string;
      status: MatchStatus;
      currentPeriod: string | null;
    }) => {
      // Convert string currentPeriod to the expected union type
      const validPeriod =
        params.currentPeriod === "auto" ||
        params.currentPeriod === "teleop" ||
        params.currentPeriod === "endgame" ||
        params.currentPeriod === null
          ? (params.currentPeriod as "auto" | "teleop" | "endgame" | null)
          : null;

      unifiedSendMatchStateChange({
        matchId: params.matchId,
        status: params.status,
        currentPeriod: validPeriod,
      });
    },
    [unifiedSendMatchStateChange]
  );

  // Initialize timer control hook
  const {
    timerDuration,
    timerRemaining,
    timerIsRunning,
    matchPeriod,
    setTimerDuration,
    setMatchPeriod,
    handleStartTimer,
    handlePauseTimer,
    handleResetTimer,
    formatTime,
  } = useTimerControl({
    tournamentId,
    selectedFieldId,
    selectedMatchId,
    sendMatchStateChange: sendMatchStateChangeWrapper,
  });

  // Initialize scoring control hook
  const scoringControl = useScoringControl({
    tournamentId,
    selectedMatchId,
    selectedFieldId,
  });

  // Get the match status update mutation
  const updateMatchStatus = useUpdateMatchStatus();

  // Handle selecting a match
  const handleSelectMatch = (match: {
    id: string;
    matchNumber: string | number;
    fieldId?: string;
  }) => {
    setSelectedMatchId(match.id);
    // If match has a fieldId, use it
    if (match.fieldId) {
      setSelectedFieldId(match.fieldId);
    }

    // Automatically update display settings to show the selected match
    changeDisplayMode({
      displayMode: "match",
      matchId: match.id,
      showTimer,
      showScores,
      showTeams,
      updatedAt: Date.now(),
    });

    // Note: Match update is now handled by useEffect when selectedMatch data loads
    // This prevents sending stale match data
  };

  // Handle display mode change
  const handleDisplayModeChange = () => {
    changeDisplayMode({
      displayMode: displayMode as any,
      matchId: selectedMatchId || null,
      showTimer,
      showScores,
      showTeams,
      updatedAt: Date.now()
    });
  };

  // Enhanced timer controls with unified match control
  const handleEnhancedStartTimer = () => {
    handleStartTimer();
    // Update match status and period through unified service
    unifiedMatchControl.startMatch();
    unifiedMatchControl.updateMatchPeriod(matchPeriod as any);
  };

  const handleEnhancedResetTimer = () => {
    handleResetTimer();
    // Reset match status and period through unified service
    unifiedMatchControl.resetMatch();
  };
  // Handle submitting final scores and completing the match
  const handleSubmitScores = async () => {
    try {
      await scoringControl.saveScores();
      // Complete match through unified service
      await unifiedMatchControl.completeMatch();
      toast.success("Match Completed", {
        description: `Final score: Red ${scoringControl.redTotalScore} - Blue ${scoringControl.blueTotalScore}`,
      });
    } catch (error) {
      toast.error("Failed to submit scores");
    }
  };

  // Handle sending an announcement
  const handleSendAnnouncement = () => {
    if (announcementMessage.trim()) {
      sendAnnouncement(announcementMessage.trim());

      // Switch display mode to announcement
      changeDisplayMode({
        displayMode: "announcement",
        message: announcementMessage.trim(),
        updatedAt: Date.now()
      });

      // Clear input after sending
      setAnnouncementMessage("");
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "IN_PROGRESS":
        return "bg-green-100 text-green-800 border-green-200";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Enhanced game element handlers using the scoring control
  const addRedGameElement = () => {
    const elementName = (
      document.getElementById("red-element-name") as HTMLInputElement
    )?.value?.trim();
    const elementCount = Number(
      (document.getElementById("red-element-count") as HTMLInputElement)
        ?.value || 1
    );
    const elementPoints = Number(
      (document.getElementById("red-element-points") as HTMLInputElement)
        ?.value || 1
    );

    if (!elementName) return;

    const totalPoints = elementCount * elementPoints;
    const newElement = {
      element: elementName,
      count: elementCount,
      pointsEach: elementPoints,
      operation: "multiply",
      totalPoints,
    };

    scoringControl.setRedGameElements([
      ...scoringControl.redGameElements,
      newElement,
    ]);
    scoringControl.setIsAddingRedElement(false);

    // Clear form
    if (document.getElementById("red-element-name")) {
      (document.getElementById("red-element-name") as HTMLInputElement).value =
        "";
    }
  };

  const addBlueGameElement = () => {
    const elementName = (
      document.getElementById("blue-element-name") as HTMLInputElement
    )?.value?.trim();
    const elementCount = Number(
      (document.getElementById("blue-element-count") as HTMLInputElement)
        ?.value || 1
    );
    const elementPoints = Number(
      (document.getElementById("blue-element-points") as HTMLInputElement)
        ?.value || 1
    );

    if (!elementName) return;

    const totalPoints = elementCount * elementPoints;
    const newElement = {
      element: elementName,
      count: elementCount,
      pointsEach: elementPoints,
      operation: "multiply",
      totalPoints,
    };

    scoringControl.setBlueGameElements([
      ...scoringControl.blueGameElements,
      newElement,
    ]);
    scoringControl.setIsAddingBlueElement(false);

    // Clear form
    if (document.getElementById("blue-element-name")) {
      (document.getElementById("blue-element-name") as HTMLInputElement).value =
        "";
    }
  };

  const removeGameElement = (alliance: "red" | "blue", index: number) => {
    if (alliance === "red") {
      const updatedElements = [...scoringControl.redGameElements];
      updatedElements.splice(index, 1);
      scoringControl.setRedGameElements(updatedElements);
    } else {
      const updatedElements = [...scoringControl.blueGameElements];
      updatedElements.splice(index, 1);
      scoringControl.setBlueGameElements(updatedElements);
    }
  };

  // Handle multiplier selection based on team count
  const updateRedTeamCount = (count: number) => {
    scoringControl.setRedTeamCount(count);
    switch (count) {
      case 1:
        scoringControl.setRedMultiplier(1.25);
        break;
      case 2:
        scoringControl.setRedMultiplier(1.5);
        break;
      case 3:
        scoringControl.setRedMultiplier(1.75);
        break;
      case 4:
        scoringControl.setRedMultiplier(2.0);
        break;
      default:
        scoringControl.setRedMultiplier(1.0);
    }
  };

  const updateBlueTeamCount = (count: number) => {
    scoringControl.setBlueTeamCount(count);
    switch (count) {
      case 1:
        scoringControl.setBlueMultiplier(1.25);
        break;
      case 2:
        scoringControl.setBlueMultiplier(1.5);
        break;
      case 3:
        scoringControl.setBlueMultiplier(1.75);
        break;
      case 4:
        scoringControl.setBlueMultiplier(2.0);
        break;
      default:
        scoringControl.setBlueMultiplier(1.0);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 p-0 w-full">
      <div className="w-full">
        <div className="flex justify-between items-center mb-6 px-6 pt-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Match Control Center
          </h1>

          {/* Role Indicator */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-gray-600">Current Role</div>
              <div
                className={`text-sm font-semibold ${
                  roleAccess.isAdmin
                    ? "text-red-600"
                    : roleAccess.isHeadReferee
                    ? "text-blue-600"
                    : roleAccess.isAllianceReferee
                    ? "text-green-600"
                    : "text-gray-600"
                }`}
              >
                {roleAccess.currentUser?.username || "Unknown"} (
                {roleAccess.currentRole})
              </div>
            </div>
            <div
              className={`w-3 h-3 rounded-full ${
                roleAccess.hasFullAccess
                  ? "bg-green-500"
                  : roleAccess.hasScoringAccess
                  ? "bg-yellow-500"
                  : "bg-gray-400"
              }`}
              title={
                roleAccess.hasFullAccess
                  ? "Full Access"
                  : roleAccess.hasScoringAccess
                  ? "Scoring Access"
                  : "Limited Access"
              }
            />
          </div>
        </div>

        {/* Tournament and Field Selection */}
        <Card className="p-6 mb-6 mx-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Tournament
              </label>{" "}
              <Select
                value={selectedTournamentId}
                onValueChange={setSelectedTournamentId}
                disabled={tournamentsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tournament" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tournaments</SelectItem>
                  {tournaments.map((tournament: any) => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      {tournament.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>{" "}
            <div>
              <label className="block text-sm font-medium mb-2">Field</label>
              <DynamicFieldSelectDropdown
                selectedTournamentId={selectedTournamentId}
                selectedFieldId={selectedFieldId}
                onFieldChange={setSelectedFieldId}
                placeholder="Select field (optional)"
              />
            </div>
          </div>

          {/* Connection Status */}
          <div className="mt-4">
            <ConnectionStatus
              isConnected={isConnected}
              currentTournament={tournamentId}
            />
          </div>
        </Card>

        {/* Main Control Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 px-6">
          {/* Match Selection */}
          <div className="xl:col-span-1">
            {roleAccess.showMatchControls || roleAccess.hasScoringAccess ? (
              <MatchSelector
                matches={matchesData}
                selectedMatchId={selectedMatchId}
                onSelectMatch={handleSelectMatch}
                getStatusBadgeColor={getStatusBadgeColor}
                formatDate={formatDate}
                getRedTeams={getRedTeams}
                getBlueTeams={getBlueTeams}
                matchScoresMap={matchScoresMap}
                isLoading={isLoadingMatches}
              />
            ) : (
              <AccessDenied
                feature="Match Selection"
                message={roleAccess.getAccessDeniedMessage("match")}
                currentRole={roleAccess.currentRole}
                requiredRoles={[
                  UserRole.ADMIN,
                  UserRole.HEAD_REFEREE,
                  UserRole.ALLIANCE_REFEREE,
                ]}
              />
            )}
          </div>

          {/* Match Status Display */}
          <div className="xl:col-span-1">
            <MatchStatusDisplay
              selectedMatch={selectedMatch}
              selectedMatchId={selectedMatchId}
              activeMatch={activeMatch}
              matchState={matchState}
              getRedTeams={getRedTeams}
              getBlueTeams={getBlueTeams}
              formatDate={formatDate}
              getStatusBadgeColor={getStatusBadgeColor}
              redTotalScore={scoringControl.redTotalScore}
              blueTotalScore={scoringControl.blueTotalScore}
              isLoading={isLoadingMatchDetails}
            />
          </div>

          {/* Timer Control */}
          <div className="xl:col-span-1">
            {roleAccess.showTimerControls ? (
              <TimerControlPanel
                timerDuration={timerDuration}
                timerRemaining={timerRemaining}
                timerIsRunning={timerIsRunning}
                matchPeriod={matchPeriod}
                setTimerDuration={setTimerDuration}
                setMatchPeriod={setMatchPeriod}
                onStartTimer={handleEnhancedStartTimer}
                onPauseTimer={handlePauseTimer}
                onResetTimer={handleEnhancedResetTimer}
                formatTime={formatTime}
                disabled={!isConnected || !selectedMatchId}
              />
            ) : (
              <AccessDenied
                feature="Timer Control"
                message={roleAccess.getAccessDeniedMessage("timer")}
                currentRole={roleAccess.currentRole}
                requiredRoles={[UserRole.ADMIN, UserRole.HEAD_REFEREE]}
              />
            )}
          </div>
        </div>

        {/* Secondary Control Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6 px-6">
          {/* Scoring Panel */}
          <div>
            {roleAccess.showScoringPanel ? (
              <ScoringPanel
                {...scoringControl}
                onUpdateScores={scoringControl.sendRealtimeUpdate}
                onSubmitScores={handleSubmitScores}
                addRedGameElement={addRedGameElement}
                addBlueGameElement={addBlueGameElement}
                removeGameElement={removeGameElement}
                updateRedTeamCount={updateRedTeamCount}
                updateBlueTeamCount={updateBlueTeamCount}
                selectedMatchId={selectedMatchId}
                disabled={!isConnected}
              />
            ) : (
              <AccessDenied
                feature="Scoring Panel"
                message={roleAccess.getAccessDeniedMessage("scoring")}
                currentRole={roleAccess.currentRole}
                requiredRoles={[
                  UserRole.ADMIN,
                  UserRole.HEAD_REFEREE,
                  UserRole.ALLIANCE_REFEREE,
                ]}
              />
            )}
          </div>
          {/* Announcement Panel */}
          <div>
            {roleAccess.showDisplayControls ? (
              <AnnouncementPanel
                announcementMessage={announcementMessage}
                setAnnouncementMessage={setAnnouncementMessage}
                displayMode={displayMode}
                setDisplayMode={setDisplayMode}
                showTimer={showTimer}
                showScores={showScores}
                showTeams={showTeams}
                setShowTimer={setShowTimer}
                setShowScores={setShowScores}
                setShowTeams={setShowTeams}
                onSendAnnouncement={handleSendAnnouncement}
                onDisplayModeChange={handleDisplayModeChange}
                isConnected={isConnected}
              />
            ) : (
              <AccessDenied
                feature="Display Control"
                message={roleAccess.getAccessDeniedMessage("display")}
                currentRole={roleAccess.currentRole}
                requiredRoles={[UserRole.ADMIN, UserRole.HEAD_REFEREE]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
