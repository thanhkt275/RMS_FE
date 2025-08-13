/**
 * Team Response DTOs for Role-Based Access Control
 * 
 * Defines different response structures based on user roles and permissions.
 * Leverages existing permission patterns from the RBAC system.
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

import { UserRole } from "@/types/types";

/**
 * Base team information available to all users
 */
export interface BaseTeamDto {
  id: string;
  name: string;
  organization: string;
  memberCount: number;
}

/**
 * Public team information for common users
 * Contains minimal information safe for public viewing
 */
export interface PublicTeamDto extends BaseTeamDto {
  // Only basic public information
}

/**
 * Team member information with role-based filtering
 */
export interface FilteredTeamMemberDto {
  id: string;
  name: string;
  organization?: string;
  // Email and phone only visible to admin, referees, and team members
  email?: string;
  phoneNumber?: string;
  province?: string;
  ward?: string;
}

/**
 * Team information for team members (own team)
 * Contains full details for teams the user belongs to
 */
export interface OwnTeamDto extends BaseTeamDto {
  teamNumber: string;
  description?: string;
  tournamentId: string;
  referralSource: string;
  members: FilteredTeamMemberDto[];
  createdAt: Date;
  updatedAt: Date;
  isUserTeam: true;
}

/**
 * Team information for referees
 * Contains comprehensive information but excludes sensitive admin data
 */
export interface RefereeTeamDto extends BaseTeamDto {
  teamNumber: string;
  description?: string;
  tournamentId: string;
  members: FilteredTeamMemberDto[];
  createdAt: Date;
  // Excludes createdBy and other sensitive admin fields
}

/**
 * Team information for administrators
 * Contains all available information including sensitive data
 */
export interface AdminTeamDto extends BaseTeamDto {
  teamNumber: string;
  description?: string;
  tournamentId: string;
  userId: string; // Team owner/creator
  referralSource: string;
  members: FilteredTeamMemberDto[];
  createdAt: Date;
  updatedAt: Date;
  // Admin-specific fields
  createdBy?: string;
  auditLog?: AuditEntry[];
  statistics?: TeamStatistics;
}

/**
 * Audit entry for team changes (Admin only)
 */
export interface AuditEntry {
  id: string;
  action: string;
  userId: string;
  userName: string;
  timestamp: Date;
  details: Record<string, any>;
}

/**
 * Team statistics (visible to admin and referees)
 */
export interface TeamStatistics {
  matchesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  pointsScored: number;
  pointsConceded: number;
  averageScore: number;
  rank?: number;
}

/**
 * Union type for all possible team response DTOs
 */
export type TeamResponseDto =
  | PublicTeamDto
  | OwnTeamDto
  | RefereeTeamDto
  | AdminTeamDto;

/**
 * Team list response with role-based filtering
 */
export interface TeamsListResponseDto {
  teams: TeamResponseDto[];
  totalCount: number;
  filteredCount: number;
  userRole: UserRole;
  permissions: {
    canCreate: boolean;
    canImport: boolean;
    canExport: boolean;
    canViewSensitiveData: boolean;
  };
}

/**
 * Team creation request DTO
 */
export interface CreateTeamDto {
  name: string;
  tournamentId: string;
  referralSource: string;
  description?: string;
  members: Omit<FilteredTeamMemberDto, "id">[];
}

/**
 * Team update request DTO
 */
export interface UpdateTeamDto {
  id: string;
  name?: string;
  description?: string;
  referralSource?: string;
  members?: Omit<FilteredTeamMemberDto, "id">[];
}

/**
 * Team import/export DTOs
 */
export interface TeamImportDto {
  tournamentId: string;
  teams: CreateTeamDto[];
  options?: {
    skipDuplicates?: boolean;
    updateExisting?: boolean;
  };
}

export interface TeamExportDto {
  tournamentId: string;
  format: 'csv' | 'json' | 'xlsx';
  includeMembers?: boolean;
  includeStatistics?: boolean;
}

/**
 * Error response for team operations
 */
export interface TeamErrorResponseDto {
  statusCode: number;
  message: string;
  error: string;
  requiredRole?: UserRole[];
  userRole?: UserRole;
  action?: string;
  teamId?: string;
}