# WebSocket Service Migration - Legacy Cleanup

## Overview
This migration removes legacy WebSocket service files that were no longer in use and updates all references to use the unified WebSocket service.

## Files Removed
1. **`src/hooks/scoring/services/websocket.service.ts`** - DELETED
   - Legacy adapter that referenced a missing `@/lib/unified-websocket` service
   - This adapter was causing import errors as it tried to import a non-existent service

## Files Updated

### 1. `src/hooks/scoring/use-realtime.ts`
- **Changed**: Replaced `WebSocketServiceAdapter` with `unifiedWebSocketService`
- **Changed**: Updated method calls from `onScoreUpdate()` to `on('scoreUpdateRealtime', callback)`
- **Changed**: Updated method calls from `sendRealtimeScoreUpdate()` to `emit('scoreUpdateRealtime', data, options)`
- **Added**: Migration note in file header

### 2. `src/hooks/context/websocket-context.tsx`
- **Changed**: Replaced `import websocketService from '@/lib/unified-websocket'` with `import { unifiedWebSocketService }`
- **Changed**: Updated interface to use `IUnifiedWebSocketService`
- **Changed**: Updated connection status handling to match new service API
- **Changed**: Exported `unifiedWebSocketService as websocketService` for backward compatibility

### 3. `src/app/control-match/page.tsx`
- **Changed**: Replaced `import { webSocketService } from '@/lib/unified-websocket'` with unified service
- **Changed**: Replaced `webSocketService.sendLegacyMatchUpdate()` with `unifiedWebSocketService.emit()`
- **Added**: Comment explaining migration from deprecated WebSocket service

### 4. `src/hooks/scoring/index.ts`
- **Removed**: Export of deleted `WebSocketServiceAdapter`
- **Added**: Comment explaining the removal

## Legacy Services Status

### ✅ Completed Migrations
- All files using the missing `@/lib/unified-websocket` service have been updated
- Legacy WebSocket adapter removed and replaced with unified service
- All imports now point to working services

### 🧹 Cleanup Actions Taken
1. **Removed broken adapter**: `WebSocketServiceAdapter` that referenced non-existent service
2. **Updated method calls**: Changed from adapter methods to unified service API
3. **Fixed import paths**: All imports now reference existing, working services
4. **Added backward compatibility**: Context exports unified service with legacy name

## Missing Files Previously Referenced
- `@/lib/unified-websocket` - This service file never existed or was previously deleted
- The legacy adapter was trying to import this missing service, causing runtime errors

## Impact
- ✅ Removes import errors caused by missing service references
- ✅ Consolidates all WebSocket usage to the unified service
- ✅ Maintains functionality while removing dead code
- ✅ Provides better error handling through unified service
- ✅ Enables role-based access control and multi-user support

## Next Steps
The codebase now uses only the unified WebSocket service. All legacy references have been removed and functionality has been preserved through the new unified architecture.
