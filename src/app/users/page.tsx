'use client';

import React from 'react';
import UserManagement from '@/components/features/admin/UserManagement';
import AuthGuard from '@/components/features/auth/AuthGuard';
import { UserRole } from '@/types/types';

/**
 * Admin User Management Page
 * 
 * Access control is handled by:
 * - Development: middleware.ts (JWT + role verification)
 * - Production: AuthGuard component (client-side verification due to cross-domain limitations)
 * 
 * AuthGuard ensures:
 * - JWT authentication verification via API call
 * - ADMIN role requirement for /users route
 * - Automatic redirect to /login if not authenticated
 * - Automatic redirect to /access-denied if not ADMIN
 */
export default function UsersPage() {
  console.log('[Users Page] Rendering - access control active');

  return (
    <AuthGuard requiredRole={UserRole.ADMIN}>
      <UserManagement />
    </AuthGuard>
  );
}
