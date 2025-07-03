import { apiClient } from "@/lib/api-client";
import { Match, MatchScores, MatchStatus } from "@/lib/types";

export class MatchService {
  static async getAllMatches(filter?: { fieldId?: string | null }): Promise<Match[]> {
    let url = "/matches";
    if (filter?.fieldId) {
      const params = new URLSearchParams();
      params.append("fieldId", filter.fieldId);
      url += `?${params.toString()}`;
    }
    return apiClient.get<Match[]>(url);
  }

  static async getMatchesByStage(stageId: string): Promise<Match[]> {
    return apiClient.get<Match[]>(`/matches?stageId=${stageId}`);
  }

  static async getMatchById(matchId: string): Promise<Match> {
    return apiClient.get<Match>(`/matches/${matchId}`);
  }

  static async updateMatchStatus(matchId: string, status: MatchStatus): Promise<Match> {
    return apiClient.patch<Match>(`/matches/${matchId}/status`, { status });
  }

  static async getMatchScores(matchId: string): Promise<MatchScores | null> {
    await apiClient.get(`/matches/${matchId}`);
    try {
      return await apiClient.get<MatchScores>(`/match-scores/match/${matchId}`);
    } catch (error: any) {
      if (error.status === 404 || error.message?.includes('not found')) {
        return null;
      }
      throw error;
    }
  }

  static async createOrUpdateMatchScores(data: Partial<Omit<MatchScores, 'redGameElements' | 'blueGameElements'> & {
    redGameElements?: Record<string, number>;
    blueGameElements?: Record<string, number>;
  }> & { matchId: string }): Promise<MatchScores> {
    await apiClient.get(`/matches/${data.matchId}`);
    try {
      const existingScores = await apiClient.get(`/match-scores/match/${data.matchId}`);
      if (existingScores) {
        return await apiClient.patch(`/match-scores/${existingScores.id}`, data);
      }
    } catch (error: any) {
      if (error.status !== 404 && !error.message?.includes('not found')) {
        throw error;
      }
    }
    return await apiClient.post(`/match-scores`, {
      matchId: data.matchId,
      redAutoScore: data.redAutoScore || 0,
      redDriveScore: data.redDriveScore || 0,
      redTotalScore: data.redTotalScore || 0,
      blueAutoScore: data.blueAutoScore || 0,
      blueDriveScore: data.blueDriveScore || 0,
      blueTotalScore: data.blueTotalScore || 0,
      redTeamCount: data.redTeamCount || 0,
      blueTeamCount: data.blueTeamCount || 0,
      redMultiplier: data.redMultiplier || 1.0,
      blueMultiplier: data.blueMultiplier || 1.0,
      redGameElements: data.redGameElements || {},
      blueGameElements: data.blueGameElements || {},
      scoreDetails: data.scoreDetails || {},
    });
  }

  static async updateMatchScores(data: Partial<Omit<MatchScores, 'redGameElements' | 'blueGameElements'> & {
    redGameElements?: Record<string, number>;
    blueGameElements?: Record<string, number>;
  }> & { id: string }): Promise<MatchScores> {
    return apiClient.patch(`/match-scores/${data.id}`, data);
  }
}