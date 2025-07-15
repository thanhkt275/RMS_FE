import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/websocket/use-websocket";
import { QueryKeys } from "@/lib/query-keys";

interface UseWebSocketSubscriptionsProps {
  tournamentId: string;
  selectedFieldId: string | null;
  selectedMatchId: string;
  onTimerUpdate?: (data: any) => void;
  onScoreUpdate?: (data: any) => void;
  onMatchUpdate?: (data: any) => void;
  onMatchStateChange?: (data: any) => void;
}

interface WebSocketSubscriptionsReturn {
  // WebSocket actions
  joinTournament: (tournamentId: string) => void;
  joinFieldRoom: (fieldId: string) => void;
  leaveFieldRoom: (fieldId: string) => void;
  changeDisplayMode: (settings: any) => void; // Updated to match useWebSocket signature
  sendAnnouncement: (message: string, duration?: number, fieldId?: string) => void;
  sendMatchUpdate: (data: any) => void;
  sendMatchStateChange: (data: any) => void;
  sendScoreUpdate: (data: any) => void;
  
  // Connection state
  isConnected: boolean;
  currentTournament: string | null;
}

export function useWebSocketSubscriptions({
  tournamentId,
  selectedFieldId,
  selectedMatchId,
  onTimerUpdate,
  onScoreUpdate,
  onMatchUpdate,
  onMatchStateChange,
}: UseWebSocketSubscriptionsProps): WebSocketSubscriptionsReturn {
  const queryClient = useQueryClient();

  // Connect to WebSocket with the tournament ID and auto-connect
  const {
    isConnected,
    currentTournament,
    joinTournament,
    changeDisplayMode,
    sendAnnouncement,
    sendMatchUpdate,
    sendMatchStateChange,
    sendScoreUpdate,
    subscribe,
    joinFieldRoom,
    leaveFieldRoom,
  } = useWebSocket({ tournamentId, autoConnect: true });
  // Join tournament and field rooms on mount
  useEffect(() => {
    if (!tournamentId) return;
    
    // Handle "all tournaments" mode - don't join a specific tournament room
    if (tournamentId === "all") {
      console.log("Monitoring all tournaments mode");
      // In "all tournaments" mode, we still join field room if selected
      if (selectedFieldId) {
        joinFieldRoom(selectedFieldId);
        console.log(`Joining field room: ${selectedFieldId} for all tournaments`);
      }
    } else {
      // Join specific tournament room
      joinTournament(tournamentId);
      console.log(`Joining tournament: ${tournamentId}`);
      
      // Then join field room if selected
      if (selectedFieldId) {
        joinFieldRoom(selectedFieldId);
        console.log(`Joining field room: ${selectedFieldId} in tournament: ${tournamentId}`);
      }
    }
    
    // On unmount, leave the field room
    return () => {
      if (selectedFieldId) {
        leaveFieldRoom(selectedFieldId);
        console.log(`Leaving field room: ${selectedFieldId}`);
      }
    };
  }, [tournamentId, selectedFieldId, joinTournament, joinFieldRoom, leaveFieldRoom]);

  // Listen for timer updates from WebSocket
  useEffect(() => {
    if (!onTimerUpdate) return;    const handleTimerUpdate = (data: any) => {
      console.log("Timer update received:", data);
      
      // Enhanced tournament filtering logic
      const shouldAcceptTournament = 
        tournamentId === "all" || // We're monitoring all tournaments
        !data.tournamentId || // No tournament filter in data
        data.tournamentId === "all" || // Data is broadcast to all
        data.tournamentId === tournamentId; // Exact tournament match
      
      if (!shouldAcceptTournament) {
        console.log(`Ignoring timer update for different tournament: ${data.tournamentId} (expected: ${tournamentId})`);
        return;
      }
      
      // Filter messages by fieldId if we're in a specific field room
      if (selectedFieldId && data.fieldId && data.fieldId !== selectedFieldId) {
        console.log(`Ignoring timer update for different field: ${data.fieldId}`);
        return;
      }

      onTimerUpdate(data);
    };

    // Subscribe to timer updates using the subscribe method from useWebSocket
    const unsubscribe = subscribe("timer_update", handleTimerUpdate);

    // Cleanup subscription when component unmounts
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribe, selectedFieldId, onTimerUpdate, tournamentId]); // Added tournamentId

  // Subscribe to WebSocket score updates and update React Query cache
  useEffect(() => {
    if (!selectedMatchId || !onScoreUpdate) return;
    const handleScoreUpdate = (data: {
      matchId: string;
      fieldId?: string;
      tournamentId?: string;
      redAutoScore?: number;
      redDriveScore?: number;
      redTotalScore?: number;
      blueAutoScore?: number;
      blueDriveScore?: number;
      blueTotalScore?: number;
      [key: string]: any;
    }) => {
      console.log("WebSocket score update received:", {
        data,
        currentTournamentId: tournamentId,
        selectedFieldId,
        selectedMatchId
      });
      
      // Enhanced tournament filtering logic:
      // 1. If we're in "all tournaments" mode, accept all updates
      // 2. If data has no tournamentId, accept it (could be legacy format)
      // 3. If data tournamentId is "all", accept it (broadcast to all)
      // 4. Only filter if both have specific tournament IDs and they don't match
      const shouldAcceptTournament = 
        tournamentId === "all" || // We're monitoring all tournaments
        !data.tournamentId || // No tournament filter in data
        data.tournamentId === "all" || // Data is broadcast to all
        data.tournamentId === tournamentId; // Exact tournament match
      
      if (!shouldAcceptTournament) {
        console.log(`Ignoring score update for different tournament: ${data.tournamentId} (expected: ${tournamentId})`);
        return;
      }
      
      // Accept updates if:
      // 1. No fieldId filtering needed (selectedFieldId is null), OR
      // 2. fieldId matches, OR  
      // 3. No fieldId in update (tournament-wide)
      const shouldAcceptField = 
        !selectedFieldId || // No field selected
        !data.fieldId || // No fieldId in update (tournament-wide)
        data.fieldId === selectedFieldId; // Exact field match
      
      if (!shouldAcceptField) {
        console.log(`Ignoring score update for different field: ${data.fieldId} (expected: ${selectedFieldId})`);
        return;
      }
      
      if (data.matchId === selectedMatchId) {
        console.log("Score update accepted for selected match:", data);
        
        // Update the React Query cache directly
        queryClient.setQueryData(
          ["match-scores", selectedMatchId],
          (oldData: Record<string, any> | undefined) => ({
            ...(oldData || {}),
            ...data,
          })
        );

        onScoreUpdate(data);
      }
    };    // Subscribe only to 'scoreUpdateRealtime' for real-time score updates
    const unsubscribe = subscribe("scoreUpdateRealtime", handleScoreUpdate);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedMatchId, subscribe, queryClient, selectedFieldId, onScoreUpdate, tournamentId]); // Added tournamentId



  // Listen for match updates from WebSocket
  useEffect(() => {
    if (!onMatchUpdate) return;    const handleMatchUpdate = (data: any) => {
      console.log("Match update received:", data);
      
      // Enhanced tournament filtering logic
      const shouldAcceptTournament = 
        tournamentId === "all" || // We're monitoring all tournaments
        !data.tournamentId || // No tournament filter in data
        data.tournamentId === "all" || // Data is broadcast to all
        data.tournamentId === tournamentId; // Exact tournament match
      
      if (!shouldAcceptTournament) {
        console.log(`Ignoring match update for different tournament: ${data.tournamentId} (expected: ${tournamentId})`);
        return;
      }
      
      // Filter messages by fieldId if we're in a specific field room
      if (selectedFieldId && data.fieldId && data.fieldId !== selectedFieldId) {
        console.log(`Ignoring match update for different field: ${data.fieldId}`);
        return;
      }
      
      // If this is the currently selected match, update the cache
      if (data.id === selectedMatchId) {
        queryClient.setQueryData(
          ["match", selectedMatchId],
          (oldData: Record<string, any> | undefined) => {
            if (!oldData) return data;
            
            return {
              ...oldData,
              ...data,
            };
          }
        );
      }

      onMatchUpdate(data);
    };
    
    // Subscribe to match updates
    const unsubscribe = subscribe("match_update", handleMatchUpdate);
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribe, selectedMatchId, queryClient, selectedFieldId, onMatchUpdate, tournamentId]); // Added tournamentId

  // Listen for match state changes from WebSocket
  useEffect(() => {
    if (!onMatchStateChange) return;    const handleMatchStateChange = (data: any) => {
      console.log("Match state change received:", data);
      
      // Enhanced tournament filtering logic
      const shouldAcceptTournament = 
        tournamentId === "all" || // We're monitoring all tournaments
        !data.tournamentId || // No tournament filter in data
        data.tournamentId === "all" || // Data is broadcast to all
        data.tournamentId === tournamentId; // Exact tournament match
      
      if (!shouldAcceptTournament) {
        console.log(`Ignoring match state update for different tournament: ${data.tournamentId} (expected: ${tournamentId})`);
        return;
      }
      
      // Filter messages by fieldId if we're in a specific field room
      if (selectedFieldId && data.fieldId && data.fieldId !== selectedFieldId) {
        console.log(`Ignoring match state update for different field: ${data.fieldId}`);
        return;
      }
      
      // Update the selected match if it's the same match
      if (data.matchId === selectedMatchId) {
        // Update match query cache with new status
        queryClient.setQueryData(
          QueryKeys.matches.byId(selectedMatchId),
          (oldData: Record<string, any> | undefined) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              status: data.status || oldData.status,
            };
          }
        );
      }

      onMatchStateChange(data);
    };
    
    // Subscribe to match state changes
    const unsubscribe = subscribe("match_state_change", handleMatchStateChange);
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribe, selectedMatchId, queryClient, selectedFieldId, onMatchStateChange, tournamentId]); // Added tournamentId

  return {
    // WebSocket actions
    joinTournament,
    joinFieldRoom,
    leaveFieldRoom,
    changeDisplayMode,
    sendAnnouncement,
    sendMatchUpdate,
    sendMatchStateChange,
    sendScoreUpdate,
    
    // Connection state
    isConnected,
    currentTournament,
  };
}
