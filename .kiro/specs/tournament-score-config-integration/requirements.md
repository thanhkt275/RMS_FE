# Requirements Document

## Introduction

This feature implements the integration of score-config profiles with tournament matches and the control-match page. Currently, administrators can create score-config profiles and assign them to tournaments, but the actual match scoring and control panel don't utilize these configurations. This feature will ensure that all matches in tournaments use their assigned score-config and that the score panel in the control-match page dynamically adapts to display the appropriate scoring elements based on the tournament's score-config.

## Requirements

### Requirement 1

**User Story:** As a tournament administrator, I want all matches in my tournament to automatically use the assigned score-config profile, so that scoring is consistent and follows the tournament's specific rules.

#### Acceptance Criteria

1. WHEN a match is being scored THEN the system SHALL retrieve the score-config assigned to the match's tournament
2. WHEN no score-config is assigned to a tournament THEN the system SHALL use a default score-config or return an appropriate error
3. WHEN calculating match scores THEN the system SHALL use the tournament's assigned score-config elements, sections, and formulas
4. WHEN a tournament's score-config is updated THEN all subsequent match scoring SHALL reflect the updated configuration

### Requirement 2

**User Story:** As a match referee, I want the score panel in the control-match page to show the scoring elements specific to the tournament's score-config, so that I can input scores using the correct scoring criteria.

#### Acceptance Criteria

1. WHEN accessing the control-match page for a specific match THEN the system SHALL display scoring elements from the match's tournament score-config
2. WHEN the score-config has multiple sections (auto, teleop, endgame, etc.) THEN the score panel SHALL organize elements by their respective sections
3. WHEN the score-config includes bonus conditions THEN the score panel SHALL display bonus scoring options
4. WHEN the score-config includes penalty conditions THEN the score panel SHALL display penalty scoring options
5. WHEN submitting scores THEN the system SHALL validate inputs against the score-config's element definitions

### Requirement 3

**User Story:** As a match referee, I want to see real-time score calculations based on the tournament's score-config formula, so that I can verify the accuracy of the scoring before finalizing.

#### Acceptance Criteria

1. WHEN entering element scores THEN the system SHALL calculate section scores in real-time using the score-config's section formulas
2. WHEN all section scores are calculated THEN the system SHALL calculate the total match score using the tournament's overall formula
3. WHEN bonus or penalty conditions are met THEN the system SHALL automatically apply the appropriate score adjustments
4. WHEN the calculated score changes THEN the display SHALL update immediately to reflect the new totals

### Requirement 4

**User Story:** As a system administrator, I want the score submission process to be backward compatible with existing match scoring, so that tournaments without assigned score-configs continue to function normally.

#### Acceptance Criteria

1. WHEN a tournament has no assigned score-config THEN the system SHALL fall back to the legacy scoring method
2. WHEN using legacy scoring THEN existing match score APIs SHALL continue to function without modification
3. WHEN migrating from legacy to score-config scoring THEN existing match data SHALL remain accessible
4. WHEN switching between scoring methods THEN the system SHALL maintain data integrity

### Requirement 5

**User Story:** As a tournament administrator, I want to be able to preview how the score panel will look with my score-config, so that I can verify the configuration before the tournament begins.

#### Acceptance Criteria

1. WHEN viewing a score-config in the admin panel THEN the system SHALL provide a preview of how the control-match score panel will appear
2. WHEN the score-config has validation errors THEN the preview SHALL highlight the issues clearly
3. WHEN testing the score-config THEN the system SHALL allow entering sample scores to verify calculations
4. WHEN the preview is satisfactory THEN the administrator SHALL be able to assign the score-config to tournaments with confidence