import { useState, useEffect } from 'react';
import type { StageBracketResponse } from '@/types/match.types';
import { getBracketDisplayConfig } from './bracket-utils';

export interface BracketViewportConfig {
  width: number;
  height: number;
  isResponsive: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

export function useBracketViewport(bracket?: StageBracketResponse): BracketViewportConfig {
  const [dimensions, setDimensions] = useState<[number, number]>(() => {
    if (typeof window === 'undefined') {
      return [1280, 720]; // SSR fallback
    }
    return [window.innerWidth, window.innerHeight];
  });

  const [width, height] = dimensions;

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      // Debounce resize events
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDimensions([window.innerWidth, window.innerHeight]);
      }, 150);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Calculate responsive dimensions
  const isResponsive = true;
  const deviceType: 'mobile' | 'tablet' | 'desktop' = 
    width < 640 ? 'mobile' : 
    width < 1024 ? 'tablet' : 
    'desktop';

  // Apply bracket-specific adjustments if bracket data is available
  let finalWidth = width;
  let finalHeight = height;

  if (bracket) {
    const displayConfig = getBracketDisplayConfig(bracket);
    
    // Use display config recommendations with compact sizing
    finalWidth = Math.max(width - 48, displayConfig.dimensions.width);
    finalHeight = Math.max(height - 120, displayConfig.dimensions.height); // Less height padding

    // Apply device-specific adjustments
    if (deviceType === 'mobile') {
      finalWidth = Math.min(finalWidth, width - 16);
      finalHeight = Math.min(finalHeight, height - 80); // Less mobile padding
    } else if (deviceType === 'tablet') {
      finalWidth = Math.min(finalWidth, width - 32);
      finalHeight = Math.min(finalHeight, height - 100); // Less tablet padding
    }
  }

  return {
    width: finalWidth,
    height: finalHeight,
    isResponsive,
    deviceType,
  };
}

export function useAdaptiveBracketTheme(bracket: StageBracketResponse, deviceType: 'mobile' | 'tablet' | 'desktop') {
  const baseTheme = {
    textColor: { main: '#0f172a', highlighted: '#1e3a8a', dark: '#1f2937' },
    matchBackground: { wonColor: '#c7d2fe', lostColor: '#e0e7ff' },
    score: {
      background: { wonColor: '#312e81', lostColor: '#1e1b4b' },
      text: { highlightedWonColor: '#bbf7d0', highlightedLostColor: '#fecdd3' },
    },
    border: { color: '#a5b4fc', highlightedColor: '#4f46e5' },
    roundHeader: { backgroundColor: '#1e293b', fontColor: '#f8fafc' },
    connectorColor: '#818cf8',
    connectorColorHighlight: '#f97316',
  };

  // Device-specific theme adjustments
  if (deviceType === 'mobile') {
    return {
      ...baseTheme,
      textColor: { ...baseTheme.textColor, main: '#1f2937' }, // Slightly darker for better mobile readability
    };
  }

  return baseTheme;
}