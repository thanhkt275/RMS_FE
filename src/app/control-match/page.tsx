"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  useMatch,
  useUpdateMatchStatus,
  useMatches,
} from "@/hooks/matches/use-matches";
import { useMatchesByTournament } from "@/hooks/matches/use-matches-by-tournament";
import { useStagesByTournament } from "@/hooks/stages/use-stages";
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
import { useAnnouncement } from "@/hooks/control-match/use-announcement";
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

function ControlMatchContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

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
    selectedFieldId,
    setSelectedFieldId,
    selectedTournamentId,
    setSelectedTournamentId,
    scheduleStageId,
    setScheduleStageId,
  } = useDisplayControl();

  // Load stages for the selected tournament (if a specific tournament is chosen)
  const stagesTournamentId =
    selectedTournamentId && selectedTournamentId !== "all"
      ? selectedTournamentId
      : "";
  const {
    data: tournamentStages = [],
    isLoading: isLoadingStages,
  } = useStagesByTournament(stagesTournamentId);

  // Initialize multimedia announcement system
  const {
    announcement,
    updateAnnouncement,
    resetAnnouncement,
    showAnnouncement,
    setShowAnnouncement,
    announcementCountdown,
    setAnnouncementCountdown,
    validateAnnouncement,
  } = useAnnouncement();

  // State for selected match
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");

  // Winner badge control state
  const [showWinnerBadge, setShowWinnerBadge] = useState<boolean>(false);

  // Announcement text customization state
  const [announcementTextSize, setAnnouncementTextSize] = useState<'small' | 'medium' | 'large' | 'xlarge'>('large');
  const [announcementTextColor, setAnnouncementTextColor] = useState<string>('#ffffff');

  // Initialize unified match control hook
  const unifiedMatchControl = useUnifiedMatchControl({
    tournamentId: selectedTournamentId || "all",
    fieldId: selectedFieldId ?? undefined,
    selectedMatchId: selectedMatchId || undefined,
  });
  // Set default tournamentId on load (All Tournaments or from URL)
  useEffect(() => {
    if (tournamentsLoading) return;
    
    // Check if tournament ID is provided in URL
    const tournamentFromUrl = searchParams.get('tournament');
    
    if (tournamentFromUrl && tournaments.length > 0) {
      // Verify the tournament ID exists in the tournaments list
      const tournamentExists = tournaments.some((t: any) => t.id === tournamentFromUrl);
      if (tournamentExists) {
        setSelectedTournamentId(tournamentFromUrl);
        return;
      }
    }
    
    // Fallback to "all" if no valid tournament in URL or not found
    if (!selectedTournamentId && tournaments.length > 0) {
      setSelectedTournamentId("all");
    }
  }, [
    tournaments,
    tournamentsLoading,
    selectedTournamentId,
    setSelectedTournamentId,
    searchParams,
  ]);

  // Check for field parameter in URL
  useEffect(() => {
    const fieldFromUrl = searchParams.get('field');
    if (fieldFromUrl && !selectedFieldId) {
      setSelectedFieldId(fieldFromUrl);
    }
  }, [searchParams, selectedFieldId, setSelectedFieldId]);

  // Use selectedTournamentId for all tournament-specific logic
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

  // Initialize unified WebSocket connection with actual user role
  const {
    isConnected,
    changeDisplayMode,
    sendAnnouncement,
    sendMatchUpdate: unifiedSendMatchUpdate,
    sendMatchStateChange: unifiedSendMatchStateChange,
    sendWinnerBadgeUpdate,
    sendScoreUpdate: unifiedSendScoreUpdate,
    subscribe: unifiedSubscribe,
  } = useUnifiedWebSocket({
    tournamentId,
    fieldId: selectedFieldId || undefined,
    autoConnect: true,
    userRole: roleAccess.currentRole, // Use actual user role from auth
  });

const handleScheduleStageChange = useCallback(
    (stageId: string | null) => {
      if (scheduleStageId === stageId) {
        return;
      }

      setScheduleStageId(stageId);

      if (displayMode === "schedule") {
        changeDisplayMode({
          displayMode: "schedule",
          matchId: selectedMatchId || null,
          showTimer,
          showScores,
          showTeams,
          updatedAt: Date.now(),
          scheduleStageId: stageId,
        });
      }
    },
    [
      scheduleStageId,
      setScheduleStageId,
      displayMode,
      changeDisplayMode,
      selectedMatchId,
      showTimer,
      showScores,
      showTeams,
    ]
  );

  // Reset schedule-stage selection if the stage list no longer includes it
  useEffect(() => {
    if (!scheduleStageId || isLoadingStages) {
      return;
    }

    const stageExists = tournamentStages.some(
      (stage: any) => stage.id === scheduleStageId
    );

    if (!stageExists) {
      handleScheduleStageChange(null);
    }
  }, [
    scheduleStageId,
    isLoadingStages,
    tournamentStages,
    handleScheduleStageChange,
  ]);

  // Debug WebSocket connection status
  useEffect(() => {
    console.log('[Control Panel] WebSocket connection status:', {
      isConnected,
      tournamentId,
      fieldId: selectedFieldId,
      userRole: roleAccess.currentRole,
    });
  }, [isConnected, tournamentId, selectedFieldId, roleAccess.currentRole]);

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
        params.currentPeriod === "teleop" ||
        params.currentPeriod === "endgame" ||
        params.currentPeriod === null
          ? (params.currentPeriod as "teleop" | "endgame" | null)
          : null;

      unifiedSendMatchStateChange({
        matchId: params.matchId,
        status: params.status,
        currentPeriod: validPeriod,
      });
    },
    [unifiedSendMatchStateChange]
  );

  // Get the match status update mutations - one for manual actions, one for automatic
  const updateMatchStatusWithToast = useUpdateMatchStatus(true);  // For manual actions
  const updateMatchStatusSilent = useUpdateMatchStatus(false);    // For automatic timer updates

  // Create stable callback for API updates using silent mutation for timer control
  const updateMatchStatusAPI = useCallback(({ matchId, status }: { matchId: string; status: MatchStatus }) => {
    updateMatchStatusSilent.mutate({ matchId, status });
  }, []); // Empty dependency array since we're using the mutation directly

  // Initialize timer control hook with API update function and proper RBAC
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
    canControlTimer,
    hasTimerPermission,
  } = useTimerControl({
    tournamentId,
    selectedFieldId,
    selectedMatchId,
    userRole: roleAccess.currentRole, // Pass actual user role for RBAC validation
    sendMatchStateChange: sendMatchStateChangeWrapper,
    updateMatchStatusAPI, // Pass the API update function
  });

  // Initialize scoring control hook
  const scoringControl = useScoringControl({
    tournamentId,
    selectedMatchId,
    selectedFieldId,
    userRole: roleAccess.currentRole,
  });

  const {
    redTotalScore,
    blueTotalScore,
    redFlagsSecured,
    redSuccessfulFlagHits,
    redOpponentFieldAmmo,
    blueFlagsSecured,
    blueSuccessfulFlagHits,
    blueOpponentFieldAmmo,
    redBreakdown,
    blueBreakdown,
    setRedFlagsSecured,
    setRedSuccessfulFlagHits,
    setRedOpponentFieldAmmo,
    setBlueFlagsSecured,
    setBlueSuccessfulFlagHits,
    setBlueOpponentFieldAmmo,
    sendRealtimeUpdate,
    saveScores,
    isLoadingScores,
    matchScores,
  } = scoringControl;
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
      scheduleStageId: null,
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
      updatedAt: Date.now(),
      scheduleStageId:
        displayMode === "schedule" ? scheduleStageId ?? null : null,
    });
  };

  // Enhanced timer controls with unified match control
  const handleEnhancedStartTimer = () => {
    const nextPeriod = timerRemaining === timerDuration ? "teleop" : matchPeriod;
    handleStartTimer();
    // Update match status and period through unified service
    unifiedMatchControl.startMatch();
    unifiedMatchControl.updateMatchPeriod(nextPeriod as any);
  };

  const handleEnhancedResetTimer = () => {
    // Timer control hook handles both WebSocket and API updates internally
    handleResetTimer();
    // Reset match status and period through unified service
    unifiedMatchControl.resetMatch();
    unifiedMatchControl.updateMatchPeriod("teleop");
  };
  // Handle submitting final scores and completing the match
  const handleSubmitScores = async () => {
    try {
      await saveScores();
      // Complete match through unified service
      await unifiedMatchControl.completeMatch();
      toast.success("Match Completed", {
        description: `Final score: Red ${redTotalScore} - Blue ${blueTotalScore}`,
      });
    } catch (error) {
      toast.error("Failed to submit scores");
    }
  };

  // Handle toggling winner badge display
  const handleToggleWinnerBadge = () => {
    const newShowWinnerBadge = !showWinnerBadge;
    setShowWinnerBadge(newShowWinnerBadge);
    
    console.log("🏆 [Control Panel] Sending winner badge update:", {
      matchId: selectedMatchId,
      showWinnerBadge: newShowWinnerBadge,
      fieldId: selectedFieldId,
    });
    
    // Send winner badge update via WebSocket
    sendWinnerBadgeUpdate({
      matchId: selectedMatchId,
      showWinnerBadge: newShowWinnerBadge,
    });
    
    toast.success(newShowWinnerBadge ? "Winner badge displayed" : "Winner badge hidden");
  };

  // Handle sending an announcement
  const handleSendAnnouncement = () => {
    const validation = validateAnnouncement();
    if (!validation.isValid) {
      toast.error("Invalid Announcement", {
        description: validation.error,
      });
      return;
    }

    // Send the multimedia announcement data with text customization
    const announcementData = {
      ...announcement,
      textSize: announcementTextSize,
      textColor: announcementTextColor,
    };
    sendAnnouncement(announcementData);

    // DO NOT change display mode - let the announcement overlay handle display
    // The audience display will show the announcement overlay and then switch to blank
    // when the announcement ends

    // Reset announcement after sending
    resetAnnouncement();
    
    toast.success("Announcement Sent", {
      description: `${announcement.type.charAt(0).toUpperCase() + announcement.type.slice(1)} announcement sent successfully`,
    });
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

  // Legacy helpers removed in new scoring system
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
              redTotalScore={redTotalScore}
              blueTotalScore={blueTotalScore}
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
                disabled={!isConnected || !selectedMatchId || !hasTimerPermission}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 px-6">
          {/* Scoring Panel */}
          <div className="lg:col-span-2">
            {roleAccess.showScoringPanel ? (
              <ScoringPanel
                selectedMatchId={selectedMatchId}
                redFlagsSecured={redFlagsSecured}
                redSuccessfulFlagHits={redSuccessfulFlagHits}
                redOpponentFieldAmmo={redOpponentFieldAmmo}
                blueFlagsSecured={blueFlagsSecured}
                blueSuccessfulFlagHits={blueSuccessfulFlagHits}
                blueOpponentFieldAmmo={blueOpponentFieldAmmo}
                redBreakdown={redBreakdown}
                blueBreakdown={blueBreakdown}
                redTotalScore={redTotalScore}
                blueTotalScore={blueTotalScore}
                setRedFlagsSecured={setRedFlagsSecured}
                setRedSuccessfulFlagHits={setRedSuccessfulFlagHits}
                setRedOpponentFieldAmmo={setRedOpponentFieldAmmo}
                setBlueFlagsSecured={setBlueFlagsSecured}
                setBlueSuccessfulFlagHits={setBlueSuccessfulFlagHits}
                setBlueOpponentFieldAmmo={setBlueOpponentFieldAmmo}
                onUpdateScores={sendRealtimeUpdate}
                onSubmitScores={handleSubmitScores}
                isLoading={isLoadingScores}
                disabled={!isConnected}
                matchStatus={selectedMatch?.status}
                showWinnerBadge={showWinnerBadge}
                onToggleWinnerBadge={handleToggleWinnerBadge}
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
          <div className="lg:col-span-1">
            {roleAccess.showDisplayControls ? (
              <AnnouncementPanel
                announcement={announcement}
                updateAnnouncement={updateAnnouncement}
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
                validateAnnouncement={validateAnnouncement}
                isConnected={isConnected}
                scheduleStageId={scheduleStageId}
                onScheduleStageChange={handleScheduleStageChange}
                stages={tournamentStages}
                isStagesLoading={isLoadingStages}
                textSize={announcementTextSize}
                textColor={announcementTextColor}
                onTextSizeChange={setAnnouncementTextSize}
                onTextColorChange={setAnnouncementTextColor}
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

function ControlMatchPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">Match Control</h1>
            <p className="text-base text-gray-600">Loading...</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Loading...</h2>
            <p className="text-gray-500">Please wait while we load the match control</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ControlMatchPage() {
  return (
    <Suspense fallback={<ControlMatchPageSkeleton />}>
      <ControlMatchContent />
    </Suspense>
  );
}
