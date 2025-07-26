/**
 * Real-time Ranking Types
 * 
 * Type definitions for the real-time ranking table feature.
 * Extends existing ranking types with real-time capabilities.
 */

import { TeamRanking as BaseTeamRanking } from './stage-advancement.types';

/**
 * Enhanced team ranking with real-time update metadata
 */
export interface RealTimeRanking extends BaseTeamRanking {
  lastUpdated: Date;
  isUpdated: boolean;
  previousRank?: number;
  rankChange?: 'up' | 'down' | 'same';
  isHighlighted?: boolean;
  updateSource?: 'websocket' | 'manual' | 'initial';
}

/**
 * WebSocket event for ranking updates
 */
export interface RankingUpdateEvent {
  type: 'ranking_update';
  tournamentId: string;
  stageId?: string;
  rankings: RealTimeRanking[];
  timestamp: number;
  triggerMatchId?: string;
  updateType: 'full' | 'incremental';
}

/**
 * WebSocket event for ranking recalculation status
 */
export interface RankingRecalculationEvent {
  type: 'ranking_recalculation_started' | 'ranking_recalculation_completed' | 'ranking_recalculation_failed';
  tournamentId: string;
  stageId?: string;
  timestamp: number;
  progress?: number;
  error?: string;
}

/**
 * Configuration for real-time ranking table
 */
export interface RealTimeRankingConfig {
  autoUpdate: boolean;
  updateInterval: number;
  showLiveIndicator: boolean;
  highlightDuration: number;
  animationDuration: number;
  maxRetries: number;
  enableVirtualization: boolean;
  pageSize?: number;
}

/**
 * Props for RealTimeRankingTable component
 */
export interface RealTimeRankingTableProps {
  tournamentId: string;
  stageId?: string;
  config?: Partial<RealTimeRankingConfig>;
  className?: string;
  onRankingUpdate?: (rankings: RealTimeRanking[]) => void;
  onError?: (error: Error) => void;
  showFilters?: boolean;
  showStats?: boolean;
  highlightAdvancing?: number;
}

/**
 * Props for ranking update indicator
 */
export interface RankingUpdateIndicatorProps {
  isConnected: boolean;
  lastUpdate?: Date;
  isUpdating: boolean;
  updateCount: number;
  onManualRefresh?: () => void;
  className?: string;
}

/**
 * Props for ranking row component
 */
export interface RankingRowProps {
  ranking: RealTimeRanking;
  index: number;
  isAdvancing?: boolean;
  onTeamClick?: (teamId: string) => void;
  showAnimation?: boolean;
  className?: string;
}

/**
 * Ranking table state for managing updates
 */
export interface RankingTableState {
  rankings: RealTimeRanking[];
  isLoading: boolean;
  isConnected: boolean;
  lastUpdate?: Date;
  error?: string;
  updateCount: number;
  isRecalculating: boolean;
}

/**
 * Options for useRealTimeRankings hook
 */
export interface UseRealTimeRankingsOptions {
  enabled?: boolean;
  config?: Partial<RealTimeRankingConfig>;
  onUpdate?: (rankings: RealTimeRanking[]) => void;
  onError?: (error: Error) => void;
  staleTime?: number;
  refetchInterval?: number;
}

/**
 * Return type for useRealTimeRankings hook
 */
export interface UseRealTimeRankingsReturn {
  rankings: RealTimeRanking[];
  isLoading: boolean;
  isConnected: boolean;
  lastUpdate?: Date;
  error?: string;
  updateCount: number;
  isRecalculating: boolean;
  refetch: () => Promise<void>;
  recalculate: () => Promise<void>;
  subscribe: () => void;
  unsubscribe: () => void;
}

/**
 * Ranking filter options
 */
export interface RankingFilters {
  search?: string;
  minRank?: number;
  maxRank?: number;
  minPoints?: number;
  maxPoints?: number;
  teamNumbers?: string[];
  organizations?: string[];
}

/**
 * Ranking statistics
 */
export interface RankingStats {
  totalTeams: number;
  averagePoints: number;
  highestPoints: number;
  lowestPoints: number;
  totalMatches: number;
  lastCalculated?: Date;
}

/**
 * Animation configuration for ranking changes
 */
export interface RankingAnimationConfig {
  enabled: boolean;
  duration: number;
  easing: string;
  highlightColor: string;
  rankChangeColor: {
    up: string;
    down: string;
    same: string;
  };
}

/**
 * Default configuration values
 */
export const DEFAULT_RANKING_CONFIG: RealTimeRankingConfig = {
  autoUpdate: true,
  updateInterval: 5000,
  showLiveIndicator: true,
  highlightDuration: 3000,
  animationDuration: 500,
  maxRetries: 3,
  enableVirtualization: false,
  pageSize: 50,
};

/**
 * Default animation configuration
 */
export const DEFAULT_ANIMATION_CONFIG: RankingAnimationConfig = {
  enabled: true,
  duration: 500,
  easing: 'ease-in-out',
  highlightColor: 'rgb(34, 197, 94)', // green-500
  rankChangeColor: {
    up: 'rgb(34, 197, 94)',   // green-500
    down: 'rgb(239, 68, 68)', // red-500
    same: 'rgb(107, 114, 128)', // gray-500
  },
};

/**
 * Utility type for ranking comparison
 */
export interface RankingComparison {
  teamId: string;
  oldRank: number;
  newRank: number;
  rankChange: 'up' | 'down' | 'same';
  pointsChange: number;
}

/**
 * WebSocket subscription status
 */
export interface RankingSubscriptionStatus {
  isSubscribed: boolean;
  tournamentId?: string;
  stageId?: string;
  subscriptionTime?: Date;
  reconnectCount: number;
}
