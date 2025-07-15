import { useState, useMemo, useEffect } from 'react';
import { useWebSocketContext } from '../context/websocket-context';
import {
  TimerData,
  MatchData,
  ScoreData,
  MatchStateData,
  AudienceDisplaySettings,
  AnnouncementData,
} from '@/types/types';

interface UseOptimizedWebSocketOptions {
  tournamentId?: string;
}

/**
 * Optimized WebSocket hook that minimizes re-renders
 * Uses WebSocket context to avoid prop drilling and excessive function recreations
 */
export function useOptimizedWebSocket(options: UseOptimizedWebSocketOptions = {}) {
  const { service: ws, isConnected } = useWebSocketContext();
  const { tournamentId } = options;
  
  const [currentTournament, setCurrentTournament] = useState<string | null>(tournamentId || null);

  // Sync currentTournament with tournamentId option changes
  useEffect(() => {
    if (tournamentId !== undefined) {
      setCurrentTournament(tournamentId);
    }
  }, [tournamentId]);

  // Core functions that don't depend on state (never re-created)
  const coreActions = useMemo(() => ({
    connect: (url?: string) => ws.connect(url),
    disconnect: () => ws.disconnect(),
    subscribe: <T>(eventName: string, callback: (data: T) => void) => ws.on<T>(eventName, callback),
    unsubscribe: (eventName: string) => ws.off(eventName),
    joinFieldRoom: (fieldId: string) => ws.joinFieldRoom(fieldId),
    leaveFieldRoom: (fieldId: string) => ws.leaveFieldRoom(fieldId),
  }), [ws]);

  // Tournament management (only re-created when necessary)
  const tournamentActions = useMemo(() => ({
    joinTournament: (id: string) => {
      ws.joinTournament(id);
      setCurrentTournament(id);
    },
    leaveTournament: (id: string) => {
      ws.leaveTournament(id);
      setCurrentTournament(null);
    },
  }), [ws]);

  // Actions that depend on currentTournament (re-created only when currentTournament changes)
  const contextualActions = useMemo(() => {
    const createContextualAction = <T extends Record<string, any>>(
      action: (data: T & { tournamentId: string }) => void,
      errorMessage: string
    ) => (data: Omit<T, 'tournamentId'>) => {
      if (!currentTournament) {
        console.error(errorMessage);
        return;
      }
      action({ ...data, tournamentId: currentTournament } as T & { tournamentId: string });
    };    return {
      changeDisplayMode: (settings: Omit<AudienceDisplaySettings, 'updatedAt'> & { tournamentId?: string }) => {
        if (!currentTournament && !settings.tournamentId) {
          console.error('No tournament ID available for changeDisplayMode');
          return;
        }
        ws.sendDisplayModeChange({
          ...settings,
          tournamentId: settings.tournamentId || currentTournament!,
          updatedAt: Date.now(),
        });
      },
      
      sendMatchUpdate: createContextualAction(
        (data: MatchData) => ws.sendMatchUpdate(data),
        'No tournament ID available for sendMatchUpdate'
      ),
      
      sendScoreUpdate: createContextualAction(
        (data: ScoreData) => ws.sendScoreUpdate(data),
        'No tournament ID available for sendScoreUpdate'
      ),
      
      sendMatchStateChange: createContextualAction(
        (data: MatchStateData) => ws.sendMatchStateChange(data),
        'No tournament ID available for sendMatchStateChange'
      ),
      
      startTimer: createContextualAction(
        (data: TimerData) => ws.startTimer(data),
        'No tournament ID available for startTimer'
      ),
      
      pauseTimer: createContextualAction(
        (data: TimerData) => ws.pauseTimer(data),
        'No tournament ID available for pauseTimer'
      ),
      
      resetTimer: createContextualAction(
        (data: TimerData) => ws.resetTimer(data),
        'No tournament ID available for resetTimer'
      ),
      
      sendAnnouncement: (message: string, duration?: number, fieldId?: string) => {
        if (!currentTournament) {
          console.error('No tournament ID available for sendAnnouncement');
          return;
        }
        ws.sendAnnouncement({ 
          message, 
          duration, 
          tournamentId: currentTournament,
          fieldId 
        });
      },
    };
  }, [currentTournament, ws]);

  return {
    isConnected,
    currentTournament,
    
    // Spread the memoized actions
    ...coreActions,
    ...tournamentActions,
    ...contextualActions,
  };
}
