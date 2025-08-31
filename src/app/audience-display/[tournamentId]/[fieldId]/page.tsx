"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTournament } from "@/hooks/tournaments/use-tournaments";
import { useTournamentFields } from "@/components/features/fields/FieldSelectDropdown";
import { useUnifiedWebSocket } from "@/hooks/websocket/use-unified-websocket";
import { useUnifiedAudienceDisplay } from "@/hooks/audience-display/use-unified-audience-display";
import { useRealtimeScores } from "@/hooks/websocket/use-realtime-scores";
import { UserRole } from "@/types/types";
import { AudienceDisplaySettings } from "@/types/types";
import TeamsDisplay from "../../../../components/features/audience-display/displays/teams-display";
import ScheduleDisplay, {
  Match,
} from "../../../../components/features/audience-display/displays/schedule-display";
import { usePublicTeams } from "@/hooks/teams/use-public-teams";
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
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Enhanced timer state for drift correction and smooth updates
  const [timerState, setTimerState] = useState<{
    duration: number;
    remaining: number;
    isRunning: boolean;
    serverTimestamp: number | null;
    lastSyncTime: number | null;
    localStartTime: number | null;
  }>({
    duration: 0,
    remaining: 0,
    isRunning: false,
    serverTimestamp: null,
    lastSyncTime: null,
    localStartTime: null,
  }); // Enhanced real-time scores with fallback support (Steps 10-12)
  const currentMatchId = matchState.matchId || "";
  console.log("useRealtimeScores called with matchId:", currentMatchId);

  const {
    realtimeScores,
    lastUpdateTime,
    isConnected: realtimeConnected,
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
  } = useAnnouncement({ disableAutoCountdown: true }); // Disable auto countdown to prevent conflicts

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

  // Fetch teams for the tournament (public access)
  const { data: teams = [], isLoading: isLoadingTeams } =
    usePublicTeams(tournamentId);

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

  // Unified WebSocket connection and state
  const {
    isConnected: unifiedConnected,
    subscribe: unifiedSubscribe,
    connectionStatus,
    joinTournament,
    joinFieldRoom,
    leaveFieldRoom,
    changeDisplayMode,
    sendAnnouncement,
    sendMatchUpdate,
    sendMatchStateChange,
    sendScoreUpdate,
    startTimer,
    pauseTimer,
    resetTimer,
  } = useUnifiedWebSocket({
    tournamentId,
    fieldId,
    autoConnect: true,
    userRole: UserRole.COMMON, // Audience display is read-only
  });

  // Unified audience display hook for match handling
  const {
    matchState: unifiedMatchState,
    displaySettings: unifiedDisplaySettings,
  } = useUnifiedAudienceDisplay({
    tournamentId,
    fieldId,
    autoConnect: false, // Disable auto-connect to avoid race condition with useUnifiedWebSocket
  });

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
            updatedAt: Date.now(),
          }),
        setToTeamsDisplay: () =>
          changeDisplayMode({
            displayMode: "teams",
            updatedAt: Date.now(),
          }),
        setToScheduleDisplay: () =>
          changeDisplayMode({
            displayMode: "schedule",
            updatedAt: Date.now(),
          }),
        setToBlankDisplay: () =>
          changeDisplayMode({
            displayMode: "blank",
            updatedAt: Date.now(),
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
        sendAnnouncement: (announcementData: any) =>
          sendAnnouncement(announcementData),
        showTestAnnouncement: (message: string, seconds: number = 10, type: string = 'text', title?: string) => {
          // Helper for testing announcements with countdown directly
          const announcementData = {
            type: type as any,
            content: message,
            title: title,
            duration: seconds
          };
          console.log('🧪 [Test] Creating test announcement:', announcementData);
          setAnnouncement(announcementData);
          setShowAnnouncement(true);
          setAnnouncementCountdown(seconds); // Use the actual seconds parameter
          
          // Auto-hide and switch to blank after duration
          setTimeout(() => {
            setShowAnnouncement(false);
            setDisplaySettings(prev => ({
              ...prev,
              displayMode: "blank",
              updatedAt: Date.now()
            }));
          }, seconds * 1000);
        },
        
        // Enhanced multimedia testing functions
        testImageAnnouncement: (imageUrl?: string, title?: string, duration: number = 15) => {
          const testUrl = imageUrl || 'https://picsum.photos/800/600?random=1';
          const announcementData = {
            type: 'image' as const,
            content: testUrl,
            title: title || 'Test Image',
            duration: duration
          };
          console.log('🖼️ [Test] Testing image announcement:', announcementData);
          setAnnouncement(announcementData);
          setShowAnnouncement(true);
          setAnnouncementCountdown(duration);
          setTimeout(() => {
            setShowAnnouncement(false);
            setDisplaySettings(prev => ({ ...prev, displayMode: "blank", updatedAt: Date.now() }));
          }, duration * 1000);
        },
        
        testVideoAnnouncement: (videoUrl?: string, title?: string, duration: number = 30) => {
          const testUrl = videoUrl || 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4';
          const announcementData = {
            type: 'video' as const,
            content: testUrl,
            title: title || 'Test Video',
            duration: duration
          };
          console.log('🎥 [Test] Testing video announcement:', announcementData);
          setAnnouncement(announcementData);
          setShowAnnouncement(true);
          setAnnouncementCountdown(duration);
          setTimeout(() => {
            setShowAnnouncement(false);
            setDisplaySettings(prev => ({ ...prev, displayMode: "blank", updatedAt: Date.now() }));
          }, duration * 1000);
        },
        
        testYouTubeAnnouncement: (youtubeUrl?: string, title?: string, duration: number = 60) => {
          const testUrl = youtubeUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
          const announcementData = {
            type: 'youtube' as const,
            content: testUrl,
            title: title || 'Test YouTube Video',
            duration: duration
          };
          console.log('🎥 [Test] Testing YouTube announcement:', announcementData);
          setAnnouncement(announcementData);
          setShowAnnouncement(true);
          setAnnouncementCountdown(duration);
          setTimeout(() => {
            setShowAnnouncement(false);
            setDisplaySettings(prev => ({ ...prev, displayMode: "blank", updatedAt: Date.now() }));
          }, duration * 1000);
        },
        
        testTextAnnouncement: (message?: string, title?: string, duration: number = 10) => {
          const testMessage = message || 'This is a test text announcement with multimedia support!';
          const announcementData = {
            type: 'text' as const,
            content: testMessage,
            title: title || 'Test Announcement',
            duration: duration
          };
          console.log('📝 [Test] Testing text announcement:', announcementData);
          setAnnouncement(announcementData);
          setShowAnnouncement(true);
          setAnnouncementCountdown(duration);
          setTimeout(() => {
            setShowAnnouncement(false);
            setDisplaySettings(prev => ({ ...prev, displayMode: "blank", updatedAt: Date.now() }));
          }, duration * 1000);
        },
        
        // Quick test suite
        runTestSuite: () => {
          console.log('🧪 [Test Suite] Starting multimedia announcement test suite...');
          
          // Test text first
          setTimeout(() => {
            (window as any).audienceDisplayWS.testTextAnnouncement('Testing text announcements...', 'Text Test', 3);
          }, 500);
          
          // Test image
          setTimeout(() => {
            (window as any).audienceDisplayWS.testImageAnnouncement('https://picsum.photos/800/600', 'Image Test', 3);
          }, 4000);
          
          // Test video
          setTimeout(() => {
            (window as any).audienceDisplayWS.testVideoAnnouncement('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'Video Test', 5);
          }, 8000);
          
          // Test YouTube
          setTimeout(() => {
            (window as any).audienceDisplayWS.testYouTubeAnnouncement('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'YouTube Test', 5);
          }, 14000);
          
          console.log('🧪 [Test Suite] Test suite scheduled. Watch for announcements!');
        },
        
        // Debug current announcement state
        getAnnouncementState: () => {
          return {
            announcement,
            showAnnouncement,
            announcementCountdown,
            isAnnouncementValid: !!(announcement && announcement.content),
            overlayWillRender: !!(showAnnouncement && announcement?.content)
          };
        },

        // Room management
        joinFieldRoom: () => joinFieldRoom(fieldId),
        leaveFieldRoom: () => leaveFieldRoom(fieldId),

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
    joinFieldRoom,
    leaveFieldRoom,
    fieldId,
    tournamentId,
  ]);

  // ESC key functionality to manually close announcements
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showAnnouncement) {
        console.log('🔑 [ESC] Manually closing announcement');
        setShowAnnouncement(false);
        setAnnouncementCountdown(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAnnouncement, setShowAnnouncement, setAnnouncementCountdown]);
  // Log the rooms being joined for debugging
  useEffect(() => {
    if (tournamentId && fieldId) {
      console.log(
        `[AudienceDisplay] Initialized for tournament: ${tournamentId}, field: ${fieldId}`
      );
      console.log(`[AudienceDisplay] WebSocket connected: ${unifiedConnected}`);
      console.log(`[AudienceDisplay] Connection status: ${connectionStatus}`);
      
      // Log connection attempts
      if (!unifiedConnected) {
        console.log(`[AudienceDisplay] Waiting for WebSocket connection...`);
      } else {
        console.log(`[AudienceDisplay] WebSocket connected successfully!`);
      }
    }
  }, [tournamentId, fieldId, unifiedConnected, connectionStatus]);
  // Note: WebSocket connection and room joining is now handled by useUnifiedWebSocket hook
  // No need for manual connection and room management here

  // Sync local state with reactive data from the unified audience display hook
  useEffect(() => {
    console.log('📺 [AudienceDisplay] Syncing unified match state:', unifiedMatchState);
    console.log('📺 [AudienceDisplay] Unified match state teams - Red:', unifiedMatchState?.redTeams?.length || 0, 'Blue:', unifiedMatchState?.blueTeams?.length || 0);
    
    if (unifiedMatchState?.matchId) {
      const isNewMatch = unifiedMatchState.matchId !== matchState.matchId;
      console.log('📺 [AudienceDisplay] Is new match?:', isNewMatch, 'Current:', matchState.matchId, 'New:', unifiedMatchState.matchId);
      
      // Check if we have complete team data
      const hasRedTeams = unifiedMatchState.redTeams && unifiedMatchState.redTeams.length > 0;
      const hasBlueTeams = unifiedMatchState.blueTeams && unifiedMatchState.blueTeams.length > 0;
      
      console.log('📺 [AudienceDisplay] Team data check - hasRedTeams:', hasRedTeams, 'hasBlueTeams:', hasBlueTeams);
      
      // For new matches, reset team data and update with new data if available
      // For same match, preserve existing team data when new data is not provided
      if (isNewMatch) {
        console.log('📺 [AudienceDisplay] NEW MATCH - Resetting and updating state');
        setMatchState({
          matchId: unifiedMatchState.matchId,
          matchNumber: unifiedMatchState.matchNumber,
          status: unifiedMatchState.status,
          name: unifiedMatchState.name,
          currentPeriod: unifiedMatchState.currentPeriod,
          redTeams: hasRedTeams ? unifiedMatchState.redTeams : [],
          blueTeams: hasBlueTeams ? unifiedMatchState.blueTeams : []
        });
        
        // For new matches, if team data is missing, fetch immediately
        if (!hasRedTeams || !hasBlueTeams) {
          console.log('📺 [AudienceDisplay] NEW MATCH with missing team data, fetching complete match details for:', unifiedMatchState.matchId);
          fetchAndSyncMatch(unifiedMatchState.matchId);
        }
      } else {
        console.log('📺 [AudienceDisplay] SAME MATCH - Preserving existing data where appropriate');
        setMatchState((prev: any) => ({
          ...prev,
          matchId: unifiedMatchState.matchId,
          matchNumber: unifiedMatchState.matchNumber || prev.matchNumber,
          status: unifiedMatchState.status || prev.status,
          name: unifiedMatchState.name || prev.name,
          currentPeriod: unifiedMatchState.currentPeriod || prev.currentPeriod,
          // Only update teams if we have new valid data, otherwise preserve existing
          redTeams: hasRedTeams ? unifiedMatchState.redTeams : prev.redTeams,
          blueTeams: hasBlueTeams ? unifiedMatchState.blueTeams : prev.blueTeams
        }));
        
        // For same match, only fetch if we still don't have team data
        if ((!hasRedTeams && (!matchState.redTeams || matchState.redTeams.length === 0)) ||
            (!hasBlueTeams && (!matchState.blueTeams || matchState.blueTeams.length === 0))) {
          console.log('📺 [AudienceDisplay] SAME MATCH still missing team data, fetching complete match details for:', unifiedMatchState.matchId);
          fetchAndSyncMatch(unifiedMatchState.matchId);
        }
      }
    }
    
    // Use the display settings from the hook directly
    setDisplaySettings(unifiedDisplaySettings);
  }, [unifiedMatchState, unifiedDisplaySettings]);

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

  // Helper to fetch and sync full match details and score
  async function fetchAndSyncMatch(matchId: string) {
    try {
      console.log('🤼 [API Fallback] Fetching match details for:', matchId);
      
      // Fetch match metadata (teams, period, status, etc.)
      const matchDetails = await apiClient.get<any>(`/matches/${matchId}`);
      console.log('🤼 [API Fallback] Raw match details received:', matchDetails);
      console.log('🤼 [API Fallback] Match alliances:', matchDetails.alliances);
      
      // Extract team data from alliances
      let redTeams = [];
      let blueTeams = [];
      
      if (matchDetails.alliances && Array.isArray(matchDetails.alliances)) {
        const redAlliance = matchDetails.alliances.find(
          (alliance: any) => alliance.color === "RED"
        );
        const blueAlliance = matchDetails.alliances.find(
          (alliance: any) => alliance.color === "BLUE"
        );
        
        console.log('🤼 [API Fallback] Red alliance:', redAlliance);
        console.log('🤼 [API Fallback] Blue alliance:', blueAlliance);
        
        // Extract team numbers and format them like the WebSocket data
        if (redAlliance?.teamAlliances) {
          redTeams = redAlliance.teamAlliances.map((ta: any) => {
            const originalTeamNumber = ta.team?.teamNumber || ta.team?.name || 'Unknown';
            const teamName = ta.team?.name || 'Unknown Team';
            
            // Improved team number extraction and processing
            const extractTeamNumber = (teamStr: string): string => {
              const str = String(teamStr);
              
              // If it looks like a team identifier (e.g., "NIH00003"), return as-is
              if (/^[A-Z]+\d+$/.test(str)) {
                return str;
              }
              
              // If it's all numbers, clean up leading zeros but preserve the number
              if (/^\d+$/.test(str)) {
                return str.replace(/^0+/, '') || str.slice(-1);
              }
              
              // Extract trailing numbers (for cases like "Team 007")
              const match = str.match(/\d+$/);
              if (match) {
                const numericPart = match[0];
                return numericPart.replace(/^0+/, '') || numericPart.slice(-1);
              }
              
              return str;
            };
            
            const processedTeamNumber = extractTeamNumber(originalTeamNumber);
            
            // Determine if we should separate teamNumber and name
            const shouldSeparate = teamName !== 'Unknown Team' && 
                                 teamName !== originalTeamNumber && 
                                 !/^[A-Z]+\d+$/.test(teamName);
            
            return {
              id: ta.team?.id || `${ta.team?.teamNumber || ta.team?.name}-${Math.random()}`,
              name: shouldSeparate ? teamName : '',
              teamNumber: processedTeamNumber,
              originalTeamNumber: String(originalTeamNumber)
            };
          });
        }
        
        if (blueAlliance?.teamAlliances) {
          blueTeams = blueAlliance.teamAlliances.map((ta: any) => {
            const originalTeamNumber = ta.team?.teamNumber || ta.team?.name || 'Unknown';
            const teamName = ta.team?.name || 'Unknown Team';
            
            // Improved team number extraction and processing
            const extractTeamNumber = (teamStr: string): string => {
              const str = String(teamStr);
              
              // If it looks like a team identifier (e.g., "NIH00003"), return as-is
              if (/^[A-Z]+\d+$/.test(str)) {
                return str;
              }
              
              // If it's all numbers, clean up leading zeros but preserve the number
              if (/^\d+$/.test(str)) {
                return str.replace(/^0+/, '') || str.slice(-1);
              }
              
              // Extract trailing numbers (for cases like "Team 007")
              const match = str.match(/\d+$/);
              if (match) {
                const numericPart = match[0];
                return numericPart.replace(/^0+/, '') || numericPart.slice(-1);
              }
              
              return str;
            };
            
            const processedTeamNumber = extractTeamNumber(originalTeamNumber);
            
            // Determine if we should separate teamNumber and name
            const shouldSeparate = teamName !== 'Unknown Team' && 
                                 teamName !== originalTeamNumber && 
                                 !/^[A-Z]+\d+$/.test(teamName);
            
            return {
              id: ta.team?.id || `${ta.team?.teamNumber || ta.team?.name}-${Math.random()}`,
              name: shouldSeparate ? teamName : '',
              teamNumber: processedTeamNumber,
              originalTeamNumber: String(originalTeamNumber)
            };
          });
        }
      }
      
      console.log('🤼 [API Fallback] Extracted red teams:', redTeams);
      console.log('🤼 [API Fallback] Extracted blue teams:', blueTeams);
      
      setMatchState((prev: any) => ({
        ...prev,
        matchId: matchDetails.id,
        matchNumber: matchDetails.matchNumber,
        name: matchDetails.name || matchDetails.match_name || "",
        status: matchDetails.status || "",
        currentPeriod: matchDetails.currentPeriod || matchDetails.period || "",
        redTeams: redTeams.length > 0 ? redTeams : prev.redTeams,
        blueTeams: blueTeams.length > 0 ? blueTeams : prev.blueTeams,
      }));
      
      // Fetch score breakdown
      const scoreDetails = await apiClient.get(
        `/match-scores/match/${matchId}`
      );
      setScore(scoreDetails);
      
      console.log('🤼 [API Fallback] Successfully updated match state with team counts - Red:', redTeams.length, 'Blue:', blueTeams.length);
    } catch (error) {
      console.error('🤼 [API Fallback] Error syncing match data:', error);
    }
  }

  // Subscribe to unified WebSocket events for audience display
  useEffect(() => {
    if (!unifiedConnected) return;

    console.log(
      "🔔 [Unified WebSocket] Setting up audience display subscriptions"
    );

    // Subscribe to display mode changes
    const unsubDisplayMode = unifiedSubscribe<AudienceDisplaySettings>(
      "display_mode_change",
      (data) => {
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
      }
    );

    // Subscribe to timer updates
    const unsubTimer = unifiedSubscribe<any>("timer_update", (data) => {
      // Process timer updates for this specific field OR tournament-wide updates (no fieldId specified)
      if (data.fieldId === fieldId || !data.fieldId) {
        console.log(
          "✅ [Unified WebSocket] Applying timer update for field:",
          fieldId,
          data
        );
        setTimer(data);
      }
    });

    // Subscribe to timer start events
    const unsubStartTimer = unifiedSubscribe<any>("start_timer", (data) => {
      if (data.fieldId === fieldId || !data.fieldId) {
        console.log(
          "✅ [Unified WebSocket] Timer started for field:",
          fieldId,
          data
        );
        
        // Ensure the timer data has the correct structure for local countdown
        const timerData = {
          ...data,
          isRunning: true,
          startedAt: data.startedAt || Date.now(),
          remaining: data.remaining || data.duration || 150000
        };
        
        setTimer(timerData);
        console.log("🟢 [Timer Start] Set timer state:", timerData);
      }
    });

    // Subscribe to timer pause events
    const unsubPauseTimer = unifiedSubscribe<any>("pause_timer", (data) => {
      if (data.fieldId === fieldId || !data.fieldId) {
        console.log(
          "✅ [Unified WebSocket] Timer paused for field:",
          fieldId,
          data
        );
        
        // Ensure the timer is marked as NOT running for pause events
        const timerData = {
          ...data,
          isRunning: false,
          pausedAt: data.pausedAt || Date.now()
        };
        
        setTimer(timerData);
        console.log("🟡 [Timer Pause] Set timer state:", timerData);
      }
    });

    // Subscribe to timer reset events
    const unsubResetTimer = unifiedSubscribe<any>("reset_timer", (data) => {
      if (data.fieldId === fieldId || !data.fieldId) {
        console.log(
          "✅ [Unified WebSocket] Timer reset for field:",
          fieldId,
          data
        );
        
        // Ensure the timer is marked as NOT running for reset events
        const timerData = {
          ...data,
          isRunning: false,
          remaining: data.remaining || data.duration || 150000
        };
        
        setTimer(timerData);
        console.log("🔴 [Timer Reset] Set timer state:", timerData);
      }
    });

    // Subscribe to real-time score updates
    const unsubRealtimeScore = unifiedSubscribe<any>(
      "scoreUpdateRealtime",
      (data) => {
        console.log(
          "✅ [Unified WebSocket] Real-time score update received:",
          data,
          "for field:",
          fieldId,
          "current match:",
          matchState?.matchId
        );

        // Accept real-time score updates if they're for the current match
        if (data.matchId && data.matchId === matchState?.matchId) {
          console.log(
            "Applying real-time score update for match:",
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
          setDisplaySettings((prevSettings) => {
            if (prevSettings.displayMode !== "match") {
              return {
                ...prevSettings,
                displayMode: "match",
                matchId: data.matchId,
                updatedAt: Date.now(),
              };
            }
            return prevSettings;
          });
        }
      }
    );

    // Subscribe to announcements
    const unsubAnnouncement = unifiedSubscribe<{
      announcementData?: any;
      // Legacy support for old message format
      message?: string;
      duration?: number;
      fieldId?: string;
      tournamentId: string;
      // New format fields
      type?: string;
      content?: string;
      title?: string;
    }>("announcement", (data) => {
      console.log("🔔 [Unified WebSocket] Announcement received:", data);
      console.log("🔔 [Announcement Debug] Raw data stringified:", JSON.stringify(data, null, 2));
      console.log("🔔 [Announcement Debug] Data keys:", Object.keys(data || {}));
      console.log("🔔 [Announcement Debug] Data.type:", data.type);
      console.log("🔔 [Announcement Debug] Data.content:", data.content);
      console.log("🔔 [Announcement Debug] Data.announcementData:", data.announcementData);
      console.log("🔔 [Announcement Debug] Data.message:", data.message);

      // Show if it's a tournament-wide announcement or specific to this field
      if (!data.fieldId || data.fieldId === fieldId) {
        console.log(
          "✅ [Unified WebSocket] Processing announcement for field:",
          fieldId,
          "Tournament:", data.tournamentId
        );
        
        let announcementData;
        
        // ENHANCED FORMAT DETECTION WITH PRIORITY ORDER
        // Priority 1: Check for nested announcementData property
        if (data.announcementData && typeof data.announcementData === 'object') {
          console.log("📦 [Format Detection] Found nested announcementData property:", data.announcementData);
          announcementData = data.announcementData;
        }
        // Priority 2: Check for root-level AnnouncementData format (type + content)
        // This handles the case where announcement fields are mixed with routing fields
        else if (data.type && data.content !== undefined) {
          console.log("📄 [Format Detection] Found root-level AnnouncementData format (mixed with routing fields)");
          // Extract only announcement-specific fields, ignore routing fields
          announcementData = {
            type: data.type,
            content: data.content,
            title: data.title,
            duration: data.duration
          };
        }
        // Priority 3: Check for legacy message format
        else if (data.message !== undefined) {
          console.log("📜 [Format Detection] Found legacy message format:", data.message);
          announcementData = {
            type: 'text' as const,
            content: data.message,
            title: undefined,
            duration: Math.floor((data.duration || 10000) / 1000)
          };
        }
        // Priority 4: Check if data itself IS the announcement (direct object) - exclude routing objects
        else if (data && typeof data === 'object' && !data.fieldId && !data.tournamentId && Object.keys(data).length > 0) {
          console.log("🎯 [Format Detection] Data appears to be direct AnnouncementData object:", data);
          announcementData = data;
        }
        else {
          console.error("❌ [Format Detection] Unknown announcement format, unable to process:", {
            dataType: typeof data,
            hasType: 'type' in data,
            hasContent: 'content' in data,
            hasMessage: 'message' in data,
            hasAnnouncementData: 'announcementData' in data,
            hasTournamentId: 'tournamentId' in data,
            hasFieldId: 'fieldId' in data,
            keys: Object.keys(data || {})
          });
          return;
        }
        
        // VALIDATION AND SANITIZATION
        if (!announcementData || typeof announcementData !== 'object') {
          console.error("❌ [Validation] Invalid announcement data structure:", announcementData);
          return;
        }
        
        // Ensure type is valid
        const validTypes = ['text', 'image', 'video', 'youtube'];
        if (!announcementData.type || !validTypes.includes(announcementData.type)) {
          console.warn("⚠️ [Validation] Invalid or missing type, defaulting to 'text':", announcementData.type);
          announcementData.type = 'text';
        }
        
        // Ensure content exists
        if (!announcementData.content && announcementData.content !== '') {
          console.error("❌ [Validation] Missing content field:", announcementData);
          return;
        }
        
        // Ensure duration is a number
        if (announcementData.duration && typeof announcementData.duration !== 'number') {
          console.warn("⚠️ [Validation] Converting duration to number:", announcementData.duration);
          announcementData.duration = parseInt(announcementData.duration) || 10;
        }
        
        console.log("✅ [Final Processing] Processed announcement data:", {
          type: announcementData.type,
          content: announcementData.content?.substring(0, 100) + (announcementData.content?.length > 100 ? '...' : ''),
          title: announcementData.title,
          duration: announcementData.duration,
          contentLength: announcementData.content?.length
        });
        
        // APPLY TO STATE
        setAnnouncement(announcementData);
        setShowAnnouncement(true);
        
        // Set the countdown to match the actual duration
        const actualDuration = announcementData.duration || 10;
        setAnnouncementCountdown(actualDuration);
        console.log("⏰ [Duration] Using announcement duration:", actualDuration, "seconds");

        // Calculate display duration in milliseconds
        const displayDuration = actualDuration * 1000;
        console.log("⏰ [Timer] Setting display duration:", displayDuration, "ms");

        // Auto-hide announcement after duration and switch to blank display
        const timerId = setTimeout(() => {
          console.log("⏰ [Timer] Auto-hiding announcement after", actualDuration, "seconds");
          setShowAnnouncement(false);
          
          // Switch to blank display mode after announcement ends
          console.log("📺 [Display] Switching to blank display after announcement");
          setDisplaySettings(prev => ({
            ...prev,
            displayMode: "blank",
            updatedAt: Date.now()
          }));
        }, displayDuration);

        // Clear timeout if component unmounts while announcement is showing
        return () => {
          console.log("🧹 [Cleanup] Clearing announcement timer");
          clearTimeout(timerId);
        };
      } else {
        console.log("🚫 [Filter] Ignoring announcement - not for this field:", {
          announcementFieldId: data.fieldId,
          currentFieldId: fieldId,
          match: data.fieldId === fieldId
        });
      }
    });

    return () => {
      console.log(
        "🧹 [Unified WebSocket] Cleaning up audience display subscriptions"
      );
      unsubDisplayMode();
      unsubTimer();
      unsubStartTimer();
      unsubPauseTimer();
      unsubResetTimer();
      unsubRealtimeScore();
      unsubAnnouncement();
    };
  }, [
    unifiedConnected,
    unifiedSubscribe,
    fieldId,
    tournamentId,
    matchState?.matchId,
  ]);

  // Local countdown for smooth timer display on audience
  useEffect(() => {
    console.log('🕒 [Timer State Monitor] Timer state changed:', {
      isRunning: timer?.isRunning,
      remaining: timer?.remaining,
      timer: timer
    });
    
    if (!timer?.isRunning) {
      console.log('⏸️ [Timer State Monitor] Timer is stopped');
      return;
    }

    console.log('✅ [Timer State Monitor] Timer is running - starting local countdown');
    
    // Create local countdown for smooth display
    const interval = setInterval(() => {
      setTimer((prevTimer:any) => {
        if (!prevTimer || !prevTimer.isRunning) {
          return prevTimer;
        }
        
        const newRemaining = Math.max(0, prevTimer.remaining - 1000);
        
        console.log('🕰️ [Local Countdown] Updated timer:', {
          previous: prevTimer.remaining,
          new: newRemaining,
          formatted: `${Math.floor(newRemaining / 60000)}:${Math.floor((newRemaining % 60000) / 1000).toString().padStart(2, '0')}`
        });
        
        return {
          ...prevTimer,
          remaining: newRemaining
        };
      });
    }, 1000); // Update every second

    return () => {
      clearInterval(interval);
      console.log('🧹 [Timer State Monitor] Cleaned up local countdown interval');
    };
  }, [timer?.isRunning]);

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

  // Proper announcement countdown effect that respects user-specified duration
  useEffect(() => {
    if (!showAnnouncement || !announcement) {
      return;
    }

    // Only start countdown if we have a valid countdown value
    if (announcementCountdown === null || announcementCountdown <= 0) {
      return;
    }

    console.log('🔢 [Countdown] Starting countdown from', announcementCountdown, 'seconds');
    
    const intervalId = setInterval(() => {
      setAnnouncementCountdown((prev) => {
        if (prev === null || prev <= 1) {
          console.log('🔢 [Countdown] Countdown finished');
          return null;
        }
        const newValue = prev - 1;
        console.log('🔢 [Countdown] Countdown:', newValue, 'seconds remaining');
        return newValue;
      });
    }, 1000);

    return () => {
      console.log('🧹 [Countdown] Cleaning up countdown interval');
      clearInterval(intervalId);
    };
  }, [showAnnouncement, announcement, announcementCountdown]);

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
      default: // Use real-time scores if available and recent, otherwise fall back to legacy scores
        const displayScore =
          unifiedConnected && lastUpdateTime
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
          unifiedConnected,
          lastUpdateTime,
          source,
          fallbackMode,
          realtimeScores,
          legacyScore: score,
          displayScore,
          unifiedWebSocketConnected: unifiedConnected,
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
    <div className="audience-display-container min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Full-screen Announcement Overlay - Hides everything when active */}
      {showAnnouncement && (
        <AnnouncementOverlay
          announcement={announcement}
          showAnnouncement={showAnnouncement}
          announcementCountdown={announcementCountdown}
        />
      )}
      
      {/* Main Layout - Hidden when announcement is showing for true full-screen experience */}
      {!showAnnouncement && (
        <>
          {/* Enhanced Connection Status with Fallback Support (Steps 10-12) */}
          <ConnectionStatus
            isConnected={unifiedConnected}
            wsConnected={unifiedConnected} // Use unified WebSocket connection status
            lastUpdateTime={lastUpdateTime}
            connectionError={connectionError}
            fallbackMode={fallbackMode}
            source={source}
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
          
          {/* Footer */}
          <footer className="container mx-auto mt-8 text-center text-sm text-gray-600 pb-6">
            <p>© Robotics Tournament Management System</p>
          </footer>
        </>
      )}
    </div>
  );
}
