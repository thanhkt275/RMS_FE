import { useMemo } from 'react';
import { useTournament } from '@/hooks/tournaments/use-tournaments';
import { useTeams } from '@/hooks/teams/use-teams';

/**
 * Hook to check tournament team limits and provide validation
 * 
 * @param tournamentId Tournament ID to check
 * @param mode Form mode - only check limits for 'create' mode
 * @returns Team limit validation state and utilities
 */
export function useTeamLimitValidation(
  tournamentId: string | undefined,
  mode: 'create' | 'edit' = 'create'
) {
  const { data: tournament } = useTournament(tournamentId || '');
  const { data: teams = [] } = useTeams(tournamentId);

  return useMemo(() => {
    // Only check limits for team creation, not editing
    if (mode !== 'create' || !tournament || !tournament.maxTeams) {
      return {
        isAtLimit: false,
        isNearLimit: false,
        currentCount: teams.length,
        maxTeams: tournament?.maxTeams || null,
        message: null,
        canSubmit: true,
        warningMessage: null,
      };
    }

    const currentCount = teams.length;
    const maxTeams = tournament.maxTeams;
    const isAtLimit = currentCount >= maxTeams;
    const isNearLimit = currentCount >= Math.floor(maxTeams * 0.9); // 90% threshold

    let message: string | null = null;
    let warningMessage: string | null = null;

    if (isAtLimit) {
      message = `This tournament has reached its maximum limit of ${maxTeams} teams. No new teams can be registered.`;
    } else if (isNearLimit) {
      const remaining = maxTeams - currentCount;
      warningMessage = `Only ${remaining} team${remaining === 1 ? ' spot' : ' spots'} remaining out of ${maxTeams} total.`;
    }

    return {
      isAtLimit,
      isNearLimit,
      currentCount,
      maxTeams,
      message,
      canSubmit: !isAtLimit,
      warningMessage,
    };
  }, [tournament, teams, mode]);
}
