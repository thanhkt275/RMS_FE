import { useCallback, useMemo } from 'react';
import { ApiService } from './services/api.service';
import { DataTransformationService } from './services/data-transformation.service';
import { MatchScoreData } from './types/index';
import {
  useMatchScores,
  useCreateMatchScores,
  useUpdateMatchScores,
} from "@/hooks/matches/use-matches";

interface UsePersistenceProps {
  selectedMatchId: string;
  tournamentId: string;
  selectedFieldId: string | null;
}

export function usePersistence({ selectedMatchId, tournamentId, selectedFieldId }: UsePersistenceProps) {
  const createMutation = useCreateMatchScores();
  const updateMutation = useUpdateMatchScores();
  const { data: matchScores, refetch } = useMatchScores(selectedMatchId || "");
  
  const apiService = new ApiService(createMutation, updateMutation, refetch);
  const transformationService = new DataTransformationService();

  const saveScores = useCallback(async (scoreData: MatchScoreData) => {
    if (!selectedMatchId) return;

    console.log("Saving scores with calculated totals:", {
      redAuto: scoreData.redAlliance.autoScore,
      redDrive: scoreData.redAlliance.driveScore,
      redTotal: scoreData.redAlliance.totalScore,
      blueAuto: scoreData.blueAlliance.autoScore,
      blueDrive: scoreData.blueAlliance.driveScore,
      blueTotal: scoreData.blueAlliance.totalScore,
      fieldId: selectedFieldId,
      matchId: selectedMatchId
    });

    try {
      const apiData = transformationService.transformToApiFormat(scoreData, {
        matchId: selectedMatchId,
      });

      if (matchScores?.id) {
        await apiService.updateMatchScores(matchScores.id, apiData);
      } else {
        await apiService.createMatchScores(apiData);
      }

      await apiService.refetchScores();
      console.log("✅ Scores saved successfully");
    } catch (error) {
      console.error("Failed to save scores:", error);
      throw error;
    }
  }, [selectedMatchId, matchScores?.id, apiService, transformationService, selectedFieldId]);

  return {
    saveScores,
    matchScores,
    isLoading: createMutation.isPending || updateMutation.isPending,
  };
}
