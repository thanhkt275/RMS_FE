/**
 * DEPRECATED: Legacy WebSocket Types
 *
 * These types belong to the legacy WebSocket layer and are deprecated.
 *
 * Migration Guide:
 * - Use standardized event maps and payloads from `src/websockets/simplified/types`.
 * - Prefer `useWebSocket` and `WebSocketService` under `src/websockets/simplified/`.
 *
 * Build-time: ESLint warns on imports from this module.
 * @deprecated Use the simplified WebSocket types instead.
 */

/** @deprecated Use standardized types in `src/websockets/simplified/types`. */
export interface GameElementDto {
  element: string;
  count: number;
  pointsEach: number;
  totalPoints: number;
  operation: 'multiply' | 'add';
}

// Base interface to avoid type conflicts (matches backend BaseScoreDto)
/** @deprecated Use standardized types in `src/websockets/simplified/types`. */
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
/** @deprecated Use standardized types in `src/websockets/simplified/types`. */
export interface ScoreUpdateData extends BaseScoreData {
  type: 'realtime';
}

// For database persistence requests
/** @deprecated Use standardized types in `src/websockets/simplified/types`. */
export interface PersistScoresData extends BaseScoreData {
  type: 'persist'; // FIXED: must match backend expectation
}

// Response from persistence operations
/** @deprecated Use standardized types in `src/websockets/simplified/types`. */
export interface PersistenceResultData {
  success: boolean;
  matchId: string;
  message?: string;
  error?: string;
  data?: unknown;
}

// Event types for WebSocket communication
/** @deprecated Use standardized event names in `src/websockets/simplified/types`. */
export type WebSocketScoreEvent =
  | 'scoreUpdateRealtime'
  | 'persistScores'
  | 'scoreUpdated'
  | 'scoresPersisted'
  | 'scorePersistenceError';

// Connection status
/** @deprecated Use standardized connection info in `src/websockets/simplified/types`. */
export interface WebSocketConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
}

// Error types
/** @deprecated Use error classes in `src/websockets/simplified/types`. */
export interface WebSocketError {
  event: string;
  message: string;
  data?: unknown;
  timestamp: Date;
}

// Common WebSocket event data structure
/** @deprecated Use standardized payloads in `src/websockets/simplified/types`. */
export interface WebSocketEventData extends Record<string, unknown> {
  tournamentId?: string;
  fieldId?: string;
  timestamp?: number;
  userRole?: string;
}

// Collaborative session event data types
/** @deprecated Use standardized payloads in `src/websockets/simplified/types`. */
export interface CollaborativeStateUpdateData {
  matchId: string;
  state: any;
  update: any;
}

/** @deprecated Use standardized payloads in `src/websockets/simplified/types`. */
export interface UserSessionEventData {
  matchId: string;
  userId: string;
  userRole?: string;
  timestamp?: number;
}

/** @deprecated Use standardized payloads in `src/websockets/simplified/types`. */
export interface UserDisconnectEventData {
  userId: string;
  timestamp: number;
  reason?: string;
}

/** @deprecated Use standardized payloads in `src/websockets/simplified/types`. */
export interface StateSyncRequestData {
  matchId: string;
  userId: string;
  timestamp?: number;
}

/** @deprecated Use standardized payloads in `src/websockets/simplified/types`. */
export interface StateSyncResponseData {
  matchId: string;
  state: any;
  requesterId: string;
  providerId: string;
  timestamp: number;
}

/** @deprecated Use standardized payloads in `src/websockets/simplified/types`. */
export interface SessionHeartbeatData {
  matchId: string;
  userId: string;
  timestamp: number;
}

// Event callback types
/** @deprecated Use standardized callbacks in `src/websockets/simplified/types`. */
export type ScoreUpdateCallback = (data: BaseScoreData) => void;
/** @deprecated Use standardized callbacks in `src/websockets/simplified/types`. */
export type PersistenceResultCallback = (data: PersistenceResultData) => void;
/** @deprecated Use standardized callbacks in `src/websockets/simplified/types`. */
export type ConnectionStatusCallback = (status: WebSocketConnectionStatus) => void;
/** @deprecated Use standardized callbacks in `src/websockets/simplified/types`. */
export type ErrorCallback = (error: WebSocketError) => void;
