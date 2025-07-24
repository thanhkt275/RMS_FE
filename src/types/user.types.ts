/**
 * User Management Types
 * Defines interfaces and types for user management functionality
 */

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export enum UserRole {
  ADMIN = "ADMIN",
  HEAD_REFEREE = "HEAD_REFEREE",
  ALLIANCE_REFEREE = "ALLIANCE_REFEREE",
  TEAM_LEADER = "TEAM_LEADER",
  TEAM_MEMBER = "TEAM_MEMBER",
  COMMON = "COMMON",
}

export interface User {
  name: string;
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  phoneNumber: string | null;
  gender: Gender;
  dateOfBirth: Date | null;
  avatar: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: User | null;
  createdById: string | null;
}

export interface CreateUserRequest {
  name: string;
  username: string;
  password: string;
  email?: string;
  role: UserRole;
  phoneNumber?: string;
  gender?: Gender;
  dateOfBirth?: Date;
}

export interface UpdateUserRequest {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  phoneNumber?: string;
  gender?: Gender;
  dateOfBirth?: Date;
  avatar?: string;
  isActive?: boolean;
}

export interface ChangeRoleRequest {
  role: UserRole;
  reason: string;
}

export interface BulkOperationRequest {
  userIds: string[];
  action: "delete" | "changeRole";
  role?: UserRole;
  reason?: string;
}

export interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface UserQueryParams extends UserFilters {
  page: number;
  limit: number;
  sortBy?: "username" | "email" | "role" | "createdAt" | "lastLoginAt";
  sortOrder?: "asc" | "desc";
}

export interface UserListResponse {
  users: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface UserStats {
  [UserRole.ADMIN]: number;
  [UserRole.HEAD_REFEREE]: number;
  [UserRole.ALLIANCE_REFEREE]: number;
  [UserRole.TEAM_LEADER]: number;
  [UserRole.TEAM_MEMBER]: number;
  [UserRole.COMMON]: number;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  createdById: string;
  action: string;
  tableName: string;
  recordId: string | null;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

// Component Props Interfaces
export interface UserTableProps {
  users: User[];
  loading: boolean;
  selectedUsers: string[];
  onSelectUser: (userId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onSort: (field: string, direction: "asc" | "desc") => void;
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onChangeRole: (userId: string) => void;
}

export interface UserFormProps {
  user?: User;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  loading: boolean;
}

export interface UserStatsProps {
  stats: UserStats | null;
  loading: boolean;
}

export interface BulkActionsProps {
  selectedUsers: string[];
  onBulkDelete: (userIds: string[], reason?: string) => Promise<void>;
  onBulkChangeRole: (
    userIds: string[],
    role: UserRole,
    reason?: string
  ) => Promise<void>;
  disabled: boolean;
}

export interface UserSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export interface RoleChangeModalProps {
  user?: User;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (role: UserRole, reason: string) => Promise<void>;
  loading: boolean;
}

export interface UserProfileProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (user: User) => void;
  auditLogs?: AuditLog[];
  loadingAudit?: boolean;
}

// Error types
export interface UserManagementError {
  code: string;
  message: string;
  field?: string;
}

// State management types
export interface UserManagementState {
  users: User[];
  totalUsers: number;
  currentPage: number;
  pageSize: number;
  filters: UserFilters;
  loading: boolean;
  selectedUsers: string[];
  stats: UserStats | null;
  error: UserManagementError | null;
  sortBy: string;
  sortOrder: "asc" | "desc";
}
