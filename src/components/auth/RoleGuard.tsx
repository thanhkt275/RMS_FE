/**
 * 
 * Features:
 * - Declarative role-based rendering
 * - Flexible fallback options for better UX
 * - Loading states and error handling
 * - Security logging integration
 * - TypeScript support with comprehensive interfaces
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

"use client";

import { ReactNode, ReactElement } from 'react';
import { useAuth } from '@/hooks/common/use-auth';
import { UserRole } from '@/lib/types';
import { rbacLogger } from '../../utils/rbacLogger';
import { 
  PERMISSIONS, 
  PermissionService, 
  IPermissionDefinition,
  type IPermissionSystem 
} from '../../constants/permissions';

/**
 * Props interface for RoleGuard component
 * 
 * Follows Interface Segregation Principle by providing only the necessary
 * properties for role-based access control.
 */
interface RoleGuardProps {
  /** Array of roles that are allowed to see the protected content (legacy) */
  allowedRoles?: UserRole[];
  
  /** Feature-based permission using the new permission system */
  feature?: keyof typeof PERMISSIONS;
  
  /** Specific action within the feature */
  action?: string;
  
  /** Permission definition object for advanced usage */
  permission?: IPermissionDefinition;
  
  /** Content to render when user has permission */
  children: ReactNode;
  
  /** Content to render when user doesn't have permission (optional) */
  fallback?: ReactNode;
  
  /** Whether to show unauthorized message instead of hiding content */
  showUnauthorized?: boolean;
  
  /** Optional identifier for logging purposes */
  logFeature?: string;
  
  /** Context for ownership-based permissions */
  permissionContext?: { isOwner?: boolean; [key: string]: unknown };
}

/**
 * Interface for role checking logic
 * 
 * Enhanced to support the new permission system while maintaining backward compatibility.
 */
interface IRoleChecker {
  hasPermission(userRole: UserRole | null, allowedRoles: UserRole[]): boolean;
  hasFeaturePermission(
    userRole: UserRole | null, 
    feature: keyof typeof PERMISSIONS, 
    action: string,
    context?: { isOwner?: boolean; [key: string]: unknown }
  ): boolean;
  hasDirectPermission(
    userRole: UserRole | null, 
    permission: IPermissionDefinition,
    context?: { isOwner?: boolean; [key: string]: unknown }
  ): boolean;
  logAccessAttempt(
    userId: string | undefined, 
    userRole: UserRole | null, 
    allowedRoles: UserRole[], 
    feature?: string,
    granted?: boolean
  ): void;
}

/**
 * Enhanced Role Checker Service
 * 
 * Supports both legacy role-based and new feature-based permissions
 * following Single Responsibility Principle.
 */
class EnhancedRoleCheckerService implements IRoleChecker {
  /**
   * Legacy role-based permission check
   */
  hasPermission(userRole: UserRole | null, allowedRoles: UserRole[]): boolean {
    if (!userRole) return false;
    return allowedRoles.includes(userRole);
  }

  /**
   * Feature-based permission check using the new permission system
   */
  hasFeaturePermission(
    userRole: UserRole | null, 
    feature: keyof typeof PERMISSIONS, 
    action: string,
    context?: { isOwner?: boolean; [key: string]: unknown }
  ): boolean {
    return PermissionService.hasPermission(userRole, feature, action, context);
  }

  /**
   * Direct permission check using permission definition
   */
  hasDirectPermission(
    userRole: UserRole | null, 
    permission: IPermissionDefinition,
    context?: { isOwner?: boolean; [key: string]: unknown }
  ): boolean {
    if (!userRole) return false;

    // Check if user's role is in the allowed roles
    const hasRolePermission = permission.roles.includes(userRole);
    
    // If ownership is required, check ownership condition
    if (permission.requiresOwnership && context?.isOwner !== true) {
      return false;
    }

    return hasRolePermission;
  }

  /**
   * Log access attempt for security auditing
   */
  logAccessAttempt(
    userId: string | undefined, 
    userRole: UserRole | null, 
    allowedRoles: UserRole[], 
    feature?: string,
    granted: boolean = true
  ): void {
    if (userId && userRole) {
      rbacLogger.logRoleCheck(
        userId, 
        userRole, 
        allowedRoles.map(role => role.toString()),
        granted
      );
      
      // Log feature-specific access if feature is provided
      if (feature) {
        const status = granted ? 'granted' : 'denied';
        console.log(`[RBAC] Feature access ${status}: ${feature} - User: ${userId} (${userRole})`);
      }
    }
  }
}

// Create singleton instance following Dependency Injection pattern
const roleChecker = new EnhancedRoleCheckerService();

/**
 * Loading Component
 * 
 * Separate component for loading state following Single Responsibility Principle.
 */
const LoadingSpinner = (): ReactElement => (
  <div className="flex items-center justify-center p-2">
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
    <span className="ml-2 text-sm text-gray-600">Loading...</span>
  </div>
);

/**
 * Unauthorized Access Component
 * 
 * Separate component for unauthorized state following Single Responsibility Principle.
 */
const UnauthorizedMessage = ({ feature }: { feature?: string }): ReactElement => (
  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
    <div className="flex">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-yellow-800">
          Access Restricted
        </h3>
        <p className="mt-1 text-sm text-yellow-700">
          You don't have permission to access {feature ? `the ${feature} feature` : 'this content'}.
        </p>
      </div>
    </div>
  </div>
);

/**
 * Authentication Required Component
 * 
 * Separate component for unauthenticated state following Single Responsibility Principle.
 */
const AuthRequiredMessage = ({ feature }: { feature?: string }): ReactElement => (
  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
    <div className="flex">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-blue-800">
          Sign In Required
        </h3>
        <p className="mt-1 text-sm text-blue-700">
          Please sign in to access {feature ? `the ${feature} feature` : 'this content'}.
        </p>
      </div>
    </div>
  </div>
);

/**
 * RoleGuard Component
 * 
 * Main component that handles role-based access control for UI elements.
 * Follows all SOLID principles and provides a clean, declarative API.
 * 
 * @param props RoleGuardProps containing access control configuration
 * @returns JSX element based on user's permissions
 */
export function RoleGuard({
  allowedRoles,
  feature,
  action,
  permission,
  children,
  fallback = null,
  showUnauthorized = false,
  logFeature,
  permissionContext
}: RoleGuardProps): ReactElement | null {
  const { user, isLoading } = useAuth();

  // Show loading state while authentication is being determined
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Handle unauthenticated user
  if (!user) {
    if (showUnauthorized) {
      return <AuthRequiredMessage feature={logFeature} />;
    }
    return fallback as ReactElement;
  }

  // Determine permission based on the props provided
  let hasPermission = false;
  let effectiveAllowedRoles: UserRole[] = [];

  if (permission) {
    // Direct permission definition
    hasPermission = roleChecker.hasDirectPermission(user.role, permission, permissionContext);
    effectiveAllowedRoles = [...permission.roles];
  } else if (feature && action) {
    // Feature-based permission
    hasPermission = roleChecker.hasFeaturePermission(user.role, feature, action, permissionContext);
    effectiveAllowedRoles = [...PermissionService.getAuthorizedRoles(feature, action)];
  } else if (allowedRoles) {
    // Legacy role-based permission
    hasPermission = roleChecker.hasPermission(user.role, allowedRoles);
    effectiveAllowedRoles = allowedRoles;
  } else {
    // No permission criteria specified - deny access
    console.warn('[RoleGuard] No permission criteria specified. Access denied by default.');
    hasPermission = false;
  }

  // Log the access attempt for security auditing
  roleChecker.logAccessAttempt(user.id, user.role, effectiveAllowedRoles, logFeature, hasPermission);

  if (!hasPermission) {
    if (showUnauthorized) {
      return <UnauthorizedMessage feature={logFeature} />;
    }
    return fallback as ReactElement;
  }

  // User has permission, render the protected content
  return <>{children}</>;
}

/**
 * Higher-Order Component (HOC) for role-based access control
 * 
 * Enhanced to support both legacy and new permission systems.
 * Follows the Decorator pattern for component enhancement.
 * 
 * @param config Permission configuration object
 * @returns HOC function
 */
export function withRoleGuard(config: {
  allowedRoles?: UserRole[];
  feature?: keyof typeof PERMISSIONS;
  action?: string;
  permission?: IPermissionDefinition;
  fallback?: ReactNode;
  showUnauthorized?: boolean;
  logFeature?: string;
  permissionContext?: { isOwner?: boolean; [key: string]: unknown };
}) {
  return function <P extends object>(
    WrappedComponent: React.ComponentType<P>
  ): React.ComponentType<P> {
    const GuardedComponent = (props: P) => (
      <RoleGuard
        allowedRoles={config.allowedRoles}
        feature={config.feature}
        action={config.action}
        permission={config.permission}
        fallback={config.fallback}
        showUnauthorized={config.showUnauthorized}
        logFeature={config.logFeature}
        permissionContext={config.permissionContext}
      >
        <WrappedComponent {...props} />
      </RoleGuard>
    );

    // Set display name for debugging
    GuardedComponent.displayName = `withRoleGuard(${
      WrappedComponent.displayName || WrappedComponent.name || 'Component'
    })`;

    return GuardedComponent;
  };
}

/**
 * Enhanced custom hook for checking permissions
 * 
 * Supports both legacy role-based and new feature-based permissions.
 * Provides a programmatic way to check permissions in components.
 * 
 * @param config Permission checking configuration
 * @returns Object with permission checking utilities
 */
export function useRoleCheck(config: {
  allowedRoles?: UserRole[];
  feature?: keyof typeof PERMISSIONS;
  action?: string;
  permission?: IPermissionDefinition;
  permissionContext?: { isOwner?: boolean; [key: string]: unknown };
}) {
  const { user } = useAuth();

  // Determine permission based on the config provided
  let hasPermission = false;
  
  if (config.permission) {
    hasPermission = roleChecker.hasDirectPermission(user?.role || null, config.permission, config.permissionContext);
  } else if (config.feature && config.action) {
    hasPermission = roleChecker.hasFeaturePermission(user?.role || null, config.feature, config.action, config.permissionContext);
  } else if (config.allowedRoles) {
    hasPermission = roleChecker.hasPermission(user?.role || null, config.allowedRoles);
  }

  /**
   * Check permission for specific criteria
   */
  const checkPermission = (checkConfig: {
    allowedRoles?: UserRole[];
    feature?: keyof typeof PERMISSIONS;
    action?: string;
    permission?: IPermissionDefinition;
    permissionContext?: { isOwner?: boolean; [key: string]: unknown };
  }): boolean => {
    if (checkConfig.permission) {
      return roleChecker.hasDirectPermission(user?.role || null, checkConfig.permission, checkConfig.permissionContext);
    } else if (checkConfig.feature && checkConfig.action) {
      return roleChecker.hasFeaturePermission(user?.role || null, checkConfig.feature, checkConfig.action, checkConfig.permissionContext);
    } else if (checkConfig.allowedRoles) {
      return roleChecker.hasPermission(user?.role || null, checkConfig.allowedRoles);
    }
    return false;
  };

  /**
   * Legacy role-based permission check for backward compatibility
   */
  const checkRoles = (rolesToCheck: UserRole[]): boolean => {
    return roleChecker.hasPermission(user?.role || null, rolesToCheck);
  };

  return {
    hasPermission,
    checkPermission,
    checkRoles, // Legacy method
    userRole: user?.role || null,
    isAuthenticated: !!user,
    // Utility methods for common permission patterns
    isAdmin: user?.role === UserRole.ADMIN,
    isHeadReferee: user?.role === UserRole.HEAD_REFEREE,
    isReferee: user?.role === UserRole.ALLIANCE_REFEREE || user?.role === UserRole.HEAD_REFEREE,
    isTeamLeader: user?.role === UserRole.TEAM_LEADER,
    isTeamMember: user?.role === UserRole.TEAM_MEMBER,
  };
}
