import { IScoringStrategy } from '../interfaces/index';
import { Alliance, ScoreType, MatchScoreData } from '../types/index';

/**
 * Example custom scoring strategy for VEX Robotics competitions
 */
export class VEXScoringStrategy implements IScoringStrategy {
  calculateScore(
    alliance: Alliance,
    scoreType: ScoreType,
    value: number,
    context: MatchScoreData
  ): number {
    // VEX-specific validation
    if (value < 0) return 0;

    const allianceData = context[alliance + 'Alliance' as keyof MatchScoreData] as any;

    switch (scoreType) {
      case 'auto':
        // VEX autonomous scoring might have different multipliers
        // Example: Autonomous points are worth 2x in VEX
        return Math.round(value * 2);

      case 'drive':
        // Driver control points are 1:1
        return Math.round(value);

      case 'total':
        // Calculate from auto and drive with VEX rules
        const autoPoints = this.calculateScore(alliance, 'auto', allianceData.autoScore || 0, context);
        const drivePoints = this.calculateScore(alliance, 'drive', allianceData.driveScore || 0, context);
        
        // Add bonus points based on game elements
        const bonusPoints = this.calculateBonusPoints(allianceData.gameElements || []);
        
        return autoPoints + drivePoints + bonusPoints;

      default:
        return value;
    }
  }

  validateScore(
    alliance: Alliance,
    scoreType: ScoreType,
    value: number,
    context: MatchScoreData
  ): boolean {
    // VEX-specific validation rules
    if (typeof value !== 'number') return false;
    if (value < 0) return false;

    switch (scoreType) {
      case 'auto':
        // VEX autonomous has a maximum possible score
        return value <= 100; // Example limit

      case 'drive':
        // VEX driver control has a different maximum
        return value <= 200; // Example limit

      case 'total':
        // Total should not exceed the sum of maximums
        return value <= 300; // Example limit

      default:
        return true;
    }
  }

  private calculateBonusPoints(gameElements: any[]): number {
    // VEX-specific bonus calculation
    // Example: Each game element might be worth different points
    return gameElements.reduce((total, element) => {
      switch (element.element) {
        case 'high_goal':
          return total + (element.count * 5);
        case 'low_goal':
          return total + (element.count * 2);
        case 'rings_scored':
          return total + (element.count * 1);
        default:
          return total;
      }
    }, 0);
  }
}

/**
 * Example custom scoring strategy for FTC (FIRST Tech Challenge)
 */
export class FTCScoringStrategy implements IScoringStrategy {
  calculateScore(
    alliance: Alliance,
    scoreType: ScoreType,
    value: number,
    context: MatchScoreData
  ): number {
    if (value < 0) return 0;

    const allianceData = context[alliance + 'Alliance' as keyof MatchScoreData] as any;

    switch (scoreType) {
      case 'auto':
        // FTC autonomous has specific point values
        // Apply team count multiplier if multiple teams
        const teamMultiplier = Math.max(1, allianceData.teamCount || 1);
        return Math.round(value * teamMultiplier);

      case 'drive':
        // FTC teleop (driver-controlled) period scoring
        return Math.round(value);

      case 'total':
        // FTC total includes auto, teleop, and endgame
        const autoPoints = this.calculateScore(alliance, 'auto', allianceData.autoScore || 0, context);
        const drivePoints = this.calculateScore(alliance, 'drive', allianceData.driveScore || 0, context);
        const endgamePoints = this.calculateEndgamePoints(allianceData.gameElements || []);
        
        return autoPoints + drivePoints + endgamePoints;

      default:
        return value;
    }
  }

  validateScore(
    alliance: Alliance,
    scoreType: ScoreType,
    value: number,
    context: MatchScoreData
  ): boolean {
    if (typeof value !== 'number') return false;
    if (value < 0) return false;

    // FTC-specific validation
    switch (scoreType) {
      case 'auto':
        return value <= 60; // FTC auto max points (example)
      case 'drive':
        return value <= 120; // FTC teleop max points (example)
      case 'total':
        return value <= 250; // FTC total max points (example)
      default:
        return true;
    }
  }

  private calculateEndgamePoints(gameElements: any[]): number {
    // FTC endgame scoring (parking, hanging, etc.)
    return gameElements.reduce((total, element) => {
      switch (element.element) {
        case 'robot_parked':
          return total + (element.count * 5);
        case 'robot_hanging':
          return total + (element.count * 25);
        case 'capstone':
          return total + (element.count * 15);
        default:
          return total;
      }
    }, 0);
  }
}

// Example of how to use custom strategies
export function createScoringStrategy(gameType: 'FRC' | 'VEX' | 'FTC' | 'default'): IScoringStrategy {
  switch (gameType) {
    case 'VEX':
      return new VEXScoringStrategy();
    case 'FTC':
      return new FTCScoringStrategy();
    case 'FRC':
    case 'default':
    default:
      // Import the default strategy from the main services
      const { DefaultScoringStrategy } = require('../services/scoring-strategy.service');
      return new DefaultScoringStrategy();
  }
}
