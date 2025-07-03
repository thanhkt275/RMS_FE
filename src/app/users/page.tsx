'use client';

import React from 'react';
import UserManagement from '@/components/admin/UserManagement';

/**
 * Admin User Management Page
 * 
 * Access control is handled by middleware.ts:
 * - JWT authentication verification
 * - ADMIN role requirement for /users route
 * - Automatic redirect to /login if not authenticated
 * - Automatic redirect to /access-denied if not ADMIN
 * 
 * If this component renders, the user is authenticated and has ADMIN role.
 */
export default function UsersPage() {
  console.log('[Users Page] Rendering - middleware has verified ADMIN access');

  return (
    <UserManagement />
  );
}
