import { useEffect } from 'react';
import { IScoringStateService } from './interfaces/index';
import { useMatchScores } from "@/hooks/matches/use-matches";

interface UseDataSyncProps {
  selectedMatchId: string;
  stateService: IScoringStateService;
  isUserActive: boolean;
}

export function useDataSync({ selectedMatchId, stateService, isUserActive }: UseDataSyncProps) {
  const { data: matchScores, isLoading } = useMatchScores(selectedMatchId || "");
  useEffect(() => {
    // Skip sync if user is actively typing
    if (isUserActive) {
      console.log("🚫 Skipping ALL sync operations (user actively typing)");
      return;
    }

    if (matchScores) {
      console.log("✅ Syncing form data with API data (user not actively typing)");
      
      // Only sync if the API data actually has score information
      const hasScoreData = matchScores.redAutoScore !== undefined || 
                          matchScores.redDriveScore !== undefined ||
                          matchScores.blueAutoScore !== undefined ||
                          matchScores.blueDriveScore !== undefined ||
                          matchScores.redTotalScore !== undefined ||
                          matchScores.blueTotalScore !== undefined;
      
      if (!hasScoreData) {
        console.log("⚠️ API data has no score information, skipping sync to prevent reset");
        return;
      }

      console.log("🔄 Syncing scores from API:", {
        redAuto: matchScores.redAutoScore || 0,
        redDrive: matchScores.redDriveScore || 0,
        blueAuto: matchScores.blueAutoScore || 0,
        blueDrive: matchScores.blueDriveScore || 0
      });

      stateService.syncWithApiData(matchScores);
    }
  }, [matchScores, isLoading, selectedMatchId, isUserActive]); // Removed stateService dependency

  return {
    isLoadingScores: isLoading,
    matchScores,
  };
}
