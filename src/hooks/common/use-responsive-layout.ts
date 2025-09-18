/**
 * Responsive hook for detecting screen size and layout preferences
 * Optimized for tablet devices (8-12 inch) with dedicated breakpoints
 */

import { useState, useEffect } from 'react';

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';
export type ViewMode = 'auto' | 'table' | 'cards';

export function useResponsiveLayout() {
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    // Initial detection
    updateScreenSize();

    // Listen for resize events
    window.addEventListener('resize', updateScreenSize);
    
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  return { screenSize, isMounted };
}
