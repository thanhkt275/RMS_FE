/**
 * Responsive Teams Display Component
 *
 * Automatically switches between table and card layouts based on screen size.
 * Provides optimized experiences for desktop (table) and mobile (cards).
 *
 * Features:
 * - Responsive breakpoint detection
 * - Smooth transitions between layouts
 * - Touch-friendly mobile interactions
 * - Consistent filtering and search across layouts
 *
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

"use client";

import { useMemo, useState, useEffect } from "react";
import React from "react";
import { Team } from "@/types/team.types";
import { UserRole } from "@/types/types";
import { canUserEditTeam, canUserViewTeam } from "@/hooks/teams/use-teams";
import { format } from "date-fns";
import { TeamsTable } from "./TeamsTable";
import { TeamsCardView } from "./TeamsCardView";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Table } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResponsiveTeamsDisplayProps {
  teams: Team[];
  isLoading?: boolean;
  selectedTournamentId: string;
  userRole: UserRole | null;
  userId?: string;
  userEmail?: string | null;
  onViewTeam?: (teamId: string) => void;
  onEditTeam?: (teamId: string) => void;
  onDeleteTeam?: (teamId: string) => void;
}

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

type ViewMode = 'auto' | 'table' | 'cards';

/**
 * Hook to detect screen size and determine appropriate layout
 */
function useResponsiveLayout() {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
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

/**
 * Main Responsive Teams Display Component
 */
export const ResponsiveTeamsDisplay = React.memo(function ResponsiveTeamsDisplay({
  teams,
  isLoading = false,
  selectedTournamentId,
  userRole,
  userId,
  userEmail,
  onViewTeam,
  onEditTeam,
  onDeleteTeam,
}: ResponsiveTeamsDisplayProps) {
  const { screenSize, isMounted } = useResponsiveLayout();
  const [userViewMode, setUserViewMode] = useState<ViewMode>('auto');

  // Determine effective view mode
  const effectiveViewMode = useMemo(() => {
    if (userViewMode === 'table') return 'table';
    if (userViewMode === 'cards') return 'cards';
    
    // Auto mode: use screen size
    return screenSize === 'mobile' ? 'cards' : 'table';
  }, [userViewMode, screenSize]);

  // Process teams data for display
  const processedTeams = useMemo((): TeamTableData[] => {
    if (!userRole) return [];
    
    return teams
      .filter((team) => canUserViewTeam(team, userRole, userId, userEmail))
      .map((team) => {
        const memberCount = team.teamMemberCount ?? team._count?.teamMembers ?? team.teamMembers?.length ?? 0;
        const organization = team.teamMembers?.[0]?.organization || team.user?.email || "N/A";
        const createdDate = new Date(team.createdAt);
        const isUserTeam = team.userId === userId || 
          team.teamMembers?.some(member => member.email === userEmail);
        
        return {
          id: team.id,
          name: team.name,
          teamNumber: team.teamNumber || "N/A",
          memberCount,
          organization,
          createdAt: format(createdDate, "MMM d, yyyy"),
          createdDate,
          canView: canUserViewTeam(team, userRole, userId, userEmail),
          canEdit: canUserEditTeam(team, userRole, userId),
          canDelete: canUserEditTeam(team, userRole, userId) && userRole === UserRole.ADMIN,
          isUserTeam,
        };
      });
  }, [teams, userRole, userId, userEmail]);

  // Don't render until mounted to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Mode Toggle (only show on tablet/desktop) */}
      {screenSize !== 'mobile' && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {processedTeams.length} {processedTeams.length === 1 ? 'team' : 'teams'} found
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground mr-2">View:</span>
            <div className="flex rounded-lg border border-border bg-card p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUserViewMode('auto')}
                className={cn(
                  "px-3 py-1 text-xs transition-all",
                  userViewMode === 'auto'
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Auto
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUserViewMode('table')}
                className={cn(
                  "px-3 py-1 text-xs transition-all",
                  userViewMode === 'table'
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Table className="h-3 w-3 mr-1" />
                Table
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUserViewMode('cards')}
                className={cn(
                  "px-3 py-1 text-xs transition-all",
                  userViewMode === 'cards'
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3 w-3 mr-1" />
                Cards
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Display Content */}
      <div className="transition-all duration-300 ease-in-out">
        {effectiveViewMode === 'cards' ? (
          <TeamsCardView
            teams={processedTeams}
            isLoading={isLoading}
            onViewTeam={onViewTeam}
            onEditTeam={onEditTeam}
            onDeleteTeam={onDeleteTeam}
          />
        ) : (
          <TeamsTable
            teams={teams}
            isLoading={isLoading}
            selectedTournamentId={selectedTournamentId}
            userRole={userRole}
            userId={userId}
            userEmail={userEmail}
            onViewTeam={onViewTeam}
            onEditTeam={onEditTeam}
            onDeleteTeam={onDeleteTeam}
          />
        )}
      </div>

      {/* View Mode Indicator (mobile only) */}
      {screenSize === 'mobile' && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-card border border-border rounded-full text-xs text-muted-foreground">
            <LayoutGrid className="h-3 w-3" />
            Mobile card view
          </div>
        </div>
      )}
    </div>
  );
});

export default ResponsiveTeamsDisplay;