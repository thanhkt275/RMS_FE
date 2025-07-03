/**
 * Client-Side Authentication Guard
 * 
 * This component handles authentication checks on the client side for production
 * environments where middleware can't access localStorage tokens.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/lib/types';
import { apiClient } from '@/lib/api-client';
import TokenManager from '@/lib/tokenManager';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
  fallbackPath?: string;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: any | null;
  error: string | null;
}

export function AuthGuard({ 
  children, 
  requiredRole, 
  requiredRoles, 
  fallbackPath = '/access-denied' 
}: AuthGuardProps) {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    error: null
  });

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      // Check if token exists in localStorage (handles migration automatically)
      const token = TokenManager.getToken();
      
      if (!token) {
        console.log('[AuthGuard] No token found in localStorage');
        setAuthState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          error: 'No authentication token found'
        });
        router.push(fallbackPath);
        return;
      }

      console.log('[AuthGuard] Found token:', TokenManager.getTokenPreview());

      // Verify token with backend
      const response = await apiClient.get('/auth/check-auth');
      
      if (response.authenticated && response.user) {
        const user = response.user;
        
        // Check role requirements
        const hasRequiredRole = checkRolePermission(user.role, requiredRole, requiredRoles);
        
        if (!hasRequiredRole) {
          console.log('[AuthGuard] User does not have required role');
          setAuthState({
            isLoading: false,
            isAuthenticated: true,
            user,
            error: 'Insufficient permissions'
          });
          router.push(fallbackPath);
          return;
        }

        // Authentication and authorization successful
        setAuthState({
          isLoading: false,
          isAuthenticated: true,
          user,
          error: null
        });
      } else {
        throw new Error('Authentication check failed');
      }
    } catch (error: any) {
      console.error('[AuthGuard] Authentication check failed:', error);
      
      // Clear invalid tokens
      TokenManager.removeToken();
      
      setAuthState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: error.message || 'Authentication failed'
      });
      
      router.push('/login');
    }
  };

  const checkRolePermission = (
    userRole: UserRole, 
    requiredRole?: UserRole, 
    requiredRoles?: UserRole[]
  ): boolean => {
    if (!requiredRole && !requiredRoles) {
      return true; // No role requirement
    }

    if (requiredRole) {
      return userRole === requiredRole || userRole === UserRole.ADMIN;
    }

    if (requiredRoles) {
      return requiredRoles.includes(userRole) || userRole === UserRole.ADMIN;
    }

    return false;
  };

  // Show loading state
  if (authState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Checking authentication...</span>
      </div>
    );
  }

  // Show error state (this shouldn't render as we redirect on error)
  if (!authState.isAuthenticated || authState.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-4">Authentication Error</div>
          <div className="text-gray-600">{authState.error}</div>
        </div>
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
}

// Higher-order component version for easier use
export function withAuthGuard<T extends object>(
  Component: React.ComponentType<T>,
  options: Omit<AuthGuardProps, 'children'> = {}
) {
  return function AuthGuardedComponent(props: T) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

export default AuthGuard;
