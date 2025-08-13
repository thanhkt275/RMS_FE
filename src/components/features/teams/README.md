# Teams Page Role-Based Access Control Implementation

## Overview

This implementation provides role-based access control for the teams page, offering different views and capabilities based on user roles (ADMIN, REF, COMMON). The solution integrates with existing authentication systems and maintains backward compatibility.

## Architecture

### Main Components

1. **TeamsPageContainer** - Main container that detects user role and renders appropriate view
2. **AdminTeamsView** - Full CRUD operations, import/export functionality
3. **RefTeamsView** - Read-only access to all team information
4. **CommonTeamsView** - Limited view showing only user's team and basic info of others

### Key Features

- **Role Detection**: Automatic role detection using existing `useAuth` hook
- **Permission-Based Rendering**: Components conditionally rendered based on user permissions
- **Data Filtering**: Teams data filtered based on user role and ownership
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Loading States**: Proper loading states for all data operations
- **Backward Compatibility**: Maintains compatibility with existing teams functionality

## Role-Based Access Levels

### ADMIN Role
- Full CRUD operations on all teams
- Import/export functionality
- Access to all team data including sensitive information
- Team management capabilities
- Statistics recalculation

### HEAD_REFEREE / ALLIANCE_REFEREE Roles
- Read-only access to all teams
- View comprehensive team information (excluding sensitive admin data)
- Access to team statistics and member information
- Filtering and sorting capabilities
- No editing or management operations

### TEAM_LEADER / TEAM_MEMBER / COMMON Roles
- View own team with full details (if registered)
- Limited public information for other teams (name, organization, rank)
- No editing or management capabilities
- Clear indication of access level

## Implementation Details

### Hooks Used

1. **useAuth** - Existing authentication hook for user context
2. **useTeamsRoleAccess** - Role-based permission checking
3. **useTeamsPageData** - Data fetching and tournament/stage selection
4. **useTeams** - Teams data with role-based filtering

### Data Filtering

The `TeamDataFilterService` provides:
- Role-based team data filtering
- Column configuration based on permissions
- Ownership-based access control
- Integration with existing RBAC system

### Error Handling

- Authentication errors (not logged in)
- Role determination errors
- Data loading errors
- Unsupported role handling
- Network/API errors

### Loading States

- Authentication loading
- Data loading (tournaments, teams, leaderboard)
- Component-specific loading states
- Graceful degradation

## Testing

### Integration Tests

- Role-based rendering verification
- Error handling validation
- Loading state testing
- Data integration testing

### Test Files

- `TeamsPageContainer.integration.test.tsx` - Comprehensive integration tests
- `role-based-rendering.test.tsx` - Simple role-based rendering tests

## Usage

The teams page automatically detects the user's role and renders the appropriate view:

```tsx
// Simple usage - role detection is automatic
export default function TeamsPage() {
  return <TeamsPageContainer />;
}
```

## Security Considerations

### Frontend Security
- Role validation on every page load
- Sensitive UI elements conditionally rendered
- Client-side filtering as additional layer (not primary security)

### Backend Security
- All endpoints validate user role server-side
- Data filtering happens at service layer
- Audit logging for sensitive operations

## Backward Compatibility

The implementation maintains backward compatibility by:
- Using existing hooks and services
- Preserving existing API contracts
- Maintaining existing error handling patterns
- Supporting existing tournament/stage selection logic

## Future Enhancements

1. **Caching**: Implement role-based caching strategies
2. **Real-time Updates**: Add WebSocket support for real-time team updates
3. **Advanced Filtering**: Enhanced filtering options for different roles
4. **Audit Logging**: Comprehensive audit logging for team operations
5. **Performance**: Optimize data loading and filtering performance

## Dependencies

- `@/hooks/common/use-auth` - Authentication context
- `@/hooks/teams/use-teams-role-access` - Role-based access control
- `@/hooks/teams/use-teams-page-data` - Data management
- `@/utils/teams/team-data-filter` - Data filtering utilities
- `@/components/features/auth/RoleGuard` - Permission-based rendering
- `@/config/permissions` - Permission service integration

## Configuration

No additional configuration is required. The implementation uses existing:
- Permission configurations from `@/config/permissions`
- Role definitions from `@/types/types`
- Authentication setup from `useAuth` hook