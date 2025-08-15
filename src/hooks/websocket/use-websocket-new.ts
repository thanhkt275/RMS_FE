/**
 * New Unified WebSocket Hook - Main Export
 * Single Responsibility: Provide unified WebSocket interface with centralized architecture
 * Replaces all existing WebSocket hooks with cross-tab synchronization and backward compatibility
 */

// Re-export the unified hook as the main useWebSocket
export {
  useWebSocket,
  type UseWebSocketOptions,
  type UseWebSocketReturn,
  type CrossTabSyncData,
  type ConnectionHealthInfo
} from './use-websocket-unified';

// Convenience hooks for specific use cases
import { useWebSocket as useWebSocketUnified, UseWebSocketOptions } from './use-websocket-unified';
import { UserRole } from '@/types/types';

/**
 * @deprecated Use useWebSocket with tournamentId option instead
 * Convenience hook for tournament-specific WebSocket connection
 */
export function useTournamentWebSocket(
  tournamentId: string, 
  options: Omit<UseWebSocketOptions, 'tournamentId'> = {}
) {
  console.warn('[useTournamentWebSocket] This hook is deprecated. Use useWebSocket({ tournamentId }) instead.');
  
  return useWebSocketUnified({
    ...options,
    tournamentId,
    autoConnect: true,
    legacyMode: true
  });
}

/**
 * @deprecated Use useWebSocket with fieldId option instead
 * Convenience hook for field-specific WebSocket connection
 */
export function useFieldWebSocket(
  fieldId: string, 
  options: Omit<UseWebSocketOptions, 'fieldId'> = {}
) {
  console.warn('[useFieldWebSocket] This hook is deprecated. Use useWebSocket({ fieldId }) instead.');
  
  return useWebSocketUnified({
    ...options,
    fieldId,
    autoConnect: true,
    legacyMode: true
  });
}

/**
 * @deprecated Use useWebSocket with appropriate options instead
 * Convenience hook for control-match interface
 */
export function useControlMatchWebSocket(tournamentId: string, fieldId?: string) {
  console.warn('[useControlMatchWebSocket] This hook is deprecated. Use useWebSocket with control match options instead.');
  
  return useWebSocketUnified({
    tournamentId,
    fieldId,
    userRole: UserRole.HEAD_REFEREE,
    autoConnect: true,
    events: ['score_update', 'timer_update', 'match_state_change'],
    reconnectOnFocus: true,
    enableHeartbeat: true,
    legacyMode: true
  });
}

/**
 * @deprecated Use useWebSocket with appropriate options instead
 * Convenience hook for audience display
 */
export function useAudienceDisplayWebSocket(tournamentId: string, fieldId?: string) {
  console.warn('[useAudienceDisplayWebSocket] This hook is deprecated. Use useWebSocket with audience display options instead.');
  
  return useWebSocketUnified({
    tournamentId,
    fieldId,
    userRole: UserRole.COMMON,
    autoConnect: true,
    events: ['display_mode_change', 'score_update', 'timer_update', 'match_update'],
    reconnectOnFocus: true,
    legacyMode: true
  });
}

/**
 * @deprecated Use useWebSocket instead
 * Legacy unified WebSocket hook
 */
export function useUnifiedWebSocket(options: any = {}) {
  console.warn('[useUnifiedWebSocket] This hook is deprecated. Use useWebSocket instead.');
  
  return useWebSocketUnified({
    ...options,
    legacyMode: true
  });
}

/**
 * Migration utility to help transition from legacy hooks
 */
export interface MigrationGuide {
  from: string;
  to: string;
  example: string;
  breaking_changes?: string[];
}

export const migrationGuides: MigrationGuide[] = [
  {
    from: 'useTournamentWebSocket(tournamentId)',
    to: 'useWebSocket({ tournamentId })',
    example: `
// Before
const { isConnected, emit } = useTournamentWebSocket('tournament-123');

// After  
const { isConnected, emit } = useWebSocket({ tournamentId: 'tournament-123' });
    `
  },
  {
    from: 'useFieldWebSocket(fieldId)',
    to: 'useWebSocket({ fieldId })',
    example: `
// Before
const { isConnected, emit } = useFieldWebSocket('field-456');

// After
const { isConnected, emit } = useWebSocket({ fieldId: 'field-456' });
    `
  },
  {
    from: 'useControlMatchWebSocket(tournamentId, fieldId)',
    to: 'useWebSocket({ tournamentId, fieldId, userRole: UserRole.HEAD_REFEREE })',
    example: `
// Before
const { sendScoreUpdate } = useControlMatchWebSocket('tournament-123', 'field-456');

// After
const { sendScoreUpdate } = useWebSocket({ 
  tournamentId: 'tournament-123', 
  fieldId: 'field-456',
  userRole: UserRole.HEAD_REFEREE,
  events: ['score_update', 'timer_update', 'match_state_change']
});
    `
  },
  {
    from: 'useAudienceDisplayWebSocket(tournamentId, fieldId)',
    to: 'useWebSocket({ tournamentId, fieldId, userRole: UserRole.COMMON })',
    example: `
// Before
const { subscribe } = useAudienceDisplayWebSocket('tournament-123', 'field-456');

// After
const { subscribe } = useWebSocket({ 
  tournamentId: 'tournament-123', 
  fieldId: 'field-456',
  userRole: UserRole.COMMON,
  events: ['display_mode_change', 'score_update', 'timer_update', 'match_update']
});
    `
  }
];

/**
 * Utility function to log migration guidance
 */
export function logMigrationGuide(hookName: string) {
  const guide = migrationGuides.find(g => g.from.includes(hookName));
  if (guide) {
    console.group(`🔄 Migration Guide: ${hookName}`);
    console.log(`From: ${guide.from}`);
    console.log(`To: ${guide.to}`);
    console.log(`Example: ${guide.example}`);
    if (guide.breaking_changes) {
      console.warn('Breaking changes:', guide.breaking_changes);
    }
    console.groupEnd();
  }
}

/**
 * Hook to check if legacy hooks are being used and provide migration guidance
 */
export function useMigrationWarning(hookName: string) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`⚠️  ${hookName} is deprecated and will be removed in a future version.`);
    logMigrationGuide(hookName);
  }
}

// Export migration utilities
export { migrationGuides as MIGRATION_GUIDES };

/**
 * Quick migration checker - run this in console to see what needs to be updated
 */
export function checkForLegacyHooks() {
  const legacyHooks = [
    'useTournamentWebSocket',
    'useFieldWebSocket', 
    'useControlMatchWebSocket',
    'useAudienceDisplayWebSocket',
    'useUnifiedWebSocket'
  ];
  
  console.group('🔍 Legacy Hook Usage Check');
  console.log('Search your codebase for these deprecated hooks:');
  legacyHooks.forEach(hook => {
    console.log(`- ${hook}`);
  });
  console.log('\nUse the migration guides above to update to the new useWebSocket hook.');
  console.groupEnd();
}

// Development helper
if (process.env.NODE_ENV === 'development') {
  (window as any).checkForLegacyHooks = checkForLegacyHooks;
  (window as any).migrationGuides = migrationGuides;
}
