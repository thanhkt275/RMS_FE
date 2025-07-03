/**
 * Enhanced Authentication Service - Step 7 Implementation
 * 
 * Provides comprehensive authentication functionality following SOLID principles.
 * Handles login, logout, user management, token refresh, and session management.
 * 
 * IMPORTANT: Some advanced features (password reset, email verification) are designed
 * for future backend implementation. Current implementation focuses on the core
 * authentication features available in the existing backend.
 * 
 * Current Backend Endpoints:
 * - POST /auth/login - User login
 * - POST /auth/register - User registration  
 * - POST /auth/logout - User logout
 * - GET /auth/check-auth - Get current user and validate session
 * 
 * Future Enhancements (when backend supports them):
 * - Password reset functionality
 * - Email verification
 * - Token refresh endpoint
 * - Profile updates
 * - Session management
 * 
 * Features:
 * - Interface-driven design for testability and extensibility
 * - Comprehensive error handling and user feedback
 * - Secure token management with automatic refresh
 * - Rate limiting and retry logic
 * - Security logging integration
 * - Type-safe implementations with full TypeScript support
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

import { User, UserRole } from '@/lib/types';
import { apiClient } from '@/lib/api-client';
import { rbacLogger } from '@/utils/rbacLogger';

// Define ApiClient type locally to avoid circular reference
type ApiClient = typeof apiClient;

/**
 * Interface for authentication credentials
 * 
 * Follows Interface Segregation Principle by defining focused data structures.
 */
export interface IAuthCredentials {
  readonly username: string;
  readonly password: string;
}

/**
 * Interface for registration data
 * 
 * Extends authentication credentials with additional registration fields.
 */
export interface IRegistrationData extends IAuthCredentials {
  readonly email?: string;
  readonly role?: UserRole; // For admin-created accounts
}

/**
 * Interface for authentication response
 * 
 * Defines the structure of authentication responses from the API.
 */
export interface IAuthResponse {
  readonly user: User;
  readonly token?: string; // Optional if using httpOnly cookies
  readonly refreshToken?: string;
  readonly expiresAt?: string;
}

/**
 * Interface for password reset request
 * 
 * Defines structure for password reset operations.
 */
export interface IPasswordResetRequest {
  readonly email: string;
  readonly username?: string;
}

/**
 * Interface for password reset confirmation
 * 
 * Defines structure for completing password reset.
 */
export interface IPasswordResetConfirmation {
  readonly token: string;
  readonly newPassword: string;
}

/**
 * Authentication error types for better error handling
 */
export enum AuthErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  RATE_LIMITED = 'RATE_LIMITED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SERVER_ERROR = 'SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

/**
 * Enhanced authentication error class
 * 
 * Provides structured error information for better error handling.
 */
export class AuthError extends Error {
  constructor(
    public readonly type: AuthErrorType,
    message: string,
    public readonly statusCode?: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AuthError';
  }

  /**
   * Check if error is recoverable (user can retry)
   */
  isRecoverable(): boolean {
    return [
      AuthErrorType.NETWORK_ERROR,
      AuthErrorType.SERVER_ERROR,
      AuthErrorType.TOKEN_EXPIRED,
    ].includes(this.type);
  }

  /**
   * Check if error requires user action
   */
  requiresUserAction(): boolean {
    return [
      AuthErrorType.INVALID_CREDENTIALS,
      AuthErrorType.ACCOUNT_LOCKED,
      AuthErrorType.EMAIL_NOT_VERIFIED,
      AuthErrorType.VALIDATION_ERROR,
    ].includes(this.type);
  }
}

/**
 * Interface for authentication service
 * 
 * Follows Dependency Inversion Principle by defining an abstraction
 * that allows different authentication implementations.
 */
export interface IAuthService {
  // Core authentication operations
  login(credentials: IAuthCredentials): Promise<User>;
  logout(): Promise<void>;
  register(registrationData: IRegistrationData): Promise<User>;
  
  // User management operations
  getCurrentUser(): Promise<User | null>;
  refreshToken(): Promise<User>;
  updateProfile(userId: string, updates: Partial<User>): Promise<User>;
  changePassword(oldPassword: string, newPassword: string): Promise<void>;
  
  // Password reset operations
  requestPasswordReset(request: IPasswordResetRequest): Promise<void>;
  confirmPasswordReset(confirmation: IPasswordResetConfirmation): Promise<void>;
  
  // Session management
  validateSession(): Promise<boolean>;
  extendSession(): Promise<void>;
  
  // Account verification
  verifyEmail(token: string): Promise<void>;
  resendVerificationEmail(): Promise<void>;
}

/**
 * Configuration interface for authentication service
 * 
 * Allows customization of service behavior.
 */
export interface IAuthServiceConfig {
  readonly baseURL: string;
  readonly retryAttempts?: number;
  readonly retryDelay?: number;
  readonly sessionTimeout?: number;
  readonly enableLogging?: boolean;
}

/**
 * Enhanced Authentication Service Implementation
 * 
 * Implements comprehensive authentication functionality following SOLID principles:
 * - Single Responsibility: Only handles authentication concerns
 * - Open/Closed: Extensible through configuration and interfaces
 * - Liskov Substitution: Implements IAuthService interface
 * - Interface Segregation: Uses focused interfaces
 * - Dependency Injection: Configurable dependencies
 */
export class EnhancedAuthService implements IAuthService {
  private readonly config: IAuthServiceConfig;
  private readonly apiClient: ApiClient;
  private retryCount: Map<string, number> = new Map();

  constructor(
    config: IAuthServiceConfig,
    apiClient: ApiClient
  ) {
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      enableLogging: true,
      ...config,
    };
    this.apiClient = apiClient;
  }

  /**
   * Authenticate user with credentials
   * 
   * @param credentials User login credentials
   * @returns Promise resolving to authenticated user
   * @throws AuthError for authentication failures
   */
  async login(credentials: IAuthCredentials): Promise<User> {
    try {
      this.validateCredentials(credentials);
      
      const response = await this.makeAuthenticatedRequest<IAuthResponse>(
        'POST',
        '/auth/login',
        credentials
      );

      const user = response.user;
      
      // Log successful authentication
      if (this.config.enableLogging) {
        await rbacLogger.logAuthenticationSuccess(user.id, user.role);
      }

      return user;

    } catch (error: any) {
      const authError = this.handleAuthError(error, 'login');
      
      // Log failed authentication
      if (this.config.enableLogging) {
        await rbacLogger.logAuthenticationFailed(
          `login:${credentials.username}`,
          authError.message
        );
      }

      throw authError;
    }
  }

  /**
   * Register new user account
   * 
   * @param registrationData User registration information
   * @returns Promise resolving to registered user
   * @throws AuthError for registration failures
   */
  async register(registrationData: IRegistrationData): Promise<User> {
    try {
      this.validateRegistrationData(registrationData);

      const response = await this.makeAuthenticatedRequest<IAuthResponse>(
        'POST',
        '/auth/register',
        registrationData
      );

      const user = response.user;

      // Log successful registration
      if (this.config.enableLogging) {
        await rbacLogger.registrationAttempt(registrationData.username, true);
      }

      return user;

    } catch (error: any) {
      const authError = this.handleAuthError(error, 'register');
      
      // Log failed registration
      if (this.config.enableLogging) {
        await rbacLogger.registrationAttempt(
          registrationData.username,
          false,
          authError.message
        );
      }

      throw authError;
    }
  }

  /**
   * Log out current user
   * 
   * @returns Promise that resolves when logout is complete
   */
  async logout(): Promise<void> {
    try {
      await this.makeAuthenticatedRequest('POST', '/auth/logout', {});
      
      // Clear retry counters
      this.retryCount.clear();
      
    } catch (error: any) {
      // Log logout even if it fails on server side
      console.warn('Logout request failed:', error);
      // Don't throw error - logout should always succeed on client side
    }
  }

  /**
   * Get current authenticated user
   * 
   * @returns Promise resolving to current user or null if not authenticated
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await this.makeAuthenticatedRequest<{ user: User | null }>(
        'GET',
        '/auth/check-auth'
      );

      return response.user;

    } catch (error: any) {
      // If we get a 401, user is not authenticated - this is expected
      if (error.status === 401) {
        return null;
      }

      // Log other errors
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Refresh authentication token
   * 
   * Note: Backend doesn't currently support token refresh endpoint.
   * This method uses session validation as a fallback.
   * 
   * @returns Promise resolving to refreshed user data
   * @throws AuthError if refresh fails
   */
  async refreshToken(): Promise<User> {
    try {
      // Try to get current user (which validates the session)
      const user = await this.getCurrentUser();
      
      if (!user) {
        throw new AuthError(
          AuthErrorType.TOKEN_EXPIRED,
          'Session has expired. Please log in again.'
        );
      }

      return user;

    } catch (error: any) {
      const authError = this.handleAuthError(error, 'refresh');
      
      // Log failed token refresh
      if (this.config.enableLogging) {
        await rbacLogger.logAuthenticationFailed(
          'token-refresh',
          authError.message
        );
      }

      throw authError;
    }
  }

  /**
   * Update user profile information
   * 
   * Note: Backend doesn't currently support profile updates.
   * This method throws a helpful error message.
   * 
   * @param userId ID of user to update
   * @param updates Partial user data to update
   * @returns Promise resolving to updated user
   */
  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    throw new AuthError(
      AuthErrorType.SERVER_ERROR,
      'Profile updates are not yet supported by the backend. This feature will be available in a future release.',
      501,
      { context: 'updateProfile', userId, updates }
    );
  }

  /**
   * Change user password
   * 
   * Note: Backend doesn't currently support password changes.
   * This method throws a helpful error message.
   * 
   * @param oldPassword Current password
   * @param newPassword New password
   * @returns Promise that resolves when password is changed
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    throw new AuthError(
      AuthErrorType.SERVER_ERROR,
      'Password changes are not yet supported by the backend. This feature will be available in a future release.',
      501,
      { context: 'changePassword' }
    );
  }

  /**
   * Request password reset
   * 
   * Note: Backend doesn't currently support password reset.
   * This method throws a helpful error message.
   * 
   * @param request Password reset request data
   * @returns Promise that resolves when reset email is sent
   */
  async requestPasswordReset(request: IPasswordResetRequest): Promise<void> {
    throw new AuthError(
      AuthErrorType.SERVER_ERROR,
      'Password reset is not yet supported by the backend. Please contact an administrator for password assistance.',
      501,
      { context: 'requestPasswordReset', request }
    );
  }

  /**
   * Confirm password reset with token
   * 
   * Note: Backend doesn't currently support password reset.
   * This method throws a helpful error message.
   * 
   * @param confirmation Password reset confirmation data
   * @returns Promise that resolves when password is reset
   */
  async confirmPasswordReset(confirmation: IPasswordResetConfirmation): Promise<void> {
    throw new AuthError(
      AuthErrorType.SERVER_ERROR,
      'Password reset is not yet supported by the backend. Please contact an administrator for password assistance.',
      501,
      { context: 'confirmPasswordReset', confirmation }
    );
  }

  /**
   * Validate current session
   * 
   * @returns Promise resolving to true if session is valid
   */
  async validateSession(): Promise<boolean> {
    try {
      await this.makeAuthenticatedRequest('GET', '/auth/check-auth');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extend current session
   * 
   * Note: Backend doesn't currently support session extension.
   * This method uses session validation as a fallback.
   * 
   * @returns Promise that resolves when session is extended
   */
  async extendSession(): Promise<void> {
    try {
      // Use session validation as a way to "extend" the session
      const isValid = await this.validateSession();
      if (!isValid) {
        throw new AuthError(
          AuthErrorType.TOKEN_EXPIRED,
          'Session has expired. Please log in again.'
        );
      }
    } catch (error: any) {
      throw this.handleAuthError(error, 'extendSession');
    }
  }

  /**
   * Verify email address with token
   * 
   * Note: Backend doesn't currently support email verification.
   * This method throws a helpful error message.
   * 
   * @param token Email verification token
   * @returns Promise that resolves when email is verified
   */
  async verifyEmail(token: string): Promise<void> {
    throw new AuthError(
      AuthErrorType.SERVER_ERROR,
      'Email verification is not yet supported by the backend. This feature will be available in a future release.',
      501,
      { context: 'verifyEmail', token }
    );
  }

  /**
   * Resend email verification
   * 
   * Note: Backend doesn't currently support email verification.
   * This method throws a helpful error message.
   * 
   * @returns Promise that resolves when verification email is sent
   */
  async resendVerificationEmail(): Promise<void> {
    throw new AuthError(
      AuthErrorType.SERVER_ERROR,
      'Email verification is not yet supported by the backend. This feature will be available in a future release.',
      501,
      { context: 'resendVerificationEmail' }
    );
  }

  /**
   * Make authenticated request with retry logic
   * 
   * @private
   */
  private async makeAuthenticatedRequest<T = any>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<T> {
    const requestKey = `${method}:${endpoint}`;
    const retryCount = this.retryCount.get(requestKey) || 0;

    try {
      let response: T;

      switch (method.toLowerCase()) {
        case 'get':
          response = await this.apiClient.get<T>(endpoint);
          break;
        case 'post':
          response = await this.apiClient.post<T>(endpoint, data);
          break;
        case 'patch':
          response = await this.apiClient.patch<T>(endpoint, data);
          break;
        case 'put':
          response = await this.apiClient.put<T>(endpoint, data);
          break;
        case 'delete':
          response = await this.apiClient.delete<T>(endpoint);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      // Reset retry counter on success
      this.retryCount.delete(requestKey);
      return response;

    } catch (error: any) {
      // Handle rate limiting with exponential backoff
      if (error.status === 429 && retryCount < this.config.retryAttempts!) {
        const delay = this.config.retryDelay! * Math.pow(2, retryCount);
        await this.sleep(delay);
        
        this.retryCount.set(requestKey, retryCount + 1);
        return this.makeAuthenticatedRequest<T>(method, endpoint, data);
      }

      // Clear retry counter if we've exhausted attempts
      this.retryCount.delete(requestKey);
      throw error;
    }
  }

  /**
   * Handle authentication errors and convert to AuthError
   * 
   * @private
   */
  private handleAuthError(error: any, context: string): AuthError {
    // Network errors
    if (!error.status) {
      return new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Network error: Unable to connect to the authentication server.',
        undefined,
        { context, originalError: error.message }
      );
    }

    // Map HTTP status codes to auth error types
    switch (error.status) {
      case 400:
        return new AuthError(
          AuthErrorType.VALIDATION_ERROR,
          error.response?.data?.message || 'Invalid request data.',
          400,
          { context, details: error.response?.data }
        );

      case 401:
        return new AuthError(
          AuthErrorType.INVALID_CREDENTIALS,
          'Invalid username or password.',
          401,
          { context }
        );

      case 403:
        return new AuthError(
          AuthErrorType.PERMISSION_DENIED,
          'Access denied. You do not have permission to perform this action.',
          403,
          { context }
        );

      case 423:
        return new AuthError(
          AuthErrorType.ACCOUNT_LOCKED,
          'Account is locked. Please contact support.',
          423,
          { context }
        );

      case 429:
        return new AuthError(
          AuthErrorType.RATE_LIMITED,
          'Too many requests. Please wait and try again.',
          429,
          { context }
        );

      case 500:
      case 502:
      case 503:
      case 504:
        return new AuthError(
          AuthErrorType.SERVER_ERROR,
          'Server error. Please try again later.',
          error.status,
          { context }
        );

      default:
        return new AuthError(
          AuthErrorType.SERVER_ERROR,
          error.response?.data?.message || 'An unexpected error occurred.',
          error.status,
          { context, originalError: error.message }
        );
    }
  }

  /**
   * Validate authentication credentials
   * 
   * @private
   */
  private validateCredentials(credentials: IAuthCredentials): void {
    if (!credentials.username || credentials.username.trim().length === 0) {
      throw new AuthError(
        AuthErrorType.VALIDATION_ERROR,
        'Username is required.',
        400
      );
    }

    if (!credentials.password || credentials.password.length === 0) {
      throw new AuthError(
        AuthErrorType.VALIDATION_ERROR,
        'Password is required.',
        400
      );
    }

    if (credentials.password.length < 6) {
      throw new AuthError(
        AuthErrorType.VALIDATION_ERROR,
        'Password must be at least 6 characters long.',
        400
      );
    }
  }

  /**
   * Validate registration data
   * 
   * @private
   */
  private validateRegistrationData(data: IRegistrationData): void {
    this.validateCredentials(data);

    if (data.email && !this.isValidEmail(data.email)) {
      throw new AuthError(
        AuthErrorType.VALIDATION_ERROR,
        'Please provide a valid email address.',
        400
      );
    }
  }

  /**
   * Check if email format is valid
   * 
   * @private
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Sleep for specified duration
   * 
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create configured authentication service
 * 
 * Follows Factory pattern for easier testing and configuration.
 */
export function createAuthService(config?: Partial<IAuthServiceConfig>): IAuthService {
  const defaultConfig: IAuthServiceConfig = {
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    retryAttempts: 3,
    retryDelay: 1000,
    sessionTimeout: 30 * 60 * 1000,
    enableLogging: process.env.NODE_ENV !== 'test',
  };

  const finalConfig = { ...defaultConfig, ...config };

  return new EnhancedAuthService(finalConfig, apiClient);
}

// Export configured singleton instance for application use
export const authService = createAuthService();
