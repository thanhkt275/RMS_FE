/**
 * Centralized WebSocket Manager Interfaces
 * Following SOLID principles with clear separation of concerns
 */

import { WebSocketEventData } from '@/types/websocket';
import { EventCallback, EventOptions } from '@/services/unified-websocket/event-manager';
import { ConnectionState } from '@/services/unified-websocket/connection-manager';

/**
 * Connection state for centralized WebSocket management
 */
export interface CentralizedConnectionState {
  isConnected: boolean;
  isLeader: boolean;
  tabId: string;
  connectionStatus: ConnectionState;
  lastHeartbeat: number;
  leaderTabId: string | null;
}

/**
 * Cross-tab message types for BroadcastChannel communication
 */
export type CrossTabMessageType =
  | 'WEBSOCKET_EVENT'
  | 'LEADER_ELECTION'
  | 'LEADER_ELECTED'
  | 'LEADER_ELECTION_FAILED'
  | 'LEADER_HEARTBEAT'
  | 'CONNECTION_STATUS'
  | 'TAB_CLOSING'
  | 'TAB_VISIBILITY_CHANGE'
  | 'FORCE_RECONNECT'
  | 'SYNC_ACK'
  | 'SYNC_REQUEST'
  | 'SYNC_RESPONSE'
  | 'LOCK_ACQUIRE'
  | 'LOCK_RELEASE'
  | 'LOCK_RENEW'
  | 'LOCK_CONFLICT';

/**
 * Cross-tab message structure
 */
export interface CrossTabMessage {
  type: CrossTabMessageType;
  tabId: string;
  timestamp: number;
  messageId: string;
  data?: any;
}

/**
 * Enhanced synchronized message with ordering and reliability features
 */
export interface SynchronizedMessage extends CrossTabMessage {
  sequenceNumber: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  requiresAck?: boolean;
  retryCount?: number;
  maxRetries?: number;
  expiresAt?: number;
  fingerprint?: string;
  vectorClock?: Record<string, number>; // Vector clock for causal ordering
}

/**
 * Message acknowledgment structure
 */
export interface MessageAcknowledgment {
  messageId: string;
  tabId: string;
  timestamp: number;
  status: 'received' | 'processed' | 'failed';
  error?: string;
}

/**
 * Synchronization statistics
 */
export interface SyncStats {
  messagesSent: number;
  messagesReceived: number;
  messagesDropped: number;
  messagesRetried: number;
  averageLatency: number;
  lastSyncTime: number;
  activeConnections: number;
  fallbackActive: boolean;
}

/**
 * WebSocket event with cross-tab metadata
 */
export interface CentralizedWebSocketEvent {
  event: string;
  data: WebSocketEventData;
  timestamp: number;
  tabId: string;
  messageId: string;
}

/**
 * Subscription management for event handlers
 */
export interface EventSubscription {
  id: string;
  event: string;
  callback: EventCallback<any>;
  options?: EventOptions;
  tabId: string;
  createdAt: number;
}

/**
 * Emit options for centralized WebSocket
 */
export interface CentralizedEmitOptions extends EventOptions {
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  broadcast?: boolean;
  debounce?: boolean;
  timeout?: number;
}

/**
 * Main interface for centralized WebSocket management
 * Single Responsibility: Manage WebSocket connection across browser tabs
 */
export interface IWebSocketManager {
  // Connection Management
  connect(url?: string): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  getConnectionState(): CentralizedConnectionState;
  
  // Event Management
  emit(event: string, data: WebSocketEventData, options?: CentralizedEmitOptions): void;
  subscribe<T = WebSocketEventData>(
    event: string, 
    callback: EventCallback<T>, 
    options?: EventOptions
  ): () => void;
  unsubscribe(event: string): void;
  
  // Tab Coordination
  isLeader(): boolean;
  getTabId(): string;
  getLeaderTabId(): string | null;
  
  // Health & Monitoring
  getStats(): Record<string, any>;
  onConnectionStatusChange(callback: (state: CentralizedConnectionState) => void): () => void;
  onError(callback: (error: Error) => void): () => void;
}

/**
 * Interface for cross-tab communication management
 * Single Responsibility: Handle BroadcastChannel communication
 */
export interface ICrossTabCommunicator {
  // Message Broadcasting
  broadcast(message: CrossTabMessage): void;

  // Message Handling
  onMessage(callback: (message: CrossTabMessage) => void): () => void;

  // Channel Management
  isChannelSupported(): boolean;
  getChannelName(): string;
  close(): void;

  // Fallback Support
  enableFallback(fallbackType: 'localStorage' | 'sharedWorker'): void;
}

/**
 * Interface for advanced cross-tab synchronization
 * Single Responsibility: Provide ordered, reliable cross-tab message synchronization
 */
export interface ICrossTabSynchronizer {
  // Enhanced Message Broadcasting
  broadcast(message: Omit<SynchronizedMessage, 'sequenceNumber' | 'timestamp' | 'fingerprint'>): Promise<void>;
  broadcastReliable(message: Omit<SynchronizedMessage, 'sequenceNumber' | 'timestamp' | 'fingerprint'>): Promise<MessageAcknowledgment[]>;

  // Ordered Message Handling
  onMessage(callback: (message: SynchronizedMessage) => void): () => void;
  onOrderedMessage(callback: (message: SynchronizedMessage) => void): () => void;

  // Synchronization Features
  waitForSync(timeout?: number): Promise<void>;
  requestSync(): Promise<SynchronizedMessage[]>;
  getMessageHistory(count?: number): SynchronizedMessage[];

  // Reliability Features
  resendMessage(messageId: string): Promise<void>;
  acknowledgeMessage(messageId: string, status: 'received' | 'processed' | 'failed', error?: string): void;

  // Health and Monitoring
  getStats(): SyncStats;
  isHealthy(): boolean;
  getSequenceNumber(): number;

  // Lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;
  reset(): void;
}

/**
 * Interface for tab leadership management
 * Single Responsibility: Manage leader election and coordination
 */
export interface ITabCoordinator {
  // Leader Election
  electLeader(): Promise<boolean>;
  becomeLeader(): void;
  resignLeadership(): void;

  // Leadership Status
  isLeader(): boolean;
  getLeaderTabId(): string | null;
  getTabId(): string;

  // Heartbeat Management
  startHeartbeat(): void;
  stopHeartbeat(): void;
  onLeaderChange(callback: (newLeaderId: string | null, oldLeaderId: string | null) => void): () => void;

  // Tab Lifecycle
  onTabClosing(): void;
  handleTabClosed(tabId: string): void;

  // Tab Visibility API
  isVisible(): boolean;
  onVisibilityChange(callback: (isVisible: boolean) => void): () => void;
}

/**
 * Connection recovery strategy types
 */
export type RecoveryStrategy = 'immediate' | 'exponential' | 'linear' | 'circuit-breaker';

/**
 * Network connection types
 */
export type NetworkType = 'wifi' | 'cellular' | 'ethernet' | 'unknown';

/**
 * Connection failure types
 */
export type FailureType = 'network' | 'server' | 'client' | 'timeout' | 'unknown';

/**
 * Connection handoff state
 */
export interface ConnectionHandoffState {
  fromTabId: string;
  toTabId: string;
  connectionState: CentralizedConnectionState;
  subscriptions: Array<{ event: string; options?: any }>;
  pendingMessages: Array<{ event: string; data: any; timestamp: number }>;
  handoffStartTime: number;
  handoffId: string;
}

/**
 * Network state information
 */
export interface NetworkState {
  isOnline: boolean;
  connectionType: NetworkType;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  lastChange: number;
}

/**
 * Recovery attempt information
 */
export interface RecoveryAttempt {
  attemptNumber: number;
  strategy: RecoveryStrategy;
  timestamp: number;
  failureType: FailureType;
  delay: number;
  success: boolean;
  error?: string;
}

/**
 * Connection health metrics
 */
export interface ConnectionHealth {
  isHealthy: boolean;
  lastSuccessfulPing: number;
  averageLatency: number;
  failureCount: number;
  successRate: number;
  lastHealthCheck: number;
}

/**
 * Interface for connection state management
 * Single Responsibility: Manage WebSocket connection lifecycle and persistence
 */
export interface IConnectionStateManager {
  // State Management
  getState(): CentralizedConnectionState;
  updateState(updates: Partial<CentralizedConnectionState>): void;

  // State Persistence
  saveState(): Promise<void>;
  loadState(): Promise<CentralizedConnectionState | null>;
  clearState(): Promise<void>;

  // State Synchronization
  syncStateAcrossTabs(): Promise<void>;
  onStateChange(callback: (state: CentralizedConnectionState) => void): () => void;

  // Handoff State Management
  saveHandoffState(handoffState: ConnectionHandoffState): Promise<void>;
  loadHandoffState(handoffId: string): Promise<ConnectionHandoffState | null>;
  clearHandoffState(handoffId: string): Promise<void>;
}

/**
 * Interface for network state monitoring
 * Single Responsibility: Monitor network connectivity and changes
 */
export interface INetworkStateMonitor {
  // Network State
  getNetworkState(): NetworkState;
  isOnline(): boolean;
  getConnectionType(): NetworkType;

  // Network Monitoring
  startMonitoring(): void;
  stopMonitoring(): void;

  // Event Handling
  onNetworkChange(callback: (networkState: NetworkState) => void): () => void;
  onOnlineStatusChange(callback: (isOnline: boolean) => void): () => void;

  // Network Quality
  measureLatency(): Promise<number>;
  estimateBandwidth(): Promise<number>;
  getConnectionQuality(): 'poor' | 'fair' | 'good' | 'excellent';
}

/**
 * Interface for connection recovery management
 * Single Responsibility: Handle connection recovery strategies and health monitoring
 */
export interface IConnectionRecoveryManager {
  // Recovery Management
  startRecovery(failureType: FailureType, error?: Error): Promise<boolean>;
  stopRecovery(): void;
  isRecovering(): boolean;

  // Recovery Strategies
  setRecoveryStrategy(strategy: RecoveryStrategy): void;
  getRecoveryStrategy(): RecoveryStrategy;

  // Health Monitoring
  startHealthMonitoring(): void;
  stopHealthMonitoring(): void;
  getConnectionHealth(): ConnectionHealth;
  performHealthCheck(): Promise<boolean>;

  // Recovery History
  getRecoveryAttempts(): RecoveryAttempt[];
  clearRecoveryHistory(): void;

  // Event Handling
  onRecoveryStart(callback: (attempt: RecoveryAttempt) => void): () => void;
  onRecoverySuccess(callback: (attempt: RecoveryAttempt) => void): () => void;
  onRecoveryFailure(callback: (attempt: RecoveryAttempt) => void): () => void;
  onHealthChange(callback: (health: ConnectionHealth) => void): () => void;
}

/**
 * Interface for connection ownership management
 * Single Responsibility: Manage connection ownership and handoff between tabs
 */
export interface IConnectionOwnershipManager {
  // Ownership Management
  takeOwnership(): Promise<boolean>;
  releaseOwnership(): Promise<void>;
  isOwner(): boolean;
  getOwnerTabId(): string | null;

  // Connection Handoff
  initiateHandoff(targetTabId: string): Promise<boolean>;
  acceptHandoff(handoffState: ConnectionHandoffState): Promise<boolean>;
  completeHandoff(handoffId: string): Promise<void>;
  cancelHandoff(handoffId: string): Promise<void>;

  // Handoff Coordination
  onHandoffRequest(callback: (handoffState: ConnectionHandoffState) => void): () => void;
  onHandoffComplete(callback: (handoffId: string) => void): () => void;
  onOwnershipChange(callback: (newOwner: string | null, oldOwner: string | null) => void): () => void;

  // Connection Management
  establishConnection(): Promise<void>;
  closeConnection(): Promise<void>;
  transferConnection(targetTabId: string): Promise<boolean>;

  // State Management
  getConnectionState(): CentralizedConnectionState;
  syncConnectionState(): Promise<void>;
}

/**
 * Interface for event subscription management
 * Single Responsibility: Manage event subscriptions and distribution
 */
export interface IEventSubscriptionManager {
  // Subscription Management
  addSubscription(subscription: EventSubscription): string;
  removeSubscription(subscriptionId: string): void;
  getSubscriptions(event?: string): EventSubscription[];
  
  // Event Distribution
  distributeEvent(event: string, data: WebSocketEventData): void;
  
  // Cleanup
  cleanupSubscriptions(tabId?: string): void;
  getSubscriptionCount(): number;
}

/**
 * Configuration for WebSocketManager
 */
export interface WebSocketManagerConfig {
  // Connection settings
  url?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  connectionTimeout?: number;
  
  // Cross-tab settings
  channelName?: string;
  heartbeatInterval?: number;
  leaderElectionTimeout?: number;
  
  // Fallback settings
  enableLocalStorageFallback?: boolean;
  enableSharedWorkerFallback?: boolean;
  
  // Debug settings
  debug?: boolean;
  logLevel?: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
}

/**
 * Error types for centralized WebSocket
 */
export interface CentralizedWebSocketError extends Error {
  type: 'CONNECTION' | 'LEADER_ELECTION' | 'CROSS_TAB' | 'SUBSCRIPTION' | 'UNKNOWN';
  tabId: string;
  timestamp: number;
  context?: Record<string, any>;
}
