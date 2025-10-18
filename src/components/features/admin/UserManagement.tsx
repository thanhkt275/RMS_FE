/**
 * UserManagement Component
 * Main dashboard for user management functionality
 */

import React, { useState, useCallback } from 'react';
import { User, UserRole } from '../../../types/user.types';
import { useUserManagement } from '../../../hooks/users/use-user-management';
import { useResponsiveLayout } from '../../../hooks/common/use-responsive-layout';
import UserStats from './UserStats';
import { AdvancedUserSearch } from './UserSearch';
import BulkActions from './BulkActions';
import ResponsiveUserDisplay from './ResponsiveUserDisplay';
import UserForm from './UserForm';
import BulkUserCreation from './BulkUserCreation';

export const UserManagement: React.FC = () => {
  const { screenSize, isMounted } = useResponsiveLayout();
  const {
    users,
    loading,
    selectedUsers,
    stats,
    error,
    currentPage,
    pageSize,
    totalUsers,
    filters,
    sortBy,
    sortOrder,
    setPage,
    setPageSize,
    setFilters,
    setSorting,
    selectUser,
    selectAllUsers,
    clearSelection,
    bulkDeleteUsers,
    bulkChangeRole,
    createUser,
    updateUser,
    deleteUser,
    changeUserRole,
    refreshUsers,
    clearError,
  } = useUserManagement();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleChangeUser, setRoleChangeUser] = useState<User | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>(null);

  /**
   * Handle search submission
   */
  const handleSearch = useCallback((query: string) => {
    setFilters({ search: query });
  }, [setFilters]);

  /**
   * Handle role filter
   */
  const handleRoleFilter = useCallback((role: string | null) => {
    setFilters({ role: role as UserRole || undefined });
  }, [setFilters]);

  /**
   * Handle status filter
   */
  const handleStatusFilter = useCallback((status: boolean | null) => {
    setFilters({ isActive: status || undefined });
  }, [setFilters]);

  /**
  * Handle user creation
  */
  const handleCreateUser = useCallback(() => {
  setShowCreateModal(true);
  }, []);

  /**
    * Handle bulk user creation
    */
  const handleBulkCreateUsers = useCallback(() => {
    setShowBulkCreateModal(true);
  }, []);

  /**
   * Handle user editing
   */
  const handleEditUser = useCallback((user: User) => {
    setEditingUser(user);
  }, []);

  /**
   * Handle user deletion with confirmation
   */
  const handleDeleteUser = useCallback(async (user: User) => {
    if (window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      await deleteUser(user.id);
    }
  }, [deleteUser]);

  /**
   * Handle role change modal
   */
  const handleChangeRole = useCallback((user: User) => {
    setRoleChangeUser(user);
    setShowRoleModal(true);
  }, []);

  /**
   * Handle view user profile
   */
  const handleViewProfile = useCallback((user: User) => {
    setProfileUser(user);
    setShowProfileModal(true);
  }, []);

  /**
   * Handle form submissions
   */
  const handleCreateSubmit = useCallback(async (data: any) => {
    await createUser(data);
    setShowCreateModal(false);
  }, [createUser]);

  const handleEditSubmit = useCallback(async (data: any) => {
    if (editingUser) {
      await updateUser(editingUser.id, data);
      setEditingUser(null);
    }
  }, [editingUser, updateUser]);

  const handleRoleSubmit = useCallback(async (role: UserRole, reason: string) => {
    if (roleChangeUser) {
      await changeUserRole(roleChangeUser.id, role, reason);
      setRoleChangeUser(null);
      setShowRoleModal(false);
    }
  }, [roleChangeUser, changeUserRole]);

  /**
   * Handle sorting change
   */
  const handleSort = useCallback((field: keyof User) => {
    const newDirection = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSorting(field as string, newDirection);
  }, [sortBy, sortOrder, setSorting]);

  /**
   * Calculate pagination info
   */
  const totalPages = Math.ceil(totalUsers / pageSize);

  // Show loading state if not mounted yet to prevent hydration issues
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">User Management</h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-700 font-medium">
                Manage users, roles, and permissions across your tournament system
              </p>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <button
              onClick={refreshUsers}
              disabled={loading}
              className="flex items-center px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 transition-all duration-200 shadow-sm touch-target"
              >
              <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
              onClick={handleBulkCreateUsers}
              className="flex items-center px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg touch-target"
              >
              <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="hidden sm:inline">Bulk</span>
              <span className="sm:inline"> Create</span>
              </button>

              <button
                onClick={handleCreateUser}
                className="flex items-center px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg touch-target"
              >
                <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="sm:inline">Create</span>
                <span className="hidden sm:inline"> User</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 sm:mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-3 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm sm:text-base text-red-800 font-medium">{error.message}</span>
              </div>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-600 transition-colors p-1 touch-target"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Statistics - Stack on mobile, grid on tablet+ */}
        <div className="mb-4 sm:mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <UserStats stats={stats || {
            ADMIN: 0,
            HEAD_REFEREE: 0,
            ALLIANCE_REFEREE: 0,
            TEAM_LEADER: 0,
            TEAM_MEMBER: 0,
            COMMON: 0,
          }} loading={loading} />
        </div>

        {/* Search and Filters */}
        <div className="mb-4 sm:mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <AdvancedUserSearch
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleSearch}
            onRoleFilter={handleRoleFilter}
            onStatusFilter={handleStatusFilter}
            selectedRole={filters.role}
            selectedStatus={filters.isActive}
            placeholder="Search users by name, email, or phone..."
          />
        </div>

        {/* Bulk Actions - Responsive layout */}
        <div className="mb-4 bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
          <BulkActions
            selectedUsers={selectedUsers}
            onBulkDelete={bulkDeleteUsers}
            onBulkChangeRole={bulkChangeRole}
            disabled={loading}
          />
        </div>

        {/* Responsive Users Display */}
        <ResponsiveUserDisplay
          users={users}
          selectedUsers={selectedUsers}
          sortConfig={sortBy ? { field: sortBy as keyof User, direction: sortOrder } : null}
          loading={loading}
          onSelectUser={selectUser}
          onSelectAll={selectAllUsers}
          onSort={handleSort}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          onViewProfile={handleViewProfile}
          onChangeRole={handleChangeRole}
        />

        {/* Pagination - Responsive */}
        {totalPages > 1 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs sm:text-sm text-gray-700 font-medium text-center sm:text-left">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
              </div>
              
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <button
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 touch-target"
                >
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </button>
                
                {/* Page Numbers - Show fewer on mobile */}
                {Array.from({ length: Math.min(screenSize === 'mobile' ? 3 : 5, totalPages) }, (_, i) => {
                  const page = i + Math.max(1, currentPage - (screenSize === 'mobile' ? 1 : 2));
                  if (page > totalPages) return null;
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setPage(page)}
                      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 touch-target ${
                        page === currentPage
                          ? 'text-white bg-blue-600 shadow-md'
                          : 'text-gray-600 bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 touch-target"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <UserForm
        user={editingUser}
        isOpen={showCreateModal || !!editingUser}
        onClose={() => {
          setShowCreateModal(false);
          setEditingUser(null);
        }}
        onSubmit={editingUser ? handleEditSubmit : handleCreateSubmit}
        loading={loading}
      />

      {showBulkCreateModal && (
        <BulkUserCreation
          isOpen={showBulkCreateModal}
          onClose={() => setShowBulkCreateModal(false)}
          onSuccess={() => {
            setShowBulkCreateModal(false);
            refreshUsers();
          }}
        />
      )}

      {/* TODO: Add RoleChangeModal */}
      {/* TODO: Add UserProfile modal */}
    </div>
  );
};

export default UserManagement;
