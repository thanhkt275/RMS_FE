/**
 * Mobile-Optimized Teams Card View Component
 *
 * Provides a card-based layout optimized for mobile devices and small screens.
 * Features touch-friendly interactions, swipe gestures, and responsive design.
 *
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

"use client";

import { useMemo, useState, useCallback } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, Edit, Trash2, Users, Calendar, Building, MoreVertical, ChevronRight } from "lucide-react";
import { Team } from "@/types/team.types";
import { UserRole } from "@/types/types";
import { canUserEditTeam, canUserViewTeam } from "@/hooks/teams/use-teams";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface TeamTableData {
  id: string;
  name: string;
  teamNumber: string;
  memberCount: number;
  organization: string;
  createdAt: string;
  createdDate: Date;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isUserTeam?: boolean;
}

interface TeamsCardViewProps {
  teams: TeamTableData[];
  isLoading?: boolean;
  onViewTeam?: (teamId: string) => void;
  onEditTeam?: (teamId: string) => void;
  onDeleteTeam?: (teamId: string) => void;
}

/**
 * Individual Team Card Component
 */
const TeamCard = React.memo(function TeamCard({
  team,
  onViewTeam,
  onEditTeam,
  onDeleteTeam,
}: {
  team: TeamTableData;
  onViewTeam?: (teamId: string) => void;
  onEditTeam?: (teamId: string) => void;
  onDeleteTeam?: (teamId: string) => void;
}) {
  const [isSwipeMenuOpen, setIsSwipeMenuOpen] = useState(false);

  const handleViewTeam = useCallback(() => {
    onViewTeam?.(team.id);
  }, [onViewTeam, team.id]);

  const handleEditTeam = useCallback(() => {
    onEditTeam?.(team.id);
  }, [onEditTeam, team.id]);

  const handleDeleteTeam = useCallback(() => {
    onDeleteTeam?.(team.id);
  }, [onDeleteTeam, team.id]);

  // Touch/swipe gesture handlers (simplified for now, can be enhanced with react-use-gesture)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Store initial touch position for swipe detection
    e.currentTarget.setAttribute('data-touch-start', e.touches[0].clientX.toString());
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchStart = e.currentTarget.getAttribute('data-touch-start');
    if (!touchStart) return;

    const touchEnd = e.changedTouches[0].clientX;
    const touchStartX = parseInt(touchStart);
    const diff = touchStartX - touchEnd;

    // Swipe left to show actions (threshold: 50px)
    if (diff > 50) {
      setIsSwipeMenuOpen(true);
    }
    // Swipe right to hide actions
    else if (diff < -50) {
      setIsSwipeMenuOpen(false);
    }
  }, []);

  return (
    <Card 
      className={`
        relative transition-all duration-200 ease-in-out
        ${team.isUserTeam ? 'bg-blue-950/30 border-blue-700' : 'bg-card border-border'}
        hover:bg-muted/50 hover:border-muted-foreground/20
        active:scale-[0.98] active:bg-muted/70
        touch-pan-x
      `}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="text-lg font-semibold text-foreground truncate">
              {team.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge 
                variant="outline" 
                className="text-xs font-mono bg-muted border-border text-muted-foreground"
              >
                #{team.teamNumber}
              </Badge>
              {team.isUserTeam && (
                <Badge 
                  variant="default" 
                  className="text-xs bg-blue-600 hover:bg-blue-700"
                >
                  My Team
                </Badge>
              )}
            </div>
          </div>
          
          {/* Action Menu */}
          <div className="flex items-center gap-2">
            {/* Primary action button (View) */}
            {team.canView && onViewTeam && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewTeam}
                className="h-8 w-8 p-0 text-blue-400 hover:bg-blue-800/30 touch-target"
                aria-label="View team details"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            
            {/* Dropdown menu for secondary actions */}
            {(team.canEdit || team.canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted touch-target"
                    aria-label="More actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {team.canView && onViewTeam && (
                    <DropdownMenuItem onClick={handleViewTeam} className="touch-target">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                  )}
                  {team.canEdit && onEditTeam && (
                    <>
                      {team.canView && <DropdownMenuSeparator />}
                      <DropdownMenuItem onClick={handleEditTeam} className="touch-target">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Team
                      </DropdownMenuItem>
                    </>
                  )}
                  {team.canDelete && onDeleteTeam && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleDeleteTeam} 
                        className="text-red-400 focus:text-red-300 touch-target"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Team
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* Members Count */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-foreground">
              {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}
            </span>
          </div>
          
          {/* Created Date */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-foreground truncate">{team.createdAt}</span>
          </div>
        </div>
        
        {/* Organization (full width) */}
        <div className="flex items-center gap-2 mt-3 text-sm">
          <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-foreground truncate">{team.organization}</span>
        </div>
        
        {/* Team ID (for technical users) */}
        <div className="mt-2 text-xs text-muted-foreground font-mono">
          ID: {team.id.substring(0, 8)}...
        </div>
      </CardContent>
      
      {/* Swipe Action Overlay */}
      {isSwipeMenuOpen && (
        <div 
          className="absolute inset-0 bg-background/80 flex items-center justify-end pr-4 rounded-lg transition-opacity duration-200"
          onClick={() => setIsSwipeMenuOpen(false)}
        >
          <div className="flex gap-2">
            {team.canEdit && onEditTeam && (
              <Button
                size="sm"
                onClick={handleEditTeam}
                className="bg-yellow-600 hover:bg-yellow-700 touch-target"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {team.canDelete && onDeleteTeam && (
              <Button
                size="sm"
                onClick={handleDeleteTeam}
                className="bg-red-600 hover:bg-red-700 touch-target"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
});

/**
 * Mobile Teams Card List Component
 */
export const TeamsCardView = React.memo(function TeamsCardView({
  teams,
  isLoading = false,
  onViewTeam,
  onEditTeam,
  onDeleteTeam,
}: TeamsCardViewProps) {
  if (isLoading) {
    return <TeamsCardSkeleton />;
  }

  if (teams.length === 0) {
    return <TeamsCardEmpty />;
  }

  return (
    <div className="space-y-4">
      {teams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          onViewTeam={onViewTeam}
          onEditTeam={onEditTeam}
          onDeleteTeam={onDeleteTeam}
        />
      ))}
    </div>
  );
});

/**
 * Skeleton loader for mobile cards
 */
const TeamsCardSkeleton = React.memo(function TeamsCardSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-muted rounded animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                </div>
              </div>
              <div className="h-8 w-8 bg-muted rounded animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-4 bg-muted rounded animate-pulse mt-3" />
            <div className="h-3 w-24 bg-muted rounded animate-pulse mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

/**
 * Empty state for mobile cards
 */
const TeamsCardEmpty = React.memo(function TeamsCardEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">No teams found</h3>
      <p className="text-muted-foreground max-w-sm">
        No teams have been registered for this tournament yet, or they don't match your current filters.
      </p>
    </div>
  );
});