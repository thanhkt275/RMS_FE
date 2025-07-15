/**
 * Access Denied Page - RBAC Step 4 Implementation
 * 
 * This page is displayed when users attempt to access routes they don't have permission for.
 * It follows the Single Responsibility Principle by only handling access denial UI.
 * 
 * Features:
 * - User-friendly error messaging
 * - Navigation options for different user states
 * - Responsive design with proper styling
 * - Integration with authentication system
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

"use client";

import { useAuth } from '@/hooks/common/use-auth';
import { UserRole } from '@/types/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactElement } from 'react';

/**
 * Access Denied Page Component
 * 
 * Provides a comprehensive access denied experience with context-aware messaging
 * and appropriate navigation options based on the user's authentication state.
 */
export default function AccessDeniedPage(): ReactElement {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-red-100">
            <svg
              className="h-12 w-12 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          {/* Main Content */}
          <div className="mt-8">
            <h1 className="text-3xl font-bold text-gray-900">Access Denied</h1>
            
            {user ? (
              // User is authenticated but lacks permission
              <div className="mt-4 space-y-2">
                <p className="text-lg text-gray-600">
                  You don't have permission to access this page.
                </p>
                <p className="text-sm text-gray-500">
                  Signed in as <span className="font-medium">{user.username}</span> ({user.role})
                </p>
              </div>
            ) : (
              // User is not authenticated
              <div className="mt-4">
                <p className="text-lg text-gray-600">
                  Please sign in to access this page.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md mt-8">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-4">
            
            {user ? (
              // Actions for authenticated users
              <>
                <button
                  onClick={() => router.back()}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go Back
                </button>
                
                <Link
                  href={getDashboardRoute(user.role)}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Dashboard
                </Link>

                <button
                  onClick={logout}
                  className="w-full flex justify-center py-2 px-4 border border-red-300 rounded-md shadow-sm bg-white text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Sign Out
                </button>
              </>
            ) : (
              // Actions for unauthenticated users
              <>
                <Link
                  href="/login"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sign In
                </Link>
                
                <Link
                  href="/"
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Home Page
                </Link>
              </>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              If you believe this is an error, please contact your administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Get appropriate dashboard route based on user role
 * 
 * Follows the Open/Closed Principle by allowing new roles to be added
 * without modifying existing logic.
 * 
 * @param role User's role
 * @returns Dashboard route path
 */
function getDashboardRoute(role: UserRole): string {
  const roleRouteMap: Record<UserRole, string> = {
    [UserRole.ADMIN]: '/admin/dashboard',
    [UserRole.HEAD_REFEREE]: '/referee-panel',
    [UserRole.ALLIANCE_REFEREE]: '/referee-panel',
    [UserRole.TEAM_LEADER]: '/team/dashboard',
    [UserRole.TEAM_MEMBER]: '/team/dashboard',
    [UserRole.COMMON]: '/dashboard',
  };

  return roleRouteMap[role] || '/dashboard';
}
