// Exact measurements and styling from Figma design specifications
export const FIGMA_DESIGN = {
  // Match card dimensions
  MATCH_CARD: {
    WIDTH: 213.33,
    HEIGHT: 67.5,
    BORDER_RADIUS: 4,
  },
  
  // Spacing and layout
  SPACING: {
    ROUND_GAP: 133.33,
    MATCH_VERTICAL_GAP: 67.5,
    ROUND_LABEL_MARGIN: 20,
  },
  
  // Colors from Figma design
  COLORS: {
    REGULAR_BORDER: '#2563EB',
    REGULAR_BORDER_WIDTH: 2,
    FINAL_BORDER: '#DC2626',
    FINAL_BORDER_WIDTH: 3,
    FINAL_TEXT: '#DC2626',
    REGULAR_TEXT: '#1E293B',
    GRAY_TEXT: '#64748B',
    CONNECTION_LINE: '#94A3B8',
    BACKGROUND: '#F8FAFC',
    CARD_BACKGROUND: '#FFFFFF',
    DIVIDER: '#CBD5E1',
  },
  
  // Typography specifications
  TYPOGRAPHY: {
    ROUND_LABEL: {
      FONT_FAMILY: 'Inter',
      FONT_SIZE: 20,
      FONT_WEIGHT: 800,
      LINE_HEIGHT: 1.2,
    },
    TEAM_TEXT: {
      FONT_FAMILY: 'Inter',
      FONT_SIZE: 15,
      FONT_WEIGHT: 500,
      LINE_HEIGHT: 1.2,
    },
  },
  
  // Connection line specifications
  CONNECTION_LINES: {
    STROKE_WIDTH: 2,
    COLOR: '#94A3B8',
  },
} as const;

// Responsive scaling constants
export const SCALING_CONSTANTS = {
  MIN_SCALE_FACTOR: 0.3,
  MAX_SCALE_FACTOR: 2.0,
  MIN_READABLE_FONT_SIZE: 10,
  VIEWPORT_PADDING: 16,
  ROUND_LABEL_HEIGHT: 40,
  // Breakpoints for different scaling strategies
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1024,
  // Minimum dimensions to maintain usability
  MIN_MATCH_WIDTH: 120,
  MIN_MATCH_HEIGHT: 40,
} as const;

// Round label generation
export const ROUND_LABELS = {
  FINAL: 'Final',
  SEMIFINAL: 'Semifinals',
  QUARTERFINAL: 'Quarterfinals',
  ROUND_PREFIX: 'Round',
} as const;