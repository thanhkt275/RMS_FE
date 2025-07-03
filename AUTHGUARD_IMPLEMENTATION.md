# Production Authentication Solution - AuthGuard Implementation

## Problem Identified
❌ **Middleware limitations**: Next.js middleware runs on Edge Runtime and cannot access:
- localStorage (where tokens are stored)
- Browser APIs
- Client-side state

❌ **Cross-domain cookies**: Don't work reliably between different domains in production

## Solution: Client-Side AuthGuard

### How It Works

1. **Development**: Middleware handles authentication (same domain, cookies work)
2. **Production**: AuthGuard components handle authentication (client-side, localStorage + API calls)

### Implementation Steps

#### 1. Update Protected Pages

Replace middleware-only protection with AuthGuard wrapper:

```tsx
// Before (middleware-only)
export default function UsersPage() {
  return <UserManagement />;
}

// After (AuthGuard + middleware)
import AuthGuard from '@/components/auth/AuthGuard';
import { UserRole } from '@/lib/types';

export default function UsersPage() {
  return (
    <AuthGuard requiredRole={UserRole.ADMIN}>
      <UserManagement />
    </AuthGuard>
  );
}
```

#### 2. AuthGuard Features

- ✅ Checks localStorage for token
- ✅ Verifies token with backend API call
- ✅ Validates user role requirements
- ✅ Automatic redirect on auth failure
- ✅ Loading states and error handling
- ✅ Works in production cross-domain scenarios

#### 3. Pages That Need AuthGuard

Update these pages with AuthGuard:

```bash
# Admin pages
/app/users/page.tsx          -> requiredRole: ADMIN
/app/admin-setup/page.tsx    -> requiredRole: ADMIN
/app/tournaments/page.tsx    -> requiredRole: ADMIN

# Referee pages  
/app/control-match/page.tsx  -> requiredRoles: [ADMIN, HEAD_REFEREE, ALLIANCE_REFEREE]
/app/referee-panel/page.tsx  -> requiredRoles: [ADMIN, HEAD_REFEREE, ALLIANCE_REFEREE]

# Team management
/app/team-management/page.tsx -> any authenticated user
```

#### 4. Usage Examples

```tsx
// Single role requirement
<AuthGuard requiredRole={UserRole.ADMIN}>
  <AdminContent />
</AuthGuard>

// Multiple roles
<AuthGuard requiredRoles={[UserRole.ADMIN, UserRole.HEAD_REFEREE]}>
  <RefereeContent />
</AuthGuard>

// Any authenticated user
<AuthGuard>
  <ProtectedContent />
</AuthGuard>

// Custom fallback
<AuthGuard requiredRole={UserRole.ADMIN} fallbackPath="/custom-error">
  <AdminContent />
</AuthGuard>
```

#### 5. HOC Alternative

For cleaner code, use the Higher-Order Component:

```tsx
import { withAuthGuard } from '@/components/auth/AuthGuard';
import { UserRole } from '@/lib/types';

function UsersPage() {
  return <UserManagement />;
}

export default withAuthGuard(UsersPage, { 
  requiredRole: UserRole.ADMIN 
});
```

### Authentication Flow

1. **User logs in** -> Token stored in localStorage
2. **User navigates to protected page** -> AuthGuard checks:
   - Token exists in localStorage?
   - Token valid via API call?
   - User has required role?
3. **If all checks pass** -> Page renders
4. **If any check fails** -> Redirect to login/access-denied

### Environment Behavior

- **Development** (localhost):
  - Middleware + AuthGuard both active
  - Cookies + localStorage both work
  - Double protection for development

- **Production** (cross-domain):
  - Middleware disabled for protected routes
  - AuthGuard handles all authentication
  - localStorage + Authorization header

### Benefits

✅ **Works in production** across different domains  
✅ **Secure** - validates tokens with backend  
✅ **Fast** - client-side checks with caching potential  
✅ **Flexible** - supports any role configuration  
✅ **Backward compatible** - doesn't break existing functionality  
✅ **User-friendly** - proper loading states and error handling  

### Testing

1. **Login** -> Verify token in localStorage
2. **Navigate to protected page** -> Should work without redirect
3. **Logout** -> Token cleared, redirect to login
4. **Direct URL access** -> Should redirect if not authenticated

This solution resolves the cross-domain authentication issue while maintaining security and user experience.
