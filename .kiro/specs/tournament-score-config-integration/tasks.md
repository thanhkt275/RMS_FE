# Implementation Plan

- [ ] 1. Create Score Config Resolution Service
  - Implement service to resolve score-config for matches via tournament relationship
  - Add caching mechanism for frequently accessed score-configs
  - Create fallback logic for matches without assigned score-configs
  - Write unit tests for resolution logic and edge cases
  - _Requirements: 1.1, 1.2, 4.1, 4.2_

- [ ] 2. Extend Match Scores Controller with Score Config Endpoints
  - Add GET endpoint `/match-scores/:matchId/score-config` to retrieve match score configuration
  - Add GET endpoint `/match-scores/:matchId/score-panel-config` for frontend UI configuration
  - Add POST endpoint `/match-scores/:matchId/:allianceId/calculate-preview` for score preview
  - Implement error handling for missing or invalid score configurations
  - Write integration tests for new endpoints
  - _Requirements: 1.1, 2.1, 3.1_

- [ ] 3. Create Score Config Preview Service
  - Implement service to generate UI preview data from score-config models
  - Add validation logic for score-config completeness and correctness
  - Create sample calculation functionality for testing score-configs
  - Add method to detect validation errors and provide helpful messages
  - Create endpoint `/score-config/:id/preview` for real-time preview data
  - Write unit tests for preview generation and validation
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 4. Enhance Score Calculation Service for Tournament Integration
  - Modify existing `calculateMatchScoreWithSections` to automatically resolve tournament score-config
  - Add backward compatibility layer for tournaments without assigned score-configs
  - Implement error handling for invalid or missing score configurations
  - Update score persistence to work with tournament-specific configurations
  - Write tests for tournament score-config integration scenarios
  - _Requirements: 1.1, 1.3, 4.1, 4.3_

- [ ] 5. Create Dynamic Score Panel Frontend Component
  - Build React component that fetches and renders score-config for a specific match
  - Implement automatic section organization based on display order
  - Add real-time score calculation using tournament formula
  - Create responsive layout that adapts to different score-config structures
  - Write component tests for various score-config scenarios
  - _Requirements: 2.1, 2.2, 3.1, 3.2_

- [ ] 6. Implement Score Section UI Components
  - Create reusable ScoreSection component for rendering individual sections
  - Build ScoreElement component for different element types (counter, boolean, timer)
  - Implement BonusCondition and PenaltyCondition display components
  - Add visual indicators for active bonuses and penalties
  - Write component tests for all section UI elements
  - _Requirements: 2.2, 2.3, 2.4_

- [ ] 7. Add Real-time Score Calculation to Frontend
  - Implement client-side score calculation using tournament formulas
  - Add live preview of section scores and total scores
  - Create visual feedback for bonus/penalty condition triggers
  - Implement debounced calculation to optimize performance
  - Write tests for calculation accuracy and performance
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 8. Create Score Config Preview Component for Admin Panel
  - Build preview component that shows how score-config will appear in control panel
  - Add interactive mode for testing score calculations with sample data
  - Implement validation error display with helpful suggestions
  - Create real-time preview that updates as admin modifies score-config elements
  - Add preview button/tab to existing score-config creation/edit page
  - Write tests for preview functionality and validation display
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 8.1. Add Preview Functionality to Score Config Page
  - Add "Preview Scoring Panel" button/tab to existing score-config UI
  - Implement live preview that updates when elements, bonuses, or penalties are modified
  - Create side-by-side view showing config editor and scoring panel preview
  - Add sample score input functionality to test calculations in preview
  - Write tests for preview integration with existing score-config page
  - _Requirements: 5.1, 5.4_

- [ ] 8.2. Prepare Foundation for Drag-and-Drop Preview (Future Enhancement)
  - Design component structure to support future drag-and-drop functionality
  - Create reusable preview components that can be easily extended
  - Implement preview state management that can handle element reordering
  - Add placeholder hooks for future drag-and-drop event handling
  - Document architecture for future drag-and-drop implementation
  - _Requirements: 5.1, 5.4_

- [ ] 9. Integrate Dynamic Score Panel with Control Match Page
  - Replace existing static score panel with dynamic score panel component
  - Add loading states and error handling for score-config fetching
  - Implement fallback to legacy scoring when no score-config is available
  - Ensure smooth user experience during score-config loading
  - Write integration tests for control match page functionality
  - _Requirements: 2.1, 2.5, 4.1, 4.2_

- [ ] 10. Add Score Config Management to Tournament Admin Interface
  - Create interface for viewing assigned score-config in tournament details
  - Add preview functionality to tournament score-config assignment
  - Implement validation warnings when assigning incompatible score-configs
  - Create quick access to score-config preview from tournament management
  - Add "Preview in Scoring Panel" link from tournament score-config assignment
  - Write tests for admin interface score-config management
  - _Requirements: 5.4, 1.4_

- [ ] 11. Implement Comprehensive Error Handling and Fallbacks
  - Add graceful degradation when score-config is unavailable or invalid
  - Implement user-friendly error messages for common configuration issues
  - Create logging for score-config resolution failures and performance issues
  - Add retry mechanisms for transient score-config loading failures
  - Write tests for all error scenarios and fallback behaviors
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 12. Create API Hooks for Frontend Score Config Integration
  - Build React hooks for fetching match score configurations
  - Create hooks for real-time score calculation and preview
  - Implement caching and error handling in API hooks
  - Add hooks for score-config validation and preview functionality
  - Write tests for API hooks and their error handling
  - _Requirements: 2.1, 3.1, 5.1_

- [ ] 13. Add Backward Compatibility Tests and Documentation
  - Write comprehensive tests ensuring existing match scoring continues to work
  - Create tests for tournaments without assigned score-configs
  - Implement migration tests for existing tournament data
  - Document API changes and new endpoints for frontend integration
  - Write user documentation for new score panel functionality
  - _Requirements: 4.1, 4.2, 4.3, 4.4_