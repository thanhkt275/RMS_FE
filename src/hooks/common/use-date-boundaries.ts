import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { DateRange } from '@/lib/date-validation';

export interface DateBoundariesResponse {
  tournament: DateRange;
  stage?: DateRange;
  warnings: string[];
}

export interface DateBoundariesParams {
  tournamentId: string;
  stageId?: string;
}

/**
 * Fetches date boundaries for validation from the API
 */
export function useDateBoundaries(params: DateBoundariesParams) {
  return useQuery({
    queryKey: ['date-boundaries', params.tournamentId, params.stageId],
    queryFn: async (): Promise<DateBoundariesResponse> => {
      const url = params.stageId 
        ? `/tournaments/${params.tournamentId}/stages/${params.stageId}/date-boundaries`
        : `/tournaments/${params.tournamentId}/date-boundaries`;
      
      const response = await apiClient.get<DateBoundariesResponse>(url);
      
      // Convert string dates to Date objects
      return {
        tournament: {
          startDate: new Date(response.tournament.startDate),
          endDate: new Date(response.tournament.endDate)
        },
        stage: response.stage ? {
          startDate: new Date(response.stage.startDate),
          endDate: new Date(response.stage.endDate)
        } : undefined,
        warnings: response.warnings
      };
    },
    enabled: !!params.tournamentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get tournament date boundaries
 */
export function useTournamentDateBoundaries(tournamentId: string) {
  return useDateBoundaries({ tournamentId });
}

/**
 * Hook to get stage date boundaries (includes tournament boundaries)
 */
export function useStageDateBoundaries(tournamentId: string, stageId: string) {
  return useDateBoundaries({ tournamentId, stageId });
}

/**
 * Hook to validate if date range updates would have impact
 */
export function useDateRangeUpdateImpact(
  entityType: 'tournament' | 'stage',
  entityId: string,
  newRange?: DateRange
) {
  return useQuery({
    queryKey: ['date-range-impact', entityType, entityId, newRange],
    queryFn: async () => {
      if (!newRange) return null;
      
      const response = await apiClient.post(`/${entityType}s/${entityId}/validate-date-update`, {
        startDate: newRange.startDate.toISOString(),
        endDate: newRange.endDate.toISOString()
      });
      
      return response;
    },
    enabled: !!(entityId && newRange),
    staleTime: 0, // Always fresh for impact analysis
  });
}
