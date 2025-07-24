import { 
  ElementScores, 
  SectionConfig as ScoreSection, 
  BonusConfig as BonusCondition, 
  PenaltyConfig as PenaltyCondition,
  ScoreCalculationResult,
  SectionScores,
  BonusApplication as AppliedBonus,
  PenaltyApplication as AppliedPenalty,
  ElementConfig
} from '../../types/score-config.types';

// Types for condition evaluation
interface SimpleCondition {
  element: string;
  operator: '>=' | '>' | '<=' | '<' | '==' | '!=';
  value: number;
}

interface ComplexCondition {
  type: 'AND' | 'OR';
  conditions: (SimpleCondition | ComplexCondition)[];
}

type Condition = SimpleCondition | ComplexCondition;

// Additional interface to match the expected calculation result structure
interface SectionScoreResult {
  elementScores: Record<string, number>;
  bonusScores: Record<string, number>;
  penaltyScores: Record<string, number>;
  totalScore: number;
  appliedBonuses: AppliedBonus[];
  appliedPenalties: AppliedPenalty[];
  errors: string[];
}

// Performance monitoring
interface CalculationMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  sectionsProcessed: number;
  conditionsEvaluated: number;
}

/**
 * Real-time score calculation engine
 */
export class ScoreCalculationEngine {
  private metrics: CalculationMetrics = {
    startTime: 0,
    endTime: 0,
    duration: 0,
    sectionsProcessed: 0,
    conditionsEvaluated: 0
  };

  /**
   * Calculate scores for all sections with real-time updates
   */
  calculateScores(
    sections: ScoreSection[], 
    elementScores: ElementScores,
    formula?: string
  ): ScoreCalculationResult {
    this.startMetrics();

    const sectionScores: Record<string, SectionScoreResult> = {};
    const appliedBonuses: AppliedBonus[] = [];
    const appliedPenalties: AppliedPenalty[] = [];
    const errors: string[] = [];

    let totalScore = 0;

    try {
      // Process each section
      for (const section of sections) {
        const sectionResult = this.calculateSectionScore(section, elementScores);
        sectionScores[section.code] = sectionResult;
        
        totalScore += sectionResult.totalScore;
        appliedBonuses.push(...sectionResult.appliedBonuses);
        appliedPenalties.push(...sectionResult.appliedPenalties);
        errors.push(...sectionResult.errors);
        
        this.metrics.sectionsProcessed++;
      }

      // Apply tournament formula if specified
      if (formula) {
        totalScore = this.applyTournamentFormula(totalScore, sectionScores, formula);
      }

    } catch (error) {
      errors.push(`Calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    this.endMetrics();

    // Convert sectionScores to match SectionScores interface
    const convertedSectionScores: SectionScores = {};
    for (const [sectionCode, sectionResult] of Object.entries(sectionScores)) {
      convertedSectionScores[sectionCode] = {
        elementScores: sectionResult.elementScores,
        bonusScores: sectionResult.bonusScores,
        penaltyScores: sectionResult.penaltyScores,
        totalScore: sectionResult.totalScore
      };
    }

    return {
      sectionScores: convertedSectionScores,
      totalScore,
      appliedBonuses,
      appliedPenalties,
      errors
    };
  }

  /**
   * Calculate score for a single section
   */
  private calculateSectionScore(
    section: ScoreSection, 
    elementScores: ElementScores
  ): SectionScoreResult {
    const elementTotal = this.calculateElementScores(section, elementScores);
    const bonusResult = this.calculateBonuses(section.bonuses, elementScores);
    const penaltyResult = this.calculatePenalties(section.penalties, elementScores);

    const totalScore = elementTotal + bonusResult.totalPoints - Math.abs(penaltyResult.totalPoints);

    return {
      elementScores: this.getElementScoresForSection(section, elementScores),
      bonusScores: bonusResult.scores,
      penaltyScores: penaltyResult.scores,
      totalScore,
      appliedBonuses: bonusResult.applied,
      appliedPenalties: penaltyResult.applied,
      errors: [...bonusResult.errors, ...penaltyResult.errors]
    };
  }

  /**
   * Calculate element scores for a section
   */
  private calculateElementScores(section: ScoreSection, elementScores: ElementScores): number {
    return section.elements.reduce((total: number, element: ElementConfig) => {
      const value = elementScores[element.code] || 0;
      
      // Validate element constraints
      if (element.minValue !== undefined && value < element.minValue) {
        return total;
      }
      if (element.maxValue !== undefined && value > element.maxValue) {
        return total;
      }
      
      return total + (value * element.pointsPerUnit);
    }, 0);
  }

  /**
   * Get element scores specific to a section
   */
  private getElementScoresForSection(
    section: ScoreSection, 
    elementScores: ElementScores
  ): Record<string, number> {
    const sectionElementScores: Record<string, number> = {};
    
    section.elements.forEach((element: ElementConfig) => {
      sectionElementScores[element.code] = elementScores[element.code] || 0;
    });
    
    return sectionElementScores;
  }

  /**
   * Calculate bonus scores and determine triggered bonuses
   */
  private calculateBonuses(
    bonuses: BonusCondition[], 
    elementScores: ElementScores
  ): {
    totalPoints: number;
    scores: Record<string, number>;
    applied: AppliedBonus[];
    errors: string[];
  } {
    let totalPoints = 0;
    const scores: Record<string, number> = {};
    const applied: AppliedBonus[] = [];
    const errors: string[] = [];

    for (const bonus of bonuses) {
      try {
        const isTriggered = this.evaluateCondition(bonus.condition, elementScores);
        const points = isTriggered ? bonus.bonusPoints : 0;
        
        scores[bonus.code] = points;
        totalPoints += points;

        if (isTriggered) {
          applied.push({
            bonusId: bonus.id,
            bonusCode: bonus.code,
            bonusName: bonus.name,
            points: bonus.bonusPoints,
            triggered: true
          });
        }
      } catch (error) {
        errors.push(`Error evaluating bonus ${bonus.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { totalPoints, scores, applied, errors };
  }

  /**
   * Calculate penalty scores and determine triggered penalties
   */
  private calculatePenalties(
    penalties: PenaltyCondition[], 
    elementScores: ElementScores
  ): {
    totalPoints: number;
    scores: Record<string, number>;
    applied: AppliedPenalty[];
    errors: string[];
  } {
    let totalPoints = 0;
    const scores: Record<string, number> = {};
    const applied: AppliedPenalty[] = [];
    const errors: string[] = [];

    for (const penalty of penalties) {
      try {
        const isTriggered = this.evaluateCondition(penalty.condition, elementScores);
        const points = isTriggered ? Math.abs(penalty.penaltyPoints) : 0;
        
        scores[penalty.code] = points;
        totalPoints += points;

        if (isTriggered) {
          applied.push({
            penaltyId: penalty.id,
            penaltyCode: penalty.code,
            penaltyName: penalty.name,
            points: Math.abs(penalty.penaltyPoints),
            triggered: true
          });
        }
      } catch (error) {
        errors.push(`Error evaluating penalty ${penalty.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { totalPoints, scores, applied, errors };
  }

  /**
   * Evaluate condition (simple or complex)
   */
  private evaluateCondition(condition: any, elementScores: ElementScores): boolean {
    this.metrics.conditionsEvaluated++;

    if (!condition) {
      return false;
    }

    try {
      // Handle complex conditions (AND/OR)
      if (condition.type && condition.conditions) {
        return this.evaluateComplexCondition(condition as ComplexCondition, elementScores);
      }
      
      // Handle simple conditions
      return this.evaluateSimpleCondition(condition as SimpleCondition, elementScores);
    } catch (error) {
      console.warn('Error evaluating condition:', error);
      return false;
    }
  }

  /**
   * Evaluate simple condition
   */
  private evaluateSimpleCondition(condition: SimpleCondition, elementScores: ElementScores): boolean {
    const elementValue = elementScores[condition.element] || 0;
    
    switch (condition.operator) {
      case '>=': return elementValue >= condition.value;
      case '>': return elementValue > condition.value;
      case '<=': return elementValue <= condition.value;
      case '<': return elementValue < condition.value;
      case '==': return elementValue === condition.value;
      case '!=': return elementValue !== condition.value;
      default: return false;
    }
  }

  /**
   * Evaluate complex condition (AND/OR)
   */
  private evaluateComplexCondition(condition: ComplexCondition, elementScores: ElementScores): boolean {
    if (condition.type === 'AND') {
      return condition.conditions.every(cond => this.evaluateCondition(cond, elementScores));
    } else if (condition.type === 'OR') {
      return condition.conditions.some(cond => this.evaluateCondition(cond, elementScores));
    }
    
    return false;
  }

  /**
   * Apply tournament-specific formula to total score
   */
  private applyTournamentFormula(
    totalScore: number, 
    sectionScores: Record<string, SectionScoreResult>,
    formula: string
  ): number {
    try {
      // Common tournament formulas
      switch (formula.toLowerCase()) {
        case 'standard':
          return totalScore;
          
        case 'weighted_autonomous':
          // Give 1.5x weight to autonomous section
          const autoScore = sectionScores['auto']?.totalScore || 0;
          const otherScores = Object.entries(sectionScores)
            .filter(([key]) => key !== 'auto')
            .reduce((sum, [, section]) => sum + section.totalScore, 0);
          return Math.round(autoScore * 1.5 + otherScores);
          
        case 'bonus_multiplier':
          // Apply 1.2x multiplier if more than 2 bonuses are active
          const activeBonuses = Object.values(sectionScores)
            .reduce((count, section) => count + section.appliedBonuses.length, 0);
          return activeBonuses > 2 ? Math.round(totalScore * 1.2) : totalScore;
          
        case 'penalty_cap':
          // Cap penalty deduction at 50% of element scores
          const elementTotal = Object.values(sectionScores)
            .reduce((sum, section) => {
              return sum + Object.values(section.elementScores)
                .reduce((elemSum: number, score: number) => elemSum + score, 0);
            }, 0);
          const penaltyTotal = Object.values(sectionScores)
            .reduce((sum, section) => {
              return sum + Object.values(section.penaltyScores)
                .reduce((penSum: number, score: number) => penSum + score, 0);
            }, 0);
          const cappedPenalty = Math.min(penaltyTotal, elementTotal * 0.5);
          return elementTotal - cappedPenalty;
          
        default:
          // Try to evaluate as a custom expression
          return this.evaluateCustomFormula(formula, totalScore, sectionScores);
      }
    } catch (error) {
      console.warn('Error applying tournament formula:', error);
      return totalScore;
    }
  }

  /**
   * Evaluate custom formula expression (basic implementation)
   */
  private evaluateCustomFormula(
    formula: string, 
    totalScore: number, 
    sectionScores: Record<string, SectionScoreResult>
  ): number {
    // This is a simplified implementation - in production, you'd want a more robust expression parser
    let expression = formula
      .replace(/\btotal\b/g, totalScore.toString())
      .replace(/\b(\w+)_score\b/g, (match, sectionCode) => {
        return (sectionScores[sectionCode]?.totalScore || 0).toString();
      });

    try {
      // Basic safety check - only allow numbers, operators, and parentheses
      if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
        throw new Error('Invalid formula expression');
      }
      
      return Math.round(eval(expression));
    } catch (error) {
      console.warn('Error evaluating custom formula:', error);
      return totalScore;
    }
  }

  /**
   * Get condition progress for visual feedback
   */
  getConditionProgress(condition: any, elementScores: ElementScores): number {
    if (!condition || !condition.element) return 0;

    const elementValue = elementScores[condition.element] || 0;
    const targetValue = condition.value || 1;

    // Calculate progress based on operator
    switch (condition.operator) {
      case '>=':
      case '>':
        return Math.min(100, (elementValue / targetValue) * 100);
      case '<=':
      case '<':
        return elementValue <= targetValue ? 100 : 0;
      case '==':
        return elementValue === targetValue ? 100 : 0;
      case '!=':
        return elementValue !== targetValue ? 100 : 0;
      default:
        return 0;
    }
  }

  /**
   * Check if condition is in warning state (close to triggering)
   */
  isConditionInWarning(condition: any, elementScores: ElementScores, threshold = 0.8): boolean {
    const progress = this.getConditionProgress(condition, elementScores);
    return progress >= threshold * 100 && progress < 100;
  }

  /**
   * Performance metrics methods
   */
  private startMetrics(): void {
    this.metrics.startTime = performance.now();
    this.metrics.sectionsProcessed = 0;
    this.metrics.conditionsEvaluated = 0;
  }

  private endMetrics(): void {
    this.metrics.endTime = performance.now();
    this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
  }

  getLastCalculationMetrics(): CalculationMetrics {
    return { ...this.metrics };
  }
}

// Singleton instance for use across components
export const scoreCalculationEngine = new ScoreCalculationEngine();

// Utility functions for components
export function calculateSectionTotal(
  section: ScoreSection, 
  elementScores: ElementScores
): number {
  return scoreCalculationEngine.calculateScores([section], elementScores).totalScore;
}

export function evaluateCondition(condition: any, elementScores: ElementScores): boolean {
  return scoreCalculationEngine['evaluateCondition'](condition, elementScores);
}

export function getConditionProgress(condition: any, elementScores: ElementScores): number {
  return scoreCalculationEngine.getConditionProgress(condition, elementScores);
}

export function isConditionInWarning(condition: any, elementScores: ElementScores): boolean {
  return scoreCalculationEngine.isConditionInWarning(condition, elementScores);
}
