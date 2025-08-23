/**
 * Audit Trail Component
 * 
 * Displays created and modified dates for entities with proper formatting
 * and visual indicators for administrators to track changes.
 */

import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Clock, Calendar, User, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface AuditTrailData {
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: {
    id: string;
    name?: string;
    username?: string;
    email?: string;
  };
  updatedBy?: {
    id: string;
    name?: string;
    username?: string;
    email?: string;
  };
}

interface AuditTrailProps {
  data: AuditTrailData;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
  showRelativeTime?: boolean;
  showUserInfo?: boolean;
}

export function AuditTrail({
  data,
  variant = 'default',
  className,
  showRelativeTime = true,
  showUserInfo = false,
}: AuditTrailProps) {
  const createdDate = new Date(data.createdAt);
  const updatedDate = new Date(data.updatedAt);
  const isModified = createdDate.getTime() !== updatedDate.getTime();

  const formatDate = (date: Date) => {
    return format(date, 'PPp'); // e.g., "Apr 29, 2023 at 3:45 PM"
  };

  const formatRelativeTime = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true });
  };

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{showRelativeTime ? formatRelativeTime(createdDate) : format(createdDate, 'PP')}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Created: {formatDate(createdDate)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {isModified && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="h-4 px-1 text-xs">
                  <Edit className="h-2 w-2 mr-1" />
                  Modified
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Last modified: {formatDate(updatedDate)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={cn('space-y-3 p-4 bg-muted/50 rounded-lg border', className)}>
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Audit Trail
        </h4>
        
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Created</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{formatDate(createdDate)}</p>
              {showRelativeTime && (
                <p className="text-xs text-muted-foreground">{formatRelativeTime(createdDate)}</p>
              )}
              {showUserInfo && data.createdBy && (
                <div className="flex items-center gap-1 mt-1">
                  <User className="h-3 w-3" />
                  <span className="text-xs text-muted-foreground">
                    {data.createdBy.name || data.createdBy.username}
                  </span>
                </div>
              )}
            </div>
          </div>

          {isModified && (
            <div className="flex items-start justify-between pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Edit className="h-3 w-3" />
                <span>Last Modified</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatDate(updatedDate)}</p>
                {showRelativeTime && (
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(updatedDate)}</p>
                )}
                {showUserInfo && data.updatedBy && (
                  <div className="flex items-center gap-1 mt-1">
                    <User className="h-3 w-3" />
                    <span className="text-xs text-muted-foreground">
                      {data.updatedBy.name || data.updatedBy.username}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Created
        </span>
        <div className="text-right">
          <p className="font-medium">{formatDate(createdDate)}</p>
          {showRelativeTime && (
            <p className="text-xs text-muted-foreground">{formatRelativeTime(createdDate)}</p>
          )}
        </div>
      </div>

      {isModified && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Edit className="h-3 w-3" />
            Modified
          </span>
          <div className="text-right">
            <p className="font-medium">{formatDate(updatedDate)}</p>
            {showRelativeTime && (
              <p className="text-xs text-muted-foreground">{formatRelativeTime(updatedDate)}</p>
            )}
          </div>
        </div>
      )}

      {showUserInfo && (
        <div className="pt-2 border-t space-y-1">
          {data.createdBy && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Created by</span>
              <span className="font-medium">
                {data.createdBy.name || data.createdBy.username}
              </span>
            </div>
          )}
          {isModified && data.updatedBy && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Modified by</span>
              <span className="font-medium">
                {data.updatedBy.name || data.updatedBy.username}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Utility component for displaying audit trail in cards
export function AuditTrailCard({ data, className, ...props }: AuditTrailProps) {
  return (
    <div className={cn('p-3 bg-card border rounded-lg', className)}>
      <AuditTrail data={data} variant="detailed" {...props} />
    </div>
  );
}

// Utility component for inline audit trail display
export function InlineAuditTrail({ data, className, ...props }: AuditTrailProps) {
  return (
    <AuditTrail 
      data={data} 
      variant="compact" 
      className={cn('text-xs', className)} 
      {...props} 
    />
  );
}

export default AuditTrail;
