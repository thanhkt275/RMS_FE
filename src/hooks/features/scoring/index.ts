// Types
export * from './types/index';

// Interfaces
export * from './interfaces/index';

// Services
export { ScoreCalculationService } from './services/score-calculation.service';
export { DataTransformationService } from './services/data-transformation.service';
export { UserActivityService } from './services/user-activity.service';
export { ApiService } from './services/api.service';
export { WebSocketServiceAdapter } from './services/websocket.service';
export { CacheService } from './services/cache.service';
export { DefaultScoringStrategy, FRCScoringStrategy } from './services/scoring-strategy.service';

// Hooks
export { useScoringState, ScoringStateService } from './hooks/use-scoring-state';
export { usePersistence } from './hooks/use-persistence';
export { useRealtime } from './hooks/use-realtime';
export { useUserActivity } from './hooks/use-user-activity';
export { useDataSync } from './hooks/use-data-sync';
export { useScoringControl } from './hooks/use-scoring-control-refactored';

// Reducers
export { scoringReducer, initialScoringState } from './reducers/scoring-reducer';
export type { ScoringAction } from './reducers/scoring-reducer';
