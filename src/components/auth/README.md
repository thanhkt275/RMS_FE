# Role-Based Access Control (RBAC) Components

This directory contains the implementation of Step 3 from the RBAC implementation plan: **Component-Level Access Control**.

## Components

### 🛡️ `RoleGuard.tsx`
The main component for role-based UI access control.

**Features:**
- Declarative role-based rendering
- Loading states and error handling
- Security logging integration
- Flexible fallback options
- TypeScript support

**Usage:**
```tsx
<RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.HEAD_REFEREE]}>
  <AdminButton />
</RoleGuard>
```

### 🎨 `RoleGuardExamples.tsx`
Comprehensive examples showing different usage patterns of the RoleGuard component.

**Examples include:**
- Basic role protection
- Fallback content
- Unauthorized messages
- Higher-Order Component (HOC) usage
- Programmatic permission checking
- Role-based layouts

### 📦 `index.ts`
Barrel export file for clean imports.

## API Reference

### RoleGuard Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `allowedRoles` | `UserRole[]` | ✅ | Array of roles that can access the content |
| `children` | `ReactNode` | ✅ | Content to render when user has permission |
| `fallback` | `ReactNode` | ❌ | Content to render when user lacks permission |
| `showUnauthorized` | `boolean` | ❌ | Show message instead of hiding content |
| `feature` | `string` | ❌ | Feature name for logging purposes |

### withRoleGuard HOC

```tsx
const ProtectedComponent = withRoleGuard([UserRole.ADMIN], {
  showUnauthorized: true,
  feature: "Admin Panel"
})(MyComponent);
```

### useRoleCheck Hook

```tsx
const { hasPermission, checkPermission, userRole, isAuthenticated } = useRoleCheck([UserRole.ADMIN]);
```

## SOLID Principles Implementation

### Single Responsibility Principle
- `RoleGuard`: Only handles role-based rendering
- `RoleCheckerService`: Only handles permission logic
- `LoadingSpinner`, `UnauthorizedMessage`, `AuthRequiredMessage`: Each handles one UI state

### Open/Closed Principle
- Components are extensible through props without modification
- New roles can be added without changing existing code

### Liskov Substitution Principle
- Components can be replaced with compatible implementations
- Service interfaces allow for different implementations

### Interface Segregation Principle
- Clean, focused interfaces for each concern
- Props interfaces contain only necessary properties

### Dependency Injection
- Services are injected through hooks and parameters
- No hard dependencies on specific implementations

## Security Features

1. **Access Logging**: All permission checks are logged for audit trails
2. **Fallback Handling**: Graceful degradation when permissions are insufficient
3. **Loading States**: Secure handling of authentication state transitions
4. **Type Safety**: Full TypeScript support prevents runtime errors

## Usage Patterns

### 1. Simple Protection
```tsx
<RoleGuard allowedRoles={[UserRole.ADMIN]}>
  <AdminButton />
</RoleGuard>
```

### 2. With Fallback
```tsx
<RoleGuard 
  allowedRoles={[UserRole.ADMIN]} 
  fallback={<div>Contact admin for access</div>}
>
  <AdminPanel />
</RoleGuard>
```

### 3. Show Messages
```tsx
<RoleGuard 
  allowedRoles={[UserRole.ADMIN]} 
  showUnauthorized={true}
  feature="User Management"
>
  <UserManagement />
</RoleGuard>
```

### 4. Programmatic Checks
```tsx
const { hasPermission } = useRoleCheck([UserRole.ADMIN]);

return (
  <button disabled={!hasPermission}>
    {hasPermission ? 'Delete User' : 'Access Denied'}
  </button>
);
```

## Best Practices

1. **Always use TypeScript**: Leverage type safety for role definitions
2. **Provide fallbacks**: Don't just hide content, provide alternatives
3. **Log appropriately**: Use the `feature` prop for audit trails
4. **Test thoroughly**: Verify behavior for all user roles
5. **Keep it simple**: Use the simplest pattern that meets your needs

## Next Steps

After implementing this step, proceed with:
- Step 4: Page-Level Access Control (Middleware)
- Step 5: Security Logging and Error Handling
- Step 6: Permission Constants for Better Organization
