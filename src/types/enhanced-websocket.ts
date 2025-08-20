/**
 * Enhanced WebSocket Types for RMS System
 * Provides comprehensive typing for improved WebSocket service
 */

export interface WebSocketConnectionState {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
  lastConnected?: Date;
  error?: string;
  latency?: number;
}

export interface ConnectionMetrics {
  totalReconnects: number;
  connectionUptime: number;
  averageLatency: number;
  lastPingTime?: Date;
}

export interface WebSocketError {
  type: 'CONNECTION_FAILED' | 'RECONNECT_FAILED' | 'MESSAGE_FAILED' | 'VALIDATION_FAILED';
  message: string;
  code?: string;
  timestamp: Date;
  retryable: boolean;
  context?: any;
}

// Match State Management
export interface MatchSession {
  matchId: string;
  tournamentId: string;
  fieldId?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
  startTime?: Date;
  endTime?: Date;
  lastActivity?: Date;
  participants: string[]; // User IDs currently in this match session
}

export interface MatchStateSnapshot {
  matchId: string;
  matchNumber?: number;
  status: string;
  currentPeriod?: string;
  timer?: TimerState;
  scores?: ScoreState;
  teams?: TeamsState;
  metadata?: Record<string, any>;
  version: number; // For conflict resolution
  updatedAt: Date;
  updatedBy?: string; // User ID who made the update
}

export interface TimerState {
  isRunning: boolean;
  remaining: number; // milliseconds
  duration: number; // total duration in milliseconds
  startedAt?: Date;
  pausedAt?: Date;
  period?: 'auto' | 'teleop' | 'endgame';
}

export interface ScoreState {
  red: AllianceScore;
  blue: AllianceScore;
  breakdown?: ScoreBreakdown;
  lastUpdated: Date;
  isRealtime: boolean;
}

export interface AllianceScore {
  auto: number;
  drive: number;
  total: number;
  penalty: number;
  multiplier: number;
  teamCount: number;
  gameElements: GameElement[];
}

export interface ScoreBreakdown {
  [key: string]: any; // Flexible score details
}

export interface GameElement {
  type: string;
  count: number;
  points: number;
}

export interface TeamsState {
  red: TeamInfo[];
  blue: TeamInfo[];
}

export interface TeamInfo {
  id: string;
  name: string;
  code: string;
}

// User Activity Tracking
export interface UserActivity {
  userId: string;
  sessionId: string;
  matchId?: string;
  fieldId?: string;
  tournamentId?: string;
  action: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ActiveUser {
  userId: string;
  sessionId: string;
  username?: string;
  role?: string;
  lastSeen: Date;
  currentMatch?: string;
  currentField?: string;
  permissions?: string[];
}

// Event Types for Enhanced WebSocket
export interface WebSocketEventMap {
  // Connection events
  'connection:status': WebSocketConnectionState;
  'connection:error': WebSocketError;
  'connection:metrics': ConnectionMetrics;
  
  // Match session events
  'match:session_created': MatchSession;
  'match:session_updated': MatchSession;
  'match:session_ended': MatchSession;
  'match:state_changed': MatchStateSnapshot;
  'match:reset': { matchId: string; reason: string };
  
  // Real-time scoring events
  'score:realtime_update': ScoreState;
  'score:persisted': { matchId: string; success: boolean; error?: string };
  'score:conflict': { matchId: string; conflictingVersions: MatchStateSnapshot[] };
  
  // Timer events
  'timer:started': TimerState;
  'timer:paused': TimerState;
  'timer:resumed': TimerState;
  'timer:reset': TimerState;
  'timer:tick': { remaining: number; period?: string };
  
  // User activity events
  'user:joined': ActiveUser;
  'user:left': ActiveUser;
  'user:activity': UserActivity;
  'user:conflict': { action: string; users: ActiveUser[] };
  
  // Audience display events
  'display:mode_changed': AudienceDisplaySettings;
  'display:announcement': AnnouncementData;
  
  // System events
  'system:maintenance': { message: string; scheduledTime?: Date };
  'system:broadcast': { message: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' };
}

// Enhanced settings types
export interface AudienceDisplaySettings {
  displayMode: 'match' | 'teams' | 'schedule' | 'rankings' | 'blank' | 'announcement';
  tournamentId: string;
  fieldId?: string;
  matchId?: string;
  message?: string;
  updatedAt: number;
  theme?: DisplayTheme;
  layout?: DisplayLayout;
}

export interface DisplayTheme {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: 'small' | 'medium' | 'large';
}

export interface DisplayLayout {
  showTimer?: boolean;
  showScores?: boolean;
  showTeams?: boolean;
  showHeader?: boolean;
  compactMode?: boolean;
}

export interface AnnouncementData {
  message: string;
  duration?: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  tournamentId: string;
  fieldId?: string;
  startTime?: Date;
  endTime?: Date;
}

// Service Configuration
export interface EnhancedWebSocketConfig {
  url?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  activityTimeout?: number;
  enableUserTracking?: boolean;
  enableConflictResolution?: boolean;
  enableMetrics?: boolean;
  debugMode?: boolean;
}

// Hook return types
export interface UseEnhancedWebSocketReturn {
  // Connection state
  connectionState: WebSocketConnectionState;
  metrics: ConnectionMetrics;
  
  // Core connection methods
  connect: (config?: Partial<EnhancedWebSocketConfig>) => void;
  disconnect: () => void;
  reconnect: () => void;
  
  // Match session management
  createMatchSession: (matchId: string, tournamentId: string, fieldId?: string) => Promise<MatchSession>;
  joinMatchSession: (matchId: string) => Promise<void>;
  leaveMatchSession: (matchId: string) => Promise<void>;
  resetMatch: (matchId: string, reason?: string) => Promise<void>;
  
  // State management
  getMatchState: (matchId: string) => MatchStateSnapshot | null;
  updateMatchState: (matchId: string, updates: Partial<MatchStateSnapshot>) => Promise<void>;
  
  // Real-time scoring
  sendRealtimeScore: (matchId: string, scores: Partial<ScoreState>) => Promise<void>;
  persistScores: (matchId: string, scores: ScoreState) => Promise<boolean>;
  
  // Timer control
  startTimer: (matchId: string, duration: number) => Promise<void>;
  pauseTimer: (matchId: string) => Promise<void>;
  resumeTimer: (matchId: string) => Promise<void>;
  resetTimer: (matchId: string) => Promise<void>;
  
  // User activity
  getActiveUsers: (matchId?: string, fieldId?: string) => ActiveUser[];
  trackActivity: (action: string, metadata?: Record<string, any>) => void;
  
  // Event subscription
  subscribe: <K extends keyof WebSocketEventMap>(
    event: K,
    callback: (data: WebSocketEventMap[K]) => void
  ) => () => void;
  
  // Display control
  updateDisplay: (settings: AudienceDisplaySettings) => Promise<void>;
  sendAnnouncement: (announcement: AnnouncementData) => Promise<void>;
  
  // Error handling
  onError: (callback: (error: WebSocketError) => void) => () => void;
  retryFailedAction: (actionId: string) => Promise<void>;
}