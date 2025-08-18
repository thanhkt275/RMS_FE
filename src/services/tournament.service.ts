import type { Tournament, UpdateTournamentDto, CreateStageDto } from '@/types/tournament.types';
import { apiClient } from '@/lib/api-client';
import { DebounceManager } from '@/utils/debounce-manager';

export class TournamentService {
  static async getFullDetails(tournamentId: string): Promise<Tournament> {
    return apiClient.get<Tournament>(`tournaments/${tournamentId}/details`);
  }

  static async update(tournamentId: string, data: UpdateTournamentDto): Promise<Tournament> {
    return apiClient.patch<Tournament>(`tournaments/${tournamentId}`, data);
  }

  static async delete(tournamentId: string): Promise<void> {
    return apiClient.delete<void>(`tournaments/${tournamentId}`);
  }

  static async createStage(tournamentId: string, data: CreateStageDto): Promise<void> {
    return apiClient.post<void>(`tournaments/${tournamentId}/stages`, data);
  }

  // Throttle example
  private static apiThrottleManager = new DebounceManager();

  static async throttledGetFullDetails(tournamentId: string): Promise<Tournament> {
    return new Promise((resolve, reject) => {
      this.apiThrottleManager.debounce(
        `getFullDetails:${tournamentId}`,
        async (data: any) => {
          try {
            const result = await apiClient.get<Tournament>(`tournaments/${tournamentId}/details`);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        { tournamentId }, // Pass data that DebounceManager expects
        { delay: 300, maxCalls: 5, windowMs: 1000 } // Custom config
      );
    });
  }
}
