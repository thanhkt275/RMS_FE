import { IApiService } from '../interfaces/index';
import { ApiScoreData } from '../types/index';
import {
  useMatchScores,
  useCreateMatchScores,
  useUpdateMatchScores,
} from "@/hooks/matches/use-matches";

export class ApiService implements IApiService {
  constructor(
    private createMutation: ReturnType<typeof useCreateMatchScores>,
    private updateMutation: ReturnType<typeof useUpdateMatchScores>,
    private refetchFunction: () => Promise<any>
  ) {}

  async createMatchScores(data: ApiScoreData): Promise<any> {
    return await this.createMutation.mutateAsync(data);
  }

  async updateMatchScores(id: string, data: ApiScoreData): Promise<any> {
    return await this.updateMutation.mutateAsync({
      id,
      ...data,
    });
  }

  async getMatchScores(matchId: string): Promise<any> {
    // This would typically be handled by React Query
    // Implementation depends on your specific API setup
    throw new Error('getMatchScores should be handled by React Query hook');
  }

  async refetchScores(): Promise<any> {
    return await this.refetchFunction();
  }
}
