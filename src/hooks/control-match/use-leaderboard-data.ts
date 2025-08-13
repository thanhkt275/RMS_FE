import { useMemo } from "react";

import type { Team } from "@/types/types";
import type { TournamentTeamStats } from "../tournaments/use-tournament-stats";

export interface SwissRanking {
  teamId: string;
  team?: {
    id: string;
    name: string;
    teamNumber: string;
  };
  teamName?: string;
  teamNumber?: string;
  rank?: number;
  totalScore?: number;
  highestScore?: number;
  pointsScored?: number;
  wins?: number;
  losses?: number;
  ties?: number;
  matchesPlayed?: number;
  rankingPoints?: number;
  opponentWinPercentage?: number;
  pointDifferential?: number;
}

export function useLeaderboardData(
  selectedStageId: string,
  tournamentStats: TournamentTeamStats[],
  tournamentTeams: Team[],
  swissRankings: SwissRanking[],
  allTeamsOption: string,
  displayAllTeams: boolean = false
) {
  return useMemo(() => {
    console.log("🔍 useLeaderboardData - Processing data:");
    console.log("selectedStageId:", selectedStageId);
    console.log("allTeamsOption:", allTeamsOption);
    console.log("tournamentStats length:", tournamentStats.length);
    console.log("tournamentTeams length:", tournamentTeams.length);
    console.log("swissRankings length:", swissRankings.length);

    if (selectedStageId === allTeamsOption || displayAllTeams) {
      // For teams page: always show all tournament teams with optional stats
      console.log("🔍 Using tournament teams for team list display");
      const statsMap = new Map(tournamentStats.map(stat => [stat.teamId, stat]));
      
      const teamList = tournamentTeams.map((team, index) => {
        const stat = statsMap.get(team.id);
        return {
          id: team.id,
          teamName: team.name,
          teamCode: team.teamNumber,
          rank: stat?.rank ?? index + 1,
          totalScore: stat?.pointsScored ?? stat?.totalScore ?? 0,
          highestScore: stat?.avgPointsScored ?? stat?.pointsScored ?? stat?.totalScore ?? 0,
          wins: stat?.wins ?? 0,
          losses: stat?.losses ?? 0,
          ties: stat?.ties ?? 0,
          matchesPlayed: stat?.matchesPlayed ?? 0,
          rankingPoints: stat?.rankingPoints ?? 0,
          opponentWinPercentage: stat?.opponentWinPercentage ?? 0,
          pointDifferential: stat?.pointDifferential ?? 0,
        };
      });

      console.log("🔍 Team list length:", teamList.length);
      return teamList;
    }

    // For stage-specific rankings: use Swiss rankings if available, otherwise show empty list
    console.log("🔍 Using Swiss rankings for stage leaderboard");
    if (swissRankings.length === 0) {
      console.log("🔍 No Swiss rankings available for this stage");
      return [];
    }
    
    return swissRankings.map((r: SwissRanking, i: number) => ({
      id: r.teamId || r.team?.id || `row-${i}`,
      teamName: r.team?.name || r.teamName || "",
      teamCode: r.team?.teamNumber || r.teamNumber || "",
      rank: r.rank ?? i + 1,
      totalScore: r.totalScore ?? r.pointsScored ?? 0,
      highestScore: r.highestScore ?? r.pointsScored ?? 0,
      wins: r.wins ?? 0,
      losses: r.losses ?? 0,
      ties: r.ties ?? 0,
      matchesPlayed: r.matchesPlayed ?? 0,
      rankingPoints: r.rankingPoints ?? 0,
      opponentWinPercentage: r.opponentWinPercentage ?? 0,
      pointDifferential: r.pointDifferential ?? 0,
    }));
  }, [selectedStageId, tournamentStats, tournamentTeams, swissRankings, allTeamsOption, displayAllTeams]);
}
