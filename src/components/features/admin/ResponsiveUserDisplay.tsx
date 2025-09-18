/**
 * ResponsiveUserDisplay Component
 * Intelligently switches between table and card layouts based on screen size
 * Optimized for tablet devices (8-12 inch) with dedicated responsive handling
 */

import React, { useState, useMemo } from 'react';
import { User } from '../../../types/user.types';
import { useResponsiveLayout, ViewMode } from '../../../hooks/common/use-responsive-layout';
import { Button } from '../../ui/button';
import { LayoutGrid, Table, Monitor } from 'lucide-react';
import { cn } from '../../../lib/utils';
import UserTable from './UserTable';
import UserCardView from './UserCardView';

interface ResponsiveUserDisplayProps {
  users: User[];
  selectedUsers: string[];
  sortConfig: { field: keyof User; direction: 'asc' | 'desc' } | null;
  loading?: boolean;
  onSelectUser: (userId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onSort: (field: keyof User) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onViewProfile: (user: User) => void;
  onChangeRole: (user: User) => void;
}

export const ResponsiveUserDisplay: React.FC<ResponsiveUserDisplayProps> = ({
  users,
  selectedUsers,
  sortConfig,
  loading = false,
  onSelectUser,
  onSelectAll,
  onSort,
  onEdit,
  onDelete,
  onViewProfile,
  onChangeRole,
}) => {
  const { screenSize, isMounted } = useResponsiveLayout();
  const [userViewMode, setUserViewMode] = useState<ViewMode>('auto');

  // Determine effective view mode
  const effectiveViewMode = useMemo(() => {
    if (userViewMode === 'table') return 'table';
    if (userViewMode === 'cards') return 'cards';
    
    // Auto mode: use screen size
    return screenSize === 'mobile' ? 'cards' : 'table';
  }, [userViewMode, screenSize]);

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
      {/* View Mode Toggle (show on tablet and desktop) */}
      {screenSize !== 'mobile' && (
        <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            {users.length} {users.length === 1 ? 'user' : 'users'} found
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 mr-2">View:</span>
            <div className="flex rounded-lg border border-gray-300 bg-white p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUserViewMode('auto')}
                className={cn(
                  "px-3 py-1 text-xs transition-all h-8",
                  userViewMode === 'auto'
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Monitor className="h-3 w-3 mr-1" />
                Auto
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUserViewMode('table')}
                className={cn(
                  "px-3 py-1 text-xs transition-all h-8",
                  userViewMode === 'table'
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
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
                  "px-3 py-1 text-xs transition-all h-8",
                  userViewMode === 'cards'
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
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
          <UserCardView
            users={users}
            selectedUsers={selectedUsers}
            loading={loading}
            onSelectUser={onSelectUser}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewProfile={onViewProfile}
            onChangeRole={onChangeRole}
          />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <UserTable
              users={users}
              selectedUsers={selectedUsers}
              sortConfig={sortConfig}
              loading={loading}
              onSelectUser={onSelectUser}
              onSelectAll={onSelectAll}
              onSort={onSort}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewProfile={onViewProfile}
              onChangeRole={onChangeRole}
            />
          </div>
        )}
      </div>

      {/* View Mode Indicator (mobile only) */}
      {screenSize === 'mobile' && (
        <div className="text-center mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-600">
            <LayoutGrid className="h-3 w-3" />
            Mobile card view
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponsiveUserDisplay;
