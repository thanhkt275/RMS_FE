# Dynamic Score Panel Components

This directory contains the implementation of the Dynamic Score Panel system that adapts to tournament-specific score configurations. The system replaces static scoring interfaces with flexible, configuration-driven components.

## Overview

The Dynamic Score Panel automatically fetches and renders score configurations for specific matches, providing real-time score calculation using tournament formulas. It supports various element types, bonus conditions, penalty conditions, and responsive layouts that adapt to different score-config structures.

## Components

### DynamicScorePanel

The main component that orchestrates the entire dynamic scoring interface.

**Props:**
- `matchId: string` - The ID of the match being scored
- `allianceColor: 'RED' | 'BLUE'` - The alliance color for theming
- `onScoreChange: (scores: ElementScores) => void` - Callback for score changes
- `onSubmit: (finalScores: AllianceScoreData) => void` - Callback for score submission
- `disabled?: boolean` - Whether the panel is disabled
- `readonly?: boolean` - Whether the panel is read-only

**Features:**
- Automatic score-config fetching for matches
- Real-time score calculation with debouncing
- Alliance-specific theming (RED/BLUE)
- Error handling and loading states
- Offline support indicators
- Permission-based access control
- Fallback to legacy scoring when no config is available

### ScoreSection

Renders individual scoring sections (e.g., Autonomous, Teleop, Endgame).

**Props:**
- `section: SectionConfig` - The section configuration
- `scores: ElementScores` - Current element scores
- `onScoreChange: (elementCode: string, value: number) => void` - Score change handler
- `readonly?: boolean` - Whether the section is read-only
- `disabled?: boolean` - Whether the section is disabled
- `allianceColor: 'RED' | 'BLUE'` - Alliance color for theming

**Features:**
- Automatic element organization by display order
- Section-level score totals
- Bonus and penalty condition display
- Visual indicators for triggered conditions
- Responsive grid layout

### ScoreElement

Renders individual scoring elements with different input types.

**Props:**
- `element: ElementConfig` - The element configuration
- `value: number` - Current element value
- `onChange: (value: number) => void` - Value change handler
- `disabled?: boolean` - Whether the element is disabled
- `readonly?: boolean` - Whether the element is read-only
- `allianceColor: 'RED' | 'BLUE'` - Alliance color for theming

**Supported Element Types:**
- **COUNTER**: Numeric input with increment/decrement buttons
- **BOOLEAN**: Yes/No toggle buttons
- **TIMER**: Time-based input with quick increment buttons
- **SELECT**: Dropdown selection with predefined options

## Usage

### Basic Implementation

```tsx
import { DynamicScorePanel } from '@/components/features/dynamic-scoring';

function ControlMatchPage() {
  const [scores, setScores] = useState({});

  const handleScoreChange = (elementScores) => {
    setScores(elementScores);
    // Update parent state or send real-time updates
  };

  const handleSubmit = (finalScores) => {
    console.log('Submitting scores:', finalScores);
    // Submit scores to backend
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Red Alliance */}
      <DynamicScorePanel
        matchId="match-123"
        allianceColor="RED"
        onScoreChange={handleScoreChange}
        onSubmit={handleSubmit}
      />
      
      {/* Blue Alliance */}
      <DynamicScorePanel
        matchId="match-123"
        allianceColor="BLUE"
        onScoreChange={handleScoreChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
```

### With Integration to Existing Control Match Page

```tsx
// Replace existing ScoringPanel with DynamicScorePanel
const DynamicScoringPanel = ({
  selectedMatchId,
  onUpdateScores,
  onSubmitScores,
  disabled
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <DynamicScorePanel
        matchId={selectedMatchId}
        allianceColor="RED"
        onScoreChange={onUpdateScores}
        onSubmit={onSubmitScores}
        disabled={disabled}
      />
      <DynamicScorePanel
        matchId={selectedMatchId}
        allianceColor="BLUE"
        onScoreChange={onUpdateScores}
        onSubmit={onSubmitScores}
        disabled={disabled}
      />
    </div>
  );
};
```

## API Integration

The components rely on several API hooks for data fetching and submission:

### Required API Endpoints

1. **GET `/api/match-scores/:matchId/score-config`**
   - Returns the score configuration for a specific match
   - Response: `MatchScoreConfig`

2. **GET `/api/match-scores/:matchId/score-panel-config`**
   - Returns UI-optimized configuration for the score panel
   - Response: `ScorePanelConfig`

3. **POST `/api/match-scores/:matchId/:allianceId/calculate-preview`**
   - Calculates score preview without saving
   - Body: `{ elementScores: ElementScores }`
   - Response: `ScoreCalculationResult`

4. **POST `/api/match-scores/:matchId/:allianceId/submit`**
   - Submits final scores
   - Body: `AllianceScoreData`

### Data Flow

1. **Configuration Loading**: Component fetches score-config for the match
2. **Real-time Calculation**: Score changes trigger debounced API calls for calculation
3. **Visual Feedback**: UI updates show real-time totals, bonuses, and penalties
4. **Score Submission**: Final scores are submitted with validation

## Theming and Styling

The components use alliance-specific theming:

### RED Alliance
- Background: `bg-red-50`
- Borders: `border-red-200`
- Headers: `bg-red-100`
- Text: `text-red-800`
- Buttons: `bg-red-500 hover:bg-red-600`

### BLUE Alliance
- Background: `bg-blue-50`
- Borders: `border-blue-200`
- Headers: `bg-blue-100`
- Text: `text-blue-800`
- Buttons: `bg-blue-500 hover:bg-blue-600`

## Error Handling

The system includes comprehensive error handling:

### Configuration Errors
- **Loading failures**: Retry button with exponential backoff
- **No configuration**: Fallback to legacy scoring with clear messaging
- **Invalid configuration**: Validation errors displayed to user

### Calculation Errors
- **Formula errors**: Error messages with context
- **Network failures**: Offline indicators and retry mechanisms
- **Invalid inputs**: Real-time validation with helpful messages

### Submission Errors
- **Network failures**: Retry mechanisms with user feedback
- **Validation errors**: Clear error messages and correction guidance
- **Permission errors**: Access control with appropriate messaging

## Performance Optimizations

### Debounced Calculations
- Score changes are debounced (300ms) to prevent excessive API calls
- Real-time UI updates provide immediate feedback

### Smart Caching
- Score configurations are cached for 5 minutes
- Background refresh keeps data current
- Offline support with cached data

### Responsive Design
- Grid layouts adapt to different screen sizes
- Mobile-optimized touch targets
- Progressive enhancement for different devices

## Testing

The components include comprehensive test coverage:

### Unit Tests
```bash
# Run component tests
npm test dynamic-score-panel.test.tsx
```

### Test Scenarios
- Loading states and error handling
- Score input and calculation
- Submission workflows
- Permission and accessibility
- Alliance theming
- Different score-config structures

## Accessibility

The components follow accessibility best practices:

- **Keyboard Navigation**: All inputs are keyboard accessible
- **Screen Readers**: Proper ARIA labels and descriptions
- **Color Contrast**: High contrast for alliance theming
- **Focus Management**: Clear focus indicators and logical tab order

## Migration from Legacy Scoring

To integrate with existing control-match page:

1. Replace `ScoringPanel` import:
```tsx
// Old
import { ScoringPanel } from '@/components/features/control-match/scoring-panel';

// New
import { DynamicScorePanel } from '@/components/features/dynamic-scoring';
```

2. Update props mapping:
```tsx
// Old props structure -> New props structure
<ScoringPanel
  selectedMatchId={selectedMatchId}
  // ... many props
/>

// Becomes
<DynamicScorePanel
  matchId={selectedMatchId}
  allianceColor="RED"
  onScoreChange={handleScoreChange}
  onSubmit={handleSubmit}
/>
```

3. Handle fallback gracefully:
- Component automatically falls back to legacy mode when no score-config is available
- Existing tournaments continue to work without modification
- New tournaments with score-configs get dynamic panels

## Future Enhancements

The component architecture supports future enhancements:

- **Drag-and-drop reordering**: Components are structured to support element reordering
- **Custom element types**: Easy to add new element types with minimal changes
- **Advanced formulas**: Formula evaluation can be enhanced for complex calculations
- **Real-time collaboration**: WebSocket integration for multi-referee scoring
- **Offline persistence**: Local storage for offline scoring capabilities
