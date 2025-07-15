import { useState, useEffect, useCallback, useRef } from 'react';
import websocketService, { IWebSocketService } from '@/lib/websocket';
import {
  TimerData,
  MatchData,
  ScoreData,
  MatchStateData,
  AudienceDisplaySettings,
  AnnouncementData,
  UseWebSocketOptions
} from '@/types/types';


/**
 * React hook for using the WebSocket service 
 * Optimized to minimize re-renders and function recreations
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  
  const ws = websocketService;
  const { autoConnect = true, url, tournamentId } = options;

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [currentTournament, setCurrentTournament] = useState<string | null>(tournamentId || null);
  
  // Use ref to always access current tournament ID without causing re-renders
  const currentTournamentRef = useRef<string | null>(tournamentId || null);

  // Sync currentTournament with tournamentId option changes
  useEffect(() => {
    if (tournamentId !== undefined) {
      setCurrentTournament(tournamentId);
      currentTournamentRef.current = tournamentId;
    }
  }, [tournamentId]);// Connect to the WebSocket server
  const connect = useCallback(() => {
    ws.connect(url);
  }, [url]); // Only url can change
  
  // Disconnect from the WebSocket server
  const disconnect = useCallback(() => {
    ws.disconnect();
  }, []); 
    // Join a tournament room
  const joinTournament = useCallback((id: string) => {
    ws.joinTournament(id);
    setCurrentTournament(id);
    currentTournamentRef.current = id;
  }, []); // No dependencies - only sets state, doesn't read currentTournament
  
  // Leave a tournament room
  const leaveTournament = useCallback((id: string) => {
    ws.leaveTournament(id);
    setCurrentTournament(null);
    currentTournamentRef.current = null;
  }, []); // No dependencies - only sets state, doesn't read currentTournament
  
  // Subscribe to WebSocket events
  const subscribe = useCallback(<T>(eventName: string, callback: (data: T) => void) => {
    return ws.on<T>(eventName, callback);
  }, []); 
  
  // Unsubscribe from WebSocket events
  const unsubscribe = useCallback((eventName: string) => {
    ws.off(eventName);
  }, []);  // Display mode control functions - Use currentTournament ref to avoid dependency
  const changeDisplayMode = useCallback((settings: Omit<AudienceDisplaySettings, 'updatedAt'>) => {
    const tournamentId = currentTournamentRef.current;
    if (!tournamentId && !settings.tournamentId) {
      console.error('No tournament ID available for changeDisplayMode');
      return;
    }
    ws.sendDisplayModeChange({
      ...settings,
      tournamentId: settings.tournamentId || tournamentId!,
      updatedAt: Date.now(),
    });
  }, []); // Remove dependencies to prevent re-creation
  
  // Match update functions - Use currentTournament ref to avoid dependency
  const sendMatchUpdate = useCallback((matchData: Omit<MatchData, 'tournamentId'>) => {
    const tournamentId = currentTournamentRef.current;
    if (!tournamentId) {
      console.error('No tournament ID available for sendMatchUpdate');
      return;
    }
    ws.sendMatchUpdate({ ...matchData, tournamentId });
  }, []); // Remove dependencies to prevent re-creation
  
  // Score update functions - Use currentTournament ref to avoid dependency
  const sendScoreUpdate = useCallback((scoreData: Omit<ScoreData, 'tournamentId'>) => {
    const tournamentId = currentTournamentRef.current;
    if (!tournamentId) {
      console.error('No tournament ID available for sendScoreUpdate');
      return;
    }
    ws.sendScoreUpdate({ ...scoreData, tournamentId });
  }, []); // Remove dependencies to prevent re-creation
  
  // Match state change functions - Use currentTournament ref to avoid dependency
  const sendMatchStateChange = useCallback((stateData: Omit<MatchStateData, 'tournamentId'>) => {
    const tournamentId = currentTournamentRef.current;
    if (!tournamentId) {
      console.error('No tournament ID available for sendMatchStateChange');
      return;
    }
    ws.sendMatchStateChange({ ...stateData, tournamentId });
  }, []); // Remove dependencies to prevent re-creation  // Timer control functions - Use currentTournament ref to avoid dependency
  const startTimer = useCallback((timerData: Omit<TimerData, 'tournamentId'>) => {
    const tournamentId = currentTournamentRef.current;
    if (!tournamentId) {
      console.error('No tournament ID available for startTimer');
      return;
    }
    // Don't override isRunning or startedAt - let the backend handle these
    ws.startTimer({ ...timerData, tournamentId });
  }, []); // Remove dependencies to prevent re-creation
  
  const pauseTimer = useCallback((timerData: Omit<TimerData, 'tournamentId'>) => {
    const tournamentId = currentTournamentRef.current;
    if (!tournamentId) {
      console.error('No tournament ID available for pauseTimer');
      return;
    }
    ws.pauseTimer({ ...timerData, tournamentId });
  }, []); // Remove dependencies to prevent re-creation
  
  const resetTimer = useCallback((timerData: Omit<TimerData, 'tournamentId'>) => {
    const tournamentId = currentTournamentRef.current;
    if (!tournamentId) {
      console.error('No tournament ID available for resetTimer');
      return;
    }
    ws.resetTimer({ ...timerData, tournamentId });
  }, []); // Remove dependencies to prevent re-creation

  // Announcement functions - Use currentTournament ref to avoid dependency
  const sendAnnouncement = useCallback((message: string, duration?: number, fieldId?: string) => {
    const tournamentId = currentTournamentRef.current;
    if (!tournamentId) {
      console.error('No tournament ID available for sendAnnouncement');
      return;
    }
    ws.sendAnnouncement({ 
      message, 
      duration, 
      tournamentId,
      fieldId // Include fieldId if provided
    });
  }, []); // Remove dependencies to prevent re-creation// Field room join/leave for field-specific context
  const joinFieldRoom = useCallback((fieldId: string) => {
    ws.joinFieldRoom(fieldId);
  }, []); 
  
  const leaveFieldRoom = useCallback((fieldId: string) => {
    ws.leaveFieldRoom(fieldId);
  }, []);  // Setup connection tracking using event-driven status updates
  useEffect(() => {
    // Callback to update local connection state (regular function, not useCallback)
    const handleConnectionStatus = (status: { connected: boolean; }) => {
      setIsConnected(status.connected);
    };

    // Subscribe to connection status updates from the WebSocket service
    const unsubscribeStatus = ws.onConnectionStatus(handleConnectionStatus);

    // Initial check and connect if autoConnect is true
    setIsConnected(ws.isConnected()); // Set initial state
    if (autoConnect && !ws.isConnected()) {
      connect();
    }

    // Cleanup: unsubscribe from status updates
    return () => {
      unsubscribeStatus();
    };
  }, [autoConnect, connect]); // Removed ws since it's now a stable reference

  return {
    isConnected,
    connect,
    disconnect,
    currentTournament,
    joinTournament,
    leaveTournament,
    subscribe,
    unsubscribe,
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
  };
}