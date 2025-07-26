/**
 * Ranking Update Indicator Component
 *
 * Displays real-time connection status and update information for rankings.
 * Shows live indicator, last update time, and manual refresh option.
 */

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  Activity,
  AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { RankingUpdateIndicatorProps } from '@/types/ranking.types';

/**
 * Component to show real-time ranking update status
 */
export function RankingUpdateIndicator({
  isConnected,
  lastUpdate,
  isUpdating,
  updateCount,
  onManualRefresh,
  className,
}: RankingUpdateIndicatorProps) {

  // Format last update time
  const formatLastUpdate = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  // Connection status indicator
  const ConnectionStatus = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                  Live
                </Badge>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
                  Offline
                </Badge>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isConnected
              ? 'Connected to live updates'
              : 'Disconnected - rankings may be outdated'
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Update activity indicator
  const UpdateActivity = () => {
    if (isUpdating) {
      return (
        <div className="flex items-center gap-2 text-blue-600">
          <Activity className="h-4 w-4 animate-pulse" />
          <span className="text-sm font-medium">Updating...</span>
        </div>
      );
    }

    if (updateCount > 0) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 text-gray-600">
                <Activity className="h-4 w-4" />
                <span className="text-sm">
                  {updateCount} update{updateCount !== 1 ? 's' : ''}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Number of real-time updates received</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return null;
  };

  // Last update time display
  const LastUpdateTime = () => {
    if (!lastUpdate) return null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                {formatLastUpdate(lastUpdate)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Last updated: {lastUpdate.toLocaleString()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Manual refresh button
  const RefreshButton = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onManualRefresh}
            disabled={isUpdating}
            className="h-8 px-3"
          >
            <RefreshCw className={cn(
              "h-4 w-4",
              isUpdating && "animate-spin"
            )} />
            <span className="ml-2 hidden sm:inline">Refresh</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Manually refresh rankings</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Warning for offline mode
  const OfflineWarning = () => {
    if (isConnected) return null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium hidden sm:inline">
                Live updates unavailable
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Rankings will not update automatically while offline</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className={cn(
      "flex items-center justify-between gap-4 p-3 bg-gray-50 border rounded-lg",
      "dark:bg-gray-800 dark:border-gray-700",
      className
    )}>
      {/* Left side - Status indicators */}
      <div className="flex items-center gap-4">
        <ConnectionStatus />
        <UpdateActivity />
        <LastUpdateTime />
        <OfflineWarning />
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {onManualRefresh && <RefreshButton />}
      </div>
    </div>
  );
}

/**
 * Compact version for smaller spaces
 */
export function CompactRankingUpdateIndicator({
  isConnected,
  isUpdating,
  updateCount,
  onManualRefresh,
  className,
}: Omit<RankingUpdateIndicatorProps, 'lastUpdate'>) {
  return (
    <div className={cn(
      "flex items-center gap-2 text-sm",
      className
    )}>
      {/* Connection indicator */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              {isConnected ? (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              ) : (
                <div className="w-2 h-2 bg-red-500 rounded-full" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isConnected ? 'Live updates active' : 'Offline mode'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Update count */}
      {updateCount > 0 && (
        <span className="text-gray-500">
          {updateCount}
        </span>
      )}

      {/* Refresh button */}
      {onManualRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onManualRefresh}
          disabled={isUpdating}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className={cn(
            "h-3 w-3",
            isUpdating && "animate-spin"
          )} />
        </Button>
      )}
    </div>
  );
}

/**
 * Status-only indicator (no actions)
 */
export function RankingStatusIndicator({
  isConnected,
  isUpdating,
  className,
}: Pick<RankingUpdateIndicatorProps, 'isConnected' | 'className'> & { isUpdating?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {isUpdating ? (
        <div className="flex items-center gap-2 text-blue-600">
          <Activity className="h-4 w-4 animate-pulse" />
          <span className="text-sm">Updating</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm text-green-700">Live</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-sm text-red-700">Offline</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
