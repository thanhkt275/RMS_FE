# Implementation Plan

- [ ] 1. Extend existing RBAC system for teams functionality





  - Add team-specific permissions to the existing `PERMISSIONS.TEAM_MANAGEMENT` configuration
  - Create `useTeamsRoleAccess` hook that leverages existing `PermissionService` for team operations
  - Implement team data filtering utilities using existing permission patterns
  - _Requirements: 4.1, 4.3, 5.1_

- [x] 2. Update teams controller with existing RBAC middleware






  - Apply existing role-based validation decorators to teams controller endpoints
  - Create `TeamDataFilterService` that uses existing `PermissionService` for data filtering
  - Implement role-specific response DTOs leveraging existing permission patterns
  - Update teams service to filter data based on user role and ownership
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 3. Create role-specific team view components using existing patterns






  - Implement `AdminTeamsView` component with full CRUD operations using existing permission checks
  - Create `RefTeamsView` component with read-only access leveraging existing role-based access patterns
  - Build `CommonTeamsView` component using existing ownership-based permission patterns
  - Integrate components with existing `useAuth` and `useRoleBasedAccess` hooks
  - _Requirements: 1.1-1.7, 2.1-2.5, 3.1-3.6_


- [x] 4. Implement team data filtering using existing permission service









  - Extend existing `TeamColumnConfig` to use `PermissionService` for column visibility
  - Implement `filterTeamsForRole` function using existing `PERMISSIONS.TEAM_MANAGEMENT` rules
  - Add `filterTeamDetailsForRole` function leveraging existing ownership-based permissions
  - Create helper functions that integrate with existing auth context for team ownership
  - _Requirements: 2.2, 2.3, 3.2, 3.3_

- [x] 5. Refactor teams page to use role-based rendering






  - Modify existing teams page to conditionally render components based on existing role detection
  - Integrate with existing `useAuth` hook for role detection and user context
  - Add loading states and error handling using existing error handling patterns
  - Maintain backward compatibility with existing teams hooks and functionality
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6. Add error handling using existing RBAC error patterns







  - Extend existing `rbacLogger` for team-specific access denied events
  - Add user-friendly error messages using existing permission error patterns
  - Integrate with existing loading states and error handling infrastructure
  - Add tooltips using existing `getAccessDeniedMessage` patterns from role-based access hook
  - _Requirements: 5.5, 4.5_

- [ ] 7. Integrate role-based functionality with existing teams infrastructure

  - Update existing `useTeams` and `useTeamManagement` hooks to respect permission-based filtering
  - Modify team management operations to use existing `PermissionService.hasPermission` checks
  - Ensure import/export functionality uses existing `PERMISSIONS.TEAM_MANAGEMENT` rules
  - Update leaderboard table to use permission-based column configurations
  - Write integration tests leveraging existing teams functionality test suite
  - _Requirements: 1.1-1.7, 2.1-2.5, 3.1-3.6_

- [ ] 8. Add comprehensive testing using existing RBAC test infrastructure
  - Write end-to-end tests using existing role-based testing patterns and utilities
  - Create test scenarios leveraging existing permission service test helpers
  - Add tests for unauthorized access using existing RBAC security test patterns
  - Implement tests for data filtering using existing permission-based test cases
  - Write performance tests following existing RBAC performance testing patterns
  - _Requirements: 4.1, 4.2, 4.4, 5.1-5.5_
