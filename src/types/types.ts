import { TeamMember } from "@/types/team.types";

export enum MatchStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

export enum CardType {
  NONE = "NONE",
  YELLOW = "YELLOW",
  RED = "RED",
}

export enum UserRole {
  ADMIN = "ADMIN",
  HEAD_REFEREE = "HEAD_REFEREE",
  ALLIANCE_REFEREE = "ALLIANCE_REFEREE",
  TEAM_LEADER = "TEAM_LEADER",
  TEAM_MEMBER = "TEAM_MEMBER",
  COMMON = "COMMON",
}

// --- Audience Display Types ---

export type DisplayMode =
  | "match"
  | "teams"
  | "schedule"
  | "blank"
  | "rankings"
  | "custom"
  | "announcement"
  | "intro";

export interface User {
  id: string;
  username: string;
  role: UserRole;
  email?: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    username: string,
    password: string,
    email?: string
  ) => Promise<void>;
}

export interface AudienceDisplaySettings {
  displayMode: DisplayMode;
  matchId?: string | null;
  showTimer?: boolean;
  showScores?: boolean;
  showTeams?: boolean;
  message?: string;
  timerStartedAt?: number | null;
  updatedAt: number;
  tournamentId: string;
  fieldId?: string | null;
}

// --- Field ---
export interface Field {
  id: string;
  name: string;
  number: number;
  location?: string;
  description?: string;
  tournamentId: string;
}

// --- Match ---
export interface Match {
  id: string;
  matchNumber: number;
  roundNumber?: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  startTime?: string;
  endTime?: string;
  scheduledTime?: string;
  winningAlliance?: "RED" | "BLUE" | "TIE";
  stageId: string;
  stage?: {
    id: string;
    name: string;
    tournament?: {
      id: string;
      name: string;
    };
  };
  alliances?: Alliance[];
}

export interface MatchContextType {
  activeMatchId: string | null;
  setActiveMatchId: (id: string | null) => void;
}

// --- Alliance ---
export interface Alliance {
  id: string;
  color: "RED" | "BLUE";
  matchId: string;
  score: number;
  teamAlliances?: {
    team: {
      id: string;
      name: string;
      teamNumber: string;
    };
  }[];
  allianceScoring?: AllianceScoring;
}

export interface AllianceScoring {
  id: string;
  allianceId: string;
  autoScore: number;
  driverScore: number;
  endGameScore: number;
  penaltyScore: number;
  totalScore: number;
}

export interface TeamAlliance {
  id: string;
  teamId: string;
  stationPosition: number;
  isSurrogate: boolean;
  team: Team;
}

// --- Team ---
export interface Team {
  id: string;
  teamNumber: string;
  name: string;
  tournamentId: string;
  userId: string;
  referralSource: string;
  teamMembers?: TeamMember[];
}

// --- Rankings/Stats ---
export interface TeamStats {
  id: string;
  teamId: string;
  tournamentId: string;
  wins: number;
  losses: number;
  ties: number;
  pointsScored: number;
  pointsConceded: number;
  matchesPlayed: number;
  rankingPoints: number;
  rank?: number;
  tiebreaker1?: number;
  tiebreaker2?: number;
}

// --- Preset/Template Types ---
export interface DisplayTemplate {
  id: string;
  name: string;
  layout: "full" | "split" | "minimal";
  components: Array<"scoreboard" | "timer" | "teams" | "rankings" | "custom">;
}

// --- Error/Loading States ---
export interface DisplayError {
  message: string;
  code?: string;
}

export interface LoadingState {
  loading: boolean;
  message?: string;
}

// --- WebSocket/Real-time Types ---

export interface TimerData {
  duration: number;
  remaining: number;
  isRunning: boolean;
  startedAt?: number;
  pausedAt?: number;
  tournamentId: string;
  fieldId?: string;
}

export interface MatchData {
  id: string;
  matchNumber: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  tournamentId: string;
  fieldId?: string;
  redTeams?: Array<{ id: string; name: string; teamNumber?: string }>;
  blueTeams?: Array<{ id: string; name: string; teamNumber?: string }>;
  // Add other match properties as needed
}

export interface ScoreData {
  matchId: string;
  redAutoScore: number;
  redDriveScore: number;
  redTotalScore: number;
  blueAutoScore: number;
  blueDriveScore: number;
  blueTotalScore: number;
  redPenalty?: number;
  bluePenalty?: number;
  tournamentId: string;
  fieldId?: string;
  redGameElements?:
    | Array<{
        element: string;
        count: number;
        pointsEach: number;
        totalPoints: number;
        operation: string;
      }>
    | Record<string, number>;
  blueGameElements?:
    | Array<{
        element: string;
        count: number;
        pointsEach: number;
        totalPoints: number;
        operation: string;
      }>
    | Record<string, number>;
  redTeamCount?: number;
  redMultiplier?: number;
  blueTeamCount?: number;
  blueMultiplier?: number;
  scoreDetails?: Record<string, unknown>;
}

export interface MatchStateData {
  matchId: string;
  status: MatchStatus;
  currentPeriod?: "auto" | "teleop" | "endgame" | null;
  tournamentId: string;
  fieldId?: string;
}

export interface AnnouncementData {
  message: string;
  tournamentId: string;
  fieldId?: string;
  duration?: number;
}

export type EventCallback<T> = (data: T) => void;

export type WebSocketEvent =
  | "display_mode_change"
  | "match_update"
  | "score_update"
  | "scoreUpdateRealtime"
  | "timer_update"
  | "match_state_change"
  | "announcement"
  | "submitTempScores"
  | "approveFinalScores"
  | "tempScoresResult"
  | "tempScoresSubmitted"
  | "tempScoresSubmissionFailed"
  | "finalScoresApproved"
  | "finalScoresApprovalFailed"
  | 'ranking_update'
  | 'ranking_recalculation';

// --- Match Control Types ---
export interface Match {
  id: string;
  matchNumber: number;
  roundNumber?: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  startTime?: string;
  endTime?: string;
  scheduledTime?: string;
  winningAlliance?: "RED" | "BLUE" | "TIE";
  stageId: string;
  stage?: {
    id: string;
    name: string;
    tournament?: {
      id: string;
      name: string;
    };
  };
  alliances?: Alliance[];
}

export interface MatchScores {
  id: string;
  matchId: string;
  redAutoScore: number;
  redDriveScore: number;
  redTotalScore: number;
  redTeamCount?: number;
  redMultiplier?: number;
  redHighGoals?: number;
  redLowGoals?: number;
  redPenalties?: number;
  redEndgamePoints?: number;
  blueAutoScore: number;
  blueDriveScore: number;
  blueTotalScore: number;
  blueTeamCount?: number;
  blueMultiplier?: number;
  blueHighGoals?: number;
  blueLowGoals?: number;
  bluePenalties?: number;
  blueEndgamePoints?: number;
  redGameElements?: Record<string, number>;
  blueGameElements?: Record<string, number>;
  scoreDetails?: {
    penalties?: {
      red: number;
      blue: number;
    };
    specialScoring?: Record<
      string,
      {
        red: number;
        blue: number;
      }
    >;
  };
  match?: {
    id: string;
    matchNumber: number;
    status: string;
    stage?: {
      name: string;
      tournament?: {
        name: string;
      };
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface ScoreUpdate {
  redAutoScore?: number;
  redDriveScore?: number;
  blueAutoScore?: number;
  blueDriveScore?: number;
}

export interface TimerState {
  duration: number;
  remaining: number;
  isRunning: boolean;
}

export interface Alliance {
  id: string;
  color: "RED" | "BLUE";
  matchId: string;
  score: number;
  teamAlliances?: {
    team: {
      id: string;
      name: string;
      teamNumber: string;
    };
  }[];
  allianceScoring?: AllianceScoring;
}

export interface AllianceScoring {
  id: string;
  allianceId: string;
  autoScore: number;
  driverScore: number;
  endGameScore: number;
  penaltyScore: number;
  totalScore: number;
}

export interface AllianceScoreUpdate {
  allianceId: string;
  autoScore?: number;
  driverScore?: number;
  endGameScore?: number;
  penaltyScore?: number;
}

export interface AudienceDisplayData {
  matchId: string | null;
  showTimer: boolean;
  showScores: boolean;
  showTeams: boolean;
  displayMode:
    | "INTRO"
    | "MATCH_RESULTS"
    | "WAITING"
    | "FINAL_RESULTS"
    | "CUSTOM_MESSAGE"
    | "DEFAULT";
  customMessage?: string;
  introVideo?: {
    source: string;
    autoplay: boolean;
    loop: boolean;
  };
  waitingMessage?: string;
  finalScoreDelay?: number;
}

// --- API Data Types ---

export interface Stage {
  id: string;
  name: string;
  type: "SWISS" | "PLAYOFF" | "FINAL";
  startDate: string;
  endDate: string;
  tournamentId: string;
  createdAt: string;
  updatedAt: string;
  tournament?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
}

export interface CreateStageInput {
  name: string;
  type: "SWISS" | "PLAYOFF" | "FINAL";
  startDate: string;
  endDate: string;
  tournamentId: string;
}

export interface UpdateStageInput {
  name?: string;
  type?: "SWISS" | "PLAYOFF" | "FINAL";
  startDate?: string;
  endDate?: string;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  adminId: string;
  createdAt: string;
  updatedAt: string;
  numberOfFields?: number;
  admin?: {
    id: string;
    username: string;
  };
  userTeam?: Team;
}

export interface CreateTournamentInput {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  adminId: string;
}

export interface UpdateTournamentInput {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

// --- Match Scheduler Types ---
export interface GenerateFrcScheduleRequest {
  stageId: string;
  rounds: number;
  teamsPerAlliance: number;
  minMatchSeparation: number;
  qualityLevel: "low" | "medium" | "high";
}

export interface GenerateSwissRoundRequest {
  stageId: string;
  currentRoundNumber: number;
}

export interface GeneratePlayoffRequest {
  stageId: string;
  numberOfRounds: number;
}
