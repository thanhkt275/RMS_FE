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
}

export interface TeamMember {
  id: string;
  name: string;
  gender?: Gender | null;
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
