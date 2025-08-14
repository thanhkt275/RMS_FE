/**
 * Ranking Query Keys
 * 
 * Centralized query keys for ranking data without WebSocket dependencies.
 * Used by both polling and WebSocket-based ranking hooks.
 */

/**
 * Query keys for ranking data
 */
export const RankingQueryKeys = {
  all: ['rankings'] as const,
  tournaments: () => [...RankingQueryKeys.all, 'tournaments'] as const,
  tournament: (id: string) => [...RankingQueryKeys.tournaments(), id] as const,
  stages: () => [...RankingQueryKeys.all, 'stages'] as const,
  stage: (id: string) => [...RankingQueryKeys.stages(), id] as const,
  live: (tournamentId: string, stageId?: string) => [
    ...RankingQueryKeys.tournament(tournamentId),
    'live',
    stageId || 'all'
  ] as const,
  polling: (tournamentId: string, stageId?: string) => [
    ...RankingQueryKeys.tournament(tournamentId),
    'polling',
    stageId || 'all'
  ] as const,
};
