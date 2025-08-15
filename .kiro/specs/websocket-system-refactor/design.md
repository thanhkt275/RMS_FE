# WebSocket System Refactor Design

## Overview

This design simplifies the current WebSocket architecture by reducing layers of abstraction, consolidating overlapping responsibilities, and implementing a more straightforward event-driven system. The new architecture focuses on four core components with clear boundaries and minimal interdependencies.

## Architecture

### Current Issues Analysis

The existing system has several architectural problems:
- **Over-abstraction**: Multiple manager classes (ConnectionManager, EventManager, DebounceManager, RoleManager, StateSynchronizer) with overlapping concerns
- **Complex state tracking**: Timer control has multiple timestamp tracking mechanisms causing drift and synchronization issues
- **Circular dependencies**: Components depend on each other in complex ways making testing difficult
- **Inconsistent event handling**: Different patterns for similar operations across the codebase

### New Simplified Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WebSocket Client                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Connection    │  │     Events      │  │    State     │ │
│  │    Handler      │  │    Handler      │  │   Manager    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Permission Controller                      │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. WebSocket Client (Main Interface)

**Responsibility**: Single entry point for all WebSocket operations

```typescript
interface WebSocketClient {
  // Connection
  connect(url: string): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  
  // Events
  emit(event: string, data: any, options?: EmitOptions): void;
  on(event: string, callback: EventCallback): () => void;
  off(event: string): void;
  
  // State
  getState(key: string): any;
  setState(key: string, value: any): void;
  
  // Permissions
  setRole(role: UserRole): void;
  canPerform(action: string): boolean;
}

interface EmitOptions {
  debounce?: number;
  compress?: boolean;
  priority?: 'low' | 'normal' | 'high';
}
```

### 2. Connection Handler

**Responsibility**: Manages WebSocket connection lifecycle only

```typescript
class ConnectionHandler {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  async connect(url: string): Promise<void>
  disconnect(): void
  isConnected(): boolean
  onConnectionChange(callback: (connected: boolean) => void): void
  
  // Simple exponential backoff - no complex state tracking
  private handleReconnect(): void
  private setupSocketHandlers(): void
}
```

### 3. Events Handler

**Responsibility**: Event subscription, emission, and optimization

```typescript
class EventsHandler {
  private eventCallbacks = new Map<string, Set<EventCallback>>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private lastEventData = new Map<string, any>();
  
  emit(event: string, data: any, options?: EmitOptions): void
  on(event: string, callback: EventCallback): () => void
  off(event: string): void
  
  // Optimization methods
  private shouldDebounce(event: string, options?: EmitOptions): boolean
  private isDuplicate(event: string, data: any): boolean
  private compressData(data: any): any
  private batchEvents(): void
}
```

### 4. State Manager

**Responsibility**: Centralized state management with conflict resolution

```typescript
class StateManager {
  private state = new Map<string, any>();
  private stateHistory = new Map<string, StateHistoryEntry[]>();
  private conflictResolver: ConflictResolver;
  
  getState(key: string): any
  setState(key: string, value: any, metadata?: StateMetadata): void
  syncState(updates: StateUpdate[]): void
  
  // Simplified conflict resolution
  private resolveConflict(current: any, incoming: any, metadata: StateMetadata): any
  private recordStateChange(key: string, oldValue: any, newValue: any): void
}

interface StateMetadata {
  userId: string;
  userRole: UserRole;
  timestamp: number;
  version: number;
}
```

### 5. Permission Controller

**Responsibility**: Role-based access control only

```typescript
class PermissionController {
  private currentRole: UserRole = UserRole.SPECTATOR;
  private rolePermissions = new Map<UserRole, Set<string>>();
  
  setRole(role: UserRole): void
  canPerform(action: string): boolean
  getCurrentRole(): UserRole
  
  // Simple permission checking - no complex UI access control
  private initializePermissions(): void
}
```

## Data Models

### Simplified Event Model

```typescript
interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: number;
  userId?: string;
  metadata?: {
    version: number;
    priority: 'low' | 'normal' | 'high';
    compressed: boolean;
  };
}
```

### Simplified State Model

```typescript
interface AppState {
  matches: Map<string, MatchState>;
  timers: Map<string, TimerState>;
  scores: Map<string, ScoreState>;
  users: Map<string, UserState>;
}

interface TimerState {
  matchId: string;
  duration: number;
  remaining: number;
  isRunning: boolean;
  period: 'auto' | 'teleop' | 'endgame';
  lastUpdate: number;
}
```

## Error Handling

### Centralized Error Management

```typescript
class ErrorHandler {
  private errorCallbacks = new Set<(error: WebSocketError) => void>();
  
  handleError(error: Error, context: string): void
  onError(callback: (error: WebSocketError) => void): () => void
  
  private categorizeError(error: Error): 'connection' | 'data' | 'permission' | 'unknown'
  private shouldRetry(error: WebSocketError): boolean
}

interface WebSocketError {
  type: 'connection' | 'data' | 'permission' | 'unknown';
  message: string;
  context: string;
  timestamp: number;
  recoverable: boolean;
}
```

## Testing Strategy

### Component Isolation

Each component will be independently testable:

```typescript
// Mock WebSocket for testing
class MockWebSocket implements WebSocket {
  // Simulate connection states, message sending, etc.
}

// Test individual components
describe('ConnectionHandler', () => {
  it('should reconnect with exponential backoff', () => {
    // Test reconnection logic in isolation
  });
});

describe('EventsHandler', () => {
  it('should debounce rapid events', () => {
    // Test debouncing without WebSocket dependency
  });
});
```

### Integration Testing

```typescript
describe('WebSocket Integration', () => {
  it('should handle timer updates end-to-end', async () => {
    // Test complete flow from timer start to display update
  });
  
  it('should resolve state conflicts correctly', async () => {
    // Test multi-user scenarios with conflict resolution
  });
});
```

## Migration Strategy

### Phase 1: Create New Components
- Implement new simplified components alongside existing ones
- Add feature flags to switch between old and new implementations
- Ensure new components pass all existing tests

### Phase 2: Update Hooks
- Modify hooks to use new WebSocket client
- Maintain backward compatibility during transition
- Update one hook at a time to minimize risk

### Phase 3: Remove Old Components
- Remove unused manager classes
- Clean up complex state tracking logic
- Simplify timer control implementation

### Phase 4: Optimization
- Implement request batching
- Add compression for large payloads
- Fine-tune debouncing parameters

## Performance Optimizations

### Request Minimization

1. **Event Batching**: Group compatible events into single WebSocket messages
2. **Delta Updates**: Send only changed fields instead of complete objects
3. **Duplicate Filtering**: Prevent sending identical consecutive events
4. **Smart Debouncing**: Use different debounce intervals based on event importance

### Memory Management

1. **Automatic Cleanup**: Remove event listeners and clear timers on disconnect
2. **State Pruning**: Limit history size and remove old entries
3. **Weak References**: Use WeakMap for temporary data associations

### Network Efficiency

1. **Payload Compression**: Compress large data before transmission
2. **Heartbeat Optimization**: Reduce heartbeat frequency when idle
3. **Priority Queuing**: Send high-priority events immediately, batch low-priority ones

## Backward Compatibility

The new system will maintain the same public API as the current unified WebSocket service, ensuring existing components continue to work without modification during the transition period.