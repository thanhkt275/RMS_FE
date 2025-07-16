export type ElementType = 'COUNTER' | 'BOOLEAN' | 'TIMER';

export interface ScoreElement {
  id: string;
  scoreConfigId: string;
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
  scoreConfigId: string;
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
  scoreConfigId: string;
  name: string;
  code: string;
  description?: string;
  penaltyPoints: number;
  condition: any;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScoreConfig {
  id: string;
  tournamentId?: string;
  name: string;
  description?: string;
  scoreElements: ScoreElement[];
  bonusConditions: BonusCondition[];
  penaltyConditions: PenaltyCondition[];
  createdAt?: string;
  updatedAt?: string;
}
