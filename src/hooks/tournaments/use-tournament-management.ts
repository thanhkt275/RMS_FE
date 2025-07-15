'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { Tournament, TournamentStats, Field, Stage } from '@/types/tournament.types';
import { TournamentService } from '@/services/tournament.service';

export function useTournamentManagement(tournamentId: string) {
  const [isActive, setIsActive] = useState(true);
  
  // Smart focus tracking for efficient polling
  useEffect(() => {
    const handleFocus = () => setIsActive(true);
    const handleBlur = () => setIsActive(false);
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Single comprehensive query to minimize server requests
  const tournamentQuery = useQuery({
    queryKey: ['tournament-management', tournamentId],
    queryFn: () => TournamentService.getFullDetails(tournamentId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
    refetchInterval: isActive ? 30000 : false, // Poll only when active
    refetchOnWindowFocus: true,
    enabled: !!tournamentId,
  });

  // Derived data computed client-side to reduce server load
  const tournament = tournamentQuery.data;
  const stages: Stage[] = tournament?.stages || [];
  const fields: Field[] = tournament?.fields || [];
  
  // Client-side computed statistics
  const stats: TournamentStats = useMemo(() => {
    const fieldsWithReferees = fields.filter((f) => f.fieldReferees && f.fieldReferees.length > 0);
    const fieldsWithHeadReferee = fields.filter((f) => 
      f.fieldReferees && f.fieldReferees.some((fr) => fr.isHeadRef)
    );
    const allRefereeIds = new Set(
      fields.flatMap((f) => f.fieldReferees ? f.fieldReferees.map((fr) => fr.userId) : [])
    );
    const totalRefereeAssignments = fields.reduce(
      (sum: number, f) => sum + (f.fieldReferees ? f.fieldReferees.length : 0), 
      0
    );

    return {
      totalStages: stages.length,
      activeStages: stages.filter((s) => s.status === 'ACTIVE').length,
      completedStages: stages.filter((s) => s.status === 'COMPLETED').length,
      totalFields: fields.length,
      fieldsWithReferees: fieldsWithReferees.length,
      fieldsWithHeadReferee: fieldsWithHeadReferee.length,
      totalReferees: allRefereeIds.size,
      averageRefereesPerField: fields.length > 0 ? totalRefereeAssignments / fields.length : 0,
    };
  }, [stages, fields]);

  return {
    tournament,
    stages,
    fields,
    stats,
    isLoading: tournamentQuery.isLoading,
    isError: tournamentQuery.isError,
    error: tournamentQuery.error,
    refetch: tournamentQuery.refetch,
  };
}
