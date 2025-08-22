/**
 * Teams Table Component
 *
 * A simple table component for displaying teams with role-based actions.
 * Replaces the leaderboard-style views to show actual team data instead of rankings.
 *
 * Features:
 * - Simple table layout with team information
 * - Role-based action buttons (view, edit, delete)
 * - Loading and empty states
 * - Responsive design
 *
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Edit, Trash2, Users, Search, Filter, Calendar, Clock, Star } from "lucide-react";
import { Team } from "@/types/team.types";
import { UserRole } from "@/types/types";
import { canUserEditTeam, canUserViewTeam } from "@/hooks/teams/use-teams";
import { format, isAfter, isBefore, subDays } from "date-fns";
import DataTable, { defaultTableState } from "@/components/data-table/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface TeamsTableProps {
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

/**
 * Empty state for when no teams are found
 */
const TeamsTableEmpty = React.memo(function TeamsTableEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">No teams found</h3>
      <p className="text-muted-foreground">
        No teams have been registered for this tournament yet.
      </p>
    </div>
  );
});

export const TeamsTable = React.memo(function TeamsTable({
  teams,
  isLoading = false,
  selectedTournamentId,
  userRole,
  userId,
  userEmail,
  onViewTeam,
  onEditTeam,
  onDeleteTeam,
}: TeamsTableProps) {
  // Table state for pagination, sorting, and filtering
  const [tableState, setTableState] = useState({
    ...defaultTableState,
    pageSize: 10,
  });

  // Enhanced search and filter states
  const [searchInput, setSearchInput] = useState(""); // Raw input for immediate UI feedback
  const [debouncedSearch, setDebouncedSearch] = useState(""); // Debounced value for actual filtering
  const [memberCountFilter, setMemberCountFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [activePreset, setActivePreset] = useState("all");

  // Debounce search input (300ms as recommended)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Process teams data for the table
  const tableData = useMemo((): TeamTableData[] => {
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

  // Get unique organizations for filter dropdown
  const organizations = useMemo(() => {
    const orgs = new Set(tableData.map(team => team.organization));
    return Array.from(orgs).filter(org => org !== "N/A").sort();
  }, [tableData]);

  // Apply filter presets
  const applyFilterPreset = useCallback((preset: string) => {
    const now = new Date();
    setActivePreset(preset);
    
    switch (preset) {
      case "my-teams":
        // This will be handled in the filtering logic
        break;
      case "active-teams":
        setMemberCountFilter("small"); // Teams with 1-3 members are considered "active"
        setDateRangeFilter("last-30-days");
        break;
      case "recent-teams":
        setDateRangeFilter("last-7-days");
        break;
      case "large-teams":
        setMemberCountFilter("large");
        break;
      case "all":
      default:
        // Reset all filters
        setMemberCountFilter("all");
        setDateRangeFilter("all");
        setOrganizationFilter("all");
        break;
    }
  }, []);

  // Enhanced filtering logic with all new filters
  // Optimized dependency array to prevent unnecessary recalculations
  const filteredData = useMemo(() => {
    let filtered = tableData;

    // Global search filter (debounced)
    if (debouncedSearch) {
      const searchTerm = debouncedSearch.toLowerCase();
      filtered = filtered.filter((team) =>
        team.name.toLowerCase().includes(searchTerm) ||
        team.teamNumber.toLowerCase().includes(searchTerm) ||
        team.organization.toLowerCase().includes(searchTerm)
      );
    }

    // Member count filter
    if (memberCountFilter && memberCountFilter !== "all") {
      if (memberCountFilter === "none") {
        filtered = filtered.filter((team) => team.memberCount === 0);
      } else if (memberCountFilter === "small") {
        filtered = filtered.filter((team) => team.memberCount >= 1 && team.memberCount <= 3);
      } else if (memberCountFilter === "medium") {
        filtered = filtered.filter((team) => team.memberCount >= 4 && team.memberCount <= 6);
      } else if (memberCountFilter === "large") {
        filtered = filtered.filter((team) => team.memberCount > 6);
      }
    }

    // Date range filter
    if (dateRangeFilter && dateRangeFilter !== "all") {
      const now = new Date();
      if (dateRangeFilter === "last-7-days") {
        const sevenDaysAgo = subDays(now, 7);
        filtered = filtered.filter((team) => isAfter(team.createdDate, sevenDaysAgo));
      } else if (dateRangeFilter === "last-30-days") {
        const thirtyDaysAgo = subDays(now, 30);
        filtered = filtered.filter((team) => isAfter(team.createdDate, thirtyDaysAgo));
      } else if (dateRangeFilter === "last-90-days") {
        const ninetyDaysAgo = subDays(now, 90);
        filtered = filtered.filter((team) => isAfter(team.createdDate, ninetyDaysAgo));
      }
    }

    // Organization filter
    if (organizationFilter && organizationFilter !== "all") {
      filtered = filtered.filter((team) => team.organization === organizationFilter);
    }

    // Apply preset-specific filters
    if (activePreset === "my-teams" && userId) {
      filtered = filtered.filter((team) => team.isUserTeam);
    }

    return filtered;
  }, [
    tableData, // tableData is already memoized based on teams array
    debouncedSearch, // Only re-filter when debounced search changes
    memberCountFilter,
    dateRangeFilter,
    organizationFilter,
    activePreset,
    userId, // Only needed for "my-teams" preset
  ]);

  // Memoized event handlers
  const handleViewTeam = useCallback((teamId: string) => {
    onViewTeam?.(teamId);
  }, [onViewTeam]);

  const handleEditTeam = useCallback((teamId: string) => {
    onEditTeam?.(teamId);
  }, [onEditTeam]);

  const handleDeleteTeam = useCallback((teamId: string) => {
    onDeleteTeam?.(teamId);
  }, [onDeleteTeam]);

  // Define table columns with proper typing
  const columns = useMemo(() => {
    const cols: ColumnDef<any>[] = [
      {
        accessorKey: "name",
        header: "Team",
        cell: ({ row }: any) => {
          const team = row.original as TeamTableData;
          return (
            <div className="flex items-center">
              <div>
                <div className="text-sm font-medium text-foreground">
                  {team.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  ID: {team.id.substring(0, 8)}...
                </div>
              </div>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: "teamNumber",
        header: "Team Number",
        cell: ({ getValue }: any) => (
          <div className="text-sm text-foreground font-mono">
            {getValue() as string}
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "memberCount",
        header: "Members",
        cell: ({ getValue }: any) => (
          <div className="flex items-center">
            <Users className="h-4 w-4 text-muted-foreground mr-2" />
            <span className="text-sm text-foreground">{getValue() as number}</span>
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "organization",
        header: "Organization",
        cell: ({ getValue }: any) => (
          <div className="text-sm text-foreground max-w-xs truncate">
            {getValue() as string}
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ getValue }: any) => (
          <div className="text-sm text-foreground">
            {getValue() as string}
          </div>
        ),
        enableSorting: true,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }: any) => {
          const team = row.original as TeamTableData;
          return (
            <div className="flex items-center justify-end gap-1 sm:gap-2">
              {team.canView && onViewTeam && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewTeam(team.id)}
                  className="text-blue-400 border-blue-700 hover:bg-blue-800/30 h-8 w-8 sm:h-auto sm:w-auto sm:px-3 touch-target"
                  title="View team details"
                >
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">View</span>
                </Button>
              )}
              {team.canEdit && onEditTeam && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditTeam(team.id)}
                  className="text-yellow-400 border-yellow-700 hover:bg-yellow-800/30 h-8 w-8 sm:h-auto sm:w-auto sm:px-3 touch-target"
                  title="Edit team"
                >
                  <Edit className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Edit</span>
                </Button>
              )}
              {team.canDelete && onDeleteTeam && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteTeam(team.id)}
                  className="text-red-400 border-red-700 hover:bg-red-800/30 h-8 w-8 sm:h-auto sm:w-auto sm:px-3 touch-target"
                  title="Delete team"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Delete</span>
                </Button>
              )}
            </div>
          );
        },
        enableSorting: false,
      },
    ];
    return cols;
  }, [handleViewTeam, handleEditTeam, handleDeleteTeam]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchInput("");
    setDebouncedSearch("");
    setMemberCountFilter("all");
    setDateRangeFilter("all");
    setOrganizationFilter("all");
    setActivePreset("all");
  }, []);

  // Enhanced filter controls with presets and advanced filters
  // Mobile-responsive design with proper touch targets
  const filterControls = useMemo(() => {
    const controls = [];

    // Filter presets (quick filters) - responsive layout
    controls.push(
      <div key="presets" className="flex items-center gap-2 overflow-x-auto pb-2">
        <Star className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex gap-1 min-w-max">
          <Button
            variant={activePreset === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => applyFilterPreset("all")}
            className={`text-xs touch-target whitespace-nowrap ${
              activePreset === "all" ? "bg-blue-600 hover:bg-blue-700" : ""
            }`}
          >
            All Teams
          </Button>
          {userId && (
            <Button
              variant={activePreset === "my-teams" ? "default" : "outline"}
              size="sm"
              onClick={() => applyFilterPreset("my-teams")}
              className={`text-xs touch-target whitespace-nowrap ${
                activePreset === "my-teams" ? "bg-green-600 hover:bg-green-700" : ""
              }`}
            >
              My Teams
            </Button>
          )}
          <Button
            variant={activePreset === "active-teams" ? "default" : "outline"}
            size="sm"
            onClick={() => applyFilterPreset("active-teams")}
            className={`text-xs touch-target whitespace-nowrap ${
              activePreset === "active-teams" ? "bg-orange-600 hover:bg-orange-700" : ""
            }`}
          >
            Active Teams
          </Button>
          <Button
            variant={activePreset === "recent-teams" ? "default" : "outline"}
            size="sm"
            onClick={() => applyFilterPreset("recent-teams")}
            className={`text-xs touch-target whitespace-nowrap ${
              activePreset === "recent-teams" ? "bg-purple-600 hover:bg-purple-700" : ""
            }`}
          >
            Recent Teams
          </Button>
          <Button
            variant={activePreset === "large-teams" ? "default" : "outline"}
            size="sm"
            onClick={() => applyFilterPreset("large-teams")}
            className={`text-xs touch-target whitespace-nowrap ${
              activePreset === "large-teams" ? "bg-red-600 hover:bg-red-700" : ""
            }`}
          >
            Large Teams
          </Button>
        </div>
      </div>
    );

    // Global search with debounced input - mobile responsive
    controls.push(
      <div key="search" className="flex items-center gap-2 w-full md:w-auto">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="relative flex-1 md:flex-initial">
          <Input
            placeholder="Search teams, numbers, organizations..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full md:w-80 bg-background border-border text-foreground pr-8 h-10 touch-target"
          />
          {searchInput !== debouncedSearch && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      </div>
    );

    // Responsive filter controls - stack on mobile
    const responsiveFilters = [
      // Member count filter
      <div key="members" className="flex items-center gap-2 w-full sm:w-auto">
        <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Select value={memberCountFilter} onValueChange={setMemberCountFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-background border-border text-foreground h-10 touch-target">
            <SelectValue placeholder="Filter by size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sizes</SelectItem>
            <SelectItem value="none">No members (0)</SelectItem>
            <SelectItem value="small">Small (1-3)</SelectItem>
            <SelectItem value="medium">Medium (4-6)</SelectItem>
            <SelectItem value="large">Large (7+)</SelectItem>
          </SelectContent>
        </Select>
      </div>,

      // Date range filter
      <div key="daterange" className="flex items-center gap-2 w-full sm:w-auto">
        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-background border-border text-foreground h-10 touch-target">
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="last-7-days">Last 7 days</SelectItem>
            <SelectItem value="last-30-days">Last 30 days</SelectItem>
            <SelectItem value="last-90-days">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>,
    ];

    // Organization filter (only show if there are multiple organizations)
    if (organizations.length > 1) {
      responsiveFilters.push(
        <div key="organization" className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-background border-border text-foreground h-10 touch-target">
              <SelectValue placeholder="Filter by organization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All organizations</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org} value={org}>
                  {org}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Wrap responsive filters in a responsive container
    controls.push(
      <div key="responsive-filters" className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2 w-full lg:w-auto">
        {responsiveFilters}
      </div>
    );

    return controls;
  }, [
    activePreset,
    applyFilterPreset,
    userId,
    searchInput,
    debouncedSearch,
    memberCountFilter,
    dateRangeFilter,
    organizationFilter,
    organizations,
  ]);

  // Action controls with mobile-responsive design
  const actionControls = useMemo(() => {
    const hasActiveFilters = searchInput || 
      memberCountFilter !== "all" || 
      dateRangeFilter !== "all" || 
      organizationFilter !== "all" || 
      activePreset !== "all";

    return [
      <Button
        key="clear"
        variant="outline"
        size="sm"
        onClick={clearFilters}
        disabled={!hasActiveFilters}
        className="text-muted-foreground border-border hover:bg-muted h-10 touch-target"
      >
        Clear Filters
      </Button>,
    ];
  }, [clearFilters, searchInput, memberCountFilter, dateRangeFilter, organizationFilter, activePreset]);

  return (
    <DataTable
      data={filteredData}
      columns={columns as any}
      totalCount={filteredData.length}
      isLoading={isLoading}
      showPagination={true}
      tableState={tableState}
      setTableState={setTableState}
      filterControls={filterControls}
      actionControls={actionControls}
      emptyState={<TeamsTableEmpty />}
    />
  );
});
