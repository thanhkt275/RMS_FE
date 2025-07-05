/**
 * TanStack Query hooks for user management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { userService } from '../../services/user.service';
import { QueryKeys } from '../../lib/query-keys';
import {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  ChangeRoleRequest,
  UserQueryParams,
  UserListResponse,
  UserStats,
  AuditLog,
} from '../../types/user.types';

// ========================= QUERIES =========================

/**
 * Hook to fetch paginated users with filters
 */
export function useUsers(params: UserQueryParams) {
  return useQuery<UserListResponse>({
    queryKey: QueryKeys.users.all(params),
    queryFn: () => userService.getUsers(params),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to fetch a specific user by ID
 */
export function useUser(id: string, enabled: boolean = true) {
  return useQuery<User>({
    queryKey: QueryKeys.users.byId(id),
    queryFn: () => userService.getUserById(id),
    enabled: enabled && !!id,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to search users
 */
export function useSearchUsers(query: string, limit: number = 20, enabled: boolean = true) {
  return useQuery<User[]>({
    queryKey: QueryKeys.users.search(query, limit),
    queryFn: () => userService.searchUsers(query, limit),
    enabled: enabled && query.length > 0,
    staleTime: 10000, // 10 seconds
  });
}

/**
 * Hook to fetch user statistics
 */
export function useUserStats() {
  return useQuery<UserStats>({
    queryKey: QueryKeys.users.stats(),
    queryFn: () => userService.getUserStats(),
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to fetch user audit logs
 */
export function useUserAuditLogs(userId: string, enabled: boolean = true) {
  return useQuery<AuditLog[]>({
    queryKey: QueryKeys.users.auditLogs(userId),
    queryFn: () => userService.getUserAuditLogs(userId),
    enabled: enabled && !!userId,
    staleTime: 30000, // 30 seconds
  });
}

// ========================= MUTATIONS =========================

/**
 * Hook to create a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation<User, Error, CreateUserRequest>({
    mutationFn: (userData) => userService.createUser(userData),
    onSuccess: (newUser) => {
      // Invalidate users list queries
      queryClient.invalidateQueries({ queryKey: QueryKeys.users.all() });
      // Force refetch stats to ensure immediate update
      queryClient.refetchQueries({ queryKey: QueryKeys.users.stats() });
      
      // Add the new user to cache
      queryClient.setQueryData(QueryKeys.users.byId(newUser.id), newUser);
      
      toast.success('User created successfully');
    },
    onError: (error) => {
      console.error('Failed to create user:', error);
      toast.error(error.message || 'Failed to create user');
    },
  });
}

/**
 * Hook to update an existing user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation<User, Error, { id: string; userData: UpdateUserRequest }>({
    mutationFn: ({ id, userData }) => userService.updateUser(id, userData),
    onSuccess: (updatedUser, { id }) => {
      // Update the user in cache
      queryClient.setQueryData(QueryKeys.users.byId(id), updatedUser);
      
      // Invalidate users list queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: QueryKeys.users.all() });
      // Force refetch stats to ensure immediate update
      queryClient.refetchQueries({ queryKey: QueryKeys.users.stats() });
      
      toast.success('User updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update user:', error);
      toast.error(error.message || 'Failed to update user');
    },
  });
}

/**
 * Hook to delete a user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, string>({
    mutationFn: (id) => userService.deleteUser(id),
    onSuccess: (_, id) => {
      // Remove user from cache
      queryClient.removeQueries({ queryKey: QueryKeys.users.byId(id) });
      
      // Invalidate users list and force refetch stats
      queryClient.invalidateQueries({ queryKey: QueryKeys.users.all() });
      queryClient.refetchQueries({ queryKey: QueryKeys.users.stats() });
      
      toast.success('User deleted successfully');
    },
    onError: (error) => {
      console.error('Failed to delete user:', error);
      toast.error(error.message || 'Failed to delete user');
    },
  });
}

/**
 * Hook to change user role
 */
export function useChangeUserRole() {
  const queryClient = useQueryClient();

  return useMutation<User, Error, { id: string; roleData: ChangeRoleRequest }>({
    mutationFn: ({ id, roleData }) => userService.changeUserRole(id, roleData),
    onSuccess: (updatedUser, { id }) => {
      // Update the user in cache
      queryClient.setQueryData(QueryKeys.users.byId(id), updatedUser);
      
      // Invalidate users list queries
      queryClient.invalidateQueries({ queryKey: QueryKeys.users.all() });
      // Force refetch stats to ensure immediate update
      queryClient.refetchQueries({ queryKey: QueryKeys.users.stats() });
      
      // Invalidate audit logs for this user
      queryClient.invalidateQueries({ queryKey: QueryKeys.users.auditLogs(id) });
      
      toast.success('User role updated successfully');
    },
    onError: (error) => {
      console.error('Failed to change user role:', error);
      toast.error(error.message || 'Failed to change user role');
    },
  });
}

/**
 * Hook to perform bulk delete operation
 */
export function useBulkDeleteUsers() {
  const queryClient = useQueryClient();

  return useMutation<{ deleted: number }, Error, { userIds: string[]; reason?: string }>({
    mutationFn: ({ userIds, reason }) => userService.bulkDeleteUsers(userIds, reason),
    onSuccess: (result, { userIds }) => {
      // Remove deleted users from cache
      userIds.forEach(id => {
        queryClient.removeQueries({ queryKey: QueryKeys.users.byId(id) });
      });
      
      // Invalidate users list and force refetch stats
      queryClient.invalidateQueries({ queryKey: QueryKeys.users.all() });
      queryClient.refetchQueries({ queryKey: QueryKeys.users.stats() });
      
      toast.success(`Successfully deleted ${result.deleted} users`);
    },
    onError: (error) => {
      console.error('Failed to bulk delete users:', error);
      toast.error(error.message || 'Failed to delete users');
    },
  });
}

/**
 * Hook to perform bulk role change operation
 */
export function useBulkChangeRole() {
  const queryClient = useQueryClient();

  return useMutation<{ updated: number }, Error, { userIds: string[]; role: string; reason?: string }>({
    mutationFn: ({ userIds, role, reason }) => userService.bulkChangeRole(userIds, role, reason),
    onSuccess: (result, { userIds }) => {
      // Invalidate affected users in cache
      userIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: QueryKeys.users.byId(id) });
        queryClient.invalidateQueries({ queryKey: QueryKeys.users.auditLogs(id) });
      });
      
      // Invalidate users list and force refetch stats
      queryClient.invalidateQueries({ queryKey: QueryKeys.users.all() });
      queryClient.refetchQueries({ queryKey: QueryKeys.users.stats() });
      
      toast.success(`Successfully updated role for ${result.updated} users`);
    },
    onError: (error) => {
      console.error('Failed to bulk change roles:', error);
      toast.error(error.message || 'Failed to update user roles');
    },
  });
}

/**
 * Hook to export users to CSV
 */
export function useExportUsers() {
  return useMutation<Blob, Error, Partial<UserQueryParams> | undefined>({
    mutationFn: (filters) => userService.exportUsers(filters),
    onSuccess: (blob) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Users exported successfully');
    },
    onError: (error) => {
      console.error('Failed to export users:', error);
      toast.error(error.message || 'Failed to export users');
    },
  });
}

/**
 * Hook to import users from CSV
 */
export function useImportUsers() {
  const queryClient = useQueryClient();

  return useMutation<{ imported: number; errors: string[] }, Error, File>({
    mutationFn: (file) => userService.importUsers(file),
    onSuccess: (result) => {
      // Invalidate all user-related queries to refresh data
      queryClient.invalidateQueries({ queryKey: QueryKeys.users.all() });
      // Force refetch stats to ensure immediate update
      queryClient.refetchQueries({ queryKey: QueryKeys.users.stats() });
      
      if (result.errors.length > 0) {
        toast.warning(`Imported ${result.imported} users with ${result.errors.length} errors`);
        console.warn('Import errors:', result.errors);
      } else {
        toast.success(`Successfully imported ${result.imported} users`);
      }
    },
    onError: (error) => {
      console.error('Failed to import users:', error);
      toast.error(error.message || 'Failed to import users');
    },
  });
}

// ========================= UTILITY HOOKS =========================

/**
 * Hook that provides all user management operations
 * Useful for components that need multiple user operations
 */
export function useUserManagement() {
  const queryClient = useQueryClient();
  
  return {
    // Queries
    useUsers,
    useUser,
    useSearchUsers,
    useUserStats,
    useUserAuditLogs,
    
    // Mutations
    createUser: useCreateUser(),
    updateUser: useUpdateUser(),
    deleteUser: useDeleteUser(),
    changeUserRole: useChangeUserRole(),
    bulkDeleteUsers: useBulkDeleteUsers(),
    bulkChangeRole: useBulkChangeRole(),
    exportUsers: useExportUsers(),
    importUsers: useImportUsers(),
    
    // Utility functions
    invalidateUserQueries: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    
    prefetchUser: (id: string) => {
      queryClient.prefetchQuery({
        queryKey: QueryKeys.users.byId(id),
        queryFn: () => userService.getUserById(id),
        staleTime: 60000,
      });
    },
  };
}
