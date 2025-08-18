// Simplified WebSocket shared types
// SOLID: small, focused types with interface segregation

export type WsEventName = string;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export interface EventPayloadMap {
  // Extend in feature modules: e.g. 'score_update': { matchId: string; score: number }
  [event: WsEventName]: JsonValue;
}

export type EventListener<TMap extends EventPayloadMap = EventPayloadMap> = <K extends keyof TMap & string>(
  event: K,
  data: TMap[K]
) => void;

export interface Subscription {
  unsubscribe: () => void;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface ConnectionInfo {
  state: ConnectionState;
  lastError?: string;
  lastConnectedAt?: number;
}

// Room scoping
export type RoomKey = string; // e.g., 'tournament:123', 'field:abc'

export interface RoomContext {
  tournamentId?: string;
  fieldId?: string;
}

export interface RoomStatus {
  rooms: RoomKey[];
  hasTournament: boolean;
  hasField: boolean;
}

// Role & permissions
export enum UserRole {
  ADMIN = 'ADMIN',
  HEAD_REFEREE = 'HEAD_REFEREE',
  ALLIANCE_REFEREE = 'ALLIANCE_REFEREE',
  TEAM_LEADER = 'TEAM_LEADER',
  TEAM_MEMBER = 'TEAM_MEMBER',
  COMMON = 'COMMON',
}

export type PermissionMatrix =
  | '*'
  | {
      [role in UserRole]?: '*' | WsEventName[];
    };

// Error types for consistent handling (Requirement 6.2)
export class WebSocketError extends Error {
  constructor(message: string, public context?: Record<string, unknown>) {
    super(message);
    this.name = 'WebSocketError';
  }
}

export class ConnectionError extends WebSocketError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'ConnectionError';
  }
}

export class PermissionDeniedError extends WebSocketError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'PermissionDeniedError';
  }
}

export class RoomOperationError extends WebSocketError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'RoomOperationError';
  }
}

export class ValidationError extends WebSocketError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'ValidationError';
  }
}

// Debugging statistics (Requirement 6.3, 6.4)
export interface WebSocketStats {
  sentCount: number;
  receivedCount: number;
  reconnectAttempts: number;
  lastEventAt?: number;
  connectedSince?: number;
}
