/**
 * Mobile and Tablet Responsive Utilities
 * Additional responsive utilities for the user management system
 */

import { cn } from '../lib/utils';

/**
 * Responsive container classes based on screen size
 */
export const getResponsiveContainerClass = (screenSize: 'mobile' | 'tablet' | 'desktop') => {
  return cn(
    'w-full mx-auto',
    {
      'px-4 py-4': screenSize === 'mobile',
      'px-6 py-6': screenSize === 'tablet', 
      'px-8 py-8': screenSize === 'desktop',
    }
  );
};

/**
 * Responsive grid classes for different layouts
 */
export const getResponsiveGridClass = (
  screenSize: 'mobile' | 'tablet' | 'desktop',
  itemType: 'cards' | 'stats' | 'actions'
) => {
  if (itemType === 'cards') {
    return cn('grid gap-4', {
      'grid-cols-1': screenSize === 'mobile',
      'grid-cols-2': screenSize === 'tablet',
      'grid-cols-3': screenSize === 'desktop',
    });
  }
  
  if (itemType === 'stats') {
    return cn('grid gap-4', {
      'grid-cols-2': screenSize === 'mobile',
      'grid-cols-3 lg:grid-cols-6': screenSize === 'tablet' || screenSize === 'desktop',
    });
  }
  
  if (itemType === 'actions') {
    return cn('flex gap-2', {
      'flex-col': screenSize === 'mobile',
      'flex-row': screenSize === 'tablet' || screenSize === 'desktop',
    });
  }

  return '';
};

/**
 * Responsive text classes
 */
export const getResponsiveTextClass = (
  size: 'small' | 'base' | 'large' | 'title',
  screenSize: 'mobile' | 'tablet' | 'desktop'
) => {
  if (size === 'title') {
    return cn({
      'text-2xl font-bold': screenSize === 'mobile',
      'text-3xl font-bold': screenSize === 'tablet' || screenSize === 'desktop',
    });
  }
  
  if (size === 'large') {
    return cn({
      'text-base font-semibold': screenSize === 'mobile',
      'text-lg font-semibold': screenSize === 'tablet' || screenSize === 'desktop',
    });
  }
  
  if (size === 'base') {
    return cn({
      'text-sm': screenSize === 'mobile',
      'text-base': screenSize === 'tablet' || screenSize === 'desktop',
    });
  }
  
  if (size === 'small') {
    return cn({
      'text-xs': screenSize === 'mobile',
      'text-sm': screenSize === 'tablet' || screenSize === 'desktop',
    });
  }

  return '';
};

/**
 * Touch-friendly button classes
 */
export const getTouchFriendlyClass = (screenSize: 'mobile' | 'tablet' | 'desktop') => {
  return cn('transition-all duration-200', {
    'min-h-[44px] active:scale-95 active:bg-opacity-80': screenSize === 'mobile',
    'min-h-[40px] hover:shadow-md': screenSize === 'tablet',
    'hover:shadow-lg': screenSize === 'desktop',
  });
};

/**
 * Responsive modal/dialog classes
 */
export const getResponsiveModalClass = (screenSize: 'mobile' | 'tablet' | 'desktop') => {
  return cn('fixed inset-0 z-50 flex items-center justify-center', {
    'p-4': screenSize === 'mobile',
    'p-6': screenSize === 'tablet',
    'p-8': screenSize === 'desktop',
  });
};

/**
 * Responsive spacing utilities
 */
export const getResponsiveSpacing = (
  type: 'section' | 'component' | 'element',
  screenSize: 'mobile' | 'tablet' | 'desktop'
) => {
  if (type === 'section') {
    return {
      mobile: 'mb-4',
      tablet: 'mb-6', 
      desktop: 'mb-8'
    }[screenSize];
  }
  
  if (type === 'component') {
    return {
      mobile: 'mb-3',
      tablet: 'mb-4',
      desktop: 'mb-6'
    }[screenSize];
  }
  
  if (type === 'element') {
    return {
      mobile: 'mb-2',
      tablet: 'mb-3',
      desktop: 'mb-4'
    }[screenSize];
  }

  return '';
};
