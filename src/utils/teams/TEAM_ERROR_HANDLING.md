# Team Error Handling Integration

This document describes the enhanced error handling system for team-related operations, which integrates with existing RBAC error patterns and infrastructure.

## Overview

The team error handling system provides:

- **Extended rbacLogger**: Team-specific logging events for security monitoring
- **User-friendly error messages**: Consistent error messaging using existing permission error patterns
- **Loading states integration**: Seamless integration with existing loading and error handling infrastructure
- **Enhanced tooltips**: Improved tooltip messages using existing `getAccessDeniedMessage` patterns

## Components

### 1. Extended rbacLogger

The `rbacLogger` has been extended with team-specific logging methods:

```typescript
// New team-specific event types
enum SecurityEventType {
  TEAM_ACCESS_DENIED = 'team_access_denied',
  TEAM_ACCESS_GRANTED = 'team_access_granted',
  TEAM_OPERATION_DENIED = 'team_operation_denied',
  TEAM_DATA_ACCESS_DENIED = 'team_data_access_denied',
}

// New logging methods
interface ISecurityLogger {
  logTeamAccessDenied(userId: string | null, role: string | null, teamId: string, operation: string, reason?: string): Promise<void>;
  logTeamAccessGranted(userId: string, role: string, teamId: string, operation: string): Promise<void>;
  logTeamOperationDenied(userId: string | null, role: string | null, operation: string, teamId?: string, reason?: string): Promise<void>;
  logTeamDataAccessDenied(userId: string | null, role: string | null, teamId: string, dataType: string, reason?: string): Promise<void>;
}
```

### 2. TeamErrorHandler Utility

The `TeamErrorHandler` class provides centralized error handling for team operations:

```typescript
import { TeamErrorHandler, teamErrorUtils } from '@/utils/teams/team-error-handler';

// Handle specific team access denied errors
await TeamErrorHandler.handleTeamAccessDenied({
  userId: 'user-123',
  userRole: UserRole.COMMON,
  teamId: 'team-456',
  operation: 'edit'
}, 'Custom error message');

// Handle team operation denied errors
await TeamErrorHandler.handleTeamOperationDenied({
  userId: 'user-123',
  userRole: UserRole.COMMON,
  operation: 'delete'
});

// Get enhanced tooltip messages
const tooltipMessage = TeamErrorHandler.getTooltipMessage('create', UserRole.COMMON);
```

### 3. Team-Specific UI Components

New UI components that follow existing patterns:

```typescript
import { 
  TeamAccessDenied, 
  TeamAccessDeniedOverlay, 
  TeamAccessDeniedInline,
  TeamLoadingState,
  TeamErrorState 
} from '@/components/features/teams/TeamAccessDenied';

// Use in place of generic AccessDenied component
<TeamAccessDenied
  operation="edit"
  currentRole={UserRole.COMMON}
  team={team}
  requiredRoles={[UserRole.ADMIN, UserRole.TEAM_LEADER]}
/>

// Use for loading states
<TeamLoadingState message="Loading team data..." />

// Use for error states
<TeamErrorState 
  error={error} 
  onRetry={handleRetry}
  operation="load team data"
/>
```

## Integration Examples

### 1. Hook Integration

Updated hooks now use the enhanced error handling:

```typescript
// In use-role-based-team-management.ts
import { teamErrorUtils, TeamErrorHandler } from '@/utils/teams/team-error-handler';

const createTeamMutation = useMutation({
  mutationFn: async (data: CreateTeamDto) => {
    // Check permissions with enhanced logging
    if (!TeamDataFilterService.canPerformTeamAction('create', userRole)) {
      const errorMessage = roleAccess.getAccessDeniedMessage('create');
      await TeamErrorHandler.handleTeamOperationDenied({
        userId,
        userRole,
        operation: 'create'
      }, errorMessage, { showToast: false });
      throw new Error(errorMessage);
    }
    
    return await TeamService.createTeam(data);
  },
  onError: async (error: Error) => {
    await teamErrorUtils.handleCreateError(error, userId, userRole);
  },
});
```

### 2. Component Integration

Components now use enhanced tooltips and error handling:

```typescript
// In AdminTeamsView.tsx
import { TeamErrorHandler } from '@/utils/teams/team-error-handler';

<Button 
  variant="outline" 
  disabled 
  title={TeamErrorHandler.getTooltipMessage('import', roleAccess.currentRole)}
  className="flex items-center gap-2"
>
  <UploadIcon size={16} /> Import
</Button>
```

### 3. Page Container Integration

Page containers use the new loading and error states:

```typescript
// In TeamsPageContainer.tsx
import { TeamLoadingState, TeamErrorState } from './TeamAccessDenied';

// Show enhanced loading state
if (authLoading || (!user && !authLoading)) {
  return <TeamLoadingState message="Loading authentication..." />;
}

// Show enhanced data loading state
if (dataLoading && !leaderboardRows.length) {
  return <TeamLoadingState message="Loading team data..." />;
}
```

## Error Handling Patterns

### 1. Permission Checks

Before performing any team operation, check permissions and log appropriately:

```typescript
// Check permissions
if (!TeamDataFilterService.canPerformTeamAction('edit', userRole, team, userId)) {
  // Log the access denied event
  await TeamErrorHandler.handleTeamAccessDenied({
    userId,
    userRole,
    teamId: team.id,
    operation: 'edit'
  });
  return;
}

// Log successful access (development only)
await TeamErrorHandler.handleTeamAccessGranted({
  userId,
  userRole,
  teamId: team.id,
  operation: 'edit'
});
```

### 2. Error Recovery

Handle errors gracefully with user feedback:

```typescript
try {
  await performTeamOperation();
} catch (error) {
  // Use utility functions for common operations
  await teamErrorUtils.handleUpdateError(error, teamId, userId, userRole);
  
  // Or handle specific error types
  await TeamErrorHandler.handleGenericTeamError(error, {
    userId,
    userRole,
    teamId,
    operation: 'update'
  });
}
```

### 3. UI Feedback

Provide clear feedback to users about their permissions:

```typescript
// For disabled buttons
<Button 
  disabled={!canPerformAction}
  title={TeamErrorHandler.getTooltipMessage(action, userRole, team)}
>
  {actionLabel}
</Button>

// For access denied sections
{!canAccess && (
  <TeamAccessDenied
    operation={operation}
    currentRole={userRole}
    team={team}
    requiredRoles={requiredRoles}
  />
)}

// For overlay protection
<TeamAccessDeniedOverlay
  operation="edit"
  currentRole={userRole}
  team={team}
  showOverlay={!canEdit}
>
  <TeamEditForm team={team} />
</TeamAccessDeniedOverlay>
```

## Security Considerations

### 1. Logging

- All team access denied events are logged for security monitoring
- Successful access is only logged in development to avoid noise
- Sensitive information is not logged (only team IDs, not team data)
- User IDs and roles are logged for audit trails

### 2. Error Messages

- Error messages are user-friendly but don't reveal system internals
- Messages include current role and required permissions for transparency
- Custom messages can be provided for specific contexts
- Default messages follow existing permission error patterns

### 3. Performance

- Logging is asynchronous and doesn't block operations
- Error handling is optimized to avoid unnecessary processing
- Toast notifications are deduplicated to prevent spam
- Loading states provide immediate feedback to users

## Testing

The error handling system includes comprehensive tests:

```bash
# Run team error handler tests
npm test src/utils/teams/__tests__/team-error-handler.test.ts

# Test coverage includes:
# - Tooltip message generation
# - Error logging functionality
# - Toast notification behavior
# - Permission checking integration
# - Utility function behavior
```

## Migration Guide

### Existing Code Updates

1. **Replace generic error handling**:
   ```typescript
   // Before
   toast.error(`Failed to create team: ${error.message}`);
   
   // After
   await teamErrorUtils.handleCreateError(error, userId, userRole);
   ```

2. **Update tooltip messages**:
   ```typescript
   // Before
   title={getAccessDeniedMessage('create')}
   
   // After
   title={TeamErrorHandler.getTooltipMessage('create', userRole, team)}
   ```

3. **Use enhanced UI components**:
   ```typescript
   // Before
   <AccessDenied feature="Teams" message={message} currentRole={role} />
   
   // After
   <TeamAccessDenied operation="edit" currentRole={role} team={team} />
   ```

### Backward Compatibility

- Existing `getAccessDeniedMessage` function still works but now uses enhanced error handler
- Original `rbacLogger` methods remain unchanged
- Existing error handling patterns continue to work
- New functionality is additive and doesn't break existing code

## Requirements Satisfied

This implementation satisfies the following requirements from the task:

✅ **5.5**: Enhanced error handling with user-friendly messages and clear permission indicators
✅ **4.5**: Backend role validation with comprehensive logging and audit trails

The error handling system provides:
- Extended `rbacLogger` for team-specific access denied events
- User-friendly error messages using existing permission error patterns  
- Integration with existing loading states and error handling infrastructure
- Enhanced tooltips using existing `getAccessDeniedMessage` patterns from role-based access hook