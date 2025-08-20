/**
 * Rankings Components Index
 *
 * Central export point for ranking-related components.
 * Optimized for polling-based rankings without WebSocket dependencies.
 */

// Main components
export { RealTimeRankingTable } from './real-time-ranking-table';
export { RankingRow, CompactRankingRow } from './ranking-row';
export {
  RankingUpdateIndicator,
  CompactRankingUpdateIndicator,
  RankingStatusIndicator
} from './ranking-update-indicator';

// Re-export types for convenience
export type {
  RealTimeRanking,
  RankingUpdateEvent,
  RankingRecalculationEvent,
  RealTimeRankingConfig,
  RealTimeRankingTableProps,
  RankingUpdateIndicatorProps,
  RankingRowProps,
  RankingFilters,
  RankingStats,
  UseRealTimeRankingsOptions,
  UseRealTimeRankingsReturn,
} from '@/types/ranking.types';

// Re-export polling-based hook (WebSocket hooks removed to prevent connection attempts)
export { usePollingRankings } from '@/hooks/rankings/use-polling-rankings';

// Re-export service
export { RankingService } from '@/services/ranking.service';
