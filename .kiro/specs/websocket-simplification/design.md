# Design Document

## Overview

The simplified WebSocket system will replace the current complex architecture with a clean, maintainable solution consisting of just 4 core files:

1. **WebSocketService** - Core connection and event management
2. **useWebSocket** - Single unified React hook
3. **types** - TypeScript definitions
4. **utils** - Helper functions and constants

This design eliminates unnecessary complexity while preserving all essential functionality for real-time tournament management.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Hook    │    │  WebSocket       │    │   Socket.IO     │
│   useWebSocket  │◄──►│  Service         │◄──►│   Server        │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Role Manager    │
                       │  (embedded)      │
                       └──────────────────┘
```

### Simplified vs Current Architecture

**Current (Complex):**
- 20+ files across 3 directories
- Multiple services: Unified, Centralized, Legacy
- Cross-tab coordination with vector clocks
- Memory managers and cleanup targets
- 8+ different hooks

**New (Simplified):**
- 4 core files in single directory
- One service, one hook
- No cross-tab complexity
- Simple memory management
- One hook for all use cases

## Components and Interfaces

### 1. WebSocketService

**Purpose:** Core service handling connection, events, rooms, and permissions.

**Key Methods:**
```typescript
class WebSocketService {
  // Connection Management
  connect(url?: string): Promise<void>
  disconnect(): void
  isConnected(): boolean
  getConnectionStatus(): ConnectionStatus
  
  // Event Management
  emit(event: string, data: any): void
  subscribe(event: string, callback: Function): () => void
  
  // Room Management
  joinRoom(roomId: string, roomType: 'tournament' | 'field'): void
  leaveRoom(roomId: string): void
  
  // Role Management
  setUserRole(role: UserRole): void
  canEmit(eventType: string): boolean
  
  // Convenience Methods
  sendScoreUpdate(data: ScoreData): void
  sendTimerUpdate(data: TimerData): void
  sendMatchUpdate(data: MatchData): void
  sendDisplayModeChange(data: DisplayData): void
  sendAnnouncement(data: AnnouncementData): void
}
```

**Internal Structure:**
- Socket.IO client instance
- Event subscriptions map
- Current rooms set
- User role state
- Connection state with auto-reconnect
- Simple role permission mapping

### 2. useWebSocket Hook

**Purpose:** Single React hook providing all WebSocket functionality.

**API:**
```typescript
interface UseWebSocketOptions {
  url?: string
  autoConnect?: boolean
  tournamentId?: string
  fieldId?: string
  userRole?: UserRole
  debug?: boolean
}

interface UseWebSocketReturn {
  // Connection State
  isConnected: boolean
  connectionStatus: ConnectionStatus
  
  // Core Methods
  connect: () => Promise<void>
  disconnect: () => void
  emit: (event: string, data: any) => void
  subscribe: (event: string, callback: Function) => () => void
  
  // Room Management
  joinedRooms: string[]
  
  // Convenience Methods
  sendScoreUpdate: (data: ScoreData) => void
  sendTimerUpdate: (data: TimerData) => void
  sendMatchUpdate: (data: MatchData) => void
  sendDisplayModeChange: (data: DisplayData) => void
  sendAnnouncement: (data: AnnouncementData) => void
  
  // Role & Permissions
  userRole: UserRole
  setUserRole: (role: UserRole) => void
  canEmit: (eventType: string) => boolean
  
  // Debug Info
  getStats: () => ConnectionStats
}
```

### 3. Role Management (Embedded)

**Purpose:** Simple role-based permissions embedded in WebSocketService.

**Role Hierarchy:**
```typescript
enum UserRole {
  ADMIN = 'ADMIN',
  HEAD_REFEREE = 'HEAD_REFEREE', 
  ALLIANCE_REFEREE = 'ALLIANCE_REFEREE',
  TEAM_LEADER = 'TEAM_LEADER',
  TEAM_MEMBER = 'TEAM_MEMBER',
  COMMON = 'COMMON'
}

// Permission Matrix
const ROLE_PERMISSIONS = {
  [UserRole.ADMIN]: ['*'], // All events
  [UserRole.HEAD_REFEREE]: ['*'], // All events
  [UserRole.ALLIANCE_REFEREE]: ['score_update', 'match_update'],
  [UserRole.TEAM_LEADER]: [], // Receive only
  [UserRole.TEAM_MEMBER]: [], // Receive only
  [UserRole.COMMON]: [] // Receive only
}
```

### 4. Auto-Reconnection Strategy

**Purpose:** Reliable connection management without complexity.

**Implementation:**
```typescript
class ReconnectionManager {
  private attempts = 0
  private maxAttempts = 5
  private delays = [2000, 4000, 8000, 16000, 32000] // Exponential backoff
  
  async reconnect(): Promise<void> {
    if (this.attempts >= this.maxAttempts) {
      throw new Error('Max reconnection attempts reached')
    }
    
    await this.delay(this.delays[this.attempts])
    this.attempts++
    
    try {
      await this.connect()
      this.attempts = 0 // Reset on success
      await this.rejoinRooms() // Rejoin previous rooms
    } catch (error) {
      return this.reconnect() // Retry
    }
  }
}
```

## Data Models

### Connection Status
```typescript
interface ConnectionStatus {
  state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
  connected: boolean
  reconnectAttempts: number
  lastConnected?: Date
  lastError?: string
}
```

### Event Subscription
```typescript
interface EventSubscription {
  id: string
  event: string
  callback: (data: any) => void
  createdAt: number
}
```

### Room State
```typescript
interface RoomState {
  roomId: string
  roomType: 'tournament' | 'field'
  joinedAt: number
}
```

### Connection Stats (Debug)
```typescript
interface ConnectionStats {
  isConnected: boolean
  reconnectAttempts: number
  joinedRooms: string[]
  activeSubscriptions: number
  userRole: UserRole
  lastActivity: Date
  totalEvents: {
    sent: number
    received: number
  }
}
```

## Error Handling

### Error Types
```typescript
enum WebSocketErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROOM_JOIN_FAILED = 'ROOM_JOIN_FAILED',
  INVALID_EVENT = 'INVALID_EVENT'
}

interface WebSocketError extends Error {
  type: WebSocketErrorType
  context?: Record<string, any>
}
```

### Error Handling Strategy
1. **Connection Errors:** Auto-retry with exponential backoff
2. **Permission Errors:** Log warning, block emission, notify callback
3. **Room Errors:** Retry room join, fallback to tournament-only scope
4. **Event Errors:** Validate event format, provide clear error messages

## Testing Strategy

### Unit Tests
- **WebSocketService:** Connection management, event handling, role permissions
- **useWebSocket Hook:** React hook behavior, state management, cleanup
- **Role Manager:** Permission validation for different roles
- **Reconnection:** Backoff timing, room rejoining, error scenarios

### Integration Tests
- **End-to-End Event Flow:** Control match → audience display synchronization
- **Room Scoping:** Tournament and field event filtering
- **Role Enforcement:** Permission blocking across different user roles
- **Connection Recovery:** Network interruption and reconnection scenarios

### Migration Tests
- **Backward Compatibility:** Legacy hooks continue working with deprecation warnings
- **API Compatibility:** Existing event payloads and room joining behavior
- **Performance:** New system performs as well or better than current system

## Migration Strategy

### Phase 1: Create New System
1. Implement new WebSocketService
2. Implement new useWebSocket hook
3. Add comprehensive tests
4. Create migration documentation

### Phase 2: Parallel Operation
1. Deploy new system alongside existing system
2. Create shim layers for legacy hooks
3. Add deprecation warnings to legacy hooks
4. Update documentation with migration examples

### Phase 3: Gradual Migration
1. Migrate control match pages to new hook
2. Migrate audience display pages to new hook
3. Migrate remaining components
4. Monitor for issues and performance

### Phase 4: Cleanup
1. Remove legacy hooks and services
2. Remove unused dependencies
3. Clean up file structure
4. Update build configuration

## File Structure

```
src/services/websocket/
├── index.ts              # Main exports
├── WebSocketService.ts   # Core service
├── types.ts             # TypeScript definitions
└── utils.ts             # Helper functions

src/hooks/
└── useWebSocket.ts      # Unified React hook

# Legacy (deprecated, will be removed)
src/services/unified-websocket/     # Mark as deprecated
src/services/centralized-websocket/ # Mark as deprecated  
src/hooks/websocket/                # Mark as deprecated
```

## Performance Considerations

### Memory Usage
- **Reduced Overhead:** Eliminate multiple managers and bounded collections
- **Simple Subscriptions:** Use Map instead of complex event management
- **No Cross-Tab Sync:** Remove memory-intensive cross-tab coordination

### Network Efficiency
- **No Heartbeats:** Rely on Socket.IO built-in heartbeat
- **No Acknowledgments:** Remove custom acknowledgment system
- **Efficient Room Management:** Join/leave rooms only when needed

### Bundle Size
- **Smaller Footprint:** Reduce from ~20 files to 4 files
- **Remove Dependencies:** Eliminate unused utility libraries
- **Tree Shaking:** Better dead code elimination

## Security Considerations

### Role-Based Access Control
- **Client-Side Validation:** Block unauthorized emissions with warnings
- **Server-Side Enforcement:** Server must validate all events (unchanged)
- **Role Transitions:** Validate role changes and update permissions

### Event Validation
- **Event Format:** Validate event names and payload structure
- **Room Context:** Ensure events include proper room context
- **Rate Limiting:** Rely on server-side rate limiting (remove client-side complexity)

## Monitoring and Debugging

### Debug Mode
```typescript
// Enable debug logging
const { ... } = useWebSocket({ 
  tournamentId: 't1', 
  debug: true 
})

// Debug output:
// [WebSocket] Connected to ws://localhost:3001
// [WebSocket] Joined tournament room: tournament_t1
// [WebSocket] Emitting score_update: { matchId: 'm1', ... }
// [WebSocket] Received timer_update: { remaining: 120, ... }
```

### Connection Statistics
```typescript
const stats = getStats()
// {
//   isConnected: true,
//   reconnectAttempts: 0,
//   joinedRooms: ['tournament_t1', 'field_f1'],
//   activeSubscriptions: 5,
//   userRole: 'HEAD_REFEREE',
//   totalEvents: { sent: 23, received: 45 }
// }
```

This design provides a clean, maintainable WebSocket solution that preserves all essential functionality while dramatically reducing complexity.