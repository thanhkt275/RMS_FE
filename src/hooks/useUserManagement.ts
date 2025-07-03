/**
 * User Management Hook
 * Custom hook that manages user state and provides CRUD operations
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
import { userService } from '../services/user.service';

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

const initialState: UserManagementState = {
  users: [],
  totalUsers: 0,
  currentPage: 1,
  pageSize: 10,
  filters: {},
  loading: false,
  selectedUsers: [],
  stats: null,
  error: null,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export const useUserManagement = (): UseUserManagementReturn => {
  const [state, setState] = useState<UserManagementState>(initialState);

  /**
   * Update state safely
   */
  const updateState = useCallback((updates: Partial<UserManagementState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Handle errors consistently
   */
  const handleError = useCallback((error: any, operation: string) => {
    const message = error?.message || `Failed to ${operation}`;
    updateState({ 
      error: { code: 'OPERATION_FAILED', message },
      loading: false 
    });
    console.error(`User management error: ${message}`);
  }, [updateState]);

  /**
   * Build query parameters from current state
   */
  const buildQueryParams = useCallback((): UserQueryParams => ({
    page: state.currentPage,
    limit: state.pageSize,
    sortBy: state.sortBy as any,
    sortOrder: state.sortOrder,
    ...state.filters,
  }), [state.currentPage, state.pageSize, state.sortBy, state.sortOrder, state.filters]);

  /**
   * Load users with current parameters
   */
  const loadUsers = useCallback(async () => {
    try {
      updateState({ loading: true, error: null });
      const params = buildQueryParams();
      console.log('Loading users with params:', params);
      
      const response = await userService.getUsers(params);
      console.log('User service response:', response);
      
      // Handle response safely with fallbacks
      const users = Array.isArray(response?.users) ? response.users : [];
      const total = response?.pagination?.total ?? 0;
      
      updateState({
        users,
        totalUsers: total,
        loading: false,
      });
    } catch (error) {
      console.error('LoadUsers error:', error);
      handleError(error, 'load users');
    }
  }, [buildQueryParams, updateState, handleError]);

  /**
   * Refresh users (reload current page)
   */
  const refreshUsers = useCallback(() => {
    return loadUsers();
  }, [loadUsers]);

  /**
   * Create new user
   */
  const createUser = useCallback(async (userData: CreateUserRequest) => {
    try {
      updateState({ loading: true, error: null });
      await userService.createUser(userData);
      
      console.log('User created successfully');
      await loadUsers(); // Refresh the list
    } catch (error) {
      handleError(error, 'create user');
      throw error; // Re-throw for form handling
    }
  }, [updateState, handleError, loadUsers]);

  /**
   * Update existing user
   */
  const updateUser = useCallback(async (id: string, userData: UpdateUserRequest) => {
    try {
      updateState({ loading: true, error: null });
      await userService.updateUser(id, userData);
      
      console.log('User updated successfully');
      await loadUsers(); // Refresh the list
    } catch (error) {
      handleError(error, 'update user');
      throw error; // Re-throw for form handling
    }
  }, [updateState, handleError, loadUsers]);

  /**
   * Delete user
   */
  const deleteUser = useCallback(async (id: string) => {
    try {
      updateState({ loading: true, error: null });
      await userService.deleteUser(id);
      
      console.log('User deleted successfully');
      
      // Clear selection if deleted user was selected
      setState(prev => ({
        ...prev,
        selectedUsers: prev.selectedUsers.filter((userId: string) => userId !== id),
        loading: false,
      }));
      
      await loadUsers(); // Refresh the list
    } catch (error) {
      handleError(error, 'delete user');
    }
  }, [updateState, handleError, loadUsers]);

  /**
   * Change user role
   */
  const changeUserRole = useCallback(async (id: string, role: UserRole, reason: string) => {
    try {
      updateState({ loading: true, error: null });
      await userService.changeUserRole(id, { role, reason });
      
      console.log('User role changed successfully');
      await loadUsers(); // Refresh the list
    } catch (error) {
      handleError(error, 'change user role');
      throw error; // Re-throw for form handling
    }
  }, [updateState, handleError, loadUsers]);

  /**
   * Set current page
   */
  const setPage = useCallback((page: number) => {
    updateState({ currentPage: page });
  }, [updateState]);

  /**
   * Set page size
   */
  const setPageSize = useCallback((size: number) => {
    updateState({ pageSize: size, currentPage: 1 }); // Reset to first page
  }, [updateState]);

  /**
   * Update filters
   */
  const setFilters = useCallback((filters: Partial<UserFilters>) => {
    updateState({ 
      filters: { ...state.filters, ...filters },
      currentPage: 1 // Reset to first page when filtering
    });
  }, [updateState, state.filters]);

  /**
   * Set sorting
   */
  const setSorting = useCallback((field: string, direction: 'asc' | 'desc') => {
    updateState({ sortBy: field, sortOrder: direction });
  }, [updateState]);

  /**
   * Select/deselect user
   */
  const selectUser = useCallback((userId: string) => {
    setState(prev => ({
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
    updateState({
      selectedUsers: selected ? state.users.map(user => user.id) : []
    });
  }, [updateState, state.users]);

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    updateState({ selectedUsers: [] });
  }, [updateState]);

  /**
   * Bulk delete users
   * Authentication and authorization are handled by middleware
   */
  const bulkDeleteUsers = useCallback(async (userIds: string[], reason?: string) => {
    try {
      updateState({ loading: true, error: null });
      
      console.log('[UserManagement] Starting bulk delete:', { userIds, reason });
      
      const result = await userService.bulkDeleteUsers(userIds, reason);
      
      console.log(`${result.deleted} users deleted successfully`);
      
      // Clear selection and refresh
      updateState({ selectedUsers: [] });
      await loadUsers();
    } catch (error) {
      handleError(error, 'bulk delete users');
    }
  }, [updateState, handleError, loadUsers]);

  /**
   * Bulk change role
   * Authentication and authorization are handled by middleware
   */
  const bulkChangeRole = useCallback(async (userIds: string[], role: UserRole, reason?: string) => {
    try {
      updateState({ loading: true, error: null });
      
      console.log('[UserManagement] Starting bulk role change:', { userIds, role, reason });
      
      const result = await userService.bulkChangeRole(userIds, role, reason);
      
      console.log(`${result.updated} users updated successfully`);
      
      // Clear selection and refresh
      updateState({ selectedUsers: [] });
      await loadUsers();
    } catch (error) {
      handleError(error, 'bulk change role');
    }
  }, [updateState, handleError, loadUsers]);

  /**
   * Load user statistics
   */
  const loadStats = useCallback(async () => {
    try {
      const stats = await userService.getUserStats();
      updateState({ stats });
    } catch (error) {
      handleError(error, 'load statistics');
    }
  }, [updateState, handleError]);

  /**
   * Search users
   */
  const searchUsers = useCallback(async (query: string): Promise<User[]> => {
    try {
      return await userService.searchUsers(query);
    } catch (error) {
      handleError(error, 'search users');
      return [];
    }
  }, [handleError]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Load users when query parameters change
  useEffect(() => {
    loadUsers();
  }, [state.currentPage, state.pageSize, state.filters, state.sortBy, state.sortOrder]);

  // Load statistics on mount
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    ...state,
    createUser,
    updateUser,
    deleteUser,
    changeUserRole,
    loadUsers,
    refreshUsers,
    setPage,
    setPageSize,
    setFilters,
    setSorting,
    selectUser,
    selectAllUsers,
    clearSelection,
    bulkDeleteUsers,
    bulkChangeRole,
    loadStats,
    searchUsers,
    clearError,
  };
};
