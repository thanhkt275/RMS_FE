import type { Tournament, UpdateTournamentDto, CreateStageDto } from '@/lib/types/tournament.types';
import { apiClient } from '@/lib/api-client';

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
}
