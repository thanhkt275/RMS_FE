/**
 * User Management Hook
 * Custom hook that manages user state and provides CRUD operations using TanStack Query
 * 
 * Authentication and authorization are handled by middleware.ts
 * This hook focuses solely on user management business logic (Single Responsibility Principle)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserFilters,
  UserQueryParams,
  UserStats,
  UserRole,
  UserManagementState,
} from '../types/user.types';
import {
  useUsers,
  useUserStats,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useChangeUserRole,
  useBulkDeleteUsers,
  useBulkChangeRole,
  useSearchUsers,
} from './api/use-users';

interface UseUserManagementReturn extends UserManagementState {
  // User CRUD operations
  createUser: (userData: CreateUserRequest) => Promise<void>;
  updateUser: (id: string, userData: UpdateUserRequest) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  changeUserRole: (id: string, role: UserRole, reason: string) => Promise<void>;
  
  // List management
  loadUsers: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setFilters: (filters: Partial<UserFilters>) => void;
  setSorting: (field: string, direction: 'asc' | 'desc') => void;
  
  // Selection management
  selectUser: (userId: string) => void;
  selectAllUsers: (selected: boolean) => void;
  clearSelection: () => void;
  
  // Bulk operations
  bulkDeleteUsers: (userIds: string[], reason?: string) => Promise<void>;
  bulkChangeRole: (userIds: string[], role: UserRole, reason?: string) => Promise<void>;
  
  // Statistics
  loadStats: () => Promise<void>;
  
  // Search
  searchUsers: (query: string) => Promise<User[]>;
  
  // Error handling
  clearError: () => void;
}

const initialFilters: UserFilters = {};

const initialState = {
  currentPage: 1,
  pageSize: 10,
  filters: initialFilters,
  selectedUsers: [] as string[],
  sortBy: 'createdAt',
  sortOrder: 'desc' as 'asc' | 'desc',
};

export const useUserManagement = (): UseUserManagementReturn => {
  const [localState, setLocalState] = useState(initialState);

  // Build query parameters for TanStack Query
  const queryParams: UserQueryParams = {
    page: localState.currentPage,
    limit: localState.pageSize,
    sortBy: localState.sortBy as any,
    sortOrder: localState.sortOrder,
    ...localState.filters,
  };

  // TanStack Query hooks
  const { 
    data: usersResponse, 
    isLoading: usersLoading, 
    error: usersError,
    refetch: refetchUsers 
  } = useUsers(queryParams);

  const { 
    data: stats, 
    isLoading: statsLoading, 
    error: statsError,
    refetch: refetchStats 
  } = useUserStats();

  // Mutation hooks
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const changeRoleMutation = useChangeUserRole();
  const bulkDeleteMutation = useBulkDeleteUsers();
  const bulkRoleMutation = useBulkChangeRole();

  /**
   * Update local state safely
   */
  const updateLocalState = useCallback((updates: Partial<typeof localState>) => {
    setLocalState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Get combined loading state
   */
  const loading = usersLoading || 
                 createUserMutation.isPending || 
                 updateUserMutation.isPending || 
                 deleteUserMutation.isPending || 
                 changeRoleMutation.isPending ||
                 bulkDeleteMutation.isPending ||
                 bulkRoleMutation.isPending;

  /**
   * Get combined error state
   */
  const error = usersError || statsError ? {
    code: 'OPERATION_FAILED',
    message: (usersError?.message || statsError?.message || 'An error occurred')
  } : null;

  /**
   * Create new user
   */
  const createUser = useCallback(async (userData: CreateUserRequest) => {
    await createUserMutation.mutateAsync(userData);
  }, [createUserMutation]);

  /**
   * Update existing user
   */
  const updateUser = useCallback(async (id: string, userData: UpdateUserRequest) => {
    await updateUserMutation.mutateAsync({ id, userData });
  }, [updateUserMutation]);

  /**
   * Delete user
   */
  const deleteUser = useCallback(async (id: string) => {
    await deleteUserMutation.mutateAsync(id);
    
    // Clear selection if deleted user was selected
    setLocalState(prev => ({
      ...prev,
      selectedUsers: prev.selectedUsers.filter((userId: string) => userId !== id),
    }));
  }, [deleteUserMutation]);

  /**
   * Change user role
   */
  const changeUserRole = useCallback(async (id: string, role: UserRole, reason: string) => {
    await changeRoleMutation.mutateAsync({ id, roleData: { role, reason } });
  }, [changeRoleMutation]);

  /**
   * Load users (refresh current query)
   */
  const loadUsers = useCallback(async () => {
    await refetchUsers();
  }, [refetchUsers]);

  /**
   * Refresh users (same as loadUsers for compatibility)
   */
  const refreshUsers = useCallback(async () => {
    await refetchUsers();
  }, [refetchUsers]);

  /**
   * Set current page
   */
  const setPage = useCallback((page: number) => {
    updateLocalState({ currentPage: page });
  }, [updateLocalState]);

  /**
   * Set page size
   */
  const setPageSize = useCallback((size: number) => {
    updateLocalState({ pageSize: size, currentPage: 1 }); // Reset to first page
  }, [updateLocalState]);

  /**
   * Update filters
   */
  const setFilters = useCallback((filters: Partial<UserFilters>) => {
    updateLocalState({ 
      filters: { ...localState.filters, ...filters },
      currentPage: 1 // Reset to first page when filtering
    });
  }, [updateLocalState, localState.filters]);

  /**
   * Set sorting
   */
  const setSorting = useCallback((field: string, direction: 'asc' | 'desc') => {
    updateLocalState({ sortBy: field, sortOrder: direction });
  }, [updateLocalState]);

  /**
   * Select/deselect user
   */
  const selectUser = useCallback((userId: string) => {
    setLocalState(prev => ({
      ...prev,
      selectedUsers: prev.selectedUsers.includes(userId)
        ? prev.selectedUsers.filter((id: string) => id !== userId)
        : [...prev.selectedUsers, userId]
    }));
  }, []);

  /**
   * Select/deselect all users
   */
  const selectAllUsers = useCallback((selected: boolean) => {
    const users = usersResponse?.users || [];
    updateLocalState({
      selectedUsers: selected ? users.map(user => user.id) : []
    });
  }, [updateLocalState, usersResponse?.users]);

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    updateLocalState({ selectedUsers: [] });
  }, [updateLocalState]);

  /**
   * Bulk delete users
   */
  const bulkDeleteUsers = useCallback(async (userIds: string[], reason?: string) => {
    await bulkDeleteMutation.mutateAsync({ userIds, reason });
    
    // Clear selection after successful delete
    updateLocalState({ selectedUsers: [] });
  }, [bulkDeleteMutation, updateLocalState]);

  /**
   * Bulk change role
   */
  const bulkChangeRole = useCallback(async (userIds: string[], role: UserRole, reason?: string) => {
    await bulkRoleMutation.mutateAsync({ userIds, role, reason });
    
    // Clear selection after successful role change
    updateLocalState({ selectedUsers: [] });
  }, [bulkRoleMutation, updateLocalState]);

  /**
   * Load user statistics
   */
  const loadStats = useCallback(async () => {
    await refetchStats();
  }, [refetchStats]);

  /**
   * Search users - using a separate hook for search functionality
   */
  const searchUsers = useCallback(async (query: string): Promise<User[]> => {
    // For search, we would typically use a separate hook or implement it differently
    // For now, returning empty array as this needs to be handled separately
    console.warn('Search functionality needs to be implemented with useSearchUsers hook');
    return [];
  }, []);

  /**
   * Clear error (for compatibility - TanStack Query handles this automatically)
   */
  const clearError = useCallback(() => {
    // TanStack Query automatically handles error clearing on retry/refetch
    console.log('Error clearing is handled automatically by TanStack Query');
  }, []);

  // Extract data from TanStack Query responses
  const users = usersResponse?.users || [];
  const totalUsers = usersResponse?.pagination?.total || 0;

  return {
    // State
    users,
    totalUsers,
    currentPage: localState.currentPage,
    pageSize: localState.pageSize,
    filters: localState.filters,
    loading,
    selectedUsers: localState.selectedUsers,
    stats: stats || null,
    error,
    sortBy: localState.sortBy,
    sortOrder: localState.sortOrder,

    // User CRUD operations
    createUser,
    updateUser,
    deleteUser,
    changeUserRole,
    
    // List management
    loadUsers,
    refreshUsers,
    setPage,
    setPageSize,
    setFilters,
    setSorting,
    
    // Selection management
    selectUser,
    selectAllUsers,
    clearSelection,
    
    // Bulk operations
    bulkDeleteUsers,
    bulkChangeRole,
    
    // Statistics
    loadStats,
    
    // Search
    searchUsers,
    
    // Error handling
    clearError,
  };
};
