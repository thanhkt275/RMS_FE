# Enhanced Score Configuration with Sections and Formulas

The score configuration system has been enhanced to support **sections** and **custom formulas** for calculating total scores. This provides much more flexibility for complex scoring scenarios like games with multiple periods.

## Overview

### New Features

1. **Score Sections**: Group related score elements, bonuses, and penalties into logical sections (e.g., "Auto", "Teleop", "Endgame")
2. **Custom Formulas**: Define mathematical expressions to calculate the total score from section scores
3. **Backward Compatibility**: Still supports legacy direct elements/bonuses/penalties

### Example Use Case: Robotics Competition

A robotics competition has three periods:
- **Autonomous (15 seconds)**: Robots operate independently, worth 1.5x points
- **Teleoperated (2:15)**: Human drivers control robots, normal scoring
- **Endgame (30 seconds)**: Special actions at end of match, worth 2x points

## Frontend Interface

### 1. Creating a Sectioned Configuration

When creating a new score configuration, you can now:

1. **Add Sections**: Click "Add Score Section" to create sections like "Auto", "Teleop", "Endgame"
2. **Configure Each Section**: 
   - Give each section a name and code (e.g., name: "Autonomous Period", code: "auto")
   - Add score elements specific to that section
   - Add section-specific bonuses and penalties
3. **Define Formula**: Use the formula editor to specify how section scores combine

### 2. Formula Examples

```javascript
// Simple addition (default behavior if no formula)
"auto + teleop + endgame"

// Weighted scoring with sections
"auto * 1.5 + teleop + endgame * 2"

// Including bonus variables
"auto + teleop + bonus_mobility"
"(auto + teleop) * bonus_multiplier"

// Including penalty variables (usually add opponent points)
"auto * 1.5 + teleop + penalty_foul"

// Complex formulas with all variable types
"auto * 2 + teleop + bonus_climb - penalty_major * 0.5"
```

### 3. Section Structure

Each section contains:
- **Basic Info**: Name, code, description, display order
- **Score Elements**: Points-based scoring items

**Note**: Bonus and penalty conditions are now **global** and apply to the entire configuration, not individual sections.

### 4. Enhanced Formula Capabilities

The formula editor now supports three types of variables:

- **📊 Section Variables**: Calculate totals from score elements within each section (e.g., `auto`, `teleop`)
- **⚡ Bonus Variables**: Global bonuses that can be added or multiplied (e.g., `bonus_mobility`, `bonus_multiplier`)
- **⚠️ Penalty Variables**: Usually added to give opponent points, rarely subtracted (e.g., `penalty_foul`)

**Common Patterns:**
- **Additive Bonuses**: `auto + teleop + bonus_mobility`
- **Multiplicative Bonuses**: `(auto + teleop) * bonus_multiplier`
- **Opponent Penalty Points**: `auto + teleop + penalty_foul` (penalty adds to opponent's score)
- **Rare Self-Penalty**: `auto + teleop - penalty_major` (penalty deducted from own score)

## Data Structure

### Enhanced Types

```typescript
export interface ScoreSection {
  id: string;
  scoreConfigId: string;
  name: string;                    // e.g., "Autonomous Period"
  code: string;                    // e.g., "auto" (used in formulas)
  description?: string;
  displayOrder: number;
  scoreElements?: ScoreElement[];  // Only score elements belong to sections
}

export interface ScoreConfig {
  id: string;
  name: string;
  description?: string;
  totalScoreFormula?: string;      // e.g., "auto * 1.5 + teleop"
  scoreSections?: ScoreSection[];  // New sectioned approach
  // Legacy fields for backward compatibility
  scoreElements?: ScoreElement[];
  bonusConditions?: BonusCondition[];
  penaltyConditions?: PenaltyCondition[];
}
```

### Example Configuration Payload

```json
{
  "name": "2024 Robotics Game",
  "description": "Three-period game with autonomous, teleop, and endgame",
  "totalScoreFormula": "auto * 1.5 + teleop + endgame * 2",
  "scoreSections": [
    {
      "name": "Autonomous Period",
      "code": "auto",
      "description": "15-second autonomous period",
      "displayOrder": 0,
      "scoreElements": [
        {
          "name": "Auto Cubes Scored",
          "code": "auto_cubes",
          "pointsPerUnit": 6,
          "elementType": "COUNTER"
        }
      ]
    },
    {
      "name": "Teleoperated Period", 
      "code": "teleop",
      "description": "2:15 human-controlled period",
      "displayOrder": 1,
      "scoreElements": [
        {
          "name": "Teleop Cubes",
          "code": "teleop_cubes", 
          "pointsPerUnit": 3,
          "elementType": "COUNTER"
        }
      ]
    },
    {
      "name": "Endgame",
      "code": "endgame",
      "description": "Final 30 seconds",
      "displayOrder": 2,
      "scoreElements": [
        {
          "name": "Climb Points",
          "code": "climb",
          "pointsPerUnit": 10,
          "elementType": "COUNTER"
        }
      ]
    }
  ]
}
```

## Score Calculation Example

### Input Scores
```json
{
  "auto_cubes": 2,     // 2 × 6 = 12 points
  "mobility": 1,       // Bonus: 5 points
  "teleop_cubes": 5,   // 5 × 3 = 15 points  
  "climb": 1           // 1 × 10 = 10 points
}
```

### Section Totals
- **auto**: 12 + 5 = 17 points
- **teleop**: 15 points
- **endgame**: 10 points

### Final Calculation
Using formula: `auto * 1.5 + teleop + endgame * 2`
- Total = 17 × 1.5 + 15 + 10 × 2
- Total = 25.5 + 15 + 20 = **60.5 points**

## Migration Path

### From Legacy Configurations
1. Existing configurations continue to work unchanged
2. To migrate to sections:
   - Create sections for your game periods
   - Move existing elements/bonuses/penalties to appropriate sections
   - Define a formula (optional - defaults to summing all sections)

### Hybrid Approach
- Configurations can have both sections AND legacy elements
- Legacy elements are calculated separately from sections
- Both results are combined in the final score

## UI Components

### New Components Added

1. **ScoreSectionEditor**: Manages the list of sections and their contents
2. **FormulaEditor**: Provides formula editing with section variable suggestions
3. **Enhanced ScoreConfigForm**: Now supports both sectioned and legacy approaches
4. **Updated ScoreConfigTable**: Shows section count and formula indicators

### User Experience Improvements

- **Visual Hierarchy**: Sections are clearly distinguished with cards and icons
- **Drag & Drop**: Sections can be reordered easily  
- **Formula Help**: Real-time examples and section variable suggestions
- **Backward Compatibility**: Legacy configurations still work and display properly

## Best Practices

1. **Section Naming**: Use clear, concise names like "Auto", "Teleop", "Endgame"
2. **Section Codes**: Use short, lowercase codes without spaces (e.g., "auto", "teleop")
3. **Formula Simplicity**: Keep formulas readable and well-documented
4. **Testing**: Always test formulas with sample data before finalizing
5. **Documentation**: Add descriptions to sections explaining their purpose

This enhanced system provides the flexibility needed for complex scoring scenarios while maintaining simplicity for basic use cases.
