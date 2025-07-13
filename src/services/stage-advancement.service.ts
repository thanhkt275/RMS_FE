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
    const response = await apiClient.get<any>(`/stages/${stageId}/advancement-preview${queryParam}`);
    
    console.log('[StageAdvancementService] Preview response:', response);
    
    // Handle both response formats: wrapped and direct
    if (response.success !== undefined) {
      // Wrapped response format
      if (!response.success) {
        throw new Error(response.message || 'Failed to preview advancement');
      }
      
      // Handle the new response format with teamsToAdvance and remainingTeams
      if (response.data && response.data.teamsToAdvance) {
        return response.data.teamsToAdvance;
      }
      
      return response.data;
    } else {
      // Direct response format - handle the new structure
      if (response && response.teamsToAdvance) {
        return response.teamsToAdvance;
      }
      
      // Assume the response is the data directly
      return Array.isArray(response) ? response : [];
    }
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
