import {
  AudienceMatchState,
} from '@/types/audience-display.types';
import { AudienceDisplaySettings, MatchData, MatchStateData, UserRole } from '@/types/types';
import { unifiedWebSocketService } from '@/lib/unified-websocket';
import { apiClient } from '@/lib/api-client';
import { useState, useEffect, useCallback } from 'react';

export interface UnifiedAudienceDisplayOptions {
  tournamentId: string;
  fieldId?: string;
  autoConnect?: boolean;
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

  // Connection status tracking
  useEffect(() => {
    const handleConnectionStatus = (status: { connected: boolean }) => {
      setDisplayState(prev => ({
        ...prev,
        isConnected: status.connected,
        error: status.connected ? null : 'WebSocket connection lost'
      }));
    };

    const unsubscribe = unifiedWebSocketService.onConnectionStatus(handleConnectionStatus);
    return unsubscribe;
  }, []);

  // Connect to unified WebSocket service
  useEffect(() => {
    if (!autoConnect) return;

    console.log('[useUnifiedAudienceDisplay] Connecting to unified WebSocket service');
    
    // Set user role for audience display (read-only)
    unifiedWebSocketService.setUserRole(UserRole.COMMON);
    
    // Connect to WebSocket
    unifiedWebSocketService.connect().catch(error => {
      console.error('[useUnifiedAudienceDisplay] Connection failed:', error);
      setDisplayState(prev => ({
        ...prev,
        error: 'Failed to connect to WebSocket service'
      }));
    });

    // Join tournament room
    if (tournamentId) {
      console.log('[useUnifiedAudienceDisplay] Joining tournament:', tournamentId);
      unifiedWebSocketService.joinTournament(tournamentId);
    }

    // Join field room if specified
    if (fieldId) {
      console.log('[useUnifiedAudienceDisplay] Joining field room:', fieldId);
      unifiedWebSocketService.joinFieldRoom(fieldId);
    }

    return () => {
      console.log('[useUnifiedAudienceDisplay] Disconnecting from unified WebSocket service');
      if (fieldId) {
        unifiedWebSocketService.leaveFieldRoom(fieldId);
      }
      if (tournamentId) {
        unifiedWebSocketService.leaveTournament(tournamentId);
      }
      unifiedWebSocketService.disconnect();
    };
  }, [tournamentId, fieldId, autoConnect]);

  // Handle match updates with field-specific filtering
  const handleMatchUpdate = useCallback((data: MatchData) => {
    console.log('[useUnifiedAudienceDisplay] Received match update:', data);

    // Apply field-specific filtering
    if (fieldId && data.fieldId && data.fieldId !== fieldId) {
      console.log('[useUnifiedAudienceDisplay] Ignoring match update for different field:', data.fieldId);
      return;
    }

    // Update match state, preserving existing team data when new data is not provided
    setDisplayState(prev => {
      // Only update teams if new data is provided and not empty
      const hasNewRedTeams = data.redTeams && data.redTeams.length > 0;
      const hasNewBlueTeams = data.blueTeams && data.blueTeams.length > 0;
      
      // Preserve existing team data when new data is not provided
      const redTeams = hasNewRedTeams ? data.redTeams : prev.matchState.redTeams;
      const blueTeams = hasNewBlueTeams ? data.blueTeams : prev.matchState.blueTeams;

      return {
        ...prev,
        matchState: {
          ...prev.matchState,
          matchId: data.id || prev.matchState.matchId,
          matchNumber: data.matchNumber || prev.matchState.matchNumber,
          status: data.status || prev.matchState.status,
          redTeams: redTeams || [],
          blueTeams: blueTeams || []
        },
        displaySettings: {
          ...prev.displaySettings,
          displayMode: "match",
          matchId: data.id,
          updatedAt: Date.now()
        }
      };
    });

    console.log('[useUnifiedAudienceDisplay] Updated match state for field:', fieldId);
  }, [fieldId]);

  // Handle match state changes with field-specific filtering
  const handleMatchStateChange = useCallback((data: MatchStateData) => {
    console.log('[useUnifiedAudienceDisplay] Received match state change:', data);

    // Apply field-specific filtering
    if (fieldId && data.fieldId && data.fieldId !== fieldId) {
      console.log('[useUnifiedAudienceDisplay] Ignoring match state change for different field:', data.fieldId);
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

  // Subscribe to unified WebSocket events
  useEffect(() => {
    console.log('[useUnifiedAudienceDisplay] Setting up event subscriptions');

    // Subscribe to match updates
    const unsubscribeMatchUpdate = unifiedWebSocketService.on('match_update', handleMatchUpdate);
    
    // Subscribe to match state changes
    const unsubscribeMatchStateChange = unifiedWebSocketService.on('match_state_change', handleMatchStateChange);
    
    // Subscribe to display mode changes
    const unsubscribeDisplayModeChange = unifiedWebSocketService.on('display_mode_change', handleDisplayModeChange);

    return () => {
      console.log('[useUnifiedAudienceDisplay] Cleaning up event subscriptions');
      unsubscribeMatchUpdate();
      unsubscribeMatchStateChange();
      unsubscribeDisplayModeChange();
    };
  }, [handleMatchUpdate, handleMatchStateChange, handleDisplayModeChange]);

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
    reconnect: () => {
      console.log('[useUnifiedAudienceDisplay] Manually reconnecting...');
      unifiedWebSocketService.connect().catch(error => {
        console.error('[useUnifiedAudienceDisplay] Manual reconnection failed:', error);
        setDisplayState(prev => ({
          ...prev,
          error: 'Failed to reconnect to WebSocket service'
        }));
      });
    },

    // Debug helpers
    getConnectionStatus: () => unifiedWebSocketService.getConnectionStatus(),
    getStats: () => unifiedWebSocketService.getStats()
  };
}