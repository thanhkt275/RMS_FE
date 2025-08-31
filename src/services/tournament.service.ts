import type { Tournament, UpdateTournamentDto, CreateStageDto } from '@/types/tournament.types';
import { apiClient } from '@/lib/api-client';
import { DebounceManager } from '@/services/unified-websocket/debounce-manager';

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

  static async exportData(tournamentId: string, format: 'csv' | 'excel' | 'json' = 'csv'): Promise<Blob> {
    return apiClient.getBlob(`tournaments/${tournamentId}/export?format=${format}`);
  }

  static async getSettings(tournamentId: string): Promise<any> {
    return apiClient.get(`tournaments/${tournamentId}/settings`);
  }

  static async updateSettings(tournamentId: string, settings: any): Promise<any> {
    return apiClient.patch(`tournaments/${tournamentId}/settings`, settings);
  }

  static async getNextMatch(tournamentId: string): Promise<any> {
    return apiClient.get(`tournaments/${tournamentId}/next-match`);
  }

  static async startMatch(tournamentId: string, matchId: string): Promise<any> {
    return apiClient.post(`tournaments/${tournamentId}/matches/${matchId}/start`);
  }

  static async duplicate(tournamentId: string, name: string): Promise<Tournament> {
    return apiClient.post<Tournament>(`tournaments/${tournamentId}/duplicate`, { name });
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
