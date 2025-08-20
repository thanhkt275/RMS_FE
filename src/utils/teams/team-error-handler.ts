/**
 * Team Error Handling Utility
 * 
 * Provides centralized error handling for team-related operations using existing
 * RBAC error patterns and infrastructure.
 * 
 * Features:
 * - Integrates with existing rbacLogger for team-specific events
 * - Provides user-friendly error messages using existing permission error patterns
 * - Supports existing loading states and error handling infrastructure
 * - Includes tooltip support using existing getAccessDeniedMessage patterns
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

import { toast } from 'sonner';
import { rbacLogger } from '@/config/rbacLogger';
import { UserRole } from '@/types/types';
import type { Team } from '@/types/team.types';

/**
 * Interface for team error context
 */
export interface TeamErrorContext {
  userId?: string | null;
  userRole?: UserRole | null | undefined;
  teamId?: string;
  operation?: string;
  dataType?: string;
}

/**
 * Interface for team error handling options
 */
export interface TeamErrorHandlingOptions {
  showToast?: boolean;
  logError?: boolean;
  includeUserFeedback?: boolean;
  severity?: 'info' | 'warning' | 'error';
}

/**
 * Team-specific error types
 */
export enum TeamErrorType {
  ACCESS_DENIED = 'access_denied',
  OPERATION_DENIED = 'operation_denied',
  DATA_ACCESS_DENIED = 'data_access_denied',
  INSUFFICIENT_PERMISSIONS = 'insufficient_permissions',
  TEAM_NOT_FOUND = 'team_not_found',
  INVALID_OPERATION = 'invalid_operation',
}

/**
 * Team Error Handler Class
 * 
 * Provides centralized error handling for team operations using existing patterns.
 */
export class TeamErrorHandler {
  /**
   * Handle team access denied errors
   */
  static async handleTeamAccessDenied(
    context: TeamErrorContext,
    message?: string,
    options: TeamErrorHandlingOptions = {}
  ): Promise<void> {
    const {
      showToast = true,
      logError = true,
      includeUserFeedback = true,
      severity = 'warning'
    } = options;

    const errorMessage = message || this.getDefaultAccessDeniedMessage(context);

    // Log the error using existing rbacLogger
    if (logError && context.teamId) {
      await rbacLogger.logTeamAccessDenied(
        context.userId || null,
        context.userRole || null,
        context.teamId,
        context.operation || 'unknown',
        errorMessage
      );
    }

    // Show user-friendly toast notification
    if (showToast) {
      toast.error(errorMessage, {
        duration: 5000,
        id: `team-access-denied-${context.teamId || 'unknown'}`,
      });
    }
  }

  /**
   * Handle team operation denied errors
   */
  static async handleTeamOperationDenied(
    context: TeamErrorContext,
    message?: string,
    options: TeamErrorHandlingOptions = {}
  ): Promise<void> {
    const {
      showToast = true,
      logError = true,
      severity = 'warning'
    } = options;

    const errorMessage = message || this.getDefaultOperationDeniedMessage(context);

    // Log the error using existing rbacLogger
    if (logError) {
      await rbacLogger.logTeamOperationDenied(
        context.userId || null,
        context.userRole || null,
        context.operation || 'unknown',
        context.teamId,
        errorMessage
      );
    }

    // Show user-friendly toast notification
    if (showToast) {
      toast.error(errorMessage, {
        duration: 5000,
        id: `team-operation-denied-${context.operation || 'unknown'}`,
      });
    }
  }

  /**
   * Handle team data access denied errors
   */
  static async handleTeamDataAccessDenied(
    context: TeamErrorContext,
    message?: string,
    options: TeamErrorHandlingOptions = {}
  ): Promise<void> {
    const {
      showToast = true,
      logError = true,
      severity = 'warning'
    } = options;

    const errorMessage = message || this.getDefaultDataAccessDeniedMessage(context);

    // Log the error using existing rbacLogger
    if (logError && context.teamId && context.dataType) {
      await rbacLogger.logTeamDataAccessDenied(
        context.userId || null,
        context.userRole || null,
        context.teamId,
        context.dataType,
        errorMessage
      );
    }

    // Show user-friendly toast notification
    if (showToast) {
      toast.error(errorMessage, {
        duration: 4000,
        id: `team-data-access-denied-${context.teamId || 'unknown'}-${context.dataType || 'unknown'}`,
      });
    }
  }

  /**
   * Handle successful team access (for logging purposes)
   */
  static async handleTeamAccessGranted(
    context: TeamErrorContext,
    options: TeamErrorHandlingOptions = {}
  ): Promise<void> {
    const { logError = true } = options;

    // Log successful access using existing rbacLogger
    if (logError && context.userId && context.userRole && context.teamId && context.operation) {
      await rbacLogger.logTeamAccessGranted(
        context.userId,
        context.userRole,
        context.teamId,
        context.operation
      );
    }
  }

  /**
   * Get user-friendly error message for access denied
   */
  private static getDefaultAccessDeniedMessage(context: TeamErrorContext): string {
    const roleDescription = this.getRoleDescription(context.userRole);
    const operation = context.operation || 'access this team';

    return `Access Denied: You don't have permission to ${operation}. Current role: ${context.userRole} (${roleDescription})`;
  }

  /**
   * Get user-friendly error message for operation denied
   */
  private static getDefaultOperationDeniedMessage(context: TeamErrorContext): string {
    const roleDescription = this.getRoleDescription(context.userRole);
    const operation = context.operation || 'perform this operation';

    return `Operation Denied: You don't have permission to ${operation}. Current role: ${context.userRole} (${roleDescription})`;
  }

  /**
   * Get user-friendly error message for data access denied
   */
  private static getDefaultDataAccessDeniedMessage(context: TeamErrorContext): string {
    const roleDescription = this.getRoleDescription(context.userRole);
    const dataType = context.dataType || 'team data';

    return `Data Access Denied: You don't have permission to view ${dataType}. Current role: ${context.userRole} (${roleDescription})`;
  }

  /**
   * Get role description for user-friendly messages
   */
  private static getRoleDescription(role: UserRole | null | undefined): string {
    const roleDescriptions: Record<UserRole, string> = {
      [UserRole.ADMIN]: 'Full team management access',
      [UserRole.HEAD_REFEREE]: 'Full team viewing access',
      [UserRole.ALLIANCE_REFEREE]: 'Team viewing access',
      [UserRole.TEAM_LEADER]: 'Own team management access',
      [UserRole.TEAM_MEMBER]: 'Own team viewing access',
      [UserRole.COMMON]: 'Limited team viewing access'
    };

    return roleDescriptions[role || UserRole.COMMON];
  }

  /**
   * Create tooltip message for disabled actions using existing patterns
   */
  static getTooltipMessage(
    action: string,
    userRole: UserRole | null | undefined,
    team?: Team
  ): string {
    const roleDescription = this.getRoleDescription(userRole);

    switch (action) {
      case 'create':
        return `Access Denied: Creating teams requires ADMIN or TEAM_LEADER role. Current role: ${userRole} (${roleDescription})`;
      case 'edit':
        return team 
          ? `Access Denied: Editing this team requires ADMIN role or team ownership. Current role: ${userRole} (${roleDescription})`
          : `Access Denied: Editing teams requires ADMIN role or team ownership. Current role: ${userRole} (${roleDescription})`;
      case 'delete':
        return `Access Denied: Deleting teams requires ADMIN role. Current role: ${userRole} (${roleDescription})`;
      case 'import_export':
        return `Access Denied: Import/Export functionality requires ADMIN role. Current role: ${userRole} (${roleDescription})`;
      case 'view_sensitive':
        return `Access Denied: Viewing sensitive team data requires ADMIN, HEAD_REFEREE, or ALLIANCE_REFEREE role. Current role: ${userRole} (${roleDescription})`;
      case 'view_members':
        return team
          ? `Access Denied: Viewing team member details requires ADMIN role or team membership. Current role: ${userRole} (${roleDescription})`
          : `Access Denied: Viewing team member details requires appropriate permissions. Current role: ${userRole} (${roleDescription})`;
      default:
        return `Access Denied: This action requires higher privileges. Current role: ${userRole} (${roleDescription})`;
    }
  }

  /**
   * Handle generic team errors with appropriate logging and user feedback
   */
  static async handleGenericTeamError(
    error: Error,
    context: TeamErrorContext,
    options: TeamErrorHandlingOptions = {}
  ): Promise<void> {
    const {
      showToast = true,
      logError = true,
      severity = 'error'
    } = options;

    // Determine error type based on error message
    let errorType = TeamErrorType.INVALID_OPERATION;
    if (error.message.includes('Access denied') || error.message.includes('access denied')) {
      errorType = TeamErrorType.ACCESS_DENIED;
    } else if (error.message.includes('permission') || error.message.includes('Permission')) {
      errorType = TeamErrorType.INSUFFICIENT_PERMISSIONS;
    } else if (error.message.includes('not found') || error.message.includes('Not found')) {
      errorType = TeamErrorType.TEAM_NOT_FOUND;
    }

    // Handle based on error type
    switch (errorType) {
      case TeamErrorType.ACCESS_DENIED:
        await this.handleTeamAccessDenied(context, error.message, options);
        break;
      case TeamErrorType.INSUFFICIENT_PERMISSIONS:
        await this.handleTeamOperationDenied(context, error.message, options);
        break;
      default:
        // Generic error handling
        if (logError) {
          await rbacLogger.logSuspiciousActivity(
            `Team operation error: ${error.message}`,
            context.userId || undefined,
            {
              errorType,
              operation: context.operation,
              teamId: context.teamId,
              userRole: context.userRole,
            }
          );
        }

        if (showToast) {
          toast.error(error.message, {
            duration: 4000,
            id: `team-error-${Date.now()}`,
          });
        }
        break;
    }
  }
}

/**
 * Utility functions for common team error scenarios
 */
export const teamErrorUtils = {
  /**
   * Handle team creation errors
   */
  handleCreateError: async (error: Error, userId?: string, userRole?: UserRole) => {
    await TeamErrorHandler.handleGenericTeamError(error, {
      userId,
      userRole,
      operation: 'create',
    });
  },

  /**
   * Handle team update errors
   */
  handleUpdateError: async (error: Error, teamId: string, userId?: string, userRole?: UserRole) => {
    await TeamErrorHandler.handleGenericTeamError(error, {
      userId,
      userRole,
      teamId,
      operation: 'edit',
    });
  },

  /**
   * Handle team deletion errors
   */
  handleDeleteError: async (error: Error, teamId: string, userId?: string, userRole?: UserRole) => {
    await TeamErrorHandler.handleGenericTeamError(error, {
      userId,
      userRole,
      teamId,
      operation: 'delete',
    });
  },

  /**
   * Handle team import errors
   */
  handleImportError: async (error: Error, userId?: string, userRole?: UserRole) => {
    await TeamErrorHandler.handleGenericTeamError(error, {
      userId,
      userRole,
      operation: 'import',
    });
  },

  /**
   * Handle team export errors
   */
  handleExportError: async (error: Error, userId?: string, userRole?: UserRole) => {
    await TeamErrorHandler.handleGenericTeamError(error, {
      userId,
      userRole,
      operation: 'export',
    });
  },

  /**
   * Handle team view errors
   */
  handleViewError: async (error: Error, teamId: string, userId?: string, userRole?: UserRole) => {
    await TeamErrorHandler.handleGenericTeamError(error, {
      userId,
      userRole,
      teamId,
      operation: 'view',
    });
  },
};