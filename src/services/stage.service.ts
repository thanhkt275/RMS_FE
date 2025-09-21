import { apiClient } from "@/lib/api-client";
import type { StageBracketResponse } from "@/types/match.types";

interface BracketApiResponse {
  success?: boolean;
  message?: string;
  data?: StageBracketResponse;
}

export class StageService {
  static async getStageBracket(stageId: string): Promise<StageBracketResponse> {
    const response = await apiClient.get<BracketApiResponse | StageBracketResponse>(
      `stages/${stageId}/bracket`
    );

    if ("data" in response && response.data) {
      return response.data;
    }

    return response as StageBracketResponse;
  }
}
