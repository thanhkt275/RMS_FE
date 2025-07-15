import { useState, useEffect, useMemo } from "react";
import { useTournaments } from "@/hooks/tournaments/use-tournaments";
import { useStagesByTournament } from "@/hooks/stages/use-stages";
import { useTournamentTeams } from "@/hooks/tournaments/use-tournament-teams";
import { useTournamentStats } from "@/hooks/tournaments/use-tournament-stats";
import { useSwissRankings } from "@/hooks/control-match/use-swiss-ranking";
import { useLeaderboardData } from "@/hooks/control-match/use-leaderboard-data";
import { apiClient } from "@/lib/api-client";

const ALL_TEAMS_OPTION = "__ALL_TEAMS__";

export function useTeamsPageData() {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [selectedStageId, setSelectedStageId] = useState<string>("");

  // API queries
  const { data: tournaments, isLoading: tournamentsLoading } = useTournaments();
  const { data: stages = [], isLoading: stagesLoading } = useStagesByTournament(selectedTournamentId);
  const { data: tournamentTeams = [], isLoading: tournamentTeamsLoading } = useTournamentTeams(
    selectedStageId === ALL_TEAMS_OPTION ? selectedTournamentId : undefined
  );
  // Always fetch tournament stats for the selected tournament (not conditional on stage)
  const { data: tournamentStats = [], isLoading: tournamentStatsLoading } = useTournamentStats(selectedTournamentId);
  const { data: swissRankings = [], isLoading: swissLoading } = useSwissRankings(
    selectedStageId && selectedStageId !== ALL_TEAMS_OPTION ? selectedStageId : undefined
  );

  // Trigger ranking calculation if we have a tournament but no stats
  useEffect(() => {
    const triggerRankingCalculation = async () => {
      if (selectedTournamentId && tournamentStats.length === 0 && !tournamentStatsLoading) {
        try {
          console.log("🔄 Triggering full team stats recalculation for tournament:", selectedTournamentId);
          // First try to recalculate all stats from matches
          await apiClient.post(`/team-stats/recalculate-all?tournamentId=${selectedTournamentId}`);
          // Then update rankings
          await apiClient.post(`/team-stats/update-rankings?tournamentId=${selectedTournamentId}`);
          // The stats query will automatically refetch due to React Query
        } catch (error) {
          console.error("Failed to trigger team stats recalculation:", error);
          // Fallback to just ranking calculation
          try {
            await apiClient.post(`/team-stats/update-rankings?tournamentId=${selectedTournamentId}`);
          } catch (fallbackError) {
            console.error("Failed to trigger ranking calculation:", fallbackError);
          }
        }
      }
    };
    
    // Small delay to ensure loading state is stable
    const timeoutId = setTimeout(triggerRankingCalculation, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedTournamentId, tournamentStats.length, tournamentStatsLoading]);

  // Filter stages to ensure they belong to the current tournament (extra safety)
  const filteredStages = useMemo(() => {
    return selectedTournamentId 
      ? stages.filter(stage => stage.tournamentId === selectedTournamentId)
      : [];
  }, [selectedTournamentId, stages]);

  // Transform data to leaderboard rows
  const leaderboardRows = useLeaderboardData(
    selectedStageId,
    tournamentStats,
    tournamentTeams,
    swissRankings,
    ALL_TEAMS_OPTION
  );

  // Debug console logs to check raw data values
  useEffect(() => {
    if (selectedTournamentId) {
      console.log("🔍 Debug: Teams page data check");
      console.log("Selected Tournament ID:", selectedTournamentId);
      console.log("Selected Stage ID:", selectedStageId);
      console.log("Tournament Stats (raw):", tournamentStats);
      console.log("Tournament Teams (raw):", tournamentTeams);
      console.log("Swiss Rankings (raw):", swissRankings);
      console.log("Leaderboard Rows (processed):", leaderboardRows);
      console.log("Loading states:", {
        tournamentStatsLoading,
        tournamentTeamsLoading,
        swissLoading,
        stagesLoading
      });
      
      // Detailed debug of tournament stats structure
      if (tournamentStats.length > 0) {
        console.log("🔍 First tournament stat item:", tournamentStats[0]);
        console.log("🔍 Tournament stat keys:", Object.keys(tournamentStats[0]));
        console.log("🔍 Score values in first item:", {
          totalScore: tournamentStats[0].totalScore,
          highestScore: tournamentStats[0].highestScore,
          pointsScored: tournamentStats[0].pointsScored,
          rank: tournamentStats[0].rank
        });
      }
      
      // Detailed debug of leaderboard row structure
      if (leaderboardRows.length > 0) {
        console.log("🔍 First leaderboard row:", leaderboardRows[0]);
        console.log("🔍 Leaderboard row keys:", Object.keys(leaderboardRows[0]));
      }
    }
  }, [selectedTournamentId, selectedStageId, tournamentStats, tournamentTeams, swissRankings, leaderboardRows, tournamentStatsLoading, tournamentTeamsLoading, swissLoading, stagesLoading]);

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

  const isLoading = tournamentsLoading || stagesLoading || 
    (selectedStageId === ALL_TEAMS_OPTION ? (tournamentTeamsLoading || tournamentStatsLoading) : swissLoading);

  return {
    // Selection state
    selectedTournamentId,
    setSelectedTournamentId,
    selectedStageId,
    setSelectedStageId,
    
    // Data
    tournaments,
    filteredStages,
    leaderboardRows,
    
    // Loading states
    isLoading,
    tournamentsLoading,
    stagesLoading,
    
    // Constants
    ALL_TEAMS_OPTION,
  };
}
