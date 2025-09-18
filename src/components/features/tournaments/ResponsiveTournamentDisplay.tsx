/**
 * ResponsiveTournamentDisplay Component
 * Switches between table and card layouts based on screen size
 * Provides manual override for user preference
 */

import React, { useState, useEffect } from 'react';
import { Tournament } from '@/types/types';
import { useResponsiveLayout, ViewMode } from '@/hooks/common/use-responsive-layout';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { TournamentCardView } from './TournamentCardView';
import DataTable from '@/components/data-table/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { LayoutGrid, Table, Monitor, Smartphone, Tablet } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ResponsiveTournamentDisplayProps {
  tournaments: Tournament[];
  columns: ColumnDef<Tournament>[];
  tableState: any;
  setTableState: (state: any) => void;
  loading?: boolean;
  actionControls?: React.ReactNode[];
  emptyState?: React.ReactNode;
  onEdit: (tournament: Tournament) => void;
  onDelete: (tournament: Tournament) => void;
}

export const ResponsiveTournamentDisplay: React.FC<ResponsiveTournamentDisplayProps> = ({
  tournaments,
  columns,
  tableState,
  setTableState,
  loading = false,
  actionControls,
  emptyState,
  onEdit,
  onDelete,
}) => {
  const { screenSize, isMounted } = useResponsiveLayout();
  const [viewMode, setViewMode] = useState<ViewMode>('auto');
  const [showViewControls, setShowViewControls] = useState(false);

  // Determine the actual view to show
  const actualView = viewMode === 'auto' 
    ? (screenSize === 'mobile' ? 'cards' : 'table')
    : viewMode;

  // Show view controls on tablet and desktop
  useEffect(() => {
    setShowViewControls(screenSize !== 'mobile');
  }, [screenSize]);

  // Don't render until mounted to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-gray-500">Loading tournaments...</p>
        </div>
      </div>
    );
  }

  // Get screen size indicator icon
  const getScreenIcon = () => {
    switch (screenSize) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Screen Size Indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {getScreenIcon()}
          <span className="capitalize">{screenSize} view</span>
          {viewMode !== 'auto' && (
            <span className="text-blue-600">• Manual override</span>
          )}
        </div>

        {/* View Mode Controls - Hidden on mobile */}
        {showViewControls && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 mr-2">Display:</span>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('auto')}
                className={cn(
                  "px-3 py-1 rounded-none border-r border-gray-200 last:border-r-0",
                  viewMode === 'auto' 
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-50" 
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                Auto
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('table')}
                className={cn(
                  "px-3 py-1 rounded-none border-r border-gray-200 last:border-r-0",
                  viewMode === 'table' 
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-50" 
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <Table className="w-4 h-4 mr-1" />
                Table
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('cards')}
                className={cn(
                  "px-3 py-1 rounded-none",
                  viewMode === 'cards' 
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-50" 
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <LayoutGrid className="w-4 h-4 mr-1" />
                Cards
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Action Controls */}
      {actionControls && actionControls.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          {actionControls.map((control, index) => (
            <div key={index} className="w-full sm:w-auto">
              {control}
            </div>
          ))}
        </div>
      )}

      {/* Content Display */}
      {actualView === 'cards' ? (
        <TournamentCardView
          tournaments={tournaments}
          loading={loading}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <DataTable
            data={tournaments}
            columns={columns as ColumnDef<unknown>[]}
            tableState={tableState}
            setTableState={setTableState}
            showPagination={false}
            isLoading={loading}
            emptyState={emptyState}
            actionControls={[]} // Actions are handled above
          />
        </div>
      )}

      {/* Loading State Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-gray-600">Loading tournaments...</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ResponsiveTournamentDisplay;
