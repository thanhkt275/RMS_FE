import type { 
  AvailableReferee, 
  AssignRefereesDto, 
  BatchAssignRefereesDto,
  FieldReferee 
} from '@/types/referee.types';
import { apiClient } from '@/lib/api-client';

export class FieldRefereeService {
  static async getAvailableReferees(): Promise<AvailableReferee[]> {
    return apiClient.get<AvailableReferee[]>('field-referees/available');
  }

  static async getAvailableRefereesForTournament(tournamentId: string): Promise<AvailableReferee[]> {
    return apiClient.get<AvailableReferee[]>(`field-referees/tournaments/${tournamentId}/available`);
  }

  static async assignReferees(fieldId: string, data: AssignRefereesDto): Promise<FieldReferee[]> {
    return apiClient.post<FieldReferee[]>(`field-referees/fields/${fieldId}/assign`, data);
  }

  static async removeReferee(fieldId: string, userId: string): Promise<void> {
    return apiClient.delete<void>(`field-referees/fields/${fieldId}/referees/${userId}`);
  }

  static async batchAssignReferees(data: BatchAssignRefereesDto): Promise<FieldReferee[]> {
    return apiClient.post<FieldReferee[]>('field-referees/batch-assign', data);
  }

  static async getFieldReferees(fieldId: string): Promise<FieldReferee[]> {
    return apiClient.get<FieldReferee[]>(`field-referees/fields/${fieldId}`);
  }

  static async getRefereesByTournament(tournamentId: string): Promise<FieldReferee[]> {
    return apiClient.get<FieldReferee[]>(`field-referees/tournaments/${tournamentId}`);
  }

  static async replaceAllReferees(fieldId: string, data: AssignRefereesDto): Promise<FieldReferee[]> {
    return apiClient.post<FieldReferee[]>(`field-referees/fields/${fieldId}/replace`, data);
  }
}
