/**
 * WebSocket Hooks - Unified Export
 * Single Responsibility: Provide unified access to all WebSocket functionality
 * Main entry point for all WebSocket hooks with backward compatibility
 */

// Main unified hook - this is the new primary export
export {
  useWebSocket,
  type UseWebSocketOptions,
  type UseWebSocketReturn,
  type CrossTabSyncData,
  type ConnectionHealthInfo
} from './use-websocket-unified';

// Backward compatibility exports - these will show deprecation warnings
export {
  useTournamentWebSocket,
  useFieldWebSocket,
  useControlMatchWebSocket,
  useAudienceDisplayWebSocket,
  useUnifiedWebSocket,
  migrationGuides,
  logMigrationGuide,
  checkForLegacyHooks,
  type MigrationGuide
} from './use-websocket-new';

// Keep existing hooks for backward compatibility but mark as deprecated
export { useCentralizedWebSocket } from './use-centralized-websocket';
export { useRealtimeScores } from './use-realtime-scores';


// Legacy hook with deprecation warning
import { useWebSocket as useWebSocketUnified } from './use-websocket-unified';

/**
 * @deprecated Use useWebSocket from './use-websocket-unified' instead
 * Legacy unified WebSocket hook maintained for backward compatibility
 */
export function useWebSocketLegacy(options: any = {}) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '⚠️  useWebSocketLegacy is deprecated. Use useWebSocket instead.\n' +
      'The new useWebSocket hook provides enhanced functionality:\n' +
      '- Cross-tab synchronization\n' +
      '- Advanced recovery strategies\n' +
      '- Network state monitoring\n' +
      '- Better error handling\n' +
      '- Performance optimizations'
    );
  }
  
  return useWebSocketUnified({
    ...options,
    legacyMode: true
  });
}

// Utility functions for migration
export const WEBSOCKET_MIGRATION_INFO = {
  version: '2.0.0',
  deprecated_hooks: [
    'useCentralizedWebSocket',
    'useTournamentWebSocket', 
    'useFieldWebSocket',
    'useControlMatchWebSocket',
    'useAudienceDisplayWebSocket',
    'useUnifiedWebSocket',
    'useWebSocketLegacy'
  ],
  new_hook: 'useWebSocket',
  migration_guide_url: '/docs/websocket-migration',
  breaking_changes: [
    'Event callback signatures may have changed',
    'Some configuration options have been renamed',
    'Connection state structure has been enhanced',
    'Error handling has been improved'
  ],
  new_features: [
    'Cross-tab data synchronization',
    'Advanced connection recovery',
    'Network state monitoring', 
    'Connection health tracking',
    'Automatic leader election',
    'Enhanced error handling',
    'Performance optimizations'
  ]
};

/**
 * Development helper to check for deprecated hook usage
 */
function auditWebSocketUsage() {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('auditWebSocketUsage is only available in development mode');
    return;
  }

  console.group('🔍 WebSocket Hook Usage Audit');
  console.log('Current version:', WEBSOCKET_MIGRATION_INFO.version);
  console.log('Recommended hook:', WEBSOCKET_MIGRATION_INFO.new_hook);
  
  console.group('📋 Deprecated Hooks');
  WEBSOCKET_MIGRATION_INFO.deprecated_hooks.forEach(hook => {
    console.log(`❌ ${hook}`);
  });
  console.groupEnd();
  
  console.group('✨ New Features Available');
  WEBSOCKET_MIGRATION_INFO.new_features.forEach(feature => {
    console.log(`✅ ${feature}`);
  });
  console.groupEnd();
  
  console.group('⚠️  Breaking Changes');
  WEBSOCKET_MIGRATION_INFO.breaking_changes.forEach(change => {
    console.log(`🔄 ${change}`);
  });
  console.groupEnd();
  
  console.log(`📖 Migration guide: ${WEBSOCKET_MIGRATION_INFO.migration_guide_url}`);
  console.groupEnd();
}

/**
 * Runtime hook usage tracker (development only)
 */
const hookUsageTracker = new Map<string, number>();

function trackHookUsage(hookName: string) {
  if (process.env.NODE_ENV !== 'development') return;
  
  const count = hookUsageTracker.get(hookName) || 0;
  hookUsageTracker.set(hookName, count + 1);
  
  // Log usage statistics periodically
  if (count === 0) {
    console.log(`📊 First usage of ${hookName} detected`);
  } else if (count % 10 === 0) {
    console.log(`📊 ${hookName} used ${count + 1} times`);
  }
}

function getHookUsageStats() {
  if (process.env.NODE_ENV !== 'development') {
    return {};
  }
  
  return Object.fromEntries(hookUsageTracker);
}

// Development utilities
if (process.env.NODE_ENV === 'development') {
  // Make utilities available globally for debugging
  (window as any).auditWebSocketUsage = auditWebSocketUsage;
  (window as any).getHookUsageStats = getHookUsageStats;
  (window as any).WEBSOCKET_MIGRATION_INFO = WEBSOCKET_MIGRATION_INFO;
  
  // Log migration info on first import
  console.group('🚀 WebSocket Hooks v2.0.0 Loaded');
  console.log('New unified hook available: useWebSocket');
  console.log('Run auditWebSocketUsage() to check for deprecated usage');
  console.log('Run checkForLegacyHooks() to see migration guides');
  console.groupEnd();
}

// Export utilities
export {
  auditWebSocketUsage,
  trackHookUsage,
  getHookUsageStats
};

// Type exports for backward compatibility
// Note: UseCentralizedWebSocketReturn is not exported from './use-centralized-websocket'.
// Remove the invalid re-export to avoid compile errors. Re-export specific types here
// if/when those types are added or moved to a proper types file.
export type {
  UseCentralizedWebSocketOptions
} from './use-centralized-websocket';

// Re-export centralized WebSocket types
export type {
  CentralizedConnectionState,
  CentralizedEmitOptions,
  CentralizedWebSocketEvent,
  WebSocketManagerConfig
} from '@/services/centralized-websocket/interfaces/websocket-manager.interface';

// Re-export WebSocket event types
export type {
  WebSocketEvents,
  WebSocketEventName,
  WebSocketEventHandler,
  WebSocketUnsubscribe,
  EventEmissionOptions
} from '@/types/websocket-events';

/**
 * Quick start guide for new users
 */
export const QUICK_START_GUIDE = {
  basic_usage: `
import { useWebSocket } from '@/hooks/websocket';

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
    emit('score_update', { score: 100 });
  };
  
  return (
    <div>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      <button onClick={handleScoreUpdate}>Update Score</button>
    </div>
  );
}
  `,
  
  advanced_usage: `
import { useWebSocket } from '@/hooks/websocket';

function AdvancedComponent() {
  const { 
    isConnected, 
    isLeader,
    crossTabSync,
    connectionHealth,
    emit, 
    subscribe,
    setRecoveryStrategy 
  } = useWebSocket({
    tournamentId: 'tournament-123',
    fieldId: 'field-456',
    enableCrossTabSync: true,
    recoveryStrategy: 'exponential',
    debug: true
  });
  
  // Monitor connection health
  useEffect(() => {
    console.log('Connection health:', connectionHealth);
  }, [connectionHealth]);
  
  // Handle cross-tab synchronization
  useEffect(() => {
    console.log('Cross-tab sync status:', crossTabSync);
  }, [crossTabSync]);
  
  return (
    <div>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      <p>Leader Tab: {isLeader ? 'Yes' : 'No'}</p>
      <p>Sync Enabled: {crossTabSync.isEnabled ? 'Yes' : 'No'}</p>
      <p>Network: {connectionHealth.networkState.isOnline ? 'Online' : 'Offline'}</p>
    </div>
  );
}
  `
};
