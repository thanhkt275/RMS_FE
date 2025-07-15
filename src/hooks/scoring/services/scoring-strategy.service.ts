import { IScoringStrategy } from '../interfaces/index';
import { Alliance, ScoreType, MatchScoreData } from '../types/index';

export class DefaultScoringStrategy implements IScoringStrategy {
  calculateScore(
    alliance: Alliance, 
    scoreType: ScoreType, 
    value: number, 
    context: MatchScoreData
  ): number {
    // Basic validation
    if (value < 0) return 0;
    
    // For total scores, calculate from auto and drive
    if (scoreType === 'total') {
      const allianceData = context[alliance + 'Alliance' as keyof MatchScoreData] as any;
      return (allianceData.autoScore || 0) + (allianceData.driveScore || 0);
    }
    
    // Apply multiplier if available
    const allianceData = context[alliance + 'Alliance' as keyof MatchScoreData] as any;
    const multiplier = allianceData?.multiplier || 1.0;
    
    return Math.round(value * multiplier);
  }

  validateScore(
    alliance: Alliance, 
    scoreType: ScoreType, 
    value: number, 
    context: MatchScoreData
  ): boolean {
    // Basic validation rules
    if (typeof value !== 'number') return false;
    if (value < 0) return false;
    if (value > 1000) return false; // Arbitrary max limit
    
    return true;
  }
}

export class FRCScoringStrategy implements IScoringStrategy {
  calculateScore(
    alliance: Alliance, 
    scoreType: ScoreType, 
    value: number, 
    context: MatchScoreData
  ): number {
    // FRC-specific scoring rules could go here
    return new DefaultScoringStrategy().calculateScore(alliance, scoreType, value, context);
  }

  validateScore(
    alliance: Alliance, 
    scoreType: ScoreType, 
    value: number, 
    context: MatchScoreData
  ): boolean {
    // FRC-specific validation rules could go here
    return new DefaultScoringStrategy().validateScore(alliance, scoreType, value, context);
  }
}
