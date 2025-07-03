/**
 * Features:
 * - Secure JWT verification using the 'jose' library
 * - Feature-based route protection using the new permission system
 * - Backward compatibility with legacy route configurations
 * - Comprehensive security logging
 * - Performance optimized with proper error handling
 * - Type-safe implementation
 * 
 * Security Benefits:
 * - Server-side validation prevents client-side bypassing
 * - JWT verification ensures token integrity
 * - Audit logging for compliance and monitoring
 * - Graceful handling of edge cases
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { UserRole } from '@/lib/types';
import { AUTH_CONFIG } from '@/config/rbac';
import { PERMISSIONS, PermissionService, type IPermissionDefinition } from '@/constants/permissions';

/**
 * Interface for JWT token verification
 * 
 * Follows Interface Segregation Principle by defining a focused contract
 * for token verification functionality.
 */
interface IJWTVerifier {
  verifyToken(token: string): Promise<UserRole | null>;
}

/**
 * Interface for basic route protection configuration
 * 
 * Defines the contract for basic route protection rules.
 */
interface IRouteProtector {
  getRequiredRoles(pathname: string): readonly UserRole[] | null;
  isRouteProtected(pathname: string): boolean;
}

/**
 * Interface for enhanced route protection configuration
 * 
 * Supports both legacy role-based and new feature-based permissions.
 */
interface IEnhancedRouteProtector extends IRouteProtector {
  getFeaturePermission(pathname: string): { feature: keyof typeof PERMISSIONS; action: string } | null;
  hasPermission(userRole: UserRole | null, pathname: string): boolean;
}

/**
 * Enhanced Route Protection Configuration
 * 
 * Maps routes to both legacy roles and new feature-based permissions.
 */
interface RouteConfig {
  // Legacy role-based configuration
  roles?: readonly UserRole[];
  
  // New feature-based configuration
  feature?: keyof typeof PERMISSIONS;
  action?: string;
  
  // Additional options
  requiresOwnership?: boolean;
  description?: string;
}

/**
 * Route protection rules using the new permission system
 * 
 * This configuration uses feature-based permissions while maintaining
 * backward compatibility with role-based rules.
 */
const ENHANCED_PROTECTED_ROUTES: Record<string, RouteConfig> = {
  '/admin': {
    feature: 'SYSTEM_SETTINGS',
    action: 'FULL_CONTROL',
    description: 'System administration panel'
  },
  '/admin/users': {
    feature: 'USER_MANAGEMENT',
    action: 'FULL_CONTROL',
    description: 'User management interface'
  },
  '/users': {
    feature: 'USER_MANAGEMENT',
    action: 'FULL_CONTROL',
    description: 'User Management Dashboard'
  },
  '/admin/tournaments': {
    feature: 'SYSTEM_SETTINGS',
    action: 'MANAGE_TOURNAMENTS',
    description: 'Tournament management'
  },
  '/tournaments': {
    feature: 'SYSTEM_SETTINGS',
    action: 'MANAGE_TOURNAMENTS',
    description: 'Tournament management interface'
  },
  '/stages': {
    feature: 'MATCH_SCHEDULING',
    action: 'FULL_CONTROL',
    description: 'Stage and match scheduling'
  },
  '/control-match': {
    roles: [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE],
    description: 'Match control center for admins and referees'
  },
  '/referee-panel': {
    feature: 'LIVE_SCORING',
    action: 'ENTER_AND_APPROVE',
    description: 'Referee scoring panel'
  },
  '/referee-panel/scoring': {
    feature: 'LIVE_SCORING',
    action: 'ENTER_SCORES',
    description: 'Match scoring interface'
  },
  '/team-management': {
    feature: 'TEAM_MANAGEMENT',
    action: 'CREATE_OWN',
    requiresOwnership: true,
    description: 'Team management interface'
  },
  '/team-management/create': {
    feature: 'TEAM_MANAGEMENT',
    action: 'CREATE_OWN',
    description: 'Team creation interface'
  },
  '/rankings/admin': {
    feature: 'RANKINGS',
    action: 'RECALCULATE',
    description: 'Rankings administration'
  },
  '/reports': {
    feature: 'REPORTING',
    action: 'GENERATE_TOURNAMENT',
    description: 'Tournament reporting'
  },
  '/reports/admin': {
    feature: 'REPORTING',
    action: 'GENERATE_ALL',
    description: 'Administrative reporting'
  },
  
  // Legacy role-based routes (for backward compatibility)
  '/legacy-admin': {
    roles: [UserRole.ADMIN],
    description: 'Legacy admin interface'
  },
  '/legacy-referee': {
    roles: [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE],
    description: 'Legacy referee interface'
  }
};

/**
 * Enhanced Route Protector Service
 * 
 * Implements route protection using the new permission system while
 * maintaining backward compatibility with legacy configurations.
 */
class EnhancedRouteProtectorService implements IEnhancedRouteProtector {
  /**
   * Check if a route is protected
   */
  isRouteProtected(pathname: string): boolean {
    return this.findMatchingRoute(pathname) !== null;
  }

  /**
   * Get required roles for a route (legacy compatibility)
   */
  getRequiredRoles(pathname: string): readonly UserRole[] | null {
    const config = this.findMatchingRoute(pathname);
    if (!config) return null;

    if (config.roles) {
      return config.roles;
    }

    if (config.feature && config.action) {
      return PermissionService.getAuthorizedRoles(config.feature, config.action);
    }

    return null;
  }

  /**
   * Get feature permission for a route (new system)
   */
  getFeaturePermission(pathname: string): { feature: keyof typeof PERMISSIONS; action: string } | null {
    const config = this.findMatchingRoute(pathname);
    if (!config || !config.feature || !config.action) return null;

    return {
      feature: config.feature,
      action: config.action
    };
  }

  /**
   * Check if user has permission for a route
   */
  hasPermission(userRole: UserRole | null, pathname: string): boolean {
    const config = this.findMatchingRoute(pathname);
    if (!config) return true; // Unprotected route

    // Check feature-based permission
    if (config.feature && config.action) {
      return PermissionService.hasPermission(userRole, config.feature, config.action);
    }

    // Check legacy role-based permission
    if (config.roles) {
      return userRole !== null && config.roles.includes(userRole);
    }

    return false;
  }

  /**
   * Find matching route configuration
   */
  private findMatchingRoute(pathname: string): RouteConfig | null {
    // Try exact match first
    if (ENHANCED_PROTECTED_ROUTES[pathname]) {
      return ENHANCED_PROTECTED_ROUTES[pathname];
    }

    // Try prefix matching (for nested routes)
    const matchingPath = Object.keys(ENHANCED_PROTECTED_ROUTES).find(path => 
      pathname.startsWith(path + '/') || pathname === path
    );

    return matchingPath ? ENHANCED_PROTECTED_ROUTES[matchingPath] : null;
  }
}

/**
 * Interface for security logging
 * 
 * Abstracts logging functionality to allow different implementations
 * (console, external services, etc.)
 */
interface ISecurityLogger {
  logAccessDenied(userRole: string | null, pathname: string): void;
  logAuthenticationFailed(tokenPrefix: string, error: any): void;
  logRouteAccess(userRole: string, pathname: string): void;
}

/**
 * JWT Token Verifier Implementation
 * 
 * Handles secure JWT verification using the 'jose' library.
 * Follows Single Responsibility Principle by only handling token verification.
 */
class JWTVerifier implements IJWTVerifier {
  private readonly jwtSecret: Uint8Array;

  constructor(secret: string) {
    this.jwtSecret = new TextEncoder().encode(secret);
  }

  /**
   * Verify JWT token and extract user role
   * 
   * @param token JWT token to verify
   * @returns Promise resolving to UserRole or null if invalid
   */
  async verifyToken(token: string): Promise<UserRole | null> {
    try {
      console.log('[JWT Debug] Verifying token...');
      console.log('[JWT Debug] Token preview:', token.substring(0, 20) + '...');
      
      const { payload } = await jwtVerify(token, this.jwtSecret);
      
      console.log('[JWT Debug] Decoded payload:', payload);
      
      const role = payload.role as UserRole;
      
      console.log('[JWT Debug] Extracted role:', role);
      console.log('[JWT Debug] Valid roles:', Object.values(UserRole));
      
      // Validate that the role is a valid UserRole
      if (Object.values(UserRole).includes(role)) {
        console.log('[JWT Debug] Role validation: SUCCESS');
        return role;
      }
      
      console.log('[JWT Debug] Role validation: FAILED - invalid role');
      return null;
    } catch (error) {
      // Token verification failed - log for security monitoring
      console.error('[JWT Debug] JWT verification failed:', error);
      return null;
    }
  }
}

/**
 * Route Protection Configuration
 * 
 * Manages route protection rules and role requirements.
 * Follows Open/Closed Principle - can be extended with new routes
 * without modifying existing code.
 */
class RouteProtector implements IRouteProtector {
  private readonly protectedRoutes: Record<string, readonly UserRole[]>;

  constructor(routes: Record<string, readonly UserRole[]>) {
    this.protectedRoutes = routes;
  }

  /**
   * Get required roles for a given pathname
   * 
   * @param pathname URL pathname to check
   * @returns Array of required roles or null if route is not protected
   */
  getRequiredRoles(pathname: string): readonly UserRole[] | null {
    // Find the most specific route that matches
    const matchingRoute = Object.entries(this.protectedRoutes)
      .find(([routePattern]) => pathname.startsWith(routePattern));

    return matchingRoute ? matchingRoute[1] : null;
  }

  /**
   * Check if a route is protected
   * 
   * @param pathname URL pathname to check
   * @returns true if route requires authentication
   */
  isRouteProtected(pathname: string): boolean {
    return this.getRequiredRoles(pathname) !== null;
  }
}

/**
 * Security Logger Implementation
 * 
 * Handles security event logging for audit trails and monitoring.
 * Follows Single Responsibility Principle by only handling logging.
 */
class SecurityLogger implements ISecurityLogger {
  /**
   * Log access denied events
   */
  logAccessDenied(userRole: string | null, pathname: string): void {
    const logEntry = {
      event: 'access_denied',
      timestamp: new Date().toISOString(),
      userRole: userRole || 'anonymous',
      pathname,
      severity: 'warning'
    };

    console.warn('[RBAC Security] Access denied:', logEntry);
    
    // In production, send to monitoring service
    // this.sendToMonitoringService(logEntry);
  }

  /**
   * Log authentication failures
   */
  logAuthenticationFailed(tokenPrefix: string, error: any): void {
    const logEntry = {
      event: 'authentication_failed',
      timestamp: new Date().toISOString(),
      tokenPrefix,
      error: error instanceof Error ? error.message : String(error),
      severity: 'error'
    };

    console.error('[RBAC Security] Authentication failed:', logEntry);
    
    // In production, send to monitoring service
    // this.sendToMonitoringService(logEntry);
  }

  /**
   * Log successful route access
   */
  logRouteAccess(userRole: string, pathname: string): void {
    const logEntry = {
      event: 'route_access',
      timestamp: new Date().toISOString(),
      userRole,
      pathname,
      severity: 'info'
    };

    // Only log in development to avoid noise
    if (process.env.NODE_ENV === 'development') {
      console.log('[RBAC Security] Route access:', logEntry);
    }
    
    // In production, send to monitoring service for analytics
    // this.sendToMonitoringService(logEntry);
  }
}

/**
 * Enhanced RBAC Middleware Configuration
 * 
 * Using enhanced route protection with the new permission system.
 */

// Initialize services following Dependency Injection pattern
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required for middleware');
}

const jwtVerifier = new JWTVerifier(jwtSecret);
const routeProtector = new EnhancedRouteProtectorService();
const securityLogger = new SecurityLogger();

/**
 * Enhanced RBAC Middleware Function
 * 
 * Main middleware function that orchestrates authentication and authorization
 * using the new permission system while maintaining backward compatibility.
 * Follows the Facade pattern to provide a simple interface for complex operations.
 * 
 * @param request NextRequest object
 * @returns NextResponse with appropriate action (continue, redirect)
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  console.log('[Middleware Debug] Processing request for:', pathname);

  // Skip processing for non-protected routes
  if (!routeProtector.isRouteProtected(pathname)) {
    console.log('[Middleware Debug] Route not protected, allowing access:', pathname);
    return NextResponse.next();
  }

  console.log('[Middleware Debug] Route is protected:', pathname);

  // Extract and verify authentication token directly (efficient approach)
  const token = request.cookies.get(AUTH_CONFIG.cookieName)?.value;
  
  console.log('[Middleware Debug] Cookie name:', AUTH_CONFIG.cookieName);
  console.log('[Middleware Debug] Token exists:', !!token);
  console.log('[Middleware Debug] Token value (first 20 chars):', token?.substring(0, 20));
  
  if (!token) {
    console.log('[Middleware Debug] No token found, redirecting to access denied');
    securityLogger.logAccessDenied(null, pathname);
    return redirectToAccessDenied(request);
  }

  // Verify token and extract user role (direct JWT verification)
  const userRole = await jwtVerifier.verifyToken(token);
  
  console.log('[Middleware Debug] JWT verification result:', userRole);
  
  if (!userRole) {
    console.log('[Middleware Debug] JWT verification failed');
    securityLogger.logAuthenticationFailed(
      token.substring(0, 10) + '...', 
      'Invalid or expired token'
    );
    return redirectToAccessDenied(request);
  }

  // Check permission using the enhanced system
  const hasPermission = routeProtector.hasPermission(userRole, pathname);

  if (!hasPermission) {
    // Log the access attempt for security monitoring
    securityLogger.logAccessDenied(userRole, pathname);
    
    // Get additional context for logging
    const featurePermission = routeProtector.getFeaturePermission(pathname);
    if (featurePermission) {
      console.log(`[RBAC] Feature-based access denied: ${featurePermission.feature}.${featurePermission.action} for user role: ${userRole}`);
    }

    return redirectToAccessDenied(request);
  }

  // Log successful access for audit trail (development only)
  if (process.env.NODE_ENV === 'development') {
    const featurePermission = routeProtector.getFeaturePermission(pathname);
    console.log(`[RBAC] Access granted to ${pathname} for user role: ${userRole}${featurePermission ? ` (${featurePermission.feature}.${featurePermission.action})` : ''}`);
  }

  // User has permission, continue to the requested page
  return NextResponse.next();
}

/**
 * Helper function to redirect to access denied page
 * 
 * @param request Original request
 * @returns NextResponse redirect
 */
function redirectToAccessDenied(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = AUTH_CONFIG.accessDeniedPath;
  return NextResponse.redirect(url);
}

/**
 * Enhanced Middleware Configuration
 * 
 * Defines which routes the middleware should run on.
 * Updated to include routes using the new permission system.
 */
export const config = {
  matcher: [
    // Admin routes (system settings and user management)
    '/admin/:path*',
    '/users/:path*', // User Management Dashboard
    '/system-settings/:path*',
    '/user-management/:path*',
    
    // Tournament management routes
    '/tournaments/:path*',
    
    // Stage and match scheduling routes
    '/stages/:path*',
    
    // Match control routes (referee and admin access)
    '/control-match/:path*',

    
    
    // Referee routes (scoring and match management)
    '/referee-panel/:path*',
    '/scoring/:path*',
    
    // Team routes (team management and registration) - excluding /teams which should be public
    '/team-management/:path*',
    '/team-registration/:path*',
    
    // Reporting routes
    '/reports/:path*',
    '/rankings/admin/:path*',
    
    // Legacy routes (for backward compatibility)
    '/legacy-admin/:path*',
    '/legacy-referee/:path*',
    
    // Exclude public routes (/teams and /matches), API routes, and static files
    '/((?!api|_next/static|_next/image|favicon.ico|public|teams|matches).*)',
  ],
};

// Export interfaces for use in other parts of the application
export type { IJWTVerifier, IRouteProtector, IEnhancedRouteProtector, ISecurityLogger };

// Export the enhanced route configuration for testing and documentation
export { ENHANCED_PROTECTED_ROUTES };
