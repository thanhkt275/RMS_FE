/**
 * RBAC Configuration - Centralized Security Settings
 * 
 * This configuration file centralizes all Role-Based Access Control settings
 * following the Single Responsibility Principle and making the system
 * easily configurable and maintainable.
 * 
 * Features:
 * - Centralized route protection rules
 * - Environment-specific configurations
 * - Type-safe configuration objects
 * - Easy extensibility for new routes and roles
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

import { UserRole } from '@/lib/types';

/**
 * Route Protection Configuration
 * 
 * Defines which routes require authentication and what roles are allowed.
 * Organized by feature area for better maintainability.
 */
export const ROUTE_PROTECTION_CONFIG = {
  // Administrative Routes
  admin: {
    '/admin': [UserRole.ADMIN],
    '/admin/dashboard': [UserRole.ADMIN],
    '/admin/users': [UserRole.ADMIN],
    '/admin/system': [UserRole.ADMIN],
    '/system-settings': [UserRole.ADMIN],
    '/user-management': [UserRole.ADMIN],
    '/users': [UserRole.ADMIN], // User Management Dashboard
  },

  // Tournament Management
  tournament: {
    '/tournaments': [UserRole.ADMIN, UserRole.HEAD_REFEREE],
    '/tournament-management': [UserRole.ADMIN, UserRole.HEAD_REFEREE],
    '/stages': [UserRole.ADMIN],
    '/stages/create': [UserRole.ADMIN],
    '/stages/edit': [UserRole.ADMIN],
  },

  // Match and Scoring
  scoring: {
    '/scoring': [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE],
    '/scoring/live': [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE],
    '/scoring/history': [UserRole.ADMIN, UserRole.HEAD_REFEREE],
    '/matches/score': [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE],
  },

  // Referee Panel
  referee: {
    '/referee-panel': [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE],
    '/referee/dashboard': [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE],
    '/referee/assignments': [UserRole.ADMIN, UserRole.HEAD_REFEREE],
  },

  // Team Management
  teams: {
    '/team-management': [UserRole.ADMIN, UserRole.TEAM_LEADER],
    '/team/create': [UserRole.ADMIN, UserRole.TEAM_LEADER],
    '/team/edit': [UserRole.ADMIN, UserRole.TEAM_LEADER],
    '/team/dashboard': [UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
    '/team/members': [UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
  },

  // Analytics and Reports
  analytics: {
    '/analytics': [UserRole.ADMIN, UserRole.HEAD_REFEREE],
    '/reports': [UserRole.ADMIN, UserRole.HEAD_REFEREE],
    '/rankings': [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
  },
} as const;

/**
 * Flattened route protection rules for middleware consumption
 */
export const PROTECTED_ROUTES: Record<string, readonly UserRole[]> = {
  ...ROUTE_PROTECTION_CONFIG.admin,
  ...ROUTE_PROTECTION_CONFIG.tournament,
  ...ROUTE_PROTECTION_CONFIG.scoring,
  ...ROUTE_PROTECTION_CONFIG.referee,
  ...ROUTE_PROTECTION_CONFIG.teams,
  ...ROUTE_PROTECTION_CONFIG.analytics,
};

/**
 * Authentication Configuration
 */
export const AUTH_CONFIG = {
  // Cookie settings - Updated to match backend cookie name
  cookieName: 'token', // Backend sets 'token', not 'auth_token'
  cookieMaxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  
  // Route settings
  accessDeniedPath: '/access-denied',
  loginPath: '/login', // Updated to match standardized login page
  logoutPath: '/auth/logout',
  
  // JWT settings
  jwtAlgorithm: 'HS256' as const,
  jwtIssuer: 'robotics-tournament-system',
  
  // Security settings
  requireHttps: process.env.NODE_ENV === 'production',
  tokenRefreshThreshold: 60 * 60, // 1 hour in seconds
} as const;

/**
 * Dashboard Route Mapping
 * 
 * Maps user roles to their appropriate dashboard routes.
 * Used for redirects after login and from access denied page.
 */
export const DASHBOARD_ROUTES: Record<UserRole, string> = {
  [UserRole.ADMIN]: '/admin/dashboard',
  [UserRole.HEAD_REFEREE]: '/referee/dashboard',
  [UserRole.ALLIANCE_REFEREE]: '/referee/dashboard',
  [UserRole.TEAM_LEADER]: '/team/dashboard',
  [UserRole.TEAM_MEMBER]: '/team/dashboard',
  [UserRole.COMMON]: '/dashboard', // Fallback for common users
};

/**
 * Public Routes Configuration
 * 
 * Routes that don't require authentication and should be accessible to everyone.
 */
export const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/contact',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/access-denied',
  '/api/health',
  '/api/public/*',
] as const;

/**
 * API Routes Configuration
 * 
 * Special handling for API routes that may have different authentication requirements.
 */
export const API_ROUTE_CONFIG = {
  // Public API endpoints
  public: [
    '/api/health',
    '/api/public/*',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
  ],
  
  // Protected API endpoints with role requirements
  protected: {
    '/api/admin/*': [UserRole.ADMIN],
    '/api/users/*': [UserRole.ADMIN], // User management API endpoints
    '/api/tournaments/*': [UserRole.ADMIN, UserRole.HEAD_REFEREE],
    '/api/teams/*': [UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
    '/api/scoring/*': [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE],
    '/api/user/*': [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
  },
} as const;

/**
 * Security Logging Configuration
 */
export const SECURITY_LOGGING_CONFIG = {
  // Events to log
  events: {
    accessDenied: true,
    authenticationFailed: true,
    routeAccess: process.env.NODE_ENV === 'development',
    tokenRefresh: true,
    roleChange: true,
  },
  
  // Log levels
  levels: {
    info: 'info',
    warning: 'warning',
    error: 'error',
    critical: 'critical',
  } as const,
  
  // External services (for production)
  services: {
    sentry: process.env.SENTRY_DSN,
    logRocket: process.env.LOGROCKET_APP_ID,
    datadog: process.env.DATADOG_API_KEY,
  },
} as const;

/**
 * Rate Limiting Configuration
 * 
 * Configuration for rate limiting authentication attempts and API calls.
 */
export const RATE_LIMIT_CONFIG = {
  // Authentication rate limits
  auth: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 60 * 60 * 1000, // 1 hour
  },
  
  // API rate limits by user role
  api: {
    [UserRole.ADMIN]: {
      maxRequests: 1000,
      windowMs: 60 * 1000, // 1 minute
    },
    [UserRole.HEAD_REFEREE]: {
      maxRequests: 500,
      windowMs: 60 * 1000,
    },
    [UserRole.ALLIANCE_REFEREE]: {
      maxRequests: 200,
      windowMs: 60 * 1000,
    },
    [UserRole.TEAM_LEADER]: {
      maxRequests: 100,
      windowMs: 60 * 1000,
    },
    [UserRole.TEAM_MEMBER]: {
      maxRequests: 50,
      windowMs: 60 * 1000,
    },
  },
} as const;

/**
 * Feature Flags Configuration
 * 
 * Toggle features based on environment or user role.
 */
export const FEATURE_FLAGS = {
  // Development features
  development: {
    debugLogging: process.env.NODE_ENV === 'development',
    mockData: process.env.MOCK_DATA === 'true',
    bypassAuth: process.env.BYPASS_AUTH === 'true',
  },
  
  // Role-based features
  roleFeatures: {
    [UserRole.ADMIN]: {
      systemReset: true,
      userImpersonation: true,
      advancedAnalytics: true,
    },
    [UserRole.HEAD_REFEREE]: {
      matchScheduling: true,
      scoreOverride: true,
      refereeAssignment: true,
    },
    [UserRole.ALLIANCE_REFEREE]: {
      liveScoring: true,
      matchNotes: true,
    },
    [UserRole.TEAM_LEADER]: {
      teamManagement: true,
      memberInvites: true,
      registrationOverride: false,
    },
    [UserRole.TEAM_MEMBER]: {
      teamView: true,
      personalStats: true,
    },
  },
} as const;

/**
 * Environment Configuration
 */
export const ENVIRONMENT_CONFIG = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  
  // API endpoints
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000',
  
  // External services
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
  },
} as const;

/**
 * Export all configurations
 */
export const RBAC_CONFIG = {
  routes: PROTECTED_ROUTES,
  auth: AUTH_CONFIG,
  dashboards: DASHBOARD_ROUTES,
  public: PUBLIC_ROUTES,
  api: API_ROUTE_CONFIG,
  security: SECURITY_LOGGING_CONFIG,
  rateLimit: RATE_LIMIT_CONFIG,
  features: FEATURE_FLAGS,
  environment: ENVIRONMENT_CONFIG,
} as const;

/**
 * Type exports for external use
 */
export type RouteProtectionConfig = typeof ROUTE_PROTECTION_CONFIG;
export type AuthConfig = typeof AUTH_CONFIG;
export type SecurityLoggingConfig = typeof SECURITY_LOGGING_CONFIG;
export type RBACConfig = typeof RBAC_CONFIG;
