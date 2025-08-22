import { User, Gender } from "./user.types";

export interface Team {
  id: string;
  teamNumber: string;
  name: string;
  tournamentId: string;
  userId: string;
  referralSource: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  teamMembers?: TeamMember[];
  teamMemberCount?: number; // Calculated field for team member count
  _count?: {
    teamMembers: number;
  };
}

export interface TeamMember {
  id: string;
  name: string;
  gender?: Gender | null;
  dateOfBirth: string;
  phoneNumber?: string;
  email?: string;
  province: string;
  ward: string;
  organization?: string;
  organizationAddress?: string;
  teamId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateTeamRequest = {
  name: string;
  tournamentId: string;
  referralSource: string;
  teamMembers: Omit<TeamMember, "id" | "teamId" | "createdAt" | "updatedAt">[];
};

export type UpdateTeamRequest = {
  name: string;
  tournamentId: string;
  referralSource: string;
  teamMembers: Omit<TeamMember, "id" | "teamId" | "createdAt" | "updatedAt">[];
};
