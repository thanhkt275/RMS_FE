// WebSocket Types for Real-time Score Synchronization
// These interfaces mirror the backend DTOs for type safety

export interface GameElementDto {
  element: string;
  count: number;
  pointsEach: number;
  totalPoints: number;
  operation: 'multiply' | 'add';
}

// Base interface to avoid type conflicts (matches backend BaseScoreDto)
export interface BaseScoreData {
  matchId: string;
  tournamentId: string;
  fieldId?: string;
  redAutoScore: number;
  redDriveScore: number;
  redTotalScore: number;
  blueAutoScore: number;
  blueDriveScore: number;
  blueTotalScore: number;
  redPenalty?: number;
  bluePenalty?: number;
  redGameElements?: GameElementDto[];
  blueGameElements?: GameElementDto[];
  redTeamCount?: number;
  redMultiplier?: number;
  blueTeamCount?: number;
  blueMultiplier?: number;
  scoreDetails?: Record<string, unknown>;
}

// For real-time score updates (no database persistence)
export interface ScoreUpdateData extends BaseScoreData {
  type: 'realtime';
}

// For database persistence requests
export interface PersistScoresData extends BaseScoreData {
  type: 'persist'; // FIXED: must match backend expectation
}

// Response from persistence operations
export interface PersistenceResultData {
  success: boolean;
  matchId: string;
  message?: string;
  error?: string;
  data?: unknown;
}

// Event types for WebSocket communication
export type WebSocketScoreEvent =
  | 'scoreUpdateRealtime'
  | 'persistScores'
  | 'scoreUpdated'
  | 'scoresPersisted'
  | 'scorePersistenceError';

// Connection status
export interface WebSocketConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
}

// Error types
export interface WebSocketError {
  event: string;
  message: string;
  data?: unknown;
  timestamp: Date;
}

// Common WebSocket event data structure
export interface WebSocketEventData extends Record<string, unknown> {
  tournamentId?: string;
  fieldId?: string;
  timestamp?: number;
  userRole?: string;
}

// Collaborative session event data types
export interface CollaborativeStateUpdateData {
  matchId: string;
  state: any;
  update: any;
}

export interface UserSessionEventData {
  matchId: string;
  userId: string;
  userRole?: string;
  timestamp?: number;
}

export interface UserDisconnectEventData {
  userId: string;
  timestamp: number;
  reason?: string;
}

export interface StateSyncRequestData {
  matchId: string;
  userId: string;
  timestamp?: number;
}

export interface StateSyncResponseData {
  matchId: string;
  state: any;
  requesterId: string;
  providerId: string;
  timestamp: number;
}

export interface SessionHeartbeatData {
  matchId: string;
  userId: string;
  timestamp: number;
}

// Event callback types
export type ScoreUpdateCallback = (data: BaseScoreData) => void;
export type PersistenceResultCallback = (data: PersistenceResultData) => void;
export type ConnectionStatusCallback = (status: WebSocketConnectionStatus) => void;
export type ErrorCallback = (error: WebSocketError) => void;
