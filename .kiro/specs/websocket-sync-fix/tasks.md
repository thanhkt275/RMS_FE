# Implementation Plan

- [x] 1. Create unified WebSocket service foundation





  - Replace dual WebSocket services with single unified service
  - Implement connection manager with robust error handling
  - Create event manager with centralized event handling
  - _Requirements: 1.1, 4.1, 4.2, 6.1_

- [x] 1.1 Implement ConnectionManager class


  - Write ConnectionManager with single socket connection
  - Add exponential backoff reconnection logic (max 5 attempts)
  - Implement connection state tracking and status callbacks
  - Create automatic state resync on reconnection
  - Write unit tests for connection lifecycle and error scenarios
  - _Requirements: 4.1, 4.3, 6.1, 6.2_


- [x] 1.2 Implement EventManager class

  - Create centralized event handling with master handlers
  - Add event deduplication and filtering logic
  - Implement field/tournament filtering for events
  - Add error boundary protection for event callbacks
  - Write unit tests for event handling and filtering
  - _Requirements: 4.2, 5.1, 5.2, 5.3, 6.4_

- [x] 1.3 Create unified WebSocket service interface


  - Design IUnifiedWebSocketService interface with all required methods
  - Implement main WebSocketService class using composition pattern
  - Add connection management delegation to ConnectionManager
  - Add event management delegation to EventManager
  - Write integration tests for service composition
  - _Requirements: 4.1, 4.2_

- [x] 2. Implement debouncing and rate limiting system



  - Create DebounceManager for high-frequency event control
  - Add rate limiting for score updates (max 10/second) and timer updates (max 1/second)
  - Implement event deduplication with latest data preservation
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 2.1 Create DebounceManager class


  - Implement debounce functionality with configurable delays
  - Add rate limiting with sliding window algorithm
  - Create event deduplication based on event type and data hash
  - Ensure latest data is always preserved during debouncing
  - Write unit tests for debouncing accuracy and rate limiting
  - _Requirements: 7.1, 7.2, 7.3, 7.4_




- [x] 2.2 Integrate debouncing into WebSocket service
  - Add DebounceManager to unified WebSocket service
  - Configure specific debounce rules for timer and score events
  - Implement automatic debouncing in emit method
  - Add configuration options for debounce timing
  - Write integration tests for debounced event emission
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 3. Implement role-based access control system





  - Create RoleManager for user permission validation
  - Add role-based event filtering and UI access control
  - Implement dynamic permission updates
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 3.1 Create RoleManager class


  - Define role permissions mapping (ADMIN/HEAD_REFEREE vs ALLIANCE_REFEREE)
  - Implement role validation for WebSocket events
  - Add UI feature access control methods
  - Create dynamic role update functionality
  - Write unit tests for role validation and access control
  - _Requirements: 8.1, 8.2, 8.3, 8.4_



- [x] 3.2 Integrate role management into control-match page
  - Add role-based UI rendering for control components
  - Restrict timer and match controls for ALLIANCE_REFEREE role
  - Show only scoring panel for alliance referees
  - Display access denied messages for restricted features
  - Write component tests for role-based UI behavior
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 4. Implement multi-user collaborative state management




  - Create StateSynchronizer for handling multiple concurrent users
  - Add conflict resolution using timestamp-based logic
  - Implement real-time state synchronization across all control interfaces
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 4.1 Create StateSynchronizer class


  - Implement state synchronization with conflict resolution
  - Add timestamp-based conflict resolution for simultaneous updates
  - Create state history tracking for debugging
  - Implement state recovery and snapshot functionality
  - Write unit tests for conflict resolution and state consistency
  - _Requirements: 9.2, 9.3, 9.4_



- [x] 4.2 Add collaborative session management





  - Implement joinCollaborativeSession and leaveCollaborativeSession methods
  - Add active user tracking for each match session
  - Create immediate state sync for new session joiners
  - Add session cleanup when users disconnect
  - Write integration tests for multi-user session management
  - _Requirements: 9.1, 9.4, 9.5_

- [x] 5. Fix timer synchronization issues





  - Replace existing timer control with unified WebSocket timer
  - Implement proper timer sync with drift correction
  - Add local timer continuation during connection loss
  - When switch to different matches, the timer must follow the new match
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 5.1 Update useTimerControl hook


  - Replace dual WebSocket usage with unified service
  - Implement timer drift correction using server timestamps
  - Add local timer continuation during connection loss
  - Create timer state resync on reconnection
  - Write unit tests for timer accuracy and sync behavior
  - _Requirements: 1.1, 1.2, 1.3, 1.4_



- [x] 5.2 Update audience display timer handling
  - Replace existing timer subscription with unified service
  - Implement smooth timer updates without jumps
  - Add connection status indicators for timer reliability
  - Create fallback timer display during disconnection
  - Write integration tests for timer sync across pages
  - _Requirements: 1.1, 1.2, 1.3_


- [x] 6. Fix score update synchronization





  - Replace existing score update system with unified service
  - Eliminate conflicts between real-time and database updates
  - Implement proper score debouncing
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 6.1 Update useScoringControl hook


  - Replace existing WebSocket usage with unified service
  - Implement debounced score updates with 200ms max latency
  - Remove database fallback conflicts with real-time updates
  - Add score update queuing during connection loss
  - Write unit tests for score update reliability and debouncing
  - _Requirements: 2.1, 2.2, 2.3, 2.4_



- [ ] 6.2 Update audience display score handling





  - Replace existing score subscription with unified service
  - Prioritize real-time updates over database data
  - Add score update animations for better user experience
  - Create score validation and error handling
  - Write integration tests for score sync across displays
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 7. Fix match information synchronization





  - Update match update system to use unified service
  - Implement proper field-specific filtering
  - Add match status and period synchronization
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 7.1 Update match control components



  - Replace existing match update logic with unified service
  - Implement field-specific match filtering
  - Add match status synchronization (pending/in-progress/completed)
  - Create match period sync (auto/teleop/endgame)
  - Write unit tests for match state consistency
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 7.2 Update audience display match handling


  - Replace existing match subscription with unified service
  - Implement proper field filtering for match updates
  - Add match information display updates
  - Create match transition animations
  - Write integration tests for match sync across field displays
  - _Requirements: 3.1, 3.4_

- [-] 8. Remove legacy WebSocket service



  - Clean up old WebSocket service files
  - Update all imports to use unified service
  - Remove duplicate event handlers and connections
  - _Requirements: 4.1, 4.2_

- [ ] 8.1 Remove old WebSocket service files


  - Delete or deprecate old WebSocket service implementation
  - Remove duplicate connection management code
  - Clean up unused event handler files
  - Update all import statements to use unified service
  - Write migration tests to ensure no functionality is lost
  - _Requirements: 4.1, 4.2_

- [ ] 8.2 Update all WebSocket usage across application
  - Replace all useWebSocket hook usage with unified service
  - Update control-match page to use new service
  - Update audience-display page to use new service
  - Remove any remaining dual service references
  - Write comprehensive integration tests for all updated components
  - _Requirements: 4.1, 4.2_

- [ ] 9. Add comprehensive error handling and monitoring
  - Implement robust error boundaries for WebSocket operations
  - Add connection status monitoring and user notifications
  - Create error recovery mechanisms
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 9.1 Create WebSocketErrorBoundary class
  - Implement error handling for all WebSocket operations
  - Add error logging and user notification system
  - Create automatic error recovery mechanisms
  - Add error categorization and appropriate responses
  - Write unit tests for error handling scenarios
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 9.2 Add connection status monitoring
  - Create connection status indicators in UI
  - Add user notifications for connection issues
  - Implement graceful degradation during outages
  - Create connection health monitoring
  - Write integration tests for error scenarios
  - _Requirements: 6.2, 6.3_

- [ ] 10. Write comprehensive tests and documentation
  - Create unit tests for all new components
  - Add integration tests for cross-page synchronization
  - Write end-to-end tests for complete workflows
  - Create performance benchmarks and monitoring
  - _Requirements: All requirements validation_

- [ ] 10.1 Write unit tests for all components
  - Test ConnectionManager connection lifecycle and error handling
  - Test EventManager event handling and filtering
  - Test DebounceManager rate limiting and debouncing
  - Test RoleManager permission validation
  - Test StateSynchronizer conflict resolution
  - Achieve minimum 90% code coverage
  - _Requirements: All requirements validation_

- [ ] 10.2 Write integration and end-to-end tests
  - Test timer synchronization between control and audience pages
  - Test score update synchronization across multiple clients
  - Test match information sync with field filtering
  - Test multi-user collaborative scenarios
  - Test role-based access control in real scenarios
  - Create performance benchmarks for latency and throughput
  - _Requirements: All requirements validation_