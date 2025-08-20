/**
 * Ranking Row Component
 *
 * Individual row component for the real-time ranking table.
 * Handles animations, highlighting, and rank change indicators.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Medal,
  Award
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RankingRowProps, DEFAULT_ANIMATION_CONFIG } from '@/types/ranking.types';

/**
 * Individual ranking row with real-time update animations
 */
export function RankingRow({
  ranking,
  index,
  isAdvancing = false,
  onTeamClick,
  showAnimation = true,
  className,
}: RankingRowProps) {
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [showRankChange, setShowRankChange] = useState(false);

  // Handle highlighting for updates
  useEffect(() => {
    if (ranking.isHighlighted && showAnimation) {
      setIsHighlighted(true);
      setShowRankChange(true);

      // Remove highlight after animation duration
      const timer = setTimeout(() => {
        setIsHighlighted(false);
      }, DEFAULT_ANIMATION_CONFIG.duration);

      // Remove rank change indicator after longer duration
      const rankChangeTimer = setTimeout(() => {
        setShowRankChange(false);
      }, DEFAULT_ANIMATION_CONFIG.duration * 2);

      return () => {
        clearTimeout(timer);
        clearTimeout(rankChangeTimer);
      };
    }
  }, [ranking.isHighlighted, showAnimation]);

  // Rank change indicator
  const RankChangeIndicator = () => {
    if (!showRankChange || !ranking.rankChange || ranking.rankChange === 'same') {
      return null;
    }

    const icons = {
      up: TrendingUp,
      down: TrendingDown,
      same: Minus,
    };

    const colors = {
      up: 'text-green-600',
      down: 'text-red-600',
      same: 'text-gray-500',
    };

    const Icon = icons[ranking.rankChange];

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        className={cn('flex items-center', colors[ranking.rankChange])}
      >
        <Icon className="h-4 w-4" />
        {ranking.previousRank && (
          <span className="ml-1 text-xs">
            {ranking.previousRank}
          </span>
        )}
      </motion.div>
    );
  };

  // Rank display with trophy icons for top positions
  const RankDisplay = () => {
    const rank = ranking.rank || index + 1;

    if (rank === 1) {
      return (
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span className="font-bold text-lg">{rank}</span>
        </div>
      );
    } else if (rank === 2) {
      return (
        <div className="flex items-center gap-2">
          <Medal className="h-5 w-5 text-gray-400" />
          <span className="font-bold text-lg">{rank}</span>
        </div>
      );
    } else if (rank === 3) {
      return (
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-600" />
          <span className="font-bold text-lg">{rank}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <span className="font-semibold text-lg w-6 text-center">{rank}</span>
        <AnimatePresence>
          <RankChangeIndicator />
        </AnimatePresence>
      </div>
    );
  };

  // Team information display
  const TeamInfo = () => (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-base">
          {ranking.teamName}
        </span>
        {isAdvancing && (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
            Advancing
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>#{ranking.teamNumber}</span>
        {ranking.updateSource === 'websocket' && (
          <Badge variant="outline" className="text-xs">
            Updated
          </Badge>
        )}
      </div>
    </div>
  );

  // Statistics display
  const StatsDisplay = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      {/* Points */}
      <div className="text-center">
        <div className="font-semibold text-lg text-blue-600">
          {ranking.pointsScored}
        </div>
        <div className="text-gray-500">Points</div>
      </div>

      {/* Record */}
      <div className="text-center">
        <div className="font-semibold">
          {ranking.wins}-{ranking.losses}-{ranking.ties}
        </div>
        <div className="text-gray-500">W-L-T</div>
      </div>

      {/* Ranking Points */}
      <div className="text-center">
        <div className="font-semibold text-purple-600">
          {ranking.rankingPoints}
        </div>
        <div className="text-gray-500">RP</div>
      </div>

      {/* Point Differential */}
      <div className="text-center">
        <div className={cn(
          "font-semibold",
          ranking.pointDifferential > 0 ? "text-green-600" :
          ranking.pointDifferential < 0 ? "text-red-600" : "text-gray-600"
        )}>
          {ranking.pointDifferential > 0 ? '+' : ''}{ranking.pointDifferential}
        </div>
        <div className="text-gray-500">Diff</div>
      </div>
    </div>
  );

  // Row content
  const rowContent = (
    <div className="grid grid-cols-12 gap-4 items-center p-4">
      {/* Rank - 2 columns */}
      <div className="col-span-2">
        <RankDisplay />
      </div>

      {/* Team Info - 4 columns */}
      <div className="col-span-4">
        <TeamInfo />
      </div>

      {/* Stats - 6 columns */}
      <div className="col-span-6">
        <StatsDisplay />
      </div>
    </div>
  );

  // Helper function to convert RGB to RGBA with opacity
  const getRgbaColor = (rgbColor: string, opacity: number): string => {
    // Extract RGB values from string like "rgb(34, 197, 94)"
    const rgbMatch = rgbColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    // Fallback to transparent if parsing fails
    return 'rgba(0, 0, 0, 0)';
  };

  // Animation wrapper
  const AnimatedRow = ({ children }: { children: React.ReactNode }) => {
    if (!showAnimation) {
      return <>{children}</>;
    }

    const highlightColor = getRgbaColor(DEFAULT_ANIMATION_CONFIG.highlightColor, 0.2);
    const transparentColor = 'rgba(0, 0, 0, 0)';

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: 1,
          y: 0,
          backgroundColor: isHighlighted ? highlightColor : transparentColor
        }}
        exit={{ opacity: 0, y: -20 }}
        transition={{
          duration: DEFAULT_ANIMATION_CONFIG.duration / 1000,
          ease: "easeInOut"
        }}
        className="transition-colors duration-300"
      >
        {children}
      </motion.div>
    );
  };

  // Click handler
  const handleClick = () => {
    if (onTeamClick) {
      onTeamClick(ranking.teamId);
    }
  };

  return (
    <AnimatedRow>
      <div
        className={cn(
          "border-b border-gray-200 hover:bg-gray-50 transition-colors",
          "dark:border-gray-700 dark:hover:bg-gray-800",
          isAdvancing && "bg-green-50 border-green-200 dark:bg-green-900/20",
          onTeamClick && "cursor-pointer",
          className
        )}
        onClick={handleClick}
      >
        {rowContent}
      </div>
    </AnimatedRow>
  );
}

/**
 * Compact ranking row for smaller displays
 */
export function CompactRankingRow({
  ranking,
  index,
  isAdvancing = false,
  onTeamClick,
  className,
}: Omit<RankingRowProps, 'showAnimation'>) {
  const rank = ranking.rank || index + 1;

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 border-b border-gray-200",
        "hover:bg-gray-50 transition-colors",
        "dark:border-gray-700 dark:hover:bg-gray-800",
        isAdvancing && "bg-green-50 border-green-200",
        onTeamClick && "cursor-pointer",
        className
      )}
      onClick={() => onTeamClick?.(ranking.teamId)}
    >
      {/* Left side - Rank and team */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="font-bold text-lg w-8 text-center">{rank}</span>
          {ranking.rankChange && ranking.rankChange !== 'same' && (
            <div className={cn(
              ranking.rankChange === 'up' ? 'text-green-600' : 'text-red-600'
            )}>
              {ranking.rankChange === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
            </div>
          )}
        </div>

        <div>
          <div className="font-semibold">{ranking.teamName}</div>
          <div className="text-sm text-gray-500">#{ranking.teamNumber}</div>
        </div>
      </div>

      {/* Right side - Key stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="text-center">
          <div className="font-semibold text-blue-600">{ranking.pointsScored}</div>
          <div className="text-gray-500">Pts</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">{ranking.wins}-{ranking.losses}</div>
          <div className="text-gray-500">W-L</div>
        </div>
      </div>
    </div>
  );
}
