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
export { useScoringState, ScoringStateService } from './use-scoring-state';
export { usePersistence } from './use-persistence';
export { useRealtime } from './use-realtime';
export { useUserActivity } from './use-user-activity';
export { useDataSync } from './use-data-sync';
export { useScoringControl } from './use-scoring-control-refactored';

// Reducers
export { scoringReducer, initialScoringState } from './reducers/scoring-reducer';
export type { ScoringAction } from './reducers/scoring-reducer';
