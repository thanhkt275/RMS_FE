import { UnifiedWebSocketService } from '@/services/unified-websocket/unified-websocket-service';

// Create singleton instance of the unified WebSocket service
export const unifiedWebSocketService = new UnifiedWebSocketService();

// Export the service for direct access when needed
export { UnifiedWebSocketService } from '@/services/unified-websocket/unified-websocket-service';
export type { IUnifiedWebSocketService } from '@/services/unified-websocket/unified-websocket-service';