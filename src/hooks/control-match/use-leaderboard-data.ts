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
  allTeamsOption: string
) {
  return useMemo(() => {
    console.log("🔍 useLeaderboardData - Processing data:");
    console.log("selectedStageId:", selectedStageId);
    console.log("allTeamsOption:", allTeamsOption);
    console.log("tournamentStats length:", tournamentStats.length);
    console.log("tournamentTeams length:", tournamentTeams.length);
    console.log("swissRankings length:", swissRankings.length);
    
    if (selectedStageId === allTeamsOption) {
      // Show all teams in tournament with stats if available
      if (tournamentStats.length > 0) {
        console.log("🔍 Using tournament stats for leaderboard");
        console.log("First tournament stat:", tournamentStats[0]);
        
        const result = tournamentStats.map((r: TournamentTeamStats, i: number) => {
          // Use the correct API field names
          const totalScore = r.pointsScored ?? r.totalScore ?? 0;
          const highestScore = r.avgPointsScored ?? r.pointsScored ?? r.totalScore ?? 0;
          
          const row = {
            id: r.teamId || r.team?.id || `row-${i}`,
            teamName: r.teamName || r.team?.name || "",
            teamCode: r.teamNumber || r.team?.teamNumber || "",
            rank: r.rank ?? i + 1,
            totalScore: totalScore,
            highestScore: highestScore,
            wins: r.wins ?? 0,
            losses: r.losses ?? 0,
            ties: r.ties ?? 0,
            matchesPlayed: r.matchesPlayed ?? 0,
            rankingPoints: r.rankingPoints ?? 0,
            opponentWinPercentage: r.opponentWinPercentage ?? 0,
            pointDifferential: r.pointDifferential ?? 0,
          };
          if (i === 0) {
            console.log("🔍 First mapped row:", row);
            console.log("🔍 Score mapping detailed:", {
              'r.pointsScored': r.pointsScored,
              'r.avgPointsScored': r.avgPointsScored,
              'r.totalScore': r.totalScore,
              'r.highestScore': r.highestScore,
              'calculated totalScore': totalScore,
              'calculated highestScore': highestScore,
              'r.wins': r.wins,
              'All available fields': Object.keys(r)
            });
          }
          return row;
        });
        
        console.log("🔍 Final result length:", result.length);
        return result;
      }
      // Fallback: just show team list if no stats
      console.log("🔍 Using tournament teams fallback for leaderboard");
      return tournamentTeams.map((t, i) => ({
        id: t.id,
        teamName: t.name,
        teamCode: t.teamNumber,
        rank: i + 1,
        totalScore: 0,
        highestScore: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        matchesPlayed: 0,
        rankingPoints: 0,
        opponentWinPercentage: 0,
        pointDifferential: 0,
      }));
    }
    
    // Default: Swiss rankings for stage
    console.log("🔍 Using Swiss rankings for leaderboard");
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
  }, [selectedStageId, tournamentStats, tournamentTeams, swissRankings, allTeamsOption]);
}
