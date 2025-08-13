# Role-Based Team Management System

This directory contains the implementation of role-based access control (RBAC) for team management functionality, leveraging existing RBAC middleware patterns and the PermissionService infrastructure.

## Overview

The role-based team management system provides different levels of access and functionality based on user roles:

- **ADMIN**: Full CRUD operations, import/export, sensitive data access
- **HEAD_REFEREE**: Read-only access to all teams with sensitive data
- **ALLIANCE_REFEREE**: Read-only access to all teams with sensitive data
- **TEAM_LEADER**: Can create teams and manage own team
- **TEAM_MEMBER**: Can view own team details
- **COMMON**: Limited public information access

## Architecture

### Core Components

1. **TeamDataFilterService** (`team-data-filter.ts`)
   - Central service for role-based data filtering
   - Uses existing PermissionService for consistent access control
   - Converts raw team data to role-appropriate DTOs

2. **Role-Specific DTOs** (`../types/team-dto.types.ts`)
   - Type-safe response structures for different roles
   - Ensures sensitive data is only included for authorized users
   - Supports backward compatibility with existing interfaces

3. **Enhanced Team Service** (`../services/team.service.ts`)
   - Extends basic team service with role-based filtering
   - Integrates with existing API client patterns
   - Provides client-side filtering as additional security layer

4. **Role-Based Hooks** (`../hooks/teams/`)
   - `useTeamsRoleAccess`: Core access control logic
   - `useRoleBasedTeamManagement`: Comprehensive team management
   - `useTeamManagement`: Enhanced legacy hook with RBAC

## Permission Matrix

| Role | View All | View Own | Create | Edit Any | Edit Own | Delete | Import/Export |
|------|----------|----------|--------|----------|----------|--------|---------------|
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| HEAD_REFEREE | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| ALLIANCE_REFEREE | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| TEAM_LEADER | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| TEAM_MEMBER | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| COMMON | Limited | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Data Filtering Levels

### ADMIN (AdminTeamDto)
```typescript
{
  id: string;
  name: string;
  teamNumber: string;
  organization: string;
  description: string;
  tournamentId: string;
  userId: string;
  referralSource: string;
  members: FilteredTeamMemberDto[]; // Full member details
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  auditLog?: AuditEntry[];
  statistics?: TeamStatistics;
}
```

### REFEREE (RefereeTeamDto)
```typescript
{
  id: string;
  name: string;
  teamNumber: string;
  organization: string;
  description: string;
  tournamentId: string;
  members: FilteredTeamMemberDto[]; // Full member details
  createdAt: Date;
  // Excludes: userId, createdBy, auditLog
}
```

### TEAM_MEMBER (OwnTeamDto - for own team only)
```typescript
{
  id: string;
  name: string;
  teamNumber: string;
  organization: string;
  description: string;
  tournamentId: string;
  referralSource: string;
  members: FilteredTeamMemberDto[]; // Full member details
  createdAt: Date;
  updatedAt: Date;
  isUserTeam: true;
}
```

### COMMON (PublicTeamDto)
```typescript
{
  id: string;
  name: string;
  organization: string;
  memberCount: number;
  // Minimal public information only
}
```

## Usage Examples

### Basic Team Fetching with Role-Based Filtering

```typescript
import { useTeamsWithRoleData } from '@/hooks/teams/use-teams';

function TeamsPage() {
  const { data: teamsData, isLoading } = useTeamsWithRoleData('tournament-1');
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>Teams ({teamsData?.filteredCount} of {teamsData?.totalCount})</h1>
      {teamsData?.permissions.canCreate && (
        <button>Create Team</button>
      )}
      {teamsData?.permissions.canImport && (
        <button>Import Teams</button>
      )}
      {teamsData?.teams.map(team => (
        <TeamCard key={team.id} team={team} />
      ))}
    </div>
  );
}
```

### Comprehensive Team Management

```typescript
import { useRoleBasedTeamManagement } from '@/hooks/teams/use-role-based-team-management';

function TeamManagementPage() {
  const {
    teams,
    permissions,
    createTeam,
    updateTeam,
    deleteTeam,
    importTeams,
    exportTeams,
    canEditTeam,
    canDeleteTeam,
    isCreating,
    isDeleting
  } = useRoleBasedTeamManagement('tournament-1');

  const handleCreateTeam = async (teamData) => {
    if (!permissions.canCreate) {
      toast.error('Access denied: Cannot create teams');
      return;
    }
    
    try {
      await createTeam(teamData);
    } catch (error) {
      console.error('Failed to create team:', error);
    }
  };

  return (
    <div>
      {teams.map(team => (
        <div key={team.id}>
          <h3>{team.name}</h3>
          {canEditTeam(team) && (
            <button onClick={() => handleEdit(team)}>Edit</button>
          )}
          {canDeleteTeam(team) && (
            <button onClick={() => deleteTeam(team.id)} disabled={isDeleting}>
              Delete
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Role-Based Access Checks

```typescript
import { useTeamsRoleAccess } from '@/hooks/teams/use-teams-role-access';

function TeamActions({ team }) {
  const {
    canEditTeam,
    canDeleteTeam,
    canViewTeamDetails,
    getAccessDeniedMessage,
    getFilteredTeamData
  } = useTeamsRoleAccess();

  const filteredTeam = getFilteredTeamData(team);
  
  return (
    <div>
      {canViewTeamDetails(team) ? (
        <TeamDetailsView team={filteredTeam} />
      ) : (
        <TeamPublicView team={filteredTeam} />
      )}
      
      <div className="actions">
        {canEditTeam(team) ? (
          <button>Edit Team</button>
        ) : (
          <button 
            disabled 
            title={getAccessDeniedMessage('edit')}
          >
            Edit Team
          </button>
        )}
        
        {canDeleteTeam(team) && (
          <button className="danger">Delete Team</button>
        )}
      </div>
    </div>
  );
}
```

## Security Considerations

### Client-Side vs Server-Side Filtering

This implementation provides **client-side filtering as an additional security layer**. The primary security enforcement should always happen on the server side:

1. **Server-Side Security** (Primary)
   - Backend API endpoints must validate user roles
   - Database queries should filter data based on user permissions
   - Sensitive operations require server-side authorization

2. **Client-Side Security** (Additional Layer)
   - Improves user experience by hiding unauthorized UI elements
   - Provides immediate feedback without server round-trips
   - Prevents accidental attempts to perform unauthorized actions

### Best Practices

1. **Always validate permissions on both client and server**
2. **Use TypeScript interfaces to ensure type safety**
3. **Leverage existing PermissionService for consistency**
4. **Provide clear error messages for access denied scenarios**
5. **Log security events for audit purposes**

## Integration with Existing RBAC System

This implementation seamlessly integrates with the existing RBAC infrastructure:

- **PermissionService**: Used for all permission checks
- **PERMISSIONS.TEAM_MANAGEMENT**: Leverages existing permission definitions
- **UserRole enum**: Uses existing role definitions
- **useAuth hook**: Integrates with existing authentication system
- **API client**: Uses existing request/response patterns

## Testing

Comprehensive test coverage is provided for all role-based functionality:

- **Unit tests**: Individual component and service testing
- **Integration tests**: End-to-end role-based workflows
- **Permission tests**: Verification of access control logic
- **Error handling tests**: Proper handling of access denied scenarios

Run tests with:
```bash
npm test src/hooks/teams/__tests__/
npm test src/utils/teams/__tests__/
```

## Migration Guide

### From Legacy Team Management

The new system maintains backward compatibility with existing team management code:

```typescript
// Legacy usage (still works)
const { teams } = useTeams('tournament-1');

// Enhanced usage (recommended)
const { teams, permissions } = useTeamsWithRoleData('tournament-1');
```

### Updating Components

1. **Replace direct team data access with filtered data**
2. **Add permission checks before rendering action buttons**
3. **Use role-appropriate DTOs instead of raw team objects**
4. **Implement proper error handling for access denied scenarios**

## Future Enhancements

1. **Real-time permission updates**: Handle role changes during active sessions
2. **Audit logging**: Track all team management operations
3. **Advanced filtering**: Support for custom permission rules
4. **Bulk operations**: Role-based bulk team management
5. **API caching**: Optimize performance with role-aware caching