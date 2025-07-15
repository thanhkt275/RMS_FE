import { IDataTransformationService } from '../interfaces/index';
import { 
  GameElement, 
  MatchScoreData, 
  ApiScoreData, 
  PersistScoreData, 
  RealtimeScoreUpdate,
  GameElementDto 
} from '../types/index';

export class DataTransformationService implements IDataTransformationService {
  objectToArrayGameElements(
    gameElements: Record<string, any> | any[] | null | undefined
  ): GameElement[] {
    if (!gameElements) return [];
    if (Array.isArray(gameElements)) return gameElements;
    if (typeof gameElements === "object" && Object.keys(gameElements).length === 0) return [];

    try {
      return Object.entries(gameElements).map(([element, value]) => {
        if (typeof value === "object" && value !== null && "count" in value) {
          return {
            element,
            count: Number(value.count || 0),
            pointsEach: Number(value.pointsEach || 1),
            totalPoints: Number(value.totalPoints || value.count),
            operation: value.operation || "multiply",
          };
        }
        return {
          element,
          count: Number(value),
          pointsEach: 1,
          totalPoints: Number(value),
          operation: "multiply",
        };
      });
    } catch (error) {
      console.error("Error converting game elements:", error, gameElements);
      return [];
    }
  }

  arrayToObjectGameElements(gameElements: GameElement[]): Record<string, number> {
    const result: Record<string, number> = {};
    gameElements.forEach((item) => {
      result[item.element] = item.count;
    });
    return result;
  }

  toGameElementDtoArray(gameElements: Record<string, number> | GameElement[]): GameElementDto[] {
    if (Array.isArray(gameElements)) {
      return gameElements.map(g => ({ ...g, operation: 'multiply' as const }));
    }
    return Object.entries(gameElements).map(([element, count]) => ({
      element,
      count: Number(count),
      pointsEach: 1,
      totalPoints: Number(count),
      operation: 'multiply' as const,
    }));
  }
  transformToApiFormat(scoreData: MatchScoreData, config: { matchId: string }): ApiScoreData {
    return {
      matchId: config.matchId,
      redAutoScore: scoreData.redAlliance.autoScore,
      redDriveScore: scoreData.redAlliance.driveScore,
      redTotalScore: scoreData.redAlliance.totalScore,
      blueAutoScore: scoreData.blueAlliance.autoScore,
      blueDriveScore: scoreData.blueAlliance.driveScore,
      blueTotalScore: scoreData.blueAlliance.totalScore,
      redGameElements: this.arrayToObjectGameElements(scoreData.redAlliance.gameElements),
      blueGameElements: this.arrayToObjectGameElements(scoreData.blueAlliance.gameElements),
      redTeamCount: scoreData.redAlliance.teamCount,
      blueTeamCount: scoreData.blueAlliance.teamCount,
      redMultiplier: scoreData.redAlliance.multiplier,
      blueMultiplier: scoreData.blueAlliance.multiplier,
      redPenalty: scoreData.redAlliance.penalty,
      bluePenalty: scoreData.blueAlliance.penalty,
      scoreDetails: scoreData.scoreDetails,
    };
  }
  transformToPersistFormat(
    scoreData: MatchScoreData, 
    config: { matchId: string; fieldId?: string; tournamentId: string }
  ): PersistScoreData {
    return {
      matchId: config.matchId,
      redAutoScore: scoreData.redAlliance.autoScore,
      redDriveScore: scoreData.redAlliance.driveScore,
      redTotalScore: scoreData.redAlliance.totalScore,
      blueAutoScore: scoreData.blueAlliance.autoScore,
      blueDriveScore: scoreData.blueAlliance.driveScore,
      blueTotalScore: scoreData.blueAlliance.totalScore,
      redGameElements: this.toGameElementDtoArray(scoreData.redAlliance.gameElements),
      blueGameElements: this.toGameElementDtoArray(scoreData.blueAlliance.gameElements),
      redTeamCount: scoreData.redAlliance.teamCount,
      blueTeamCount: scoreData.blueAlliance.teamCount,
      redMultiplier: scoreData.redAlliance.multiplier,
      blueMultiplier: scoreData.blueAlliance.multiplier,
      redPenalty: scoreData.redAlliance.penalty,
      bluePenalty: scoreData.blueAlliance.penalty,
      scoreDetails: scoreData.scoreDetails,
      fieldId: config.fieldId,
      tournamentId: config.tournamentId,
    };
  }
  transformToRealtimeFormat(
    scoreData: MatchScoreData, 
    config: { matchId: string; fieldId?: string; tournamentId: string }
  ): RealtimeScoreUpdate {
    return {
      matchId: config.matchId,
      fieldId: config.fieldId,
      tournamentId: config.tournamentId,
      redAutoScore: scoreData.redAlliance.autoScore,
      redDriveScore: scoreData.redAlliance.driveScore,
      redTotalScore: scoreData.redAlliance.totalScore,
      blueAutoScore: scoreData.blueAlliance.autoScore,
      blueDriveScore: scoreData.blueAlliance.driveScore,
      blueTotalScore: scoreData.blueAlliance.totalScore,
      redGameElements: this.toGameElementDtoArray(scoreData.redAlliance.gameElements),
      blueGameElements: this.toGameElementDtoArray(scoreData.blueAlliance.gameElements),
      redTeamCount: scoreData.redAlliance.teamCount,
      blueTeamCount: scoreData.blueAlliance.teamCount,
      redMultiplier: scoreData.redAlliance.multiplier,
      blueMultiplier: scoreData.blueAlliance.multiplier,
      redPenalty: scoreData.redAlliance.penalty,
      bluePenalty: scoreData.blueAlliance.penalty,
      scoreDetails: scoreData.scoreDetails,
    };
  }
}
