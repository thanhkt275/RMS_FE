// Dynamic Scoring Components
export { default as DynamicScorePanel } from './dynamic-score-panel';
export { default as ScoreSection } from './score-section';
export { default as ScoreElement } from './score-element';

// Re-export types for convenience
export type {
  DynamicScorePanelProps,
  ScoreSectionProps,
  ScoreElementProps,
  ElementScores,
  AllianceScoreData,
  ScoreCalculationResult
} from '@/types/score-config.types';
