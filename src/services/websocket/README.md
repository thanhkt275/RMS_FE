# Simplified WebSocket System

This directory contains the new simplified WebSocket system that replaces the complex existing implementation.

## 🚨 Migration Notice

**The WebSocket system has been completely redesigned for simplicity and maintainability.**

If you're using legacy WebSocket hooks, please migrate to the new unified system:

- 📖 **[Migration Guide](./MIGRATION_GUIDE.md)** - Complete step-by-step migration instructions
- ⚠️ **[Breaking Changes](./BREAKING_CHANGES.md)** - All breaking changes and solutions
- 🔄 **[API Changes](./API_CHANGES.md)** - Detailed API comparison
- ✅ **[Migration Checklist](./MIGRATION_CHECKLIST.md)** - Comprehensive migration checklist

**Legacy hooks are deprecated and will be removed in a future version.**

## Structure

- **`index.ts`** - Main exports and barrel file
- **`WebSocketService.ts`** - Core WebSocket service class
- **`types.ts`** - TypeScript definitions and interfaces
- **`utils.ts`** - Helper functions and constants
- **`README.md`** - This documentation file

## Usage

### Basic Usage

```typescript
import { useWebSocket } from '@/services/websocket';

function MyComponent() {
  const { isConnected, emit, subscribe } = useWebSocket({
    tournamentId: 'tournament-123',
    autoConnect: true
  });

  // Subscribe to events
  useEffect(() => {
    return subscribe('score_update', (data) => {
      console.log('Score updated:', data);
    });
  }, [subscribe]);

  // Emit events
  const handleScoreUpdate = () => {
    emit('score_update', { 
      matchId: 'match-1',
      redTotalScore: 100,
      blueTotalScore: 85
    });
  };

  return (
    <div>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      <button onClick={handleScoreUpdate}>Update Score</button>
    </div>
  );
}
```

### Advanced Usage with Roles and Rooms

```typescript
import { useWebSocket } from '@/services/websocket';
import { UserRole } from '@/types/types';

function AdvancedComponent() {
  const { 
    isConnected,
    connectionStatus,
    joinedRooms,
    userRole,
    setUserRole,
    canEmit,
    sendScoreUpdate,
    getStats
  } = useWebSocket({
    tournamentId: 'tournament-123',
    fieldId: 'field-456',
    userRole: UserRole.HEAD_REFEREE,
    debug: true
  });

  // Check permissions before emitting
  const handleScoreUpdate = () => {
    if (canEmit('score_update')) {
      sendScoreUpdate({
        matchId: 'match-1',
        redTotalScore: 100,
        blueTotalScore: 85
      });
    } else {
      console.warn('No permission to update scores');
    }
  };

  return (
    <div>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      <p>Status: {connectionStatus.state}</p>
      <p>Role: {userRole}</p>
      <p>Joined Rooms: {joinedRooms.join(', ')}</p>
      <button onClick={handleScoreUpdate}>Update Score</button>
    </div>
  );
}
```

## Key Features

### 1. Single Hook Interface
- One `useWebSocket()` hook for all use cases
- Replaces 8+ legacy hooks with a single, unified interface

### 2. Automatic Connection Management
- Auto-reconnection with exponential backoff
- Connection state tracking and notifications
- Graceful handling of network interruptions

### 3. Room-Based Scoping
- Automatic tournament and field room joining
- Event filtering based on room membership
- Clean room management with automatic cleanup

### 4. Role-Based Permissions
- Client-side permission checking with warnings
- Role-based event emission blocking
- Clear permission denied messages

### 5. Convenience Methods
- `sendScoreUpdate()`, `sendTimerUpdate()`, etc.
- Type-safe event data structures
- Automatic data validation and sanitization

### 6. Debug and Monitoring
- Debug mode with detailed logging
- Connection statistics and health monitoring
- Event tracking and performance metrics

## Migration from Legacy Hooks

### Quick Migration Reference

| Legacy Hook | New Hook | Key Changes |
|-------------|----------|-------------|
| `useWebSocketUnified` | `useWebSocket` | Direct replacement |
| `useCentralizedWebSocket` | `useWebSocket` | UserRole enum, no cross-tab config |
| `useControlMatchWebSocket` | `useWebSocket` | Timer controls unified, explicit role |
| `useAudienceDisplayWebSocket` | `useWebSocket` | State management moved to component |

### Migration Resources

- 📖 **[Migration Guide](./MIGRATION_GUIDE.md)** - Complete step-by-step instructions
- ⚠️ **[Breaking Changes](./BREAKING_CHANGES.md)** - All breaking changes and solutions
- 🔄 **[API Changes](./API_CHANGES.md)** - Detailed API comparison
- ✅ **[Migration Checklist](./MIGRATION_CHECKLIST.md)** - Comprehensive checklist

### Deprecated Hook Shims

Temporary backward compatibility is available:

```typescript
// DEPRECATED - Use for temporary compatibility only
import { 
  useWebSocketUnified,
  useCentralizedWebSocket,
  useControlMatchWebSocket,
  useAudienceDisplayWebSocket 
} from '@/hooks/websocket/deprecated';

// These will show deprecation warnings and will be removed in a future version
```

### Before (Legacy)
```typescript
import { useCentralizedWebSocket } from '@/hooks/websocket';

const { emit, subscribe } = useCentralizedWebSocket({
  tournamentId: 'tournament-123',
  userRole: 'HEAD_REFEREE' // String
});
```

### After (New)
```typescript
import { useWebSocket } from '@/hooks/useWebSocket';
import { UserRole } from '@/types/types';

const { emit, subscribe } = useWebSocket({
  tournamentId: 'tournament-123',
  userRole: UserRole.HEAD_REFEREE // Enum
});
```

## Architecture

The simplified system consists of:

1. **WebSocketService** - Core service handling connections, events, and rooms
2. **useWebSocket Hook** - React hook providing service access with state management
3. **Type Definitions** - Comprehensive TypeScript interfaces
4. **Utility Functions** - Helper functions for validation, permissions, etc.

This replaces the previous complex architecture with 20+ files across multiple directories.

## Error Handling

The system provides comprehensive error handling:

- Connection failures with automatic retry
- Permission denied warnings
- Invalid event data validation
- Room operation failures
- Network interruption recovery

## Performance

Key performance improvements:

- Reduced bundle size (4 files vs 20+ files)
- Shared service instance across components
- Efficient event subscription management
- Automatic cleanup and memory management
- No cross-tab synchronization overhead