/**
 * Query keys for TanStack Query
 * 
 * This file defines all the query keys used in the application,
 * making it easy to manage cache invalidation and dependencies.
 */
export const QueryKeys = {
  // Auth related queries
  auth: {
    user: () => ['auth', 'user'],
  },
  
  // Tournament related queries
  tournaments: {
    all: () => ['tournaments'],
    byId: (id: string) => ['tournaments', id],
    mine: () => ['tournaments', 'mine'],
  },
  
  // Stage related queries
  stages: {
    all: () => ['stages'],
    byId: (id: string) => ['stages', id],
    byTournament: (tournamentId: string) => ['stages', 'tournament', tournamentId],
  },
  
  // Match related queries
  matches: {
    all: () => ['matches'],
    byId: (id: string) => ['matches', id],
    byStage: (stageId: string) => ['matches', 'stage', stageId],
    byTournament: (tournamentId: string) => ['matches', 'tournament', tournamentId],
  },
  
  // Team related queries
  teams: {
    all: () => ['teams'],
    byId: (id: string) => ['teams', id],
    byTournament: (tournamentId: string) => ['teams', tournamentId],
    rankings: (stageId: string) => ['teams', 'rankings', stageId],
  },
  
  // Match scores related queries
  matchScores: {
    byMatch: (matchId: string) => ['match-scores', matchId],
    all: () => ['all-match-scores'],
  },
  
  // User related queries
  users: {
    all: (params?: Record<string, any>) => ['users', { params }],
    byId: (id: string) => ['users', id],
    search: (query: string, limit?: number) => ['users', 'search', { query, limit }],
    stats: () => ['users', 'stats'],
    auditLogs: (userId: string) => ['users', userId, 'audit'],
  },
  
  // Swiss rankings related queries
  swissRankings: {
    byStage: (stageId: string) => ['swiss-rankings', stageId],
  },
  
  // Audience display settings
  audienceDisplay: {
    settings: () => ['audience-display-settings'],
  },
  
  // Tournament fields related queries
  tournamentFields: {
    byTournament: (tournamentId: string) => ['tournamentFields', tournamentId],
  },
  
  // Tournament teams and stats related queries
  tournamentTeams: {
    byTournament: (tournamentId: string) => ['tournament-teams', tournamentId],
  },
  tournamentStats: {
    byTournament: (tournamentId: string) => ['tournament-stats', tournamentId],
  },
};

export const scoreConfigKeys = {
  all: ['score-configs'] as const,
  detail: (id: string) => [...scoreConfigKeys.all, id] as const,
};