export type ElementType = 'COUNTER' | 'BOOLEAN' | 'TIMER';

export interface ScoreElement {
  id: string;
  scoreConfigId?: string; // Now optional as it can belong to a section instead
  scoreSectionId?: string; // New field for section-based elements
  name: string;
  code: string;
  description?: string;
  pointsPerUnit: number;
  maxUnits?: number;
  category?: string;
  elementType: ElementType;
  displayOrder?: number;
  icon?: string;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BonusCondition {
  id: string;
  scoreConfigId: string; // Always belongs to config (no longer section-based)
  name: string;
  code: string;
  description?: string;
  bonusPoints: number;
  condition: any;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PenaltyCondition {
  id: string;
  scoreConfigId: string; // Always belongs to config (no longer section-based)
  name: string;
  code: string;
  description?: string;
  penaltyPoints: number;
  condition: any;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

// New ScoreSection interface
export interface ScoreSection {
  id: string;
  scoreConfigId: string;
  name: string;
  code: string;
  description?: string;
  displayOrder: number;
  scoreElements?: ScoreElement[]; // Only score elements belong to sections
  createdAt?: string;
  updatedAt?: string;
}

export interface ScoreConfig {
  id: string;
  tournamentId?: string;
  name: string;
  description?: string;
  totalScoreFormula?: string; // New field for custom formulas
  scoreSections?: ScoreSection[]; // New field for sections
  // Legacy fields for backward compatibility
  scoreElements?: ScoreElement[];
  bonusConditions?: BonusCondition[];
  penaltyConditions?: PenaltyCondition[];
  createdAt?: string;
  updatedAt?: string;
}
