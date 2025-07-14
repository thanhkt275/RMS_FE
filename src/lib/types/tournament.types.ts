import { Team } from "../../types/team.types";

export interface Tournament {
  id: string;
  name: string;
  description: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  adminId: string;
  numberOfFields: number;
  createdAt: Date;
  updatedAt: Date;
  admin: {
    id: string;
    username: string;
    email: string;
  };
  stages: Stage[];
  fields: Field[];
  teams: Team[];
  _count: {
    stages: number;
    fields: number;
    teams: number;
  };
  maxTeams?: number;
  maxTeamMembers?: number;
}

export enum StageStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
}

export interface Stage {
  id: string;
  name: string;
  description?: string;
  stageType: "QUALIFICATION" | "PLAYOFF" | "FINAL";
  status: StageStatus;
  startDate: Date;
  endDate?: Date;
  maxTeams?: number;
  isElimination?: boolean;
  advancementRules?: string;
  tournamentId: string;
  matches?: Match[];
  _count?: {
    matches: number;
    completedMatches: number;
  };
}

export interface Field {
  id: string;
  name: string;
  number?: number;
  isActive: boolean;
  tournamentId: string;
  fieldReferees?: FieldReferee[];
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    matches: number;
    activeMatches: number;
  };
}

export interface FieldReferee {
  id: string;
  fieldId: string;
  userId: string;
  isHeadRef: boolean;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    email: string;
    role: "HEAD_REFEREE" | "ALLIANCE_REFEREE";
  };
}

/*export interface Team {
  id: string;
  teamNumber: number;
  name: string;
  organization: string;
}*/

export interface Match {
  id: string;
  matchNumber: number;
  status: "PENDING" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
  startTime?: Date;
  endTime?: Date;
  fieldId?: string;
  scoredById?: string;
}

export interface TournamentStats {
  totalStages: number;
  activeStages: number;
  completedStages: number;
  totalFields: number;
  fieldsWithReferees: number;
  fieldsWithHeadReferee: number;
  totalReferees: number;
  averageRefereesPerField: number;
}

export interface UpdateTournamentDto {
  name?: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  numberOfFields?: number;
}

export interface CreateStageDto {
  name: string;
  stageType: "QUALIFICATION" | "PLAYOFF" | "FINAL";
  startDate: string;
  endDate?: string;
}
