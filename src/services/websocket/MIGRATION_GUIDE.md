# WebSocket System Migration Guide

## Overview

This guide helps you migrate from the legacy WebSocket system to the new simplified WebSocket system. The new system provides the same functionality with dramatically reduced complexity.

## Quick Migration

### Before (Legacy)
```typescript
import { useUnifiedWebSocket } from '@/hooks/websocket/use-unified-websocket';
import { useCentralizedWebSocket } from '@/hooks/websocket/use-centralized-websocket';
import { useControlMatchWebSocket } from '@/hooks/websocket/use-websocket-new';

// Multiple different hooks for different use cases
const { isConnected, emit } = useUnifiedWebSocket({ tournamentId: 't1' });
const { sendScoreUpdate } = useControlMatchWebSocket('t1', 'f1');
const { subscribe } = useAudienceDisplayWebSocket('t1', 'f1');
```

### After (New System)
```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

// Single hook for all use cases
const { 
  isConnected, 
  emit, 
  sendScoreUpdate, 
  subscribe 
} = useWebSocket({ 
  tournamentId: 't1', 
  fieldId: 'f1',
  userRole: UserRole.HEAD_REFEREE 
});
```

## Detailed Migration Steps

### 1. Update Imports

Replace all legacy WebSocket imports with the new unified import:

```typescript
// Remove these imports
import { useUnifiedWebSocket } from '@/hooks/websocket/use-unified-websocket';
import { useCentralizedWebSocket } from '@/hooks/websocket/use-centralized-websocket';
import { useControlMatchWebSocket } from '@/hooks/websocket/use-websocket-new';
import { useAudienceDisplayWebSocket } from '@/hooks/websocket/use-websocket-new';
import { useWebSocketUnified } from '@/hooks/websocket/use-websocket-unified';

// Replace with this single import
import { useWebSocket } from '@/hooks/useWebSocket';
```

### 2. Update Hook Usage

#### Control Match Components
```typescript
// Before
const {
  isConnected,
  sendScoreUpdate,
  sendTimerUpdate,
  sendMatchUpdate
} = useControlMatchWebSocket(tournamentId, fieldId);

// After
const {
  isConnected,
  sendScoreUpdate,
  sendTimerUpdate,
  sendMatchUpdate
} = useWebSocket({
  tournamentId,
  fieldId,
  userRole: UserRole.HEAD_REFEREE,
  autoConnect: true
});
```

#### Audience Display Components
```typescript
// Before
const {
  isConnected,
  subscribe
} = useAudienceDisplayWebSocket(tournamentId, fieldId);

// After
const {
  isConnected,
  subscribe
} = useWebSocket({
  tournamentId,
  fieldId,
  userRole: UserRole.COMMON,
  autoConnect: true
});
```

#### Tournament Management Components
```typescript
// Before
const {
  isConnected,
  emit,
  joinTournament,
  leaveTournament
} = useUnifiedWebSocket({
  tournamentId,
  autoConnect: true
});

// After
const {
  isConnected,
  emit
} = useWebSocket({
  tournamentId,
  autoConnect: true
});
// Note: Room joining/leaving is now automatic based on tournamentId/fieldId
```

### 3. Update Event Handling

The event handling API remains largely the same:

```typescript
// Event emission (unchanged)
emit('score_update', {
  matchId: 'm1',
  redScore: 100,
  blueScore: 85
});

// Event subscription (unchanged)
useEffect(() => {
  return subscribe('timer_update', (data) => {
    console.log('Timer update:', data);
  });
}, [subscribe]);

// Convenience methods (unchanged)
sendScoreUpdate({
  matchId: 'm1',
  redScore: 100,
  blueScore: 85
});
```

### 4. Update Role Management

```typescript
// Before
const { setUserRole, canAccess } = useUnifiedWebSocket();
setUserRole(UserRole.HEAD_REFEREE);
const canControlTimer = canAccess('timer_control');

// After
const { setUserRole, canEmit } = useWebSocket({
  userRole: UserRole.HEAD_REFEREE // Set initial role in options
});
const canControlTimer = canEmit('timer_update');
```

### 5. Remove Complex Features

The following complex features have been removed for simplicity:

#### Cross-Tab Synchronization
```typescript
// Before - Cross-tab sync was automatic
const { crossTabSync } = useCentralizedWebSocket();

// After - No cross-tab sync (simplified)
// Each tab manages its own connection
const { isConnected } = useWebSocket();
```

#### Vector Clocks and Distributed Locking
```typescript
// Before - Complex state synchronization
const { getCollaborativeState, syncState } = useUnifiedWebSocket();

// After - Removed (use server-side state management instead)
// Focus on simple event emission and subscription
```

#### Memory Management Targets
```typescript
// Before - Complex memory management
const { getMemoryUsage, cleanup } = useUnifiedWebSocket();

// After - Automatic cleanup (no manual management needed)
// Cleanup happens automatically on component unmount
```

## Breaking Changes

### 1. Removed Features
- Cross-tab synchronization
- Vector clocks and distributed locking
- Complex memory management
- Collaborative state synchronization
- Connection pooling
- Advanced debouncing configuration

### 2. Changed APIs
- `canAccess(feature)` → `canEmit(eventType)`
- Room management is now automatic based on `tournamentId`/`fieldId`
- Connection state structure simplified
- Error handling simplified

### 3. Simplified Configuration
```typescript
// Before - Complex configuration
const options = {
  url: 'ws://localhost:3001',
  autoConnect: true,
  reconnectOnFocus: true,
  enableHeartbeat: true,
  enableCrossTabSync: true,
  recoveryStrategy: 'exponential',
  debug: true
};

// After - Simple configuration
const options = {
  url: 'ws://localhost:3001',
  autoConnect: true,
  tournamentId: 't1',
  fieldId: 'f1',
  userRole: UserRole.HEAD_REFEREE,
  debug: true
};
```

## Migration Checklist

- [ ] Update all WebSocket imports to use `useWebSocket` from `@/hooks/useWebSocket`
- [ ] Replace multiple hook calls with single `useWebSocket` call
- [ ] Update role management to use `userRole` option and `canEmit` method
- [ ] Remove cross-tab synchronization code
- [ ] Remove manual room management (now automatic)
- [ ] Remove complex memory management code
- [ ] Update error handling to use simplified error callbacks
- [ ] Test all WebSocket functionality works as expected
- [ ] Remove unused legacy WebSocket imports
- [ ] Update TypeScript types if needed

## Common Migration Patterns

### Pattern 1: Control Match Page
```typescript
// Before
const controlMatch = useControlMatchWebSocket(tournamentId, fieldId);
const unified = useUnifiedWebSocket({ tournamentId });

// After
const webSocket = useWebSocket({
  tournamentId,
  fieldId,
  userRole: UserRole.HEAD_REFEREE,
  autoConnect: true
});
```

### Pattern 2: Audience Display Page
```typescript
// Before
const audience = useAudienceDisplayWebSocket(tournamentId, fieldId);
const centralized = useCentralizedWebSocket({ tournamentId, fieldId });

// After
const webSocket = useWebSocket({
  tournamentId,
  fieldId,
  userRole: UserRole.COMMON,
  autoConnect: true
});
```

### Pattern 3: Tournament Management
```typescript
// Before
const tournament = useUnifiedWebSocket({ 
  tournamentId, 
  userRole: UserRole.ADMIN 
});

// After
const webSocket = useWebSocket({
  tournamentId,
  userRole: UserRole.ADMIN,
  autoConnect: true
});
```

## Troubleshooting

### Issue: Events not being received
**Solution:** Check that `tournamentId` and `fieldId` are correctly set in the hook options.

### Issue: Permission denied errors
**Solution:** Ensure `userRole` is set correctly in the hook options.

### Issue: Connection not establishing
**Solution:** Check the WebSocket URL and ensure the server is running.

### Issue: Missing cross-tab synchronization
**Solution:** This feature was removed for simplicity. Use server-side state management instead.

## Support

If you encounter issues during migration:

1. Check this migration guide
2. Review the new WebSocket service documentation
3. Check the console for deprecation warnings with specific guidance
4. Test the new system thoroughly before removing legacy code

## Timeline

- **Phase 1:** New system available alongside legacy system
- **Phase 2:** Deprecation warnings added to legacy system
- **Phase 3:** Legacy system marked for removal
- **Phase 4:** Legacy system removed

We recommend migrating as soon as possible to take advantage of the simplified architecture and improved maintainability.