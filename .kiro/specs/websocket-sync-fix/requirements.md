# Requirements Document

## Introduction

This feature addresses critical WebSocket synchronization issues between the control-match and audience-display pages. The current implementation suffers from dual WebSocket services, timer drift, score update conflicts, and inconsistent connection management. This fix will establish a unified, reliable real-time communication system that ensures perfect synchronization of timer, match information, and scores across all connected clients.

## Requirements

### Requirement 1

**User Story:** As a match controller, I want timer updates to be perfectly synchronized across all audience displays, so that all viewers see the exact same countdown without drift or delays.

#### Acceptance Criteria

1. WHEN the timer is started on the control page THEN all audience displays SHALL show the timer starting within 100ms
2. WHEN the timer is running THEN all displays SHALL show the same time within 1 second accuracy
3. WHEN the timer is paused or reset THEN all displays SHALL immediately reflect the change
4. WHEN network connectivity is temporarily lost THEN the timer SHALL continue running locally and resync when connection is restored

### Requirement 2

**User Story:** As a match controller, I want score updates to be instantly reflected on audience displays, so that spectators see real-time scoring without conflicts or delays.

#### Acceptance Criteria

1. WHEN scores are updated on the control page THEN audience displays SHALL show the updated scores within 200ms
2. WHEN multiple score updates occur rapidly THEN the system SHALL debounce updates to prevent overwhelming the network
3. WHEN real-time updates fail THEN the system SHALL NOT fall back to database polling to avoid conflicts
4. WHEN scores are persisted to database THEN real-time updates SHALL take priority over database data

### Requirement 3

**User Story:** As a match controller, I want match information updates to be synchronized across displays, so that team names, match status, and periods are consistent everywhere.

#### Acceptance Criteria

1. WHEN a match is selected on the control page THEN audience displays SHALL show the correct match within 100ms
2. WHEN match status changes (pending/in-progress/completed) THEN all displays SHALL reflect the new status immediately
3. WHEN match period changes (auto/teleop/endgame) THEN all displays SHALL show the correct period
4. WHEN field-specific matches are selected THEN only displays for that field SHALL be updated

### Requirement 4

**User Story:** As a system administrator, I want a unified WebSocket service that eliminates dual connections and race conditions, so that the system is reliable and maintainable.

#### Acceptance Criteria

1. WHEN the application starts THEN only one WebSocket connection SHALL be established per client
2. WHEN events are emitted THEN they SHALL be processed by a single event handler to prevent duplicates
3. WHEN connection is lost THEN the system SHALL attempt reconnection with exponential backoff
4. WHEN reconnection succeeds THEN the system SHALL resync all current state without data loss

### Requirement 5

**User Story:** As a match controller, I want proper field and tournament filtering, so that updates only affect the intended displays and don't interfere with other concurrent matches.

#### Acceptance Criteria

1. WHEN updates are sent for a specific field THEN only displays monitoring that field SHALL receive the updates
2. WHEN tournament-wide updates are sent THEN all displays for that tournament SHALL receive the updates
3. WHEN "all tournaments" mode is active THEN displays SHALL receive updates from any tournament
4. WHEN field filtering is applied THEN the system SHALL prevent cross-field event leakage

### Requirement 6

**User Story:** As a match controller, I want robust error handling and connection recovery, so that temporary network issues don't disrupt the match experience.

#### Acceptance Criteria

1. WHEN WebSocket connection fails THEN the system SHALL attempt reconnection up to 5 times with exponential backoff
2. WHEN reconnection attempts are exhausted THEN the system SHALL display a clear error message
3. WHEN connection is restored THEN the system SHALL automatically resync all current state
4. WHEN errors occur during event processing THEN they SHALL be logged without crashing the application

### Requirement 7

**User Story:** As a developer, I want proper debouncing and rate limiting for WebSocket events, so that the system performs efficiently under high-frequency updates.

#### Acceptance Criteria

1. WHEN score updates occur more frequently than 10 times per second THEN the system SHALL debounce to maximum 10 updates per second
2. WHEN timer updates are sent THEN they SHALL be throttled to once per second maximum
3. WHEN multiple identical events are queued THEN the system SHALL deduplicate them
4. WHEN debouncing is active THEN the latest data SHALL always be preserved

### Requirement 8

**User Story:** As a head referee or admin, I want full access to all control-match functions, while alliance referees should only access the scoring panel, so that responsibilities are properly distributed and controlled.

#### Acceptance Criteria

1. WHEN a user with HEAD_REFEREE or ADMIN role accesses control-match THEN they SHALL have access to all functions including timer, match selection, and scoring
2. WHEN a user with ALLIANCE_REFEREE role accesses control-match THEN they SHALL only have access to the scoring panel
3. WHEN an alliance referee attempts to access timer or match controls THEN the system SHALL display an access denied message
4. WHEN role permissions change THEN the UI SHALL immediately reflect the new access level

### Requirement 9

**User Story:** As a tournament organizer, I want multiple referees (2-4 people) to be able to control the same match simultaneously, so that scoring and timing can be managed collaboratively without conflicts.

#### Acceptance Criteria

1. WHEN multiple users control the same match THEN all updates SHALL be synchronized across all control interfaces
2. WHEN one user updates scores THEN other users SHALL see the changes within 200ms
3. WHEN multiple users update the same score simultaneously THEN the system SHALL use the most recent timestamp to resolve conflicts
4. WHEN a user joins an active control session THEN they SHALL receive the current state immediately
5. WHEN users have different role permissions THEN each SHALL only see controls appropriate to their role