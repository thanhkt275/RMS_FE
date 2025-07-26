/**
 * Rankings Components Index
 * 
 * Central export point for all ranking-related components.
 * Follows the Barrel Export pattern for better organization.
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

// Re-export hooks
export { useRealTimeRankings, RankingQueryKeys } from '@/hooks/rankings/use-real-time-rankings';

// Re-export service
export { RankingService } from '@/services/ranking.service';
