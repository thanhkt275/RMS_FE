/**
 * User Management Service
 * Handles all API interactions for user management functionality
 */

import {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  ChangeRoleRequest,
  BulkOperationRequest,
  UserQueryParams,
  UserListResponse,
  UserStats,
  AuditLog,
} from '../types/user.types';
import { apiClient } from '../lib/api-client';

class UserService {
  
  /**
   * Get paginated list of users with filters
   */
  async getUsers(params: UserQueryParams): Promise<UserListResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    try {
      const response = await apiClient.get<any>(`/users?${searchParams}`);
      
      // Handle backend response structure {success: true, data: {...}}
      const data = response.data || response;
      
      // Validate and ensure response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response structure from server');
      }
      
      // Handle case where backend returns different structure
      if (Array.isArray(data)) {
        // If data is just an array of users (fallback)
        return {
          users: data,
          pagination: {
            total: data.length,
            page: params.page || 1,
            limit: params.limit || 10,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          }
        };
      }
      
      // Ensure response has the expected structure
      return {
        users: Array.isArray(data.users) ? data.users : [],
        pagination: {
          total: data.pagination?.total || 0,
          page: data.pagination?.page || params.page || 1,
          limit: data.pagination?.limit || params.limit || 10,
          totalPages: data.pagination?.totalPages || 1,
          hasNext: data.pagination?.hasNext || false,
          hasPrev: data.pagination?.hasPrev || false,
        }
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User> {
    const response = await apiClient.get<any>(`/users/${id}`);
    
    // Handle backend response structure {success: true, data: {...}}
    return response.data || response;
  }

  /**
   * Create new user
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    // Debug: Log the data being sent
    console.log('[UserService] Creating user with data:', userData);
    
    // Clean up the data to ensure proper serialization
    const cleanedData: any = {
      ...userData,
      // Convert Date to ISO string if it exists
      DateOfBirth: userData.DateOfBirth ? 
        (userData.DateOfBirth instanceof Date ? userData.DateOfBirth.toISOString() : userData.DateOfBirth)
        : undefined,
    };
    
    // Remove empty string values and undefined values
    if (cleanedData.email === '' || cleanedData.email === undefined) {
      delete cleanedData.email;
    }
    if (cleanedData.phoneNumber === '' || cleanedData.phoneNumber === undefined) {
      delete cleanedData.phoneNumber;
    }
    if (cleanedData.DateOfBirth === undefined) {
      delete cleanedData.DateOfBirth;
    }
    if (cleanedData.gender === undefined) {
      delete cleanedData.gender;
    }
    
    console.log('[UserService] Cleaned data being sent:', cleanedData);
    
    const response = await apiClient.post<any>('/users', cleanedData);
    
    // Handle backend response structure {success: true, data: {...}}
    return response.data || response;
  }

  /**
   * Update existing user
   */
  async updateUser(id: string, userData: UpdateUserRequest): Promise<User> {
    const response = await apiClient.patch<any>(`/users/${id}`, userData);
    
    // Handle backend response structure {success: true, data: {...}}
    return response.data || response;
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<any>(`/users/${id}`);
    
    // Handle backend response structure {success: true, data: {...}}
    return response.data || response;
  }

  /**
   * Change user role
   */
  async changeUserRole(id: string, roleData: ChangeRoleRequest): Promise<User> {
    const response = await apiClient.patch<any>(`/users/${id}/role`, roleData);
    
    // Handle backend response structure {success: true, data: {...}}
    return response.data || response;
  }

  /**
   * Search users by query
   */
  async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    const searchParams = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    const response = await apiClient.get<any>(`/users/search?${searchParams}`);
    
    // Handle backend response structure {success: true, data: {...}}
    return response.data || response;
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStats> {
    const response = await apiClient.get<any>('/users/stats');
    
    // Handle backend response structure {success: true, data: {...}}
    return response.data || response;
  }

  /**
   * Perform bulk delete operation
   */
  async bulkDeleteUsers(userIds: string[], reason?: string): Promise<{ deleted: number }> {
    const requestData = { 
      userIds, 
      action: 'delete',
      reason: reason || 'Bulk delete operation'
    };
    
    console.log('[UserService] Bulk delete request data:', requestData);
    
    const response = await apiClient.post<any>('/users/bulk-delete', requestData);
    
    console.log('[UserService] Bulk delete response:', response);
    
    // Handle backend response structure {success: true, data: {...}}
    return response.data || response;
  }

  /**
   * Perform bulk role change operation
   */
  async bulkChangeRole(userIds: string[], role: string, reason?: string): Promise<{ updated: number }> {
    console.log('[UserService] Executing bulk role change:', { userIds, role, reason });
    
    const requestData = { 
      userIds, 
      action: 'changeRole', 
      role, 
      reason: reason || 'Bulk role change operation'
    };
    
    console.log('[UserService] Request data being sent:', requestData);
    
    const response = await apiClient.post<any>('/users/bulk-role', requestData);
    
    console.log('[UserService] Bulk role change response:', response);
    
    // Handle backend response structure {success: true, data: {...}}
    return response.data || response;
  }

  /**
   * Get user audit logs
   */
  async getUserAuditLogs(userId: string): Promise<AuditLog[]> {
    const response = await apiClient.get<any>(`/users/${userId}/audit`);
    
    // Handle backend response structure {success: true, data: {...}}
    return response.data || response;
  }

  /**
   * Export users to CSV
   */
  async exportUsers(filters?: Partial<UserQueryParams>): Promise<Blob> {
    const searchParams = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    // Use api-client for blob response
    return apiClient.postBlob(`/users/export?${searchParams}`);
  }

  /**
   * Import users from CSV
   */
  async importUsers(file: File): Promise<{ imported: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);

    // Use api-client for FormData upload
    const response = await apiClient.postFormData<any>('/users/import', formData);
    
    // Handle backend response structure {success: true, data: {...}}
    return response.data || response;
  }
}

// Create singleton instance
export const userService = new UserService();
export default userService;
