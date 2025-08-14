/**
 * Standardized WebSocket Event Types for RMS System
 * Provides type-safe event definitions for consistent communication
 */

import { UserRole } from './types';

// Base event data interface
export interface BaseEventData {
  tournamentId?: string;
  fieldId?: string;
  timestamp?: number;
  userId?: string;
  isGlobal?: boolean;
}

// Score event data
export interface ScoreUpdateData extends BaseEventData {
  matchId: string;
  redAutoScore: number;
  redDriveScore: number;
  redTotalScore: number;
  redPenalty: number;
  blueAutoScore: number;
  blueDriveScore: number;
  blueTotalScore: number;
  bluePenalty: number;
  redTeamCount?: number;
  blueTeamCount?: number;
  redMultiplier?: number;
  blueMultiplier?: number;
  redGameElements?: any[];
  blueGameElements?: any[];
  scoreDetails?: any;
  isRealtime?: boolean;
}

// Timer event data
export interface TimerUpdateData extends BaseEventData {
  duration: number;
  remaining: number;
  isRunning: boolean;
  startedAt?: number;
  pausedAt?: number;
  period?: string;
  matchId?: string;
}

export interface TimerStartData extends BaseEventData {
  matchId: string;
  duration: number;
  period: string;
  startedAt: number;
}

export interface TimerPauseData extends BaseEventData {
  matchId: string;
  pausedAt: number;
  remaining: number;
}

export interface TimerResetData extends BaseEventData {
  matchId: string;
  duration: number;
  period?: string;
}

// Match event data
export interface MatchUpdateData extends BaseEventData {
  matchId: string;
  matchNumber?: number;
  name?: string;
  status?: string;
  currentPeriod?: 'auto' | 'teleop' | 'endgame';
  redTeams?: Array<{ name: string; id?: string }>;
  blueTeams?: Array<{ name: string; id?: string }>;
  startTime?: string;
  endTime?: string;
}

export interface MatchStateChangeData extends BaseEventData {
  matchId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  currentPeriod?: 'auto' | 'teleop' | 'endgame' | null;
  previousStatus?: string;
  reason?: string;
}

// Display event data
export interface DisplayModeChangeData extends BaseEventData {
  displayMode: 'match' | 'schedule' | 'teams' | 'rankings' | 'announcement';
  matchId?: string;
  scheduleType?: string;
  announcementText?: string;
  duration?: number;
  updatedAt: number;
}

// Communication event data
export interface AnnouncementData extends BaseEventData {
  message: string;
  duration?: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  startTime?: number;
  endTime?: number;
}

// Connection event data
export interface ConnectionStatusData {
  connected: boolean;
  state: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR';
  reconnectAttempts?: number;
  lastConnected?: number;
  error?: string;
}

export interface RoomJoinedData extends BaseEventData {
  roomId: string;
  roomType: 'tournament' | 'field' | 'match';
  memberCount?: number;
}

export interface RoomLeftData extends BaseEventData {
  roomId: string;
  roomType: 'tournament' | 'field' | 'match';
  memberCount?: number;
}

// User session data
export interface UserSessionData extends BaseEventData {
  userId: string;
  username?: string;
  role: UserRole;
  sessionId: string;
  joinedAt: number;
}

// Standardized WebSocket Events Interface
export interface WebSocketEvents {
  // Score events
  'score_update': ScoreUpdateData;
  
  // Timer events  
  'timer_update': TimerUpdateData;
  'timer_start': TimerStartData;
  'timer_pause': TimerPauseData;
  'timer_reset': TimerResetData;
  
  // Match events
  'match_update': MatchUpdateData;
  'match_state_change': MatchStateChangeData;
  
  // Display events
  'display_mode_change': DisplayModeChangeData;
  
  // Communication events
  'announcement': AnnouncementData;
  
  // Connection events
  'connection_status': ConnectionStatusData;
  'room_joined': RoomJoinedData;
  'room_left': RoomLeftData;
  
  // User session events
  'user_joined': UserSessionData;
  'user_left': UserSessionData;
}

// Event name type for type safety
export type WebSocketEventName = keyof WebSocketEvents;

// Event handler type
export type WebSocketEventHandler<T extends WebSocketEventName> = (data: WebSocketEvents[T]) => void;

// Event subscription return type
export type WebSocketUnsubscribe = () => void;

// Event emission options
export interface EventEmissionOptions {
  fieldId?: string;
  tournamentId?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  debounce?: boolean;
  broadcast?: boolean;
}

// Backward compatibility mapping (temporary)
export const LEGACY_EVENT_MAPPING: Record<string, WebSocketEventName> = {
  'scoreUpdateRealtime': 'score_update',
  'start_timer': 'timer_start',
  'pause_timer': 'timer_pause',
  'reset_timer': 'timer_reset',
  'match_state_update': 'match_state_change',
  'display_change': 'display_mode_change',
} as const;

// Helper function to get standardized event name
export function getStandardizedEventName(eventName: string): WebSocketEventName {
  return (LEGACY_EVENT_MAPPING[eventName] as WebSocketEventName) || (eventName as WebSocketEventName);
}

// Type guard functions
export function isScoreUpdateEvent(data: any): data is ScoreUpdateData {
  return data && typeof data.matchId === 'string' && 
         typeof data.redTotalScore === 'number' && 
         typeof data.blueTotalScore === 'number';
}

export function isTimerUpdateEvent(data: any): data is TimerUpdateData {
  return data && typeof data.duration === 'number' && 
         typeof data.remaining === 'number' && 
         typeof data.isRunning === 'boolean';
}

export function isMatchUpdateEvent(data: any): data is MatchUpdateData {
  return data && typeof data.matchId === 'string';
}

export function isAnnouncementEvent(data: any): data is AnnouncementData {
  return data && typeof data.message === 'string';
}
