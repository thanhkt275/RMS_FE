"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTournament } from "@/hooks/api/use-tournaments";
import { useTournamentFields } from "@/components/fields/FieldSelectDropdown";
import { useWebSocket } from "@/hooks/common/use-websocket";
import { useRealtimeScores } from "@/hooks/features/use-realtime-scores";
import { webSocketService } from "@/lib/websocket";
import { AudienceDisplaySettings } from "@/lib/types";
import TeamsDisplay from "../../../../components/features/audience-display/displays/teams-display";
import ScheduleDisplay, {
  Match,
} from "../../../../components/features/audience-display/displays/schedule-display";
import { useTeams } from "@/hooks/api/use-teams";
import { apiClient } from "@/lib/api-client";
import { useInjectTextShadowStyle } from "../../../../hooks/features/use-inject-text-shadow-style";
import { useAnnouncement } from "../../../../hooks/features/use-announcement";
import { AnnouncementOverlay } from "../../../../components/features/audience-display/overlays/announcement-overlay";
import { FieldNotFound } from "../../../../components/features/audience-display/states/field-not-found";
import { LoadingDisplay } from "../../../../components/features/audience-display/states/loading-display";
import { ConnectionStatus } from "../../../../components/features/audience-display/states/connection-status";
import { MatchDisplay } from "../../../../components/features/audience-display/displays/match-display";
import { useMatchesByTournament } from "@/hooks/features/use-matches-by-tournament";
import { SwissRankingsDisplay } from "../../../../components/features/audience-display/displays/swiss-rankings-display";
import { formatDateRange, formatTimeMsPad } from '@/lib/utils';

export default function LiveFieldDisplayPage() {
  const router = useRouter();
  const params = useParams();
  const tournamentId = params?.tournamentId as string;
  const fieldId = params?.fieldId as string;

  useInjectTextShadowStyle();

  // Fetch tournament and field details
  const { data: tournament, isLoading: isLoadingTournament } =
    useTournament(tournamentId);
  const { data: fields = [], isLoading: isLoadingFields } =
    useTournamentFields(tournamentId);
  const field = fields.find((f) => f.id === fieldId); // State for live data
  const [score, setScore] = useState<any>(null);
  const [timer, setTimer] = useState<any>(null);
  const [matchState, setMatchState] = useState<any>({
    matchId: null,
    matchNumber: null,
    name: null,
    status: null,
    currentPeriod: null,
    redTeams: [],
    blueTeams: [],
  });
  const [connectionError, setConnectionError] = useState<string | null>(null); // Enhanced real-time scores with fallback support (Steps 10-12)
  const currentMatchId = matchState.matchId || "";
  console.log("useRealtimeScores called with matchId:", currentMatchId);

  const {
    realtimeScores,
    lastUpdateTime,
    isConnected: wsConnected,
    fallbackMode,
    source,
  } = useRealtimeScores(currentMatchId);

  // Display mode and announcement state
  const [displaySettings, setDisplaySettings] =
    useState<AudienceDisplaySettings>({
      displayMode: "match",
      tournamentId,
      fieldId,
      updatedAt: Date.now(),
    });

  const {
    announcement,
    setAnnouncement,
    showAnnouncement,
    setShowAnnouncement,
    announcementCountdown,
    setAnnouncementCountdown,
  } = useAnnouncement();

  // Validate field exists for this tournament
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoadingFields && fields.length > 0 && fieldId && !field) {
      setFieldError(
        `Field with ID "${fieldId}" was not found in tournament "${
          tournament?.name || tournamentId
        }"`
      );
    } else {
      setFieldError(null);
    }
  }, [fields, fieldId, field, tournament, isLoadingFields, tournamentId]);

  // Fetch teams for the tournament
  const { data: teams = [], isLoading: isLoadingTeams } =
    useTeams(tournamentId);

  // Fetch match schedule for the tournament
  const { data: matches = [], isLoading: isLoadingMatches } =
    useMatchesByTournament(tournamentId);

  // Rankings state
  const [rankings, setRankings] = useState<any[]>([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState<boolean>(false);

  useEffect(() => {
    if (!tournamentId) return;
    setIsLoadingRankings(true);
    apiClient
      .get(`/team-stats/leaderboard/${tournamentId}`)
      .then((data) => setRankings(data.rankings || []))
      .catch(() => setRankings([]))
      .finally(() => setIsLoadingRankings(false));
  }, [tournamentId]);

  // WebSocket connection and state
  const {
    isConnected,
    joinFieldRoom,
    leaveFieldRoom,
    subscribe,
    changeDisplayMode,
    sendMatchUpdate,
    sendMatchStateChange,
    sendScoreUpdate,
    startTimer,
    pauseTimer,
    resetTimer,
    sendAnnouncement,
    joinTournament,
    joinFieldRoom: wsJoinFieldRoom,
    leaveFieldRoom: wsLeaveFieldRoom,
  } = useWebSocket({ tournamentId, autoConnect: true });

  // Expose WebSocket testing interface on window for manual testing and debugging
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).audienceDisplayWS = {
        // Display settings
        changeDisplayMode: (settings: any) =>
          changeDisplayMode({
            ...settings,
            fieldId,
            tournamentId,
          }),
        setToMatchDisplay: () =>
          changeDisplayMode({
            displayMode: "match",
            fieldId,
            tournamentId,
          }),
        setToTeamsDisplay: () =>
          changeDisplayMode({
            displayMode: "teams",
            fieldId,
            tournamentId,
          }),
        setToScheduleDisplay: () =>
          changeDisplayMode({
            displayMode: "schedule",
            fieldId,
            tournamentId,
          }),
        setToBlankDisplay: () =>
          changeDisplayMode({
            displayMode: "blank",
            fieldId,
            tournamentId,
          }),

        // Match management
        sendMatchUpdate: (data: any) =>
          sendMatchUpdate({
            ...data,
            fieldId,
          }),
        sendMatchStateChange: (data: any) =>
          sendMatchStateChange({
            ...data,
            fieldId,
          }),
        sendScoreUpdate: (data: any) =>
          sendScoreUpdate({
            ...data,
            fieldId,
          }),

        // Timer controls
        startTimer: (data: any) =>
          startTimer({
            ...data,
            fieldId,
          }),
        pauseTimer: (data: any) =>
          pauseTimer({
            ...data,
            fieldId,
          }),
        resetTimer: (data: any) =>
          resetTimer({
            ...data,
            fieldId,
          }),
        // Announcements
        sendAnnouncement: (message: string, duration?: number) =>
          sendAnnouncement(message, duration, fieldId),
        showTestAnnouncement: (message: string, seconds: number = 10) => {
          // Helper for testing announcements with countdown directly
          setAnnouncement(message);
          setShowAnnouncement(true);
          setAnnouncementCountdown(seconds);
          setTimeout(() => setShowAnnouncement(false), seconds * 1000);
        },

        // Room management
        joinFieldRoom: () => wsJoinFieldRoom(fieldId),
        leaveFieldRoom: () => wsLeaveFieldRoom(fieldId),

        // Debugging info
        getFieldId: () => fieldId,
        getTournamentId: () => tournamentId,
        getCurrentDisplayMode: () => displaySettings.displayMode,
        getCurrentDisplaySettings: () => displaySettings,
      };
    }
  }, [
    changeDisplayMode,
    sendMatchUpdate,
    sendMatchStateChange,
    sendScoreUpdate,
    startTimer,
    pauseTimer,
    resetTimer,
    sendAnnouncement,
    wsJoinFieldRoom,
    wsLeaveFieldRoom,
    fieldId,
    tournamentId,
    displaySettings,
  ]); // Join tournament and field rooms on mount
  useEffect(() => {
    if (!tournamentId) return;

    console.log(
      `Audience display joining tournament: ${tournamentId} and field: ${fieldId}`
    );
    joinTournament(tournamentId);

    if (fieldId) {
      joinFieldRoom(fieldId);
      console.log(
        `Joining field room: ${fieldId} in tournament: ${tournamentId}`
      );
    }

    return () => {
      if (fieldId) {
        leaveFieldRoom(fieldId);
        console.log(`Leaving field room: ${fieldId}`);
      }
    };
  }, [tournamentId, fieldId, joinTournament, joinFieldRoom, leaveFieldRoom]);
  // Connect the new WebSocket service for real-time scores
  useEffect(() => {
    console.log("🔗 Connecting new WebSocket service for real-time scores");
    webSocketService.connect();

    // Join tournament and field rooms for real-time score updates
    if (tournamentId) {
      console.log(
        `🏆 New WebSocket service joining tournament: ${tournamentId}`
      );
      webSocketService.joinTournament(tournamentId);
    }

    if (fieldId) {
      console.log(`🏟️ New WebSocket service joining field room: ${fieldId}`);
      webSocketService.joinFieldRoom(fieldId);
    }

    return () => {
      console.log("🔌 Disconnecting new WebSocket service");
      webSocketService.disconnect();
    };
  }, [tournamentId, fieldId]);

  // Subscribe to match updates from the new WebSocket service for better timing
  useEffect(() => {
    if (!tournamentId) return;

    const handleNewMatchUpdate = (data: any) => {
      console.log("🆕 [New WebSocket Service] Match update received:", data, "for field:", fieldId);
      
      // Accept updates if:
      // 1. No fieldId filtering needed (selectedFieldId is null), OR
      // 2. fieldId matches, OR  
      // 3. No fieldId in update (tournament-wide)
      const shouldAccept = 
        !fieldId || // No field selected
        !data.fieldId || // No fieldId in update (tournament-wide)
        data.fieldId === fieldId; // Exact field match
      
      if (!shouldAccept) {
        console.log(`🚫 [New WebSocket] Ignoring match update for different field: ${data.fieldId} (expected: ${fieldId})`);
        return;
      }

      const newMatchId = data.matchId || data.id;
      
      console.log("✅ [New WebSocket] Processing match update for field:", fieldId, "matchId:", newMatchId);

      // Update match state immediately - this ensures the useRealtimeScores hook
      // gets the correct matchId before score updates arrive
      setMatchState((prevState: any) => ({
        ...prevState,
        ...data,
        matchId: newMatchId || prevState?.matchId,
        matchNumber: data.matchNumber || prevState?.matchNumber,
        status: data.status || prevState?.status,
        redTeams: data.redTeams || prevState?.redTeams || [],
        blueTeams: data.blueTeams || prevState?.blueTeams || [],
      }));

      // Switch to match display mode if not already
      if (displaySettings.displayMode !== "match") {
        setDisplaySettings({
          ...displaySettings,
          displayMode: "match",
          matchId: newMatchId,
          updatedAt: Date.now(),
        });
      }
    };

    console.log("🔔 [New WebSocket Service] Setting up match update subscription");
    const unsubscribeNewMatchUpdate = webSocketService.onMatchUpdate(handleNewMatchUpdate);

    return () => {
      if (unsubscribeNewMatchUpdate) {
        unsubscribeNewMatchUpdate();
      }
    };
  }, [tournamentId, fieldId, displaySettings]);

  // Track connection status and attempts
  const [connectionAttempts, setConnectionAttempts] = useState<number>(0);

  // Update connection error message based on connection status
  useEffect(() => {
    if (!isConnected) {
      const attemptMessage =
        connectionAttempts > 0 ? ` (Attempt ${connectionAttempts + 1})` : "";
      setConnectionError(
        `WebSocket connection not established${attemptMessage}. Ensure the server is running.`
      );

      // Increment connection attempts and retry after delay
      const timeoutId = setTimeout(() => {
        setConnectionAttempts((prev) => prev + 1);
      }, 5000);

      return () => clearTimeout(timeoutId);
    } else {
      setConnectionError(null);
      setConnectionAttempts(0);
    }
  }, [isConnected, connectionAttempts]);

  // Helper to fetch and sync full match details and score
  async function fetchAndSyncMatch(matchId: string) {
    try {
      // Fetch match metadata (teams, period, status, etc.)
      const matchDetails = await apiClient.get<any>(`/matches/${matchId}`);
      setMatchState((prev: any) => ({
        ...prev,
        matchId: matchDetails.id,
        matchNumber: matchDetails.matchNumber,
        name: matchDetails.name || matchDetails.match_name || "",
        status: matchDetails.status || "",
        currentPeriod: matchDetails.currentPeriod || matchDetails.period || "",
        redTeams: matchDetails.redTeams || matchDetails.red_teams || [],
        blueTeams: matchDetails.blueTeams || matchDetails.blue_teams || [],
      }));
      // Fetch score breakdown
      const scoreDetails = await apiClient.get(
        `/match-scores/match/${matchId}`
      );
      setScore(scoreDetails);
    } catch (error) {
      console.error("Error syncing match data:", error);
    }
  }

  // Subscribe to WebSocket events and sync all live data with field-specific filtering
  useEffect(() => {
    // --- WebSocket Event Subscriptions for Audience Display ---
    // Only listen to 'scoreUpdateRealtime' for real-time score updates.
    // Legacy events like 'score_update' are now ignored to avoid race conditions and ensure clean, scalable real-time flow.

    
    const unsubDisplayMode = subscribe<AudienceDisplaySettings>(
      "display_mode_change",
      (data) => {
        // Apply if global tournament update (no fieldId) or specific to this field
        if (!data.fieldId || data.fieldId === fieldId) {
          console.log("Received display mode change:", data);
          console.log(
            "Current display mode before update:",
            displaySettings.displayMode
          );

          // Ensure we're using the full data object with all required properties
          const updatedSettings = {
            ...data,
            // Make sure fieldId is preserved
            fieldId: data.fieldId || fieldId,
            // Make sure tournamentId is preserved
            tournamentId: data.tournamentId || tournamentId,
            // Ensure updatedAt is present
            updatedAt: data.updatedAt || Date.now(),
          };

          setDisplaySettings(updatedSettings);
          console.log("Updated display settings to:", updatedSettings);

          // If changing to match display mode and matchId is provided,
          // fetch and sync all match data immediately
          if (
            updatedSettings.displayMode === "match" &&
            updatedSettings.matchId
          ) {
            fetchAndSyncMatch(updatedSettings.matchId);
          }
        }
      }
    ); // Match updates - should be field-specific or global tournament updates
    const unsubMatchUpdate = subscribe<any>("match_update", (data) => {
      // Process updates for this specific field OR updates without a fieldId (global updates)
      if (!data.fieldId || data.fieldId === fieldId) {
        console.log("Receiving match update for field:", fieldId, data);

        const newMatchId = data.matchId || data.id; // Extract newMatchId

        // Store match data in matchState to show it on the audience display
        setMatchState((prevState: any) => ({
          ...prevState,
          ...data,
          // Ensure we have matchId set properly (could be in id or matchId property)
          matchId: newMatchId || prevState?.matchId,
          matchNumber: data.matchNumber || prevState?.matchNumber,
          status: data.status || prevState?.status,
          // If we have alliance data, keep it; otherwise use previous data
          redTeams: data.redTeams || prevState?.redTeams || [],
          blueTeams: data.blueTeams || prevState?.blueTeams || [],
        }));

        // If a new matchId is provided, and it's different from the current one,
        // or if the current matchId is null, fetch its full details.
        if (
          newMatchId &&
          (newMatchId !== matchState.matchId || !matchState.matchId)
        ) {
          console.log(
            `Match ID update: current ${matchState.matchId}, new ${newMatchId}. Fetching full details.`
          );
          fetchAndSyncMatch(newMatchId);
        }

        // Also ensure display mode is set to match
        if (displaySettings.displayMode !== "match") {
          setDisplaySettings({
            ...displaySettings,
            displayMode: "match",
            matchId: newMatchId, // Use extracted newMatchId
            updatedAt: Date.now(),
          });
        }
      }
    }); // Timer updates - should be field-specific or tournament-wide
    const unsubTimer = subscribe<any>("timer_update", (data) => {
      // Process timer updates for this specific field OR tournament-wide updates (no fieldId specified)
      if (data.fieldId === fieldId || !data.fieldId) {
        console.log("Applying timer update for field:", fieldId, data);
        setTimer(data);
      }
    }); // Match state changes - should be field-specific
    const unsubMatchState = subscribe<any>("match_state_change", (data) => {
      // Only process match state changes for this specific field
      if (data.fieldId === fieldId) {
        console.log("Applying match state change for field:", fieldId, data);
        console.log("Previous match state:", matchState);

        // Update the match state with the new status and period information
        // Use the same fallback pattern as match_update to preserve existing data
        setMatchState((prevState: any) => {
          const updatedState = {
            ...prevState,
            // Ensure we maintain matchId and don't overwrite with undefined
            matchId: data.matchId || prevState?.matchId,
            // Preserve match name and number if not provided in update
            matchNumber: data.matchNumber || prevState?.matchNumber,
            name: data.name || prevState?.name,
            // Update status and period
            status: data.status || prevState?.status,
            currentPeriod: data.currentPeriod || prevState?.currentPeriod,
            // Ensure team data is preserved
            redTeams: data.redTeams || prevState?.redTeams || [],
            blueTeams: data.blueTeams || prevState?.blueTeams || [],
          };

          console.log("Updated match state:", updatedState);
          return updatedState;
        });

        // If we're not already in match display mode, switch to it
        if (displaySettings.displayMode !== "match") {
          setDisplaySettings({
            ...displaySettings,
            displayMode: "match",
            matchId: data.matchId || matchState?.matchId, // Use existing matchId as fallback
            updatedAt: Date.now(),
          });
        }
      }
    }); // Enhanced score updates - prioritize real-time WebSocket scores (Step 10)
    const unsubRealtimeScore = subscribe<any>("scoreUpdateRealtime", (data) => {
      console.log(
        "🔴 [Legacy WebSocket] Real-time score update received:",
        data,
        "for field:",
        fieldId,
        "current match:",
        matchState?.matchId
      );

      // Accept real-time score updates if they're for the current match
      if (data.matchId && data.matchId === matchState?.matchId) {
        console.log("Applying real-time score update for match:", data.matchId);        // Convert real-time score format to display format
        const realtimeScoreData = {
          matchId: data.matchId,
          redAutoScore: data.redAutoScore || 0,
          redDriveScore: data.redDriveScore || 0,
          redTotalScore: data.redTotalScore || 0,
          blueAutoScore: data.blueAutoScore || 0,
          blueDriveScore: data.blueDriveScore || 0,
          blueTotalScore: data.blueTotalScore || 0,
          redPenalty: data.redPenalty || 0,
          bluePenalty: data.bluePenalty || 0,
          redTeamCount: data.redTeamCount || 2,
          blueTeamCount: data.blueTeamCount || 2,
          redMultiplier: data.redMultiplier || 1,
          blueMultiplier: data.blueMultiplier || 1,
          redGameElements: data.redGameElements || [],
          blueGameElements: data.blueGameElements || [],
          scoreDetails: data.scoreDetails || {},
          timestamp: data.timestamp || Date.now(),
          isRealtime: true, // Flag to identify real-time updates
        };

        setScore(realtimeScoreData);

        // Ensure we're in match display mode
        if (displaySettings.displayMode !== "match") {
          setDisplaySettings({
            ...displaySettings,
            displayMode: "match",
            matchId: data.matchId,
            updatedAt: Date.now(),
          });
        }
      } else {
        console.log(
          "Ignoring real-time score update - not for current match:",
          {
            updateMatchId: data.matchId,
            currentMatchId: matchState?.matchId,
          }
        );
      }
    });    // Announcements - can be tournament-wide or field-specific
    const unsubAnnouncement = subscribe<{
      message: string;
      duration?: number;
      fieldId?: string;
      tournamentId: string;
    }>("announcement", (data) => {
      console.log("🔔 Announcement received on audience display:", data);
      console.log("Current field:", fieldId, "Announcement fieldId:", data.fieldId);
      
      // Show if it's a tournament-wide announcement or specific to this field
      if (!data.fieldId || data.fieldId === fieldId) {
        console.log("✅ Displaying announcement for field:", fieldId, data);
        setAnnouncement(data.message);
        setShowAnnouncement(true);

        // Use the provided duration or default to 10 seconds
        const displayDuration = data.duration || 10000;

        // Auto-hide announcement after duration
        const timerId = setTimeout(
          () => setShowAnnouncement(false),
          displayDuration
        );

        // Clear timeout if component unmounts while announcement is showing
        return () => clearTimeout(timerId);
      } else {
        console.log("❌ Ignoring announcement for different field. Current:", fieldId, "Announcement:", data.fieldId);
      }
    });
    return () => {
      unsubDisplayMode();
      unsubMatchUpdate();
      unsubTimer();
      unsubMatchState();
      unsubRealtimeScore();
      unsubAnnouncement();
    };
  }, [
    subscribe,
    fieldId,
    tournamentId,
    // Remove frequently changing dependencies that don't need to trigger re-subscription:
    // - displaySettings.displayMode (handled within callback)
    // - matchState?.matchId (handled within callback)
    // - wsConnected (not needed for subscription setup)
    // - lastUpdateTime (not needed for subscription setup)
  ]);

  // Robust timer countdown effect: always use latest timer state from server, prevent drift
  useEffect(() => {
    if (
      !timer?.isRunning ||
      typeof timer.remaining !== "number" ||
      timer.remaining <= 0
    )
      return;
    const interval = setInterval(() => {
      setTimer((prev: any) => {
        // Only decrement if still running and remaining > 0
        if (!prev?.isRunning || prev.remaining <= 0) return prev;
        // Decrement by 1000ms, but never go below 0
        return { ...prev, remaining: Math.max(0, prev.remaining - 1000) };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timer?.isRunning, timer?.remaining]);

  // Effect to automatically update match period based on timer
  useEffect(() => {
    // Only update period if the timer is actively running
    if (timer && typeof timer.remaining === "number" && timer.isRunning) {
      const remainingSeconds = Math.floor(timer.remaining / 1000);
      let newPeriod = "";

      // Timer counts down from 150 seconds (2:30)
      // Auto: 2:30 (150s) down to 2:01 (121s)
      // Teleop: 2:00 (120s) down to 0:31 (31s)
      // Endgame: 0:30 (30s) down to 0:00 (0s)
      if (remainingSeconds > 120) {
        newPeriod = "auto";
      } else if (remainingSeconds > 30) {
        newPeriod = "teleop";
      } else if (remainingSeconds >= 0) {
        newPeriod = "endgame";
      } else {
        // Timer has gone below 0 or is in an unexpected state; do not attempt to set a period.
        return;
      }

      // Only update state if the calculated period is different from the current one.
      if (newPeriod && newPeriod !== matchState.currentPeriod) {
        console.log(
          `Timer-based period change: ${matchState.currentPeriod} -> ${newPeriod} (Remaining: ${remainingSeconds}s)`
        );
        setMatchState((prevMatchState: any) => ({
          ...prevMatchState,
          currentPeriod: newPeriod,
        }));
      }
    }
  }, [timer, matchState.currentPeriod]); // Dependency array includes timer and currentPeriod

  // Effect to handle announcement countdown
  useEffect(() => {
    if (!showAnnouncement) {
      setAnnouncementCountdown(null);
      return;
    }

    // Start with 10 seconds by default if countdown is not already set
    if (announcementCountdown === null) {
      setAnnouncementCountdown(10);
    }

    // Update countdown every second
    const intervalId = setInterval(() => {
      setAnnouncementCountdown((prev) => {
        if (prev === null || prev <= 1) {
          // Auto-hide announcement when countdown reaches 0
          if (prev === 1) setTimeout(() => setShowAnnouncement(false), 100);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [showAnnouncement, announcementCountdown]);

  // Debug component to show current display mode and other info
  const DebugInfo = () => {
    if (process.env.NODE_ENV !== "development") return null;    return (
      <div className="text-xs bg-white border border-gray-200 text-gray-700 p-4 rounded-xl mt-4 shadow-sm">
        <div className="font-semibold border-b border-gray-200 pb-2 mb-2 text-gray-900">
          Debug Information
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            Mode:{" "}
            <span className="font-mono bg-blue-50 text-blue-800 px-2 py-1 rounded border border-blue-200">
              {displaySettings.displayMode}
            </span>
          </div>
          <div>
            Field: <span className="font-mono bg-gray-50 px-1 rounded">{fieldId}</span>
          </div>
          <div>
            Tournament:{" "}
            <span className="font-mono bg-gray-50 px-1 rounded">{tournamentId.substring(0, 8)}...</span>
          </div>
          <div>
            Connection:{" "}
            {isConnected ? (
              <span className="text-green-800 bg-green-50 px-2 py-1 rounded border border-green-200">✓ Connected</span>
            ) : (
              <span className="text-red-800 bg-red-50 px-2 py-1 rounded border border-red-200">✗ Disconnected</span>
            )}
          </div>          <div>
            Last Update:{" "}
            <span className="font-mono bg-gray-50 px-1 rounded">
              {new Date(displaySettings.updatedAt).toLocaleTimeString()}
            </span>
          </div>
          <div>
            Match State:{" "}
            <span className="font-mono bg-gray-50 px-1 rounded">{matchState?.status || "none"}</span>
          </div>
          <div>
            Timer:{" "}
            <span className="font-mono bg-gray-50 px-1 rounded">
              {timer?.isRunning ? "running" : "stopped"}
            </span>
          </div>
          <div>
            Match ID:{" "}
            <span className="font-mono bg-gray-50 px-1 rounded">{matchState?.matchId || "none"}</span>
          </div>
        </div>
        <div className="mt-3 text-xs border-t border-gray-200 pt-2">
          <div className="text-gray-900 font-medium">Match Data: {matchState ? "Present" : "Missing"}</div>
          {matchState && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                Number:{" "}
                <span className="font-mono bg-gray-50 px-1 rounded">
                  {matchState.matchNumber || "none"}
                </span>
              </div>
              <div>
                Name:{" "}
                <span className="font-mono bg-gray-50 px-1 rounded">{matchState.name || "none"}</span>
              </div>
              <div>
                Period:{" "}
                <span className="font-mono bg-gray-50 px-1 rounded">
                  {matchState.currentPeriod || "none"}
                </span>
              </div>
              <div>
                Red Teams:{" "}
                <span className="font-mono bg-gray-50 px-1 rounded">
                  {Array.isArray(matchState.redTeams)
                    ? matchState.redTeams.length
                    : "none"}
                </span>
              </div>
              <div>
                Blue Teams:{" "}
                <span className="font-mono bg-gray-50 px-1 rounded">
                  {Array.isArray(matchState.blueTeams)
                    ? matchState.blueTeams.length
                    : "none"}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="text-right mt-2 pt-2 border-t border-gray-200">
          <span className="text-blue-800 bg-blue-50 px-2 py-1 rounded border border-blue-200">
            Test with window.audienceDisplayWS
          </span>
        </div>
      </div>
    );
  };

  // Log match state changes for debugging
  useEffect(() => {
    if (matchState) {
      console.log("Match state updated:", {
        matchId: matchState.matchId,
        matchNumber: matchState.matchNumber,
        status: matchState.status,
        currentPeriod: matchState.currentPeriod,
        redTeams: Array.isArray(matchState.redTeams)
          ? matchState.redTeams.length
          : 0,
        blueTeams: Array.isArray(matchState.blueTeams)
          ? matchState.blueTeams.length
          : 0,
      });
    }
  }, [matchState]);

  // Reset timer state when match changes to ensure timer updates correctly for new match
  useEffect(() => {
    // When matchId changes, reset timer to null (or a default value)
    setTimer(null);
  }, [matchState.matchId]);

  // Render content based on display mode
  const renderContent = () => {
    // Force a key update every time display mode changes to ensure full re-render
    const contentKey = `${displaySettings.displayMode}-${displaySettings.updatedAt}`;
    console.log(
      `Rendering content for display mode: ${displaySettings.displayMode} with key: ${contentKey}`
    );

    switch (displaySettings.displayMode) {
      case "teams":
        return (
          <div key={contentKey}>
            <TeamsDisplay teams={teams} isLoading={isLoadingTeams} />
            <DebugInfo />
          </div>
        );

      case "schedule":
        // Ensure scheduledTime is always a string for each match
        const safeMatches = matches.map((m: any) => ({
          ...m,
          scheduledTime: m.scheduledTime ?? "",
        }));
        return (
          <div key={contentKey}>
            <ScheduleDisplay
              tournamentId={tournamentId}
              matches={safeMatches}
              isLoading={isLoadingMatches}
            />
            <DebugInfo />
          </div>
        );

      case "rankings":
        return (
          <div key={contentKey} className="p-0 md:p-4">
            <SwissRankingsDisplay
              rankings={Array.isArray(rankings) ? rankings : []}
              isLoading={isLoadingRankings}
            />
            <DebugInfo />
          </div>
        );

      case "blank":
        return (
          <div key={contentKey} className="min-h-screen">
            <DebugInfo />
          </div>
        );      case "announcement":
        return (
          <div
            key={contentKey}
            className="flex flex-col items-center justify-center min-h-[70vh]"
          >
            <div className="bg-blue-50 border border-blue-200 p-10 rounded-xl max-w-4xl text-center shadow-lg">
              <h2 className="text-4xl font-bold mb-6 text-blue-800">
                ANNOUNCEMENT
              </h2>
              <p className="text-3xl text-gray-900">
                {displaySettings.message || "No announcement message"}
              </p>
            </div>
            <DebugInfo />
          </div>
        );
      case "match":
      default:        // Use real-time scores if available and recent, otherwise fall back to legacy scores
        const displayScore =
          wsConnected && lastUpdateTime
            ? {
                redTotalScore: realtimeScores.red.total,
                blueTotalScore: realtimeScores.blue.total,
                redAutoScore: realtimeScores.red.auto,
                redDriveScore: realtimeScores.red.drive,
                blueAutoScore: realtimeScores.blue.auto,
                blueDriveScore: realtimeScores.blue.drive,
                redPenalty: realtimeScores.red.penalty || 0,
                bluePenalty: realtimeScores.blue.penalty || 0,
              }
            : score;
        console.log("Displaying scores:", {
          wsConnected,
          lastUpdateTime,
          source,
          fallbackMode,
          realtimeScores,
          legacyScore: score,
          displayScore,
          newWebSocketConnected: webSocketService.isConnected(),
          currentMatchId,
        });

        // Display match information with prioritized real-time scores
        return (
          <div key={contentKey}>
            <MatchDisplay
              matchState={matchState}
              timer={timer}
              score={displayScore}
            />
            <DebugInfo />
          </div>
        );
    }
  };

  // Loading and error states
  if (isLoadingTournament || isLoadingFields) {
    return <LoadingDisplay connectionError={connectionError} />;
  }

  // Field not found error state
  if (fieldError) {
    return (
      <FieldNotFound
        fieldError={fieldError}
        onBack={() => router.push(`/audience-display/${tournamentId}`)}
      />
    );
  }

  // --- UI Layout ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Enhanced Connection Status with Fallback Support (Steps 10-12) */}
      <ConnectionStatus
        isConnected={isConnected}
        wsConnected={wsConnected}
        lastUpdateTime={lastUpdateTime}
        connectionError={connectionError}
        fallbackMode={fallbackMode}
        source={source}
      />
      <AnnouncementOverlay
        announcement={announcement}
        showAnnouncement={showAnnouncement}
        announcementCountdown={announcementCountdown}
      />
      {/* Header with tournament and field info */}
      <header className="mb-6 px-6 pt-8">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-blue-900 drop-shadow-lg mb-1">
              {tournament?.name || 'Tournament'}
            </h1>
            <div className="text-lg text-gray-700 font-semibold">
              Field: <span className="text-blue-700 font-bold">{field?.name || fieldId}</span>
            </div>
            <div className="text-sm text-gray-500 font-medium mt-1">
              Dates: <span className="text-gray-900 font-semibold">{tournament ? formatDateRange(tournament.startDate, tournament.endDate) : ''}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {matchState?.matchNumber && (
              <div className="text-2xl font-bold text-green-700 bg-green-100 px-6 py-2 rounded-xl shadow-md border-2 border-green-300">
                Match #{matchState.matchNumber}
              </div>
            )}
            {matchState?.status && (
              <div className={`text-sm font-bold px-4 py-1 rounded-full border-2 shadow-sm mt-1
                ${matchState.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 border-blue-300' : ''}
                ${matchState.status === 'COMPLETED' ? 'bg-green-100 text-green-800 border-green-300' : ''}
                ${matchState.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}
                ${!['IN_PROGRESS','COMPLETED','PENDING'].includes(matchState.status) ? 'bg-gray-100 text-gray-800 border-gray-300' : ''}
              `}>
                {matchState.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
              </div>
            )}
            {timer && (
              <div className="text-4xl font-mono font-extrabold text-blue-700 bg-white px-8 py-2 rounded-xl shadow-lg border-2 border-blue-200 mt-2">
                {timer.remaining !== undefined ? formatTimeMsPad(timer.remaining) : '--:--'}
              </div>
            )}
            {matchState?.currentPeriod && (
              <div className="text-lg font-bold uppercase text-indigo-800 bg-indigo-100 px-4 py-1 rounded-full border border-indigo-200 mt-2 tracking-widest">
                {matchState.currentPeriod}
              </div>
            )}
          </div>
        </div>
      </header>
      {/* Main content area */}
      <main className="container mx-auto bg-white border-2 border-gray-200 rounded-2xl shadow-2xl p-10 mt-2 mb-8">
        {connectionError ? (
          <div className="text-center text-red-800 bg-red-50 border border-red-200 rounded-xl p-8 font-semibold text-lg">
            {connectionError}
          </div>
        ) : fieldError ? (
          <FieldNotFound fieldError={fieldError} onBack={() => router.push(`/audience-display/${tournamentId}`)} />
        ) : (
          renderContent()
        )}
      </main>
      {/* Footer */}{" "}      <footer className="container mx-auto mt-8 text-center text-sm text-gray-600 pb-6">
        <p>
          © Robotics Tournament Management System
        </p>
      </footer>
    </div>
  );
}
