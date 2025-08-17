# Requirements Document

## Introduction

This feature aims to dramatically simplify the existing WebSocket subsystem in RMS_FE by consolidating multiple overlapping services, hooks, and complex abstractions into a single, clean, and maintainable WebSocket solution. The current system has grown overly complex with 20+ files, 8+ hooks, cross-tab coordination, vector clocks, and enterprise-level abstractions that are unnecessary for a tournament management system.

The simplified system will maintain all essential functionality while being easier to understand, debug, and maintain.

## Requirements

### Requirement 1

**User Story:** As a developer, I want a single WebSocket hook that handles all use cases, so that I don't need to choose between multiple confusing options.

#### Acceptance Criteria

1. WHEN I need WebSocket functionality THEN I SHALL use only one hook: `useWebSocket()`
2. WHEN I use `useWebSocket()` THEN it SHALL support all current use cases (control match, audience display, tournament, field)
3. WHEN I migrate from existing hooks THEN the API SHALL be backward compatible where possible
4. WHEN I look at the codebase THEN there SHALL be no more than 1 WebSocket hook exported

### Requirement 2

**User Story:** As a developer, I want simple WebSocket connection management with auto-reconnect, so that I don't need to handle connection complexity.

#### Acceptance Criteria

1. WHEN the WebSocket connection is lost THEN the system SHALL automatically attempt to reconnect
2. WHEN reconnecting THEN the system SHALL use exponential backoff (2s, 4s, 8s, 16s, 32s max)
3. WHEN reconnection succeeds THEN the system SHALL automatically rejoin previously joined rooms
4. WHEN connection state changes THEN subscribers SHALL be notified via callback
5. WHEN connection fails after max retries THEN the system SHALL provide clear error information

### Requirement 3

**User Story:** As a developer, I want a basic event emit/subscribe pattern, so that I can send and receive WebSocket events easily.

#### Acceptance Criteria

1. WHEN I call `emit(eventName, data)` THEN the event SHALL be sent to the server
2. WHEN I call `subscribe(eventName, callback)` THEN I SHALL receive events of that type
3. WHEN I unsubscribe THEN I SHALL no longer receive events for that subscription
4. WHEN the component unmounts THEN all subscriptions SHALL be automatically cleaned up
5. WHEN emitting events THEN the system SHALL validate I have permission to emit that event type

### Requirement 4

**User Story:** As a developer, I want room-based scoping for tournaments and fields, so that events are properly filtered to relevant contexts.

#### Acceptance Criteria

1. WHEN I provide `tournamentId` THEN the system SHALL automatically join the tournament room
2. WHEN I provide `fieldId` THEN the system SHALL automatically join the field room  
3. WHEN I provide both `tournamentId` and `fieldId` THEN the system SHALL join both rooms
4. WHEN I change tournament/field context THEN the system SHALL leave old rooms and join new ones
5. WHEN receiving events THEN I SHALL only receive events relevant to my joined rooms

### Requirement 5

**User Story:** As a developer, I want role-based permissions that prevent unauthorized event emissions, so that security is maintained without complexity.

#### Acceptance Criteria

1. WHEN I set `userRole` THEN the system SHALL enforce emission permissions based on that role
2. WHEN I try to emit a restricted event THEN the system SHALL block it and log a warning
3. WHEN my role is ADMIN or HEAD_REFEREE THEN I SHALL be able to emit all events
4. WHEN my role is ALLIANCE_REFEREE THEN I SHALL be able to emit score updates only
5. WHEN my role is lower (TEAM_MEMBER, etc.) THEN I SHALL only be able to receive events

### Requirement 6

**User Story:** As a developer, I want the WebSocket system to be easy to debug, so that I can quickly identify and fix issues.

#### Acceptance Criteria

1. WHEN I enable debug mode THEN I SHALL see clear logs of all WebSocket operations
2. WHEN an error occurs THEN I SHALL receive descriptive error messages with context
3. WHEN I inspect the hook state THEN I SHALL see current connection status, joined rooms, and active subscriptions
4. WHEN debugging THEN I SHALL have access to connection statistics and health information
5. WHEN events are blocked by permissions THEN I SHALL see clear warning messages

### Requirement 7

**User Story:** As a developer, I want to remove all unnecessary complexity from the current system, so that the codebase is maintainable.

#### Acceptance Criteria

1. WHEN the refactor is complete THEN there SHALL be no more than 4 core files for WebSocket functionality
2. WHEN the refactor is complete THEN all cross-tab coordination features SHALL be removed
3. WHEN the refactor is complete THEN vector clocks, atomic operations, and distributed locking SHALL be removed
4. WHEN the refactor is complete THEN memory management and cleanup targets SHALL be simplified
5. WHEN the refactor is complete THEN all legacy hooks SHALL be marked as deprecated with migration guides

### Requirement 8

**User Story:** As a developer, I want backward compatibility during migration, so that existing code continues to work while I migrate.

#### Acceptance Criteria

1. WHEN existing hooks are called THEN they SHALL work but show deprecation warnings
2. WHEN I use legacy hook APIs THEN they SHALL be shimmed to use the new unified hook
3. WHEN migrating THEN I SHALL have clear migration examples for each legacy hook
4. WHEN the migration period ends THEN legacy hooks SHALL be safely removable
5. WHEN using new APIs THEN they SHALL be simpler and more intuitive than legacy APIs

### Requirement 9

**User Story:** As a developer, I want convenience methods for common operations, so that I don't need to remember event names and payload structures.

#### Acceptance Criteria

1. WHEN I need to send score updates THEN I SHALL use `sendScoreUpdate(data)`
2. WHEN I need to send timer updates THEN I SHALL use `sendTimerUpdate(data)`
3. WHEN I need to send match updates THEN I SHALL use `sendMatchUpdate(data)`
4. WHEN I need to control display mode THEN I SHALL use `sendDisplayModeChange(data)`
5. WHEN I need to send announcements THEN I SHALL use `sendAnnouncement(data)`

### Requirement 10

**User Story:** As a system administrator, I want the simplified WebSocket system to maintain all current functionality, so that no features are lost during simplification.

#### Acceptance Criteria

1. WHEN the refactor is complete THEN all current WebSocket events SHALL still be supported
2. WHEN the refactor is complete THEN control match → audience display synchronization SHALL work identically
3. WHEN the refactor is complete THEN role-based permissions SHALL work identically
4. WHEN the refactor is complete THEN room scoping (tournament/field) SHALL work identically
5. WHEN the refactor is complete THEN auto-reconnection SHALL work as well or better than before