/**

 * This module implements centralized authentication state management using React Context.
 * 
 * Features:
 * - Centralized authentication state management
 * - Secure error handling and logging
 * - React Query integration for efficient data fetching
 * - Type-safe API with comprehensive TypeScript support
 * - RBAC logging for security auditing
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { User, UserRole } from "@/types/user.types";
import { authService } from "@/services/authService";
import { toast } from "sonner";

// Create the auth context with updated typing
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    username: string,
    password: string,
    email: string,
    name: string,
    phoneNumber: string
  ) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider Component
 *
 * Provides authentication state management using React Context.
 * Updated to use real backend authentication instead of React Query.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();

  // Check authentication status on mount
  const checkAuth = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const currentUser = await authService.getCurrentUser();
      setUser(currentUser as User | null);
    } catch (err) {
      console.error("[AuthProvider] Auth check failed:", err);
      setUser(null);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Register a new user and automatically log them in
   */
  const register = async (
    username: string,
    password: string,
    email: string,
    name: string,
    phoneNumber: string
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("[AuthProvider] Attempting registration for:", username);

      await authService.register({
        username,
        password,
        email,
        phoneNumber,
        name,
      });
    } catch (err) {
      console.error("[AuthProvider] Registration failed:", err);
      setError(err as Error);
      toast.error(`Registration failed. ${(err as Error)?.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Log in user and refresh authentication state
   */
  const login = async (username: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("[AuthProvider] Attempting login for:", username);

      const authenticatedUser = await authService.login({ username, password });
      console.log("[AuthProvider] Login successful:", authenticatedUser);

      setUser(authenticatedUser as User);
    } catch (err) {
      console.error("[AuthProvider] Login failed:", err);
      setUser(null);
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Log out user and clear authentication state
   */
  const logout = async (): Promise<void> => {
    try {
      console.log("[AuthProvider] Logging out...");
      await authService.logout();
      setUser(null);
      setError(null);

      // Small delay to ensure state updates are processed before redirect
      setTimeout(() => {
        router.push("/login");
      }, 100);
    } catch (err) {
      console.error("[AuthProvider] Logout failed:", err);
      // Still clear user state even if logout fails
      setUser(null);
      setError(null);
    }
  };

  const verifyEmail = async (token: string): Promise<void> => {
    try {
      //setIsLoading(true);
      setError(null);

      await authService.verifyEmail({ token });
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      //setIsLoading(false);
    }
  };

  const resendVerificationEmail = async (email: string): Promise<void> => {
    try {
      setError(null);
      await authService.resendVerificationEmail(email);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Create context value with all required methods and state
  const contextValue: AuthContextType = {
    user,
    isLoading,
    error,
    login,
    logout,
    register,
    verifyEmail,
    resendVerificationEmail,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

/**
 * useAuth Hook
 *
 * Custom hook for accessing authentication context.
 * Provides type-safe access to authentication state and methods.
 *
 * @throws {Error} When used outside of AuthProvider
 * @returns {AuthContextType} Authentication context with user state and methods
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      "useAuth must be used within an AuthProvider. " +
        "Make sure to wrap your component tree with <AuthProvider>."
    );
  }

  return context;
}
