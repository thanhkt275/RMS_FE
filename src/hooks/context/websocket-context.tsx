// This file is deprecated. Use the unified WebSocket service directly.
// The context wrapper adds unnecessary complexity when the service is already a singleton.

import { unifiedWebSocketService } from '@/lib/unified-websocket';

/**
 * @deprecated This context wrapper is no longer needed.
 * Use the unifiedWebSocketService directly or useUnifiedWebSocket hook instead.
 * The service is already a singleton and doesn't need React context wrapping.
 */

// Re-export for backward compatibility during migration
export { unifiedWebSocketService as websocketService };

// Temporary compatibility function for existing code
export function useWebSocketContext() {
  console.warn('useWebSocketContext is deprecated. Use unifiedWebSocketService directly or useUnifiedWebSocket hook.');
  
  return {
    service: unifiedWebSocketService,
    isConnected: unifiedWebSocketService.isConnected(),
    connectionAttempts: 0, // Not tracked in unified service
  };
}

// Deprecated provider component
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  console.warn('WebSocketProvider is deprecated. The unified WebSocket service is a singleton and does not need React context.');
  return <>{children}</>;
}
