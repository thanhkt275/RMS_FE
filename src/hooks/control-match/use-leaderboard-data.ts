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
      // Show all teams in tournament, merging stats with complete team roster
      console.log("🔍 Merging tournament stats with complete team roster");
      console.log("Tournament stats available:", tournamentStats.length);
      console.log("Total teams in tournament:", tournamentTeams.length);

      // Create a map of team stats by team ID for quick lookup
      const statsMap = new Map<string, TournamentTeamStats>();
      tournamentStats.forEach(stat => {
        const teamId = stat.teamId || stat.team?.id;
        if (teamId) {
          statsMap.set(teamId, stat);
        }
      });

      // Create leaderboard rows for all teams
      const allTeamRows = tournamentTeams.map((team, i) => {
        const stats = statsMap.get(team.id);

        if (stats) {
          // Team has stats - use actual data
          const totalScore = stats.pointsScored ?? stats.totalScore ?? 0;
          const highestScore = stats.avgPointsScored ?? stats.pointsScored ?? stats.totalScore ?? 0;

          return {
            id: team.id,
            teamName: team.name,
            teamCode: team.teamNumber,
            rank: stats.rank ?? 0, // Will be re-ranked below
            totalScore: totalScore,
            highestScore: highestScore,
            wins: stats.wins ?? 0,
            losses: stats.losses ?? 0,
            ties: stats.ties ?? 0,
            matchesPlayed: stats.matchesPlayed ?? 0,
            rankingPoints: stats.rankingPoints ?? 0,
            opponentWinPercentage: stats.opponentWinPercentage ?? 0,
            pointDifferential: stats.pointDifferential ?? 0,
          };
        } else {
          // Team has no stats - use default values
          return {
            id: team.id,
            teamName: team.name,
            teamCode: team.teamNumber,
            rank: 0, // Will be re-ranked below
            totalScore: 0,
            highestScore: 0,
            wins: 0,
            losses: 0,
            ties: 0,
            matchesPlayed: 0,
            rankingPoints: 0,
            opponentWinPercentage: 0,
            pointDifferential: 0,
          };
        }
      });

      // Sort teams: teams with stats first (by ranking points, then by point differential),
      // then teams without stats (alphabetically)
      const sortedRows = allTeamRows.sort((a, b) => {
        // If both teams have played matches, sort by ranking criteria
        if (a.matchesPlayed > 0 && b.matchesPlayed > 0) {
          // Primary: Ranking points (descending)
          if (a.rankingPoints !== b.rankingPoints) {
            return b.rankingPoints - a.rankingPoints;
          }
          // Secondary: Point differential (descending)
          if (a.pointDifferential !== b.pointDifferential) {
            return b.pointDifferential - a.pointDifferential;
          }
          // Tertiary: Total score (descending)
          return b.totalScore - a.totalScore;
        }

        // If only one team has played, that team ranks higher
        if (a.matchesPlayed > 0 && b.matchesPlayed === 0) return -1;
        if (a.matchesPlayed === 0 && b.matchesPlayed > 0) return 1;

        // If neither team has played, sort alphabetically by team name
        return a.teamName.localeCompare(b.teamName);
      });

      // Assign final ranks
      const finalRows = sortedRows.map((row, index) => ({
        ...row,
        rank: index + 1,
      }));

      console.log("🔍 Final merged leaderboard:", finalRows);
      console.log(`🔍 Showing ${finalRows.length} teams total (${tournamentStats.length} with stats, ${finalRows.length - tournamentStats.length} without stats)`);

      return finalRows;
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
