/**
 * Audience Display Design System
 * Centralized design tokens and component styles for consistent UI
 */

// Color Palette
export const colors = {
  // Primary Brand Colors
  primary: {
    50: 'bg-blue-50',
    100: 'bg-blue-100',
    500: 'bg-blue-500',
    600: 'bg-blue-600',
    700: 'bg-blue-700',
    800: 'bg-blue-800',
    900: 'bg-blue-900',
  },
  
  // Alliance Colors
  red: {
    50: 'bg-red-50',
    100: 'bg-red-100',
    200: 'bg-red-200',
    500: 'bg-red-500',
    600: 'bg-red-600',
    700: 'bg-red-700',
    800: 'bg-red-800',
  },
  
  blue: {
    50: 'bg-blue-50',
    100: 'bg-blue-100',
    200: 'bg-blue-200',
    500: 'bg-blue-500',
    600: 'bg-blue-600',
    700: 'bg-blue-700',
    800: 'bg-blue-800',
  },
  
  // Status Colors
  success: {
    50: 'bg-green-50',
    100: 'bg-green-100',
    400: 'bg-green-400',
    500: 'bg-green-500',
    600: 'bg-green-600',
  },
  
  warning: {
    50: 'bg-yellow-50',
    100: 'bg-yellow-100',
    400: 'bg-yellow-400',
    500: 'bg-yellow-500',
  },
  
  error: {
    50: 'bg-red-50',
    100: 'bg-red-100',
    500: 'bg-red-500',
    600: 'bg-red-600',
  },
  
  // Neutral Colors
  gray: {
    50: 'bg-gray-50',
    100: 'bg-gray-100',
    200: 'bg-gray-200',
    300: 'bg-gray-300',
    400: 'bg-gray-400',
    500: 'bg-gray-500',
    600: 'bg-gray-600',
    700: 'bg-gray-700',
    800: 'bg-gray-800',
    900: 'bg-gray-900',
  },
  
  // Text Colors
  text: {
    primary: 'text-gray-900',
    secondary: 'text-gray-600',
    muted: 'text-gray-500',
    white: 'text-white',
    red: 'text-red-700',
    blue: 'text-blue-700',
    success: 'text-green-700',
    warning: 'text-yellow-700',
    error: 'text-red-700',
  }
};

// Typography Scale
export const typography = {
  // Display Headers
  display: {
    xl: 'text-4xl md:text-5xl font-bold tracking-tight',
    lg: 'text-3xl md:text-4xl font-bold tracking-tight',
    md: 'text-2xl md:text-3xl font-bold tracking-tight',
    sm: 'text-xl md:text-2xl font-bold tracking-tight',
  },
  
  // Headings
  heading: {
    xl: 'text-3xl font-bold',
    lg: 'text-2xl font-bold',
    md: 'text-xl font-bold',
    sm: 'text-lg font-bold',
    xs: 'text-base font-bold',
  },
  
  // Body Text
  body: {
    xl: 'text-xl font-medium',
    lg: 'text-lg font-medium',
    md: 'text-base font-medium',
    sm: 'text-sm font-medium',
    xs: 'text-xs font-medium',
  },
  
  // Labels
  label: {
    lg: 'text-sm font-semibold uppercase tracking-wider',
    md: 'text-xs font-semibold uppercase tracking-wider',
    sm: 'text-xs font-medium uppercase tracking-wide',
  }
};

// Spacing Scale
export const spacing = {
  // Padding
  padding: {
    xs: 'p-2',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12',
    responsive: 'p-4 md:p-6 lg:p-8',
  },
  
  // Margins
  margin: {
    xs: 'm-2',
    sm: 'm-4',
    md: 'm-6',
    lg: 'm-8',
    xl: 'm-12',
    bottom: {
      sm: 'mb-4',
      md: 'mb-6',
      lg: 'mb-8',
    }
  },
  
  // Gaps
  gap: {
    xs: 'gap-2',
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
  }
};

// Border Radius
export const borderRadius = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  full: 'rounded-full',
};

// Shadows
export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
};

// Component Styles
export const components = {
  // Card Styles
  card: {
    base: 'bg-white border border-gray-200 rounded-xl shadow-lg',
    header: 'bg-blue-600 text-white p-4 md:p-6 lg:p-8 rounded-xl',
    content: 'p-4 md:p-6 lg:p-8',
  },
  
  // Button Styles
  button: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors',
    secondary: 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-medium py-2 px-4 rounded-lg transition-colors',
    danger: 'bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors',
  },
  
  // Status Indicators
  status: {
    connected: `${colors.success[500]} animate-pulse`,
    disconnected: `${colors.error[500]}`,
    warning: `${colors.warning[500]}`,
    loading: `${colors.gray[400]} animate-spin`,
  },
  
  // Alliance Styles
  alliance: {
    red: {
      background: `${colors.red[50]} border border-red-200`,
      text: `${colors.text.red}`,
      accent: `${colors.red[600]}`,
    },
    blue: {
      background: `${colors.blue[50]} border border-blue-200`,
      text: `${colors.text.blue}`,
      accent: `${colors.blue[600]}`,
    },
  },
  
  // Table Styles
  table: {
    container: 'bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden',
    header: 'bg-gray-50',
    row: 'hover:bg-blue-50 transition-colors',
    cell: 'px-5 py-4 whitespace-nowrap',
  },

  // Shadows (separate from template literals to avoid circular references)
  shadows: shadows,
  
  // Loading States
  loading: {
    skeleton: 'animate-pulse bg-gray-300 rounded',
    spinner: `w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin`,
  }
};

// Responsive Breakpoints
export const breakpoints = {
  sm: 'sm:',
  md: 'md:',
  lg: 'lg:',
  xl: 'xl:',
  '2xl': '2xl:',
};

// Animation Classes
export const animations = {
  fadeIn: 'animate-fade-in',
  fadeInSlow: 'animate-fade-in-slow',
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
  
  // Transitions
  transition: {
    all: 'transition-all duration-300 ease-in-out',
    colors: 'transition-colors duration-200',
    transform: 'transition-transform duration-200',
  }
};

// Layout Utilities
export const layout = {
  container: 'max-w-7xl mx-auto',
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex items-center justify-between',
  grid: {
    cols1: 'grid grid-cols-1',
    cols2: 'grid grid-cols-1 md:grid-cols-2',
    cols3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    cols4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }
};

// Responsive Design Utilities
export const responsive = {
  // Container padding that adapts to screen size
  containerPadding: 'px-4 sm:px-6 lg:px-8',

  // Text sizes that scale with screen size
  text: {
    display: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold',
    heading: 'text-xl sm:text-2xl md:text-3xl font-bold',
    subheading: 'text-lg sm:text-xl md:text-2xl font-semibold',
    body: 'text-sm sm:text-base',
    caption: 'text-xs sm:text-sm',
  },

  // Spacing that adapts to screen size
  spacing: {
    section: 'py-8 sm:py-12 lg:py-16',
    component: 'p-4 sm:p-6 lg:p-8',
    gap: 'gap-4 sm:gap-6 lg:gap-8',
    margin: 'mb-4 sm:mb-6 lg:mb-8',
  },

  // Layout patterns for different screen sizes
  layout: {
    stack: 'flex flex-col space-y-4 sm:space-y-6',
    stackToRow: 'flex flex-col sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0 space-y-4',
    centerOnMobile: 'text-center sm:text-left',
    hideOnMobile: 'hidden sm:block',
    showOnMobile: 'block sm:hidden',
    mobileFullWidth: 'w-full sm:w-auto',
  },

  // Table responsive patterns
  table: {
    container: 'overflow-x-auto',
    hideColumns: {
      md: 'hidden md:table-cell',
      lg: 'hidden lg:table-cell',
      xl: 'hidden xl:table-cell',
    },
    mobileCard: 'block sm:hidden',
    desktopTable: 'hidden sm:table',
  }
};

// Utility function to combine classes
export const cn = (...classes: (string | undefined | null | false | Record<string, boolean>)[]): string => {
  return classes
    .map(cls => {
      if (typeof cls === 'object' && cls !== null) {
        // Handle conditional classes object
        return Object.entries(cls)
          .filter(([, condition]) => condition)
          .map(([className]) => className)
          .join(' ');
      }
      return cls;
    })
    .filter(Boolean)
    .join(' ');
};
