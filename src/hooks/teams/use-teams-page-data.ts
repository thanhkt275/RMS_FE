import { useState, useEffect, useMemo } from "react";
import { useTournaments } from "@/hooks/tournaments/use-tournaments";
import { useStagesByTournament } from "@/hooks/stages/use-stages";
import { useUserTournamentPreferences } from "@/hooks/common/use-tournament-preferences";
import { useAuth } from "@/hooks/common/use-auth";
import { apiClient } from "@/lib/api-client";

const ALL_TEAMS_OPTION = "__ALL_TEAMS__";

export function useTeamsPageData() {
  const { user } = useAuth();
  const [selectedStageId, setSelectedStageId] = useState<string>("");

  // API queries
  const { data: tournaments = [], isLoading: tournamentsLoading } = useTournaments();
  
  // Auto-save tournament selection with user preferences
  const {
    selectedTournamentId,
    setSelectedTournamentId,
    isLoading: preferencesLoading,
    hasStoredPreference,
  } = useUserTournamentPreferences(user?.id || "", tournaments);
  
  const { data: stages = [], isLoading: stagesLoading } = useStagesByTournament(selectedTournamentId);



  // Filter stages to ensure they belong to the current tournament (extra safety)
  const filteredStages = useMemo(() => {
    return selectedTournamentId 
      ? stages.filter(stage => stage.tournamentId === selectedTournamentId)
      : [];
  }, [selectedTournamentId, stages]);



  // When tournament changes, reset stage selection
  useEffect(() => {
    setSelectedStageId("");
  }, [selectedTournamentId]);

  // When stages are loaded for the tournament, auto-select first option
  useEffect(() => {
    if (selectedTournamentId && filteredStages.length > 0 && !stagesLoading) {
      // Check if the currently selected stage belongs to the current tournament
      const stageExists = filteredStages.find(stage => stage.id === selectedStageId);
      
      if (!selectedStageId || !stageExists) {
        // Auto-select "All Teams" as the default option if no valid stage is selected
        setSelectedStageId(ALL_TEAMS_OPTION);
      }
    }
  }, [selectedTournamentId, filteredStages, stagesLoading, selectedStageId]);

  const isLoading = tournamentsLoading || stagesLoading || preferencesLoading;

  return {
    // Selection state
    selectedTournamentId,
    setSelectedTournamentId,
    selectedStageId,
    setSelectedStageId,
    
    // Data
    tournaments,
    filteredStages,
    
    // Loading states
    isLoading,
    tournamentsLoading,
    stagesLoading,
    preferencesLoading,
    
    // Preference info
    hasStoredPreference,
    
    // Constants
    ALL_TEAMS_OPTION,
  };
}
