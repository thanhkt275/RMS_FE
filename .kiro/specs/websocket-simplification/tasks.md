# Implementation Plan

- [x] 1. Set up new simplified WebSocket structure

  - Create new directory structure for simplified WebSocket system
  - Set up TypeScript definitions and interfaces
  - Create barrel exports for clean imports
  - _Requirements: 1.1, 7.1_

- [x] 2. Implement core WebSocketService class

  - [x] 2.1 Create basic WebSocketService with Socket.IO integration

    - Write WebSocketService class with Socket.IO client connection
    - Implement connect/disconnect methods with proper error handling
    - Add connection state management and status tracking
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 2.2 Add event emit/subscribe functionality

    - Implement emit method with event validation
    - Implement subscribe method with callback management
    - Add automatic subscription cleanup on disconnect
    - Create event subscription tracking and unsubscribe functionality
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 2.3 Implement auto-reconnection with exponential backoff

    - Create ReconnectionManager with exponential backoff strategy
    - Implement automatic room rejoining after reconnection
    - Add connection state notifications and callbacks
    - Handle max retry limits and permanent failure states
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 3. Add room management functionality


  - [x] 3.1 Implement room joining and leaving

    - Add joinRoom method with tournament/field room types
    - Add leaveRoom method with proper cleanup
    - Implement automatic room management based on context
    - Track joined rooms state and provide room status
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.2 Add room-based event filtering

    - Implement room context validation for incoming events
    - Add room scoping to outgoing events
    - Filter events based on joined rooms
    - Handle room context changes and cleanup
    - _Requirements: 4.5_

- [x] 4. Implement role-based permissions system






  - [x] 4.1 Create embedded role management



    - Define UserRole enum and permission matrix
    - Implement setUserRole method with validation
    - Add canEmit method for permission checking
    - Create role-based event emission blocking
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 4.2 Add permission validation and logging


    - Implement permission checking before event emission
    - Add warning logs for blocked emissions
    - Create clear error messages for permission denials
    - Add debug logging for permission checks
    - _Requirements: 6.5_

- [x] 5. Add convenience methods for common operations






  - Create sendScoreUpdate method with proper data validation
  - Create sendTimerUpdate method with timer-specific logic
  - Create sendMatchUpdate method with match context
  - Create sendDisplayModeChange method for audience display
  - Create sendAnnouncement method with announcement formatting
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 6. Implement unified useWebSocket React hook






  - [x] 6.1 Create basic hook structure and state management



    - Implement useWebSocket hook with options interface
    - Add connection state management with React state
    - Implement automatic service initialization and cleanup
    - Add proper useEffect cleanup for subscriptions
    - _Requirements: 1.1, 1.2_

  - [x] 6.2 Add automatic room management based on props



    - Implement automatic tournament room joining based on tournamentId
    - Implement automatic field room joining based on fieldId
    - Add room cleanup when props change
    - Handle room joining/leaving on prop updates
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 6.3 Expose all service methods through hook interface


    - Expose emit, subscribe, and convenience methods
    - Add connection management methods (connect, disconnect)
    - Expose role management and permission checking
    - Add debug information and statistics access
    - _Requirements: 1.3, 6.3_

- [ ] 7. Add comprehensive error handling and debugging



  - [x] 7.1 Implement error types and error handling



    - Define WebSocketError types and error classes
    - Add error handling for connection failures
    - Implement error handling for permission denials
    - Add error handling for room operations
    - _Requirements: 6.2_

  - [x] 7.2 Add debug mode and logging


    - Implement debug mode with detailed logging
    - Add connection status and statistics tracking
    - Create getStats method for debugging information
    - Add clear log messages for all operations
    - _Requirements: 6.1, 6.3, 6.4_

- [x] 8. Create migration layer for backward compatibility






  - [x] 8.1 Create deprecated hook shims



    - Create useWebSocketUnified shim with deprecation warning
    - Create useCentralizedWebSocket shim with deprecation warning
    - Create useControlMatchWebSocket shim with deprecation warning
    - Create useAudienceDisplayWebSocket shim with deprecation warning
    - _Requirements: 8.1, 8.2_



  - [x] 8.2 Add migration guides and documentation
    - Create migration examples for each legacy hook
    - Add deprecation warnings with clear migration paths
    - Document API changes and breaking changes
    - Create migration checklist for developers
    - _Requirements: 8.3, 8.4_

- [ ] 9. Write comprehensive tests

  - [ ] 9.1 Add unit tests for WebSocketService

    - Test connection management and reconnection logic
    - Test event emission and subscription handling
    - Test room management and filtering
    - Test role-based permissions and validation
    - Test error handling and edge cases
    - _Requirements: All requirements_

  - [ ] 9.2 Add unit tests for useWebSocket hook

    - Test hook initialization and cleanup
    - Test automatic room management
    - Test state updates and re-renders
    - Test method exposure and functionality
    - Test error handling and debug features
    - _Requirements: All requirements_

  - [ ] 9.3 Add integration tests for end-to-end functionality
    - Test control match to audience display synchronization
    - Test tournament and field room scoping
    - Test role-based permission enforcement
    - Test connection recovery and room rejoining
    - Test migration compatibility with legacy hooks
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 10. Create documentation and examples

  - [ ] 10.1 Update main WebSocket README

    - Replace complex documentation with simple usage guide
    - Add clear examples for common use cases
    - Document the new unified API
    - Add troubleshooting guide for common issues
    - _Requirements: 6.1, 6.4_

  - [ ] 10.2 Create migration documentation
    - Document migration path from each legacy hook
    - Provide before/after code examples
    - List breaking changes and workarounds
    - Create migration timeline and deprecation schedule
    - _Requirements: 8.3, 8.4_

- [ ] 11. Deploy and validate new system



  - [x] 11.1 Deploy new system alongside existing system



    - Add new WebSocket system to build configuration
    - Ensure no conflicts with existing system
    - Add feature flag for gradual rollout
    - Monitor bundle size and performance impact
    - _Requirements: 7.1, 7.2, 7.3_


  - [ ] 11.2 Validate functionality and performance

    - Test all existing WebSocket functionality works identically
    - Validate performance improvements (bundle size, memory usage)
    - Test backward compatibility with existing components
    - Monitor for any regressions or issues
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 12. Clean up legacy system





  - [x] 12.1 Mark legacy files as deprecated



    - Add deprecation comments to all legacy files
    - Update imports to show deprecation warnings
    - Add migration guides in legacy file headers
    - Update build system to warn about deprecated usage
    - _Requirements: 7.5_



  - [x] 12.2 Remove legacy system after migration period

    - Remove all legacy WebSocket services and hooks
    - Clean up unused dependencies and imports
    - Update file structure and build configuration
    - Validate no remaining references to legacy system
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
