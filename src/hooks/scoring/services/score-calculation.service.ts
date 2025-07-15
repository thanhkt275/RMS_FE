import { IScoreCalculationService } from '../interfaces/index';
import { GameElement, MatchScoreData } from '../types/index';

export class ScoreCalculationService implements IScoreCalculationService {
  calculateTotalScore(autoScore: number, driveScore: number): number {
    return (autoScore || 0) + (driveScore || 0);
  }

  calculateGameElementScore(gameElements: GameElement[]): number {
    return gameElements.reduce((total, element) => {
      if (element.operation === 'multiply') {
        return total + (element.count * element.pointsEach);
      } else if (element.operation === 'add') {
        return total + element.count + element.pointsEach;
      }
      return total + element.totalPoints;
    }, 0);
  }

  validateScoreData(scoreData: Partial<MatchScoreData>): boolean {
    if (!scoreData) return false;
    
    // Check if basic score structure exists
    const hasRedAlliance = scoreData.redAlliance !== undefined;
    const hasBlueAlliance = scoreData.blueAlliance !== undefined;
    
    if (!hasRedAlliance || !hasBlueAlliance) return false;
    
    // Check for valid score values (numbers >= 0)
    const redScores = scoreData.redAlliance;
    const blueScores = scoreData.blueAlliance;
    
    if (redScores) {
      if (typeof redScores.autoScore !== 'number' || redScores.autoScore < 0) return false;
      if (typeof redScores.driveScore !== 'number' || redScores.driveScore < 0) return false;
    }
    
    if (blueScores) {
      if (typeof blueScores.autoScore !== 'number' || blueScores.autoScore < 0) return false;
      if (typeof blueScores.driveScore !== 'number' || blueScores.driveScore < 0) return false;
    }
    
    return true;
  }
}
