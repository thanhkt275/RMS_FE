import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/websockets/simplified/useWebSocket';
import { UserRole, MatchData, MatchStateData, AudienceDisplaySettings } from '@/types/types';

export interface UnifiedAudienceDisplayOptions {
  tournamentId: string;
  fieldId?: string;
  autoConnect?: boolean;
}

export interface AudienceMatchState {
  matchId: string | null;
  matchNumber: number | null;
  name: string | null;
  status: string | null;
  currentPeriod: 'auto' | 'teleop' | 'endgame' | null;
  redTeams: Array<{ name: string }>;
  blueTeams: Array<{ name: string }>;
}

export interface AudienceDisplayState {
  matchState: AudienceMatchState;
  displaySettings: AudienceDisplaySettings;
  isConnected: boolean;
  error: string | null;
}

/**
 * Unified Audience Display Hook
 * Replaces existing match subscription with unified WebSocket service
 * Implements proper field filtering for match updates and display transitions
 */
export function useUnifiedAudienceDisplay({
  tournamentId,
  fieldId,
  autoConnect = true
}: UnifiedAudienceDisplayOptions) {
  
  // Simplified WebSocket connection
  const { info, on, off, setRoomContext, setUserRole } = useWebSocket({
    autoConnect,
    tournamentId: tournamentId || 'all',
    fieldId,
    role: UserRole.COMMON,
  });
  const isConnectedWs = info.state === 'connected';
  // keep room and role synced
  useEffect(() => { setUserRole(UserRole.COMMON); }, [setUserRole]);
  useEffect(() => { void setRoomContext({ tournamentId: tournamentId || 'all', fieldId }); }, [tournamentId, fieldId, setRoomContext]);

  // Local state for audience display
  const [displayState, setDisplayState] = useState<AudienceDisplayState>({
    matchState: {
      matchId: null,
      matchNumber: null,
      name: null,
      status: null,
      currentPeriod: null,
      redTeams: [],
      blueTeams: []
    },
    displaySettings: {
      displayMode: "match",
      tournamentId,
      fieldId: fieldId || null,
      updatedAt: Date.now()
    },
    isConnected: false,
    error: null
  });

  // Connection status tracking via simplified info.state
  useEffect(() => {
    setDisplayState(prev => ({
      ...prev,
      isConnected: isConnectedWs,
      error: isConnectedWs ? null : 'WebSocket connection lost'
    }));
  }, [isConnectedWs]);

  // No manual connect/disconnect needed; useWebSocket manages lifecycle

  // Handle match updates with field-specific filtering
  const handleMatchUpdate = useCallback((data: MatchData) => {
    console.log('[useUnifiedAudienceDisplay] Received match update:', data);

    // Apply field-specific filtering
    if (fieldId && data.fieldId && data.fieldId !== fieldId) {
      console.log('[useUnifiedAudienceDisplay] Ignoring match update for different field:', data.fieldId);
      return;
    }

    // Update match state
    setDisplayState(prev => ({
      ...prev,
      matchState: {
        ...prev.matchState,
        matchId: data.id || prev.matchState.matchId,
        matchNumber: data.matchNumber || prev.matchState.matchNumber,
        status: data.status || prev.matchState.status,
        redTeams: (data as any).redTeams || prev.matchState.redTeams,
        blueTeams: (data as any).blueTeams || prev.matchState.blueTeams
      },
      displaySettings: {
        ...prev.displaySettings,
        displayMode: "match",
        matchId: data.id,
        updatedAt: Date.now()
      }
    }));

    console.log('[useUnifiedAudienceDisplay] Updated match state for field:', fieldId);
  }, [fieldId]);

  // Handle match state changes with field-specific filtering
  const handleMatchStateChange = useCallback((data: MatchStateData) => {
    console.log('[useUnifiedAudienceDisplay] Received match state change:', data);

    // Apply field-specific filtering
    if (fieldId && (data as any).fieldId && (data as any).fieldId !== fieldId) {
      console.log('[useUnifiedAudienceDisplay] Ignoring match state change for different field:', (data as any).fieldId);
      return;
    }

    // Update match state
    setDisplayState(prev => ({
      ...prev,
      matchState: {
        ...prev.matchState,
        matchId: data.matchId || prev.matchState.matchId,
        status: data.status || prev.matchState.status,
        currentPeriod: data.currentPeriod || prev.matchState.currentPeriod
      }
    }));

    console.log('[useUnifiedAudienceDisplay] Updated match state change for field:', fieldId);
  }, [fieldId]);

  // Handle display mode changes with field-specific filtering
  const handleDisplayModeChange = useCallback((data: AudienceDisplaySettings) => {
    console.log('[useUnifiedAudienceDisplay] Received display mode change:', data);

    // Apply field-specific filtering
    if (fieldId && data.fieldId && data.fieldId !== fieldId) {
      console.log('[useUnifiedAudienceDisplay] Ignoring display mode change for different field:', data.fieldId);
      return;
    }

    // Update display settings
    setDisplayState(prev => ({
      ...prev,
      displaySettings: {
        ...data,
        fieldId: data.fieldId || fieldId || null,
        tournamentId: data.tournamentId || tournamentId,
        updatedAt: data.updatedAt || Date.now()
      }
    }));

    console.log('[useUnifiedAudienceDisplay] Updated display mode for field:', fieldId);
  }, [fieldId, tournamentId]);

  // Subscribe to simplified WebSocket events
  useEffect(() => {
    console.log('[useUnifiedAudienceDisplay] Setting up event subscriptions');
    const subMatchUpdate = on('match_update' as any, handleMatchUpdate as any);
    const subMatchState = on('match_state_change' as any, handleMatchStateChange as any);
    const subDisplayMode = on('display_mode_change' as any, handleDisplayModeChange as any);

    return () => {
      console.log('[useUnifiedAudienceDisplay] Cleaning up event subscriptions');
      off('match_update' as any, handleMatchUpdate as any);
      off('match_state_change' as any, handleMatchStateChange as any);
      off('display_mode_change' as any, handleDisplayModeChange as any);
      subMatchUpdate?.unsubscribe?.();
      subMatchState?.unsubscribe?.();
      subDisplayMode?.unsubscribe?.();
    };
  }, [handleMatchUpdate, handleMatchStateChange, handleDisplayModeChange, on, off]);

  // Create match transition animations
  const triggerMatchTransition = useCallback((newMatchId: string) => {
    console.log('[useUnifiedAudienceDisplay] Triggering match transition animation for:', newMatchId);
    
    // Add transition class to trigger animation
    const displayElement = document.querySelector('.audience-display-container');
    if (displayElement) {
      displayElement.classList.add('match-transition');
      
      // Remove transition class after animation completes
      setTimeout(() => {
        displayElement.classList.remove('match-transition');
      }, 500);
    }
  }, []);

  // Watch for match changes to trigger transitions
  useEffect(() => {
    const currentMatchId = displayState.matchState.matchId;
    const previousMatchId = displayState.matchState.matchId;
    
    if (currentMatchId && currentMatchId !== previousMatchId) {
      triggerMatchTransition(currentMatchId);
    }
  }, [displayState.matchState.matchId, triggerMatchTransition]);

  // Public API
  return {
    // State
    matchState: displayState.matchState,
    displaySettings: displayState.displaySettings,
    isConnected: displayState.isConnected,
    error: displayState.error,

    // Actions
    updateDisplaySettings: (settings: Partial<AudienceDisplaySettings>) => {
      setDisplayState(prev => ({
        ...prev,
        displaySettings: {
          ...prev.displaySettings,
          ...settings,
          updatedAt: Date.now()
        }
      }));
    },

    // Getters
    getCurrentMatch: () => displayState.matchState,
    getCurrentDisplayMode: () => displayState.displaySettings.displayMode,
    isMatchDisplayMode: () => displayState.displaySettings.displayMode === 'match',
    getFieldId: () => fieldId,
    getTournamentId: () => tournamentId,

    // Connection management
    reconnect: () => { /* managed by service; no-op */ },

    // Debug helpers
    getConnectionStatus: () => info.state,
    getStats: () => ({ state: info.state })
  };
}