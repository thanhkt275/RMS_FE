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
  scoreDetails?: Record<string, any>;
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
  data?: any;
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
  data?: any;
  timestamp: Date;
}

// Event callback types
export type ScoreUpdateCallback = (data: BaseScoreData) => void;
export type PersistenceResultCallback = (data: PersistenceResultData) => void;
export type ConnectionStatusCallback = (status: WebSocketConnectionStatus) => void;
export type ErrorCallback = (error: WebSocketError) => void;
