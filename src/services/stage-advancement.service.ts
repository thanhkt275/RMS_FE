import { apiClient } from "@/lib/api-client";
import { 
  TeamRanking, 
  StageReadiness, 
  AdvancementOptions, 
  AdvancementResult, 
  ApiResponse 
} from "@/types/stage-advancement.types";

/**
 * Service for stage advancement operations
 * Implements Single Responsibility Principle - only handles stage advancement API calls
 */
export class StageAdvancementService {
  
  /**
   * Get team rankings for a stage
   */
  static async getStageRankings(stageId: string): Promise<TeamRanking[]> {
    const response = await apiClient.get<ApiResponse<TeamRanking[]>>(`/stages/${stageId}/rankings`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch stage rankings');
    }
    return response.data;
  }

  /**
   * Check if a stage is ready for advancement
   */
  static async checkStageReadiness(stageId: string): Promise<StageReadiness> {
    const response = await apiClient.get<ApiResponse<StageReadiness>>(`/stages/${stageId}/readiness`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to check stage readiness');
    }
    return response.data;
  }

  /**
   * Preview which teams would be advanced
   */
  static async previewAdvancement(stageId: string, teamsToAdvance?: number): Promise<TeamRanking[]> {
    const queryParam = teamsToAdvance ? `?teamsToAdvance=${teamsToAdvance}` : '';
    const response = await apiClient.get<ApiResponse<TeamRanking[]>>(`/stages/${stageId}/advancement-preview${queryParam}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to preview advancement');
    }
    return response.data;
  }

  /**
   * Advance teams to the next stage
   */
  static async advanceTeams(stageId: string, options: AdvancementOptions): Promise<AdvancementResult> {
    const response = await apiClient.post<ApiResponse<AdvancementResult>>(`/stages/${stageId}/advance`, options);
    if (!response.success) {
      throw new Error(response.message || 'Failed to advance teams');
    }
    return response.data;
  }
}
