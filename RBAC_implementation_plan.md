# Frontend RBAC Implementation Plan

This document outlines the step-by-step process for implementing a robust Role-Based Access Control (RBAC) system in the Next.js frontend application.

**Goal:** To create a secure and user-friendly interface that dynamically adjusts what the user can see and do based on their assigned role.

---

### Prerequisites

1.  **Backend API:** The backend must have an authentication endpoint (`/login`) that, upon successful login, returns a user object including their `role`.
2.  **Secure Token:** The backend should provide a secure token (e.g., JWT) that is stored on the client (e.g., in an HttpOnly cookie) to manage the session.

---

### Step 1: Centralize Authentication State with React Context

Create a global context to manage the user's session. This makes the user's role and authentication status available to any component in the application without prop-drilling.

**Action:** Create a new file `src/hooks/useAuth.tsx`.

```tsx
// src/hooks/useAuth.tsx
"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types/user'; // We will create this in the next step
import { authService } from '@/services/authService'; // Assume this service exists

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const currentUser = await authService.getCurrentUser(); // Verifies token with backend
        setUser(currentUser);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkUserSession();
  }, []);

  const logout = () => {
    authService.logout(); // Clears token
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

**Action:** Wrap the root layout with this `AuthProvider`.

```tsx
// src/app/layout.tsx
import { AuthProvider } from '@/hooks/useAuth';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

### Step 2: Define Shared Types

Create a shared type definition for the `User` and `UserRole` to ensure consistency between the frontend and backend.

**Action:** Create a new file `src/types/user.ts`.

```ts
// src/types/user.ts
export enum UserRole {
  ADMIN = 'ADMIN',
  HEAD_REFEREE = 'HEAD_REFEREE',
  ALLIANCE_REFEREE = 'ALLIANCE_REFEREE',
  TEAM_LEADER = 'TEAM_LEADER',
  TEAM_MEMBER = 'TEAM_MEMBER',
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}
```

---

### Step 3: Component-Level Access Control

Use the `useAuth` hook to conditionally render UI elements based on the user's role.

**Action:** Create a `RoleGuard` component for cleaner conditional rendering. This component centralizes the display logic, making it highly scalable.

```tsx
// src/components/auth/RoleGuard.tsx
"use client";

import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';
import { ReactNode } from 'react';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
  showUnauthorized?: boolean;
}

export function RoleGuard({ 
  allowedRoles, 
  children, 
  fallback = null,
  showUnauthorized = false 
}: RoleGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  if (!user) {
    return showUnauthorized ? (
      <div className="auth-required">Please sign in to access this feature.</div>
    ) : fallback;
  }

  if (!allowedRoles.includes(user.role)) {
    return showUnauthorized ? (
      <div className="permission-denied">You don't have permission to access this feature.</div>
    ) : fallback;
  }

  return <>{children}</>;
}
```

**Usage Example:**

```tsx
// In any component that needs role-based UI
import { RoleGuard } from '@/components/auth/RoleGuard';
import { UserRole } from '@/types/user';

function MatchControls() {
  return (
    <div>
      <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.HEAD_REFEREE]}>
        <button>Approve Final Score</button>
      </RoleGuard>

      <RoleGuard allowedRoles={[UserRole.ADMIN]}>
        <button>System-Wide Reset</button>
      </RoleGuard>
    </div>
  );
}
```

**Scalability Note:** Using a `RoleGuard` component is highly scalable. If you need to change your permission logic (e.g., a "Super Admin" should inherit "Admin" permissions), you only need to update the logic inside the `RoleGuard.tsx` file once. The change will automatically apply everywhere the component is used.

---

### Step 4: Page-Level Access Control (Protected Routes)

Use Next.js Middleware to protect entire pages. This is the most secure and performant method.

**Action:** Create an `access-denied` page.

```tsx
// src/app/access-denied/page.tsx
export default function AccessDeniedPage() {
  return (
    <div>
      <h1>Access Denied</h1>
      <p>You do not have permission to view this page.</p>
    </div>
  );
}
```

**Action:** Create the `middleware.ts` file in the root of your project (or inside `src/`).

```ts
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { UserRole } from '@/types/user';
import { rbacLogger } from '@/utils/rbacLogger';

// Secure JWT verification using the 'jose' library
async function getRoleFromToken(token: string | undefined): Promise<UserRole | null> {
  if (!token) return null;
  
  try {
    const { jwtVerify } = await import('jose');
    const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return (payload.role as UserRole) || null;
  } catch (error) {
    console.error('JWT verification failed:', error);
    // Log security event for monitoring
    rbacLogger.authenticationFailed(token.substring(0, 10) + '...', error);
    return null;
  }
}

const protectedRoutes: Record<string, UserRole[]> = {
  '/admin': [UserRole.ADMIN],
  '/stages': [UserRole.ADMIN],
  '/referee-panel': [UserRole.ADMIN, UserRole.HEAD_REFEREE],
  '/team-management': [UserRole.TEAM_LEADER],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const requiredRoles = Object.entries(protectedRoutes).find(([path]) =>
    pathname.startsWith(path)
  )?.[1];

  // If the route is not protected, let it pass
  if (!requiredRoles) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;
  const userRole = await getRoleFromToken(token);

  if (!userRole || !requiredRoles.includes(userRole)) {
    // Log access attempt for security monitoring
    rbacLogger.accessDenied(
      userRole || 'anonymous', 
      userRole || 'none', 
      pathname
    );
    
    const url = request.nextUrl.clone();
    url.pathname = '/access-denied';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/stages/:path*', '/referee-panel/:path*', '/team-management/:path*'],
};
```

**Scalability Note:** Using Middleware is the most scalable way to protect pages. To protect a new section of your application (e.g., `/analytics`), you only need to add the new path to the `protectedRoutes` object and the `matcher` array in this single file. You do not need to add any security code to the new page components themselves.

---

### Step 5: Add Security Logging and Error Handling

**Action:** Create a security logging utility for monitoring and audit trails.

```tsx
// src/utils/rbacLogger.ts
export const rbacLogger = {
  accessDenied: (userId: string, role: string, attemptedPath: string) => {
    console.warn(`Access denied: User ${userId} (${role}) attempted to access ${attemptedPath}`);
    // Send to your monitoring service (e.g., Sentry, LogRocket, etc.)
    // trackSecurityEvent('access_denied', { userId, role, attemptedPath });
  },
  
  authenticationFailed: (tokenPrefix: string, error: any) => {
    console.error(`JWT verification failed for token ${tokenPrefix}:`, error);
    // Send to your monitoring service
    // trackSecurityEvent('auth_failed', { tokenPrefix, error: error.message });
  },
  
  roleCheck: (userId: string, role: string, requiredRoles: string[]) => {
    console.log(`Role check: User ${userId} (${role}) against required roles: ${requiredRoles.join(', ')}`);
  }
};
```

**Action:** Create an error boundary for authentication errors.

```tsx
// src/components/auth/AuthErrorBoundary.tsx
"use client";

import React from 'react';

interface AuthErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class AuthErrorBoundary extends React.Component<
  { children: React.ReactNode },
  AuthErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth error boundary caught an error:', error, errorInfo);
    // Log to your error monitoring service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="auth-error">
          <h2>Authentication Error</h2>
          <p>Something went wrong with authentication. Please refresh the page or contact support.</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="retry-button"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Action:** Update your layout to include the error boundary.

```tsx
// src/app/layout.tsx
import { AuthProvider } from '@/hooks/useAuth';
import { AuthErrorBoundary } from '@/components/auth/AuthErrorBoundary';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AuthErrorBoundary>
      </body>
    </html>
  );
}
```

---

### Step 6: Permission Constants for Better Organization

**Action:** Create centralized permission constants that map to your requirements matrix.

```tsx
// src/constants/permissions.ts
import { UserRole } from '@/types/user';

export const PERMISSIONS = {
  DASHBOARD: {
    SYSTEM_STATS: [UserRole.ADMIN],
    MATCH_STATUS: [UserRole.ADMIN, UserRole.HEAD_REFEREE],
    ASSIGNED_MATCHES: [UserRole.ALLIANCE_REFEREE],
    TEAM_VIEW: [UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
  },
  USER_MANAGEMENT: {
    FULL_CONTROL: [UserRole.ADMIN],
    VIEW_ONLY: [UserRole.HEAD_REFEREE],
  },
  TEAM_CREATION: {
    FULL_CONTROL: [UserRole.ADMIN],
    CREATE_OWN: [UserRole.TEAM_LEADER],
  },
  TEAM_MEMBERSHIP: {
    EDIT_ANY: [UserRole.ADMIN],
    MANAGE_OWN: [UserRole.TEAM_LEADER],
    VIEW_OWN: [UserRole.TEAM_MEMBER],
  },
  TOURNAMENT_REGISTRATION: {
    REGISTER_ANY: [UserRole.ADMIN],
    REGISTER_OWN: [UserRole.TEAM_LEADER],
    VIEW_ONLY: [UserRole.HEAD_REFEREE, UserRole.TEAM_MEMBER],
  },
  MATCH_SCHEDULING: {
    FULL_CONTROL: [UserRole.ADMIN],
    REQUEST_CHANGES: [UserRole.HEAD_REFEREE],
    VIEW_ONLY: [UserRole.ALLIANCE_REFEREE, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
  },
  LIVE_SCORING: {
    OVERRIDE: [UserRole.ADMIN],
    ENTER_AND_APPROVE: [UserRole.HEAD_REFEREE],
    ENTER_ONLY: [UserRole.ALLIANCE_REFEREE],
    VIEW_ONLY: [UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
  },
  RANKINGS: {
    RECALCULATE: [UserRole.ADMIN],
    VIEW_ONLY: [UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
  },
  ANNOUNCEMENTS: {
    FULL_CONTROL: [UserRole.ADMIN],
    CREATE_AND_EDIT: [UserRole.HEAD_REFEREE],
    VIEW_ONLY: [UserRole.ALLIANCE_REFEREE, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
  },
  PROFILE: {
    EDIT_ANY: [UserRole.ADMIN],
    EDIT_OWN: [UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER],
  },
  SYSTEM_SETTINGS: {
    FULL_CONTROL: [UserRole.ADMIN],
  },
} as const;
```

**Usage Example with Permission Constants:**

```tsx
// In your components
import { PERMISSIONS } from '@/constants/permissions';
import { RoleGuard } from '@/components/auth/RoleGuard';

function Dashboard() {
  return (
    <div>
      <RoleGuard allowedRoles={PERMISSIONS.DASHBOARD.SYSTEM_STATS}>
        <SystemStatsWidget />
      </RoleGuard>
      
      <RoleGuard allowedRoles={PERMISSIONS.DASHBOARD.MATCH_STATUS}>
        <MatchStatusWidget />
      </RoleGuard>
      
      <RoleGuard allowedRoles={PERMISSIONS.DASHBOARD.TEAM_VIEW}>
        <TeamViewWidget />
      </RoleGuard>
    </div>
  );
}
```

---

### Step 7: Enhanced AuthService Implementation

**Action:** Create a comprehensive authentication service.

```tsx
// src/services/authService.ts
import { User } from '@/types/user';

class AuthService {
  private baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  async login(credentials: { username: string; password: string }): Promise<User> {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      credentials: 'include', // Include cookies
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const user = await response.json();
    return user;
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${this.baseURL}/auth/me`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Not authenticated');
    }

    return response.json();
  }

  async logout(): Promise<void> {
    await fetch(`${this.baseURL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  }

  async refreshToken(): Promise<User> {
    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return response.json();
  }
}

export const authService = new AuthService();
```

---

### Step 8: Environment Variables and Configuration

**Action:** Document required environment variables.

```bash
# .env.local (for development)
NEXT_PUBLIC_API_URL=http://localhost:3001
JWT_SECRET=your-super-secret-jwt-key-here

# .env.production (for production)
NEXT_PUBLIC_API_URL=https://your-api-domain.com
JWT_SECRET=your-production-jwt-secret
```

**Action:** Add environment validation.

```tsx
// src/config/env.ts
const requiredEnvVars = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  JWT_SECRET: process.env.JWT_SECRET,
};

// Validate all required environment variables are present
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const config = {
  apiUrl: requiredEnvVars.NEXT_PUBLIC_API_URL!,
  jwtSecret: requiredEnvVars.JWT_SECRET!,
} as const;
```

---

### Step 9: Long-Term Scalability and Maintenance

This architecture is designed to grow with your application without becoming complex.

*   **Centralized Rules:** All page-level security rules are in `middleware.ts`. All component-level display logic is in `RoleGuard.tsx`. All permissions constants are in `permissions.ts`. This makes it easy to understand and modify your permission system.
*   **Adding New Roles:** To add a new role (e.g., "Sponsor"), you simply add it to the `UserRole` enum and then include it in the relevant permission arrays. No major refactoring is required.
*   **Adding New Pages:** To protect a new page, you make a one-line change in the middleware. This is extremely efficient and reduces the risk of forgetting to protect a page.
*   **Security Monitoring:** The logging system helps you track unauthorized access attempts and authentication failures for security auditing.
*   **Error Recovery:** Error boundaries prevent authentication issues from breaking the entire application.

### Summary & Best Practices

*   **Security First:** Use secure JWT verification with the `jose` library, never decode tokens client-side without verification.
*   **Centralize Logic:** Use the `AuthProvider`, `RoleGuard`, permission constants, and `middleware.ts` to keep your RBAC logic clean, centralized, and scalable.
*   **Middleware is Key:** Use middleware for page-level protection. It's more secure, performant, and vastly easier to maintain than client-side checks as your app grows.
*   **UX is Not Security:** Remember that frontend controls are for user experience. The backend validation is your actual security. Always validate permissions on the server for every API call.
*   **Provide Feedback:** Use proper loading states, error messages, and access denied pages to give users clear feedback.
*   **Monitor and Log:** Track security events for auditing and to detect potential security issues.
*   **Handle Errors Gracefully:** Use error boundaries to prevent authentication errors from breaking the user experience.

### Required Dependencies

Add these to your `package.json`:

```bash
npm install jose  # For secure JWT verification
# Optional: Add monitoring/logging services
npm install @sentry/nextjs  # For error tracking
```


