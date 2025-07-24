/**
 * Score Configuration Types
 * Defines interfaces for the dynamic scoring system
 */

export enum ElementType {
  COUNTER = "COUNTER",
  BOOLEAN = "BOOLEAN", 
  TIMER = "TIMER",
  SELECT = "SELECT"
}

export interface ScoreElement {
  id: string;
  name: string;
  code: string;
  description?: string;
  pointsPerUnit: number;
  category?: string;
  elementType: ElementType;
  displayOrder: number;
  icon?: string;
  color?: string;
  maxValue?: number;
  minValue?: number;
  options?: string[]; // For SELECT type
}

export interface BonusCondition {
  id: string;
  name: string;
  code: string;
  description?: string;
  bonusPoints: number;
  condition: any; // JSON condition logic
  displayOrder: number;
}

export interface PenaltyCondition {
  id: string;
  name: string;
  code: string;
  description?: string;
  penaltyPoints: number;
  condition: any; // JSON condition logic
  displayOrder: number;
}

export interface ScoreSection {
  id: string;
  name: string;
  code: string;
  description?: string;
  displayOrder: number;
  scoreElements: ScoreElement[];
  bonusConditions: BonusCondition[];
  penaltyConditions: PenaltyCondition[];
}

export interface ScoreConfig {
  id: string;
  tournamentId?: string;
  name: string;
  description?: string;
  totalScoreFormula?: string;
  scoreSections: ScoreSection[];
  scoreElements: ScoreElement[]; // Legacy elements
  bonusConditions: BonusCondition[]; // Legacy bonuses
  penaltyConditions: PenaltyCondition[]; // Legacy penalties
  createdAt: Date;
  updatedAt: Date;
}

// Frontend-specific types for the dynamic score panel
export interface ElementScores {
  [elementCode: string]: number;
}

export interface SectionScores {
  [sectionCode: string]: {
    elementScores: ElementScores;
    bonusScores: ElementScores;
    penaltyScores: ElementScores;
    totalScore: number;
  };
}

export interface AllianceScoreData {
  sectionScores: SectionScores;
  totalScore: number;
}

export interface MatchScoreConfig {
  matchId: string;
  scoreConfig: ScoreConfig | null;
  redAllianceId: string;
  blueAllianceId: string;
}

// API Response types
export interface ScorePanelConfig {
  matchId: string;
  scoreConfigId: string;
  sections: SectionConfig[];
  formula: string;
  previewMode: boolean;
  validationRules: ValidationRule[];
}

export interface SectionConfig {
  id: string;
  name: string;
  code: string;
  description?: string;
  displayOrder: number;
  elements: ElementConfig[];
  bonuses: BonusConfig[];
  penalties: PenaltyConfig[];
}

export interface ElementConfig {
  id: string;
  name: string;
  code: string;
  description?: string;
  elementType: ElementType;
  pointsPerUnit: number;
  displayOrder: number;
  icon?: string;
  color?: string;
  maxValue?: number;
  minValue?: number;
  options?: string[];
}

export interface BonusConfig {
  id: string;
  name: string;
  code: string;
  bonusPoints: number;
  condition: any;
  displayOrder: number;
  description?: string;
}

export interface PenaltyConfig {
  id: string;
  name: string;
  code: string;
  penaltyPoints: number;
  condition: any;
  displayOrder: number;
  description?: string;
}

export interface ValidationRule {
  field: string;
  rule: string;
  message: string;
}

// Component Props
export interface DynamicScorePanelProps {
  matchId: string;
  allianceColor: 'RED' | 'BLUE';
  onScoreChange: (scores: ElementScores) => void;
  onSubmit: (finalScores: AllianceScoreData) => void;
  disabled?: boolean;
  readonly?: boolean;
}

export interface ScoreSectionProps {
  section: SectionConfig;
  scores: ElementScores;
  onScoreChange: (elementCode: string, value: number) => void;
  readonly?: boolean;
  disabled?: boolean;
  allianceColor: 'RED' | 'BLUE';
}

export interface ScoreElementProps {
  element: ElementConfig;
  value: number;
  description?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
  readonly?: boolean;
  allianceColor: 'RED' | 'BLUE';
}

// Calculation types
export interface ScoreCalculationResult {
  sectionScores: SectionScores;
  totalScore: number;
  appliedBonuses: BonusApplication[];
  appliedPenalties: PenaltyApplication[];
  errors: string[];
}

export interface BonusApplication {
  bonusId: string;
  bonusCode: string;
  bonusName: string;
  points: number;
  triggered: boolean;
}

export interface PenaltyApplication {
  penaltyId: string;
  penaltyCode: string;
  penaltyName: string;
  points: number;
  triggered: boolean;
}

// Error types
export interface ScoreConfigError {
  code: string;
  message: string;
  field?: string;
  section?: string;
}

export interface ScoreValidationError {
  element: string;
  value: number;
  error: string;
}
