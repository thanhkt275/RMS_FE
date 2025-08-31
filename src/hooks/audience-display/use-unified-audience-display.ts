import {
  AudienceMatchState,
} from '@/types/audience-display.types';
import { AudienceDisplaySettings, MatchData, MatchStateData, UserRole, DisplayMode } from '@/types/types';
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
      displayMode: "match" as DisplayMode,
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

  // Handle room joining when connection becomes ready (for external connections)
  useEffect(() => {
    if (autoConnect) return; // Skip if we're managing connection ourselves

    const handleConnectionStatus = (status: any) => {
      // When connection becomes ready and we're not auto-connecting, join rooms
      if (status.ready && status.connected && status.state === 'CONNECTED') {
        console.log('[useUnifiedAudienceDisplay] External connection ready, joining rooms');
        
        // Small delay to ensure connection is fully established
        setTimeout(() => {
          if (tournamentId) {
            console.log('[useUnifiedAudienceDisplay] Joining tournament:', tournamentId);
            unifiedWebSocketService.joinTournament(tournamentId);
          }

          if (fieldId) {
            console.log('[useUnifiedAudienceDisplay] Joining field room:', fieldId);
            unifiedWebSocketService.joinFieldRoom(fieldId);
          }
        }, 150); // Slightly longer delay than useUnifiedWebSocket
      }
    };

    const unsubscribe = unifiedWebSocketService.onConnectionStatus(handleConnectionStatus);
    
    // Check if already connected
    const currentStatus = unifiedWebSocketService.getConnectionStatus();
    if (currentStatus.ready && currentStatus.connected && currentStatus.state === 'CONNECTED') {
      handleConnectionStatus(currentStatus);
    }

    return unsubscribe;
  }, [autoConnect, tournamentId, fieldId]);

  // Connect to unified WebSocket service
  useEffect(() => {
    if (!autoConnect) {
      console.log('[useUnifiedAudienceDisplay] Auto-connect disabled, relying on external connection');
      return;
    }

    console.log('[useUnifiedAudienceDisplay] Connecting to unified WebSocket service');
    
    // Set user role for audience display (read-only)
    unifiedWebSocketService.setUserRole(UserRole.COMMON);
    
    // Connect to WebSocket and wait for it to be ready before joining rooms
    const connectAndJoinRooms = async () => {
      try {
        await unifiedWebSocketService.connect();
        
        // Wait for connection to be ready
        const maxWaitTime = 5000; // 5 seconds max wait
        const checkInterval = 100; // Check every 100ms
        let waitTime = 0;
        
        while (waitTime < maxWaitTime) {
          const status = unifiedWebSocketService.getConnectionStatus();
          if (status.ready && status.connected && status.state === 'CONNECTED') {
            console.log('[useUnifiedAudienceDisplay] Connection ready, joining rooms');
            
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
            
            return;
          }
          
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          waitTime += checkInterval;
        }
        
        console.warn('[useUnifiedAudienceDisplay] Connection ready timeout, proceeding anyway');
        // Proceed with joining rooms even if ready state is not confirmed
        if (tournamentId) {
          unifiedWebSocketService.joinTournament(tournamentId);
        }
        if (fieldId) {
          unifiedWebSocketService.joinFieldRoom(fieldId);
        }
        
      } catch (error) {
        console.error('[useUnifiedAudienceDisplay] Connection failed:', error);
        setDisplayState(prev => ({
          ...prev,
          error: 'Failed to connect to WebSocket service'
        }));
      }
    };

    connectAndJoinRooms();

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
    console.log('[useUnifiedAudienceDisplay] RECEIVED match update:', data);
    console.log('[useUnifiedAudienceDisplay] Current fieldId:', fieldId);
    console.log('[useUnifiedAudienceDisplay] Data fieldId:', data.fieldId);
    console.log('[useUnifiedAudienceDisplay] Data redTeams:', data.redTeams);
    console.log('[useUnifiedAudienceDisplay] Data blueTeams:', data.blueTeams);
    console.log('[useUnifiedAudienceDisplay] Team counts - Red:', data.redTeams?.length || 0, 'Blue:', data.blueTeams?.length || 0);

    // Apply field-specific filtering
    if (fieldId && data.fieldId && data.fieldId !== fieldId) {
      console.log('[useUnifiedAudienceDisplay] FILTERING OUT - different field:', data.fieldId, 'vs expected:', fieldId);
      return;
    }

    console.log('[useUnifiedAudienceDisplay] PROCESSING match update for field:', fieldId);

    // Update match state, handling match switching properly
    setDisplayState(prev => {
      console.log('[useUnifiedAudienceDisplay] Previous match state:', prev.matchState);
      const isNewMatch = data.id && data.id !== prev.matchState.matchId;
      console.log('[useUnifiedAudienceDisplay] Is new match?:', isNewMatch, 'Current:', prev.matchState.matchId, 'New:', data.id);
      
      // Check if we have team data in the new update
      const hasNewRedTeams = data.redTeams && data.redTeams.length > 0;
      const hasNewBlueTeams = data.blueTeams && data.blueTeams.length > 0;
      
      console.log('[useUnifiedAudienceDisplay] Team data check - hasNewRedTeams:', hasNewRedTeams, 'hasNewBlueTeams:', hasNewBlueTeams);
      
      // When switching to a new match, always reset team data and use new data if available
      // When staying on same match, preserve existing team data if new data is not provided
      let redTeams: any[];
      let blueTeams: any[];
      
      if (isNewMatch) {
        console.log('[useUnifiedAudienceDisplay] NEW MATCH - Resetting team data and using new data if available');
        redTeams = hasNewRedTeams ? data.redTeams || [] : [];
        blueTeams = hasNewBlueTeams ? data.blueTeams || [] : [];
      } else {
        console.log('[useUnifiedAudienceDisplay] SAME MATCH - Preserving existing team data if new data not available');
        redTeams = hasNewRedTeams ? data.redTeams || [] : prev.matchState.redTeams;
        blueTeams = hasNewBlueTeams ? data.blueTeams || [] : prev.matchState.blueTeams;
      }
      
      console.log('[useUnifiedAudienceDisplay] Final teams - Red:', redTeams, 'Blue:', blueTeams);
      console.log('useUnifiedAudienceDisplay] Final team counts - Red:', redTeams?.length || 0, 'Blue:', blueTeams?.length || 0);

      const newState = {
        ...prev,
        matchState: {
          ...prev.matchState,
          matchId: data.id || prev.matchState.matchId,
          matchNumber: data.matchNumber || prev.matchState.matchNumber,
          status: data.status || prev.matchState.status,
          redTeams: redTeams || [],
          blueTeams: blueTeams || [],
          // Reset other match-specific data when switching matches
          name: isNewMatch ? null : prev.matchState.name,
          currentPeriod: isNewMatch ? null : prev.matchState.currentPeriod
        },
        displaySettings: {
          ...prev.displaySettings,
          displayMode: "match" as DisplayMode,
          matchId: data.id,
          updatedAt: Date.now()
        }
      };
      
      console.log('🎭 [useUnifiedAudienceDisplay] NEW state being set:', newState);
      return newState;
    });

    console.log('🎭 [useUnifiedAudienceDisplay] COMPLETED match state update for field:', fieldId);
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