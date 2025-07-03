/**
 * Auth Components Index - Updated for Step 5
 * 
 * Central export point for all authentication-related components.
 * This follows the Barrel Export pattern for better organization.
 * 
 * Step 5 additions: Security Logging and Error Handling components
 */

// Step 3: Component-Level Access Control
export { RoleGuard, withRoleGuard, useRoleCheck } from './RoleGuard';

// Step 5: Security Logging and Error Handling
export { 
  AuthErrorBoundary, 
  withAuthErrorBoundary, 
  useAuthErrorHandler,
  AuthErrorType 
} from './AuthErrorBoundary';




// Re-export types for convenience
export type { UserRole } from '@/lib/types';
