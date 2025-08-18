"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTournament } from "@/hooks/tournaments/use-tournaments";
import { useTournamentFields } from "@/components/features/fields/FieldSelectDropdown";
import { useWebSocket } from "@/websockets/simplified/useWebSocket";
import { useAudienceTimer } from "@/hooks/audience-display/use-audience-timer";
import { UserRole } from "@/types/types";
import { AudienceDisplaySettings } from "@/types/types";
import TeamsDisplay from "../../../../components/features/audience-display/displays/teams-display";
import ScheduleDisplay, {
  Match,
} from "../../../../components/features/audience-display/displays/schedule-display";
import { useOptimizedTeams } from "@/hooks/audience-display/use-optimized-teams";
import { apiClient } from "@/lib/api-client";
import { useInjectTextShadowStyle } from "../../../../hooks/common/use-inject-text-shadow-style";
import { useAnnouncement } from "../../../../hooks/control-match/use-announcement";
import { AnnouncementOverlay } from "../../../../components/features/audience-display/overlays/announcement-overlay";
import { FieldNotFound } from "../../../../components/features/audience-display/states/field-not-found";
import { LoadingDisplay } from "../../../../components/features/audience-display/states/loading-display";
import { ConnectionStatus } from "../../../../components/features/audience-display/states/connection-status";
import { MatchDisplay } from "../../../../components/features/audience-display/displays/match-display";
import { useMatchesByTournament } from "@/hooks/matches/use-matches-by-tournament";
import { SwissRankingsDisplay } from "../../../../components/features/audience-display/displays/swiss-rankings-display";
import { formatDateRange, formatTimeMsPad } from "@/lib/utils";
import "@/styles/audience-display.css";

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
  const field = fields.find((f) => f.id === fieldId);

  // State for live data
  const [score, setScore] = useState<any>(null);
  const [matchState, setMatchState] = useState<any>({
    matchId: null,
    matchNumber: null,
    name: null,
    status: null,
    currentPeriod: null,
    redTeams: [],
    blueTeams: [],
  });
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Use the proper audience timer hook for timer functionality
  const {
    timer,
    isConnected: timerConnected,
    showConnectionStatus: showTimerConnectionStatus,
    connectionMessage: timerConnectionMessage,
    formatTime: formatTimerTime,
  } = useAudienceTimer({
    tournamentId,
    fieldId,
  }); // Enhanced real-time scores with fallback support (Steps 10-12)
  const currentMatchId = matchState.matchId || "";

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

  // Fetch teams for the tournament with optimized hook
  const {
    teams,
    isLoading: isLoadingTeams,
    error: teamsError,
    refetch: refetchTeams
  } = useOptimizedTeams({
    tournamentId,
    refetchInterval: 30000, // 30 seconds
    staleTime: 60000, // 1 minute
  });

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

  // New simplified WebSocket connection and state
  const {
    info,
    on,
    off,
    setRoomContext,
    getRoomStatus,
    getStats,
    connect,
    sendDisplayModeChange,
    sendAnnouncement,
    sendMatchUpdate,
    sendScoreUpdate,
    sendTimerUpdate,
  } = useWebSocket({
    autoConnect: true,
    role: UserRole.COMMON,
    tournamentId,
    fieldId,
    instanceId: 'audience-display', // Unique instance for audience display
  });
  const unifiedConnected = info.state === "connected";

  // Add room debugging
  const roomStatus = getRoomStatus();
  console.log("🏠 [Audience-Display] Room status:", {
    rooms: roomStatus.rooms,
    hasTournament: roomStatus.hasTournament,
    hasField: roomStatus.hasField,
    expectedTournament: `tournament:${tournamentId}`,
    expectedField: `field:${fieldId}`,
    tournamentId,
    fieldId,
    timestamp: new Date().toISOString()
  });

  // Unified audience display hook removed; match state will be synced via events and REST fetches as needed

  // Expose WebSocket testing interface on window for manual testing and debugging
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).audienceDisplayWS = {
        // Display settings
        changeDisplayMode: (settings: any) =>
          sendDisplayModeChange({
            ...settings,
            fieldId,
            tournamentId,
          }),
        setToMatchDisplay: () =>
          sendDisplayModeChange({
            displayMode: "match",
            updatedAt: Date.now(),
          }),
        setToTeamsDisplay: () =>
          sendDisplayModeChange({
            displayMode: "teams",
            updatedAt: Date.now(),
          }),
        setToScheduleDisplay: () =>
          sendDisplayModeChange({
            displayMode: "schedule",
            updatedAt: Date.now(),
          }),
        setToBlankDisplay: () =>
          sendDisplayModeChange({
            displayMode: "blank",
            updatedAt: Date.now(),
          }),

        // Match management
        sendMatchUpdate: (data: any) => {
          // Ensure matchId is present, fallback to current match
          const matchId = data?.matchId || data?.id || matchState?.matchId;
          if (!matchId) {
            console.warn('[AudienceDisplay] sendMatchUpdate requires matchId or id field');
            return;
          }
          sendMatchUpdate({
            ...data,
            matchId, // Ensure matchId is always present
            fieldId,
          });
        },
        // Ensure interactive debug sends include a matchId (fallback to current match)
        sendScoreUpdate: (data: any) =>
          sendScoreUpdate({
            ...data,
            fieldId,
            matchId: data?.matchId ?? matchState?.matchId,
          }),

        // Timer controls
        startTimer: (data: any) =>
          sendTimerUpdate({ ...data, action: "start", fieldId }),
        pauseTimer: (data: any) =>
          sendTimerUpdate({ ...data, action: "pause", fieldId }),
        resetTimer: (data: any) =>
          sendTimerUpdate({ ...data, action: "reset", fieldId }),
        // Announcements
        sendAnnouncement: (message: string, duration?: number) =>
          sendAnnouncement({ message, duration }),
        showTestAnnouncement: (message: string, seconds: number = 10) => {
          // Helper for testing announcements with countdown directly
          setAnnouncement(message);
          setShowAnnouncement(true);
          setAnnouncementCountdown(seconds);
          setTimeout(() => setShowAnnouncement(false), seconds * 1000);
        },

        // Room management
        joinFieldRoom: () => setRoomContext({ tournamentId, fieldId }),
        leaveFieldRoom: () => setRoomContext({ tournamentId, fieldId: undefined }),

        // Debugging info
        getFieldId: () => fieldId,
        getTournamentId: () => tournamentId,
        getCurrentDisplayMode: () => displaySettings.displayMode,
        getCurrentDisplaySettings: () => displaySettings,
        getConnectionStats: () => getStats(),
        forceReconnect: () => connect(),
        getRoomStatus: () => getRoomStatus(),
        
        // Simple ping test for WebSocket communication
        sendPong: (originalMessage?: string) => {
          const pongData = {
            message: `Pong! Received: ${originalMessage || 'N/A'}`,
            from: 'audience-display',
            tournamentId,
            fieldId,
            timestamp: Date.now()
          };
          console.log('📡 [Audience-Display] Sending pong:', pongData);
          // Use emit from the WebSocket hook
          sendDisplayModeChange(pongData as any); // Reuse existing sender for simplicity
        },
        // Debug helpers
        bypassRoomFilter: () => { (window as any).BYPASS_ROOM_FILTER = true; console.log('🚨 Room filtering BYPASSED'); },
        enableRoomFilter: () => { (window as any).BYPASS_ROOM_FILTER = false; console.log('✅ Room filtering ENABLED'); },
        debugRoomStatus: () => {
          const status = getRoomStatus();
          console.log('🏠 Current Room Status:', status);
          console.log('🏠 Expected rooms:', [`tournament:${tournamentId}`, `field:${fieldId}`]);
          return status;
        },
        compareRoomContext: () => {
          const myContext = { tournamentId, fieldId };
          const roomStatus = getRoomStatus();
          console.log('🔍 [Audience-Display] Room context comparison:', {
            myContext,
            joinedRooms: roomStatus.rooms,
            expectedRooms: [`tournament:${tournamentId}`, `field:${fieldId}`],
            tournamentRoomMatches: roomStatus.rooms.includes(`tournament:${tournamentId}`),
            fieldRoomMatches: roomStatus.rooms.includes(`field:${fieldId}`),
            hasTournamentRoom: roomStatus.hasTournament,
            hasFieldRoom: roomStatus.hasField,
            timestamp: new Date().toISOString()
          });
          return { myContext, roomStatus };
        },
      };

      console.log(`[AudienceDisplay] WebSocket connected: ${unifiedConnected}`);
      console.log(`[AudienceDisplay] Connection status: ${info.state}`);

      // Log connection attempts
      if (!unifiedConnected) {
        console.log(`[AudienceDisplay] Waiting for WebSocket connection...`);
      } else {
        console.log(`[AudienceDisplay] WebSocket connected successfully!`);
      }
    }
  }, [
    sendDisplayModeChange,
    sendMatchUpdate,
    sendScoreUpdate,
    sendTimerUpdate,
    setRoomContext,
    getStats,
    connect,
    sendAnnouncement,
    fieldId,
    tournamentId,
    unifiedConnected,
    info.state,
  ]);

  // Previous unified audience display sync removed; state now updates via websocket events directly

  // Track connection status and attempts
  const [connectionAttempts, setConnectionAttempts] = useState<number>(0);

  // Update connection error message based on connection status
  useEffect(() => {
    if (!unifiedConnected) {
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
  }, [unifiedConnected, connectionAttempts]);

  // Use refs to access current state values without causing re-renders
  const matchStateRef = useRef(matchState);
  const displaySettingsRef = useRef(displaySettings);

  // Update refs when state changes
  useEffect(() => {
    matchStateRef.current = matchState;
  }, [matchState]);

  useEffect(() => {
    displaySettingsRef.current = displaySettings;
  }, [displaySettings]);

  // Helper to fetch and sync full match details and score
  const fetchAndSyncMatch = useCallback(async (matchId: string) => {
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
  }, []);

  // Stable callback for display mode changes
  const handleDisplayModeChange = useCallback((data: AudienceDisplaySettings) => {
    // Apply if global tournament update (no fieldId) or specific to this field
    if (!data.fieldId || data.fieldId === fieldId) {
      console.log(
        "✅ [Unified WebSocket] Received display mode change:",
        data
      );

      // Ensure we're using the full data object with all required properties
      const updatedSettings = {
        ...data,
        fieldId: data.fieldId || fieldId,
        tournamentId: data.tournamentId || tournamentId,
        updatedAt: data.updatedAt || Date.now(),
      };

      setDisplaySettings(updatedSettings);

      // If changing to match display mode and matchId is provided,
      // fetch and sync all match data immediately
      if (
        updatedSettings.displayMode === "match" &&
        updatedSettings.matchId
      ) {
        fetchAndSyncMatch(updatedSettings.matchId);
      }
    }
  }, [fieldId, tournamentId, fetchAndSyncMatch]);

  // Timer updates are now handled by the useAudienceTimer hook
  // No need for manual timer handling here

  // Stable callback for score updates
  const handleScoreUpdate = useCallback((data: any) => {
    console.log(
      "✅ [Unified WebSocket] Real-time score update received:",
      data,
      "for field:",
      fieldId,
      "current match:",
      matchStateRef.current?.matchId
    );

    // Debug: Log detailed matching information
    console.log("🔍 [Score Update Debug]", {
      receivedMatchId: data.matchId,
      currentMatchId: matchStateRef.current?.matchId,
      receivedFieldId: data.fieldId,
      currentFieldId: fieldId,
      matchesMatch: data.matchId === matchStateRef.current?.matchId,
      matchesField: !data.fieldId || data.fieldId === fieldId,
      willProcess: data.matchId && data.matchId === matchStateRef.current?.matchId
    });

    // Accept real-time score updates if they're for the current match
    if (data.matchId && data.matchId === matchStateRef.current?.matchId) {
      console.log(
        "✅ Applying real-time score update for match:",
        data.matchId
      );

      // Convert real-time score format to display format
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
      if (displaySettingsRef.current.displayMode !== "match") {
        setDisplaySettings({
          ...displaySettingsRef.current,
          displayMode: "match",
          matchId: data.matchId,
          updatedAt: Date.now(),
        });
      }
    } else {
      console.log(
        "❌ Rejecting real-time score update - match ID mismatch or missing:",
        {
          receivedMatchId: data.matchId,
          currentMatchId: matchStateRef.current?.matchId,
          hasMatchId: !!data.matchId,
          hasCurrentMatch: !!matchStateRef.current?.matchId,
          reason: !data.matchId ? "No matchId in data" :
                  !matchStateRef.current?.matchId ? "No current matchId" :
                  "Match ID mismatch"
        }
      );
    }
  }, [fieldId]);

  // Stable callback for announcements
  const handleAnnouncement = useCallback((data: {
    message: string;
    duration?: number;
    fieldId?: string;
    tournamentId: string;
  }) => {
    console.log("🔔 [Unified WebSocket] Announcement received:", data);

    // Show if it's a tournament-wide announcement or specific to this field
    if (!data.fieldId || data.fieldId === fieldId) {
      console.log(
        "✅ [Unified WebSocket] Displaying announcement for field:",
        fieldId,
        data
      );
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
    }
  }, [fieldId]);

  // Handle match updates to sync match state and trigger data fetch
  const handleMatchUpdate = useCallback((data: any) => {
    console.log(
      "✅ [Unified WebSocket] Match update received:",
      data,
      "for field:",
      fieldId,
      "current match:",
      matchStateRef.current?.matchId
    );

    // Apply field-specific filtering
    if (data.fieldId && data.fieldId !== fieldId) {
      console.log(
        "❌ [Match Update] Ignoring update for different field:",
        data.fieldId,
        "(expected:", fieldId, ")"
      );
      return;
    }

    // Update match state with received data
    const updatedMatchState = {
      matchId: data.id || data.matchId || null,
      matchNumber: data.matchNumber || null,
      name: data.name || data.match_name || "",
      status: data.status || "",
      currentPeriod: data.currentPeriod || data.period || "",
      redTeams: data.redTeams || data.red_teams || [],
      blueTeams: data.blueTeams || data.blue_teams || [],
    };

    console.log("🔄 [Match Update] Setting match state:", updatedMatchState);
    setMatchState(updatedMatchState);

    // If we have a valid match ID, fetch full match details and scores
    if (updatedMatchState.matchId) {
      console.log("🔍 [Match Update] Fetching full match details for:", updatedMatchState.matchId);
      fetchAndSyncMatch(updatedMatchState.matchId);
    }

    // Ensure we're in match display mode
    if (displaySettingsRef.current.displayMode !== "match") {
      console.log("📺 [Match Update] Switching to match display mode");
      setDisplaySettings({
        ...displaySettingsRef.current,
        displayMode: "match",
        matchId: updatedMatchState.matchId,
        updatedAt: Date.now(),
      });
    }
  }, [fieldId, fetchAndSyncMatch]);

  // Enhanced debug logging for WebSocket events and room context
  useEffect(() => {
    if (!unifiedConnected) return;

    console.log("🔥 [Audience-Display] WebSocket connection established, setting up debug logging:", {
      connected: unifiedConnected,
      tournamentId,
      fieldId,
      connectionState: info.state,
      expectedRooms: [`tournament:${tournamentId}`, `field:${fieldId}`],
      actualRooms: getRoomStatus().rooms,
      timestamp: new Date().toISOString()
    });

    // Debug: Enhanced room status logging
    const currentRoomStatus = getRoomStatus();
    console.log("🏠 [Audience-Display] Current room membership:", {
      joinedRooms: currentRoomStatus.rooms,
      hasTournament: currentRoomStatus.hasTournament,
      hasField: currentRoomStatus.hasField,
      expectedTournamentRoom: `tournament:${tournamentId}`,
      expectedFieldRoom: `field:${fieldId}`,
      tournamentMatches: currentRoomStatus.rooms.filter(r => r.startsWith('tournament:')),
      fieldMatches: currentRoomStatus.rooms.filter(r => r.startsWith('field:')),
      timestamp: new Date().toISOString()
    });

    return () => {
      console.log("🧹 [Audience-Display] Cleaning up debug logging");
    };
  }, [unifiedConnected, tournamentId, fieldId, info.state, getRoomStatus]);

  // Subscribe to simplified WebSocket events for audience display
  useEffect(() => {
    if (!unifiedConnected) return;

    console.log(
      "🔔 [WebSocket] Setting up audience display subscriptions for:",
      { tournamentId, fieldId, connected: unifiedConnected }
    );

    // Subscribe to display mode changes
    const displayModeHandler = (d: AudienceDisplaySettings) => {
      console.log("📺 [WebSocket] Display mode change received:", {
        event: 'display_mode_change',
        data: d,
        myContext: { tournamentId, fieldId },
        eventContext: { tournamentId: d?.tournamentId, fieldId: d?.fieldId },
        timestamp: new Date().toISOString()
      });
      handleDisplayModeChange(d);
    };
    on("display_mode_change" as any, displayModeHandler as any);

    // Subscribe to match updates (CRITICAL - was missing!)
    const matchUpdateHandler = (d: any) => {
      console.log("🎯 [WebSocket] Match update received - DETAILED ANALYSIS:", {
        event: 'match_update',
        rawData: d,
        myContext: {
          tournamentId,
          fieldId,
          instanceId: 'audience-display',
          expectedRooms: [`tournament:${tournamentId}`, `field:${fieldId}`]
        },
        eventContext: {
          eventTournamentId: d?.tournamentId,
          eventFieldId: d?.fieldId,
          eventMatchId: d?.matchId || d?.id,
          eventMatchNumber: d?.matchNumber
        },
        roomStatus: getRoomStatus(),
        matchesTournament: d?.tournamentId === tournamentId || d?.tournamentId === 'all',
        matchesField: !d?.fieldId || d?.fieldId === fieldId,
        shouldProcess: (d?.tournamentId === tournamentId || d?.tournamentId === 'all') && (!d?.fieldId || d?.fieldId === fieldId),
        timestamp: new Date().toISOString()
      });
      handleMatchUpdate(d);
    };
    on("match_update" as any, matchUpdateHandler as any);

    // Timer updates are handled by useAudienceTimer hook

    // Subscribe to real-time score updates
    const scoreHandler = (d: any) => {
      console.log("🎯 [WebSocket] Score update received - DETAILED ANALYSIS:", {
        event: 'score_update',
        rawData: d,
        myContext: { tournamentId, fieldId, currentMatchId: matchStateRef.current?.matchId },
        eventContext: { eventMatchId: d?.matchId, eventFieldId: d?.fieldId },
        matchesCurrentMatch: d?.matchId === matchStateRef.current?.matchId,
        matchesField: !d?.fieldId || d?.fieldId === fieldId,
        willProcess: d?.matchId && d?.matchId === matchStateRef.current?.matchId,
        timestamp: new Date().toISOString()
      });
      handleScoreUpdate(d);
    };
    on("score_update" as any, scoreHandler as any);

    // Subscribe to announcements
    const announcementHandler = (d: { message: string; duration?: number; fieldId?: string; tournamentId: string; }) => {
      console.log("📢 [WebSocket] Announcement received - DETAILED ANALYSIS:", {
        event: 'announcement',
        rawData: d,
        myContext: { tournamentId, fieldId },
        eventContext: { eventFieldId: d?.fieldId, eventTournamentId: d?.tournamentId },
        matchesField: !d?.fieldId || d?.fieldId === fieldId,
        willProcess: !d?.fieldId || d?.fieldId === fieldId,
        timestamp: new Date().toISOString()
      });
      handleAnnouncement(d);
    };
    on("announcement" as any, announcementHandler as any);

    // Subscribe to test ping events for debugging communication
    const pingHandler = (d: any) => {
      console.log("🏓 [WebSocket] Test ping received - DETAILED ANALYSIS:", {
        event: 'test_ping',
        rawData: d,
        myContext: { tournamentId, fieldId },
        eventContext: { from: d?.from, eventTournamentId: d?.tournamentId, eventFieldId: d?.fieldId },
        matchesTournament: d?.tournamentId === tournamentId || d?.tournamentId === 'all',
        matchesField: !d?.fieldId || d?.fieldId === fieldId,
        willRespond: (d?.tournamentId === tournamentId || d?.tournamentId === 'all') && (!d?.fieldId || d?.fieldId === fieldId),
        timestamp: new Date().toISOString()
      });
      
      // Respond to control-match pings for basic communication testing
      if (d?.from === 'control-match' && ((d?.tournamentId === tournamentId || d?.tournamentId === 'all') && (!d?.fieldId || d?.fieldId === fieldId))) {
        console.log('✅ [WebSocket] Responding to ping from control-match');
        // Respond with pong using the debug interface
        if ((window as any).audienceDisplayWS) {
          (window as any).audienceDisplayWS.sendPong(d.message);
        }
      }
    };
    on("test_ping" as any, pingHandler as any);

    console.log(
      "✅ [WebSocket] All event subscriptions established:",
      ["display_mode_change", "match_update", "score_update", "announcement"]
    );
    console.log(
      "🏠 [WebSocket] Audience display room context:",
      { tournamentId, fieldId, expectedRooms: [`tournament:${tournamentId}`, `field:${fieldId}`] }
    );

    return () => {
      console.log(
        "🧹 [WebSocket] Cleaning up audience display subscriptions"
      );
      off("display_mode_change" as any, displayModeHandler as any);
      off("match_update" as any, matchUpdateHandler as any);
      off("score_update" as any, scoreHandler as any);
      off("announcement" as any, announcementHandler as any);
    };
  }, [unifiedConnected, on, off, handleDisplayModeChange, handleMatchUpdate, handleScoreUpdate, handleAnnouncement, tournamentId, fieldId]);

  // Timer countdown is now handled by the useAudienceTimer hook

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
    if (process.env.NODE_ENV !== "development") return null;
    return (
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
            Field:{" "}
            <span className="font-mono bg-gray-50 px-1 rounded">{fieldId}</span>
          </div>
          <div>
            Tournament:{" "}
            <span className="font-mono bg-gray-50 px-1 rounded">
              {tournamentId.substring(0, 8)}...
            </span>
          </div>
          <div>
            Connection:{" "}
            {unifiedConnected ? (
              <span className="text-green-800 bg-green-50 px-2 py-1 rounded border border-green-200">
                ✓ Connected
              </span>
            ) : (
              <span className="text-red-800 bg-red-50 px-2 py-1 rounded border border-red-200">
                ✗ Disconnected
              </span>
            )}
          </div>{" "}
          <div>
            Last Update:{" "}
            <span className="font-mono bg-gray-50 px-1 rounded">
              {new Date(displaySettings.updatedAt).toLocaleTimeString()}
            </span>
          </div>
          <div>
            Match State:{" "}
            <span className="font-mono bg-gray-50 px-1 rounded">
              {matchState?.status || "none"}
            </span>
          </div>
          <div>
            Timer:{" "}
            <span className="font-mono bg-gray-50 px-1 rounded">
              {timer?.isRunning ? "running" : "stopped"}
            </span>
          </div>
          <div>
            Match ID:{" "}
            <span className="font-mono bg-gray-50 px-1 rounded">
              {matchState?.matchId || "none"}
            </span>
          </div>
        </div>
        <div className="mt-3 text-xs border-t border-gray-200 pt-2">
          <div className="text-gray-900 font-medium">
            Match Data: {matchState ? "Present" : "Missing"}
          </div>
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
                <span className="font-mono bg-gray-50 px-1 rounded">
                  {matchState.name || "none"}
                </span>
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

  // Timer state is managed by the useAudienceTimer hook

  // Convert TimerData to TimerState for MatchDisplay component
  const timerState = timer ? {
    isRunning: timer.isRunning,
    remaining: timer.remaining,
    initial: timer.duration,
    phase: matchState.currentPeriod,
  } : {
    isRunning: false,
    remaining: 0,
    initial: 150000, // Default 2:30
    phase: matchState.currentPeriod,
  };

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
            <TeamsDisplay
              teams={teams}
              isLoading={isLoadingTeams}
              error={teamsError}
              onRetry={refetchTeams}
            />
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
        );
      case "announcement":
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
      default:
        const displayScore = score;
        console.log("Displaying scores:", {
          unifiedConnected,
          legacyScore: score,
          displayScore,
          currentMatchId,
        });

        // Display match information
        return (
          <div key={contentKey}>
            <MatchDisplay
              matchState={matchState}
              timer={timerState}
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
    <div className="audience-display-container min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Enhanced Connection Status with Fallback Support (Steps 10-12) */}
      <ConnectionStatus
        isConnected={unifiedConnected}
        wsConnected={unifiedConnected}
        lastUpdateTime={displaySettings.updatedAt}
        connectionError={connectionError}
        fallbackMode={false}
        source={unifiedConnected ? 'websocket' : 'none'}
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
              {tournament?.name || "Tournament"}
            </h1>
            <div className="text-lg text-gray-700 font-semibold">
              Field:{" "}
              <span className="text-blue-700 font-bold">
                {field?.name || fieldId}
              </span>
            </div>
            <div className="text-sm text-gray-500 font-medium mt-1">
              Dates:{" "}
              <span className="text-gray-900 font-semibold">
                {tournament
                  ? formatDateRange(tournament.startDate, tournament.endDate)
                  : ""}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {matchState?.matchNumber && (
              <div className="text-2xl font-bold text-green-700 bg-green-100 px-6 py-2 rounded-xl shadow-md border-2 border-green-300">
                Match #{matchState.matchNumber}
              </div>
            )}
            {matchState?.status && (
              <div
                className={`text-sm font-bold px-4 py-1 rounded-full border-2 shadow-sm mt-1
                ${
                  matchState.status === "IN_PROGRESS"
                    ? "bg-blue-100 text-blue-800 border-blue-300"
                    : ""
                }
                ${
                  matchState.status === "COMPLETED"
                    ? "bg-green-100 text-green-800 border-green-300"
                    : ""
                }
                ${
                  matchState.status === "PENDING"
                    ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                    : ""
                }
                ${
                  !["IN_PROGRESS", "COMPLETED", "PENDING"].includes(
                    matchState.status
                  )
                    ? "bg-gray-100 text-gray-800 border-gray-300"
                    : ""
                }
              `}
              >
                {matchState.status
                  .replace("_", " ")
                  .toLowerCase()
                  .replace(/\b\w/g, (c: string) => c.toUpperCase())}
              </div>
            )}
            {timer && (
              <div className="text-4xl font-mono font-extrabold text-blue-700 bg-white px-8 py-2 rounded-xl shadow-lg border-2 border-blue-200 mt-2">
                {timer.remaining !== undefined
                  ? formatTimeMsPad(timer.remaining)
                  : "--:--"}
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
          <FieldNotFound
            fieldError={fieldError}
            onBack={() => router.push(`/audience-display/${tournamentId}`)}
          />
        ) : (
          renderContent()
        )}
      </main>
      {/* Footer */}{" "}
      <footer className="container mx-auto mt-8 text-center text-sm text-gray-600 pb-6">
        <p>© Robotics Tournament Management System</p>
      </footer>
    </div>
  );
}
