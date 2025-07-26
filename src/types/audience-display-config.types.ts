/**
 * Audience Display Score Configuration Types
 * Defines how scoring elements are displayed on audience screens
 */

import { ElementType } from './score-config.types';

export interface ScoreDisplayElement {
  elementCode: string;
  displayName: string;
  visible: boolean;
  displayOrder: number;
  showDetails: boolean; // Show count/details or just total
  allianceSpecific?: boolean; // Different settings per alliance
}

export interface ScoreDisplaySection {
  sectionCode: string;
  displayName: string;
  visible: boolean;
  displayOrder: number;
  elements: ScoreDisplayElement[];
  showSectionTotal: boolean;
  collapsible?: boolean;
}

export interface AudienceScoreDisplayConfig {
  id: string;
  tournamentId: string;
  fieldId?: string; // Optional field-specific config
  displayMode: 'simple' | 'detailed' | 'custom';
  showAutoScore: boolean;
  showTeleOpScore: boolean;
  showEndgameScore: boolean;
  showPenalties: boolean;
  showBonuses: boolean;
  showTotalOnly: boolean;
  sections?: ScoreDisplaySection[];
  customElements?: ScoreDisplayElement[];
  refreshInterval?: number; // ms between updates
  animateChanges?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AudienceDisplaySettingsExtended {
  displayMode: string;
  matchId?: string | null;
  showTimer?: boolean;
  showScores?: boolean;
  showTeams?: boolean;
  message?: string;
  timerStartedAt?: number | null;
  updatedAt: number;
  tournamentId: string;
  fieldId?: string | null;
  scoreDisplayConfig?: AudienceScoreDisplayConfig;
}

export interface ScoreDisplayPreset {
  id: string;
  name: string;
  description: string;
  config: Partial<AudienceScoreDisplayConfig>;
  isDefault?: boolean;
}
