/**
 * Authentication Error Boundary - Step 5 Implementation
 * 
 * React Error Boundary specifically designed for authentication and authorization errors.
 * Follows SOLID principles to provide graceful error handling and recovery.
 * 
 * Features:
 * - Catches authentication-related errors without crashing the app
 * - Provides user-friendly error messages with recovery options
 * - Integrates with security logging for audit trails
 * - Supports different error types with appropriate handling
 * - Clean, accessible UI with proper styling
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

"use client";

import React, { ReactNode, ErrorInfo, Component } from 'react';
import { rbacLogger } from '@/config/rbacLogger';
import { SecurityEventType, SecurityEventSeverity } from '@/config/rbacLogger';
import { AlertTriangle, RefreshCw, Home, LogIn } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Interface for error boundary state
 * 
 * Follows Interface Segregation Principle by defining focused state structure.
 */
interface IAuthErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorType: AuthErrorType;
  retryCount: number;
}

/**
 * Authentication error types for better categorization and handling
 */
export enum AuthErrorType {
  AUTHENTICATION_FAILED = 'authentication_failed',
  AUTHORIZATION_FAILED = 'authorization_failed',
  SESSION_EXPIRED = 'session_expired',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * Interface for error classification
 * 
 * Follows Single Responsibility Principle by separating error analysis logic.
 */
interface IErrorClassifier {
  classifyError(error: Error): AuthErrorType;
  isRecoverable(errorType: AuthErrorType): boolean;
  getErrorMessage(errorType: AuthErrorType): string;
  getRecoveryActions(errorType: AuthErrorType): RecoveryAction[];
}

/**
 * Recovery action interface
 */
interface RecoveryAction {
  label: string;
  action: () => void;
  primary?: boolean;
  icon?: ReactNode;
}

/**
 * Error classifier implementation
 * 
 * Handles error categorization and recovery strategy determination.
 */
class AuthErrorClassifier implements IErrorClassifier {
  classifyError(error: Error): AuthErrorType {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('authentication') || errorMessage.includes('login')) {
      return AuthErrorType.AUTHENTICATION_FAILED;
    }
    
    if (errorMessage.includes('authorization') || errorMessage.includes('permission')) {
      return AuthErrorType.AUTHORIZATION_FAILED;
    }
    
    if (errorMessage.includes('session') || errorMessage.includes('expired')) {
      return AuthErrorType.SESSION_EXPIRED;
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return AuthErrorType.NETWORK_ERROR;
    }
    
    return AuthErrorType.UNKNOWN_ERROR;
  }

  isRecoverable(errorType: AuthErrorType): boolean {
    return [
      AuthErrorType.NETWORK_ERROR,
      AuthErrorType.SESSION_EXPIRED,
      AuthErrorType.UNKNOWN_ERROR,
    ].includes(errorType);
  }

  getErrorMessage(errorType: AuthErrorType): string {
    switch (errorType) {
      case AuthErrorType.AUTHENTICATION_FAILED:
        return 'Authentication failed. Please check your credentials and try logging in again.';
      case AuthErrorType.AUTHORIZATION_FAILED:
        return 'You don\'t have permission to access this resource. Contact your administrator if you believe this is an error.';
      case AuthErrorType.SESSION_EXPIRED:
        return 'Your session has expired. Please log in again to continue.';
      case AuthErrorType.NETWORK_ERROR:
        return 'Network connection error. Please check your internet connection and try again.';
      case AuthErrorType.UNKNOWN_ERROR:
      default:
        return 'An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.';
    }
  }

  getRecoveryActions(errorType: AuthErrorType): RecoveryAction[] {
    const commonActions: RecoveryAction[] = [
      {
        label: 'Go to Home',
        action: () => window.location.href = '/',
        icon: <Home className="w-4 h-4" />,
      },
    ];

    switch (errorType) {
      case AuthErrorType.AUTHENTICATION_FAILED:
      case AuthErrorType.SESSION_EXPIRED:
        return [
          {
            label: 'Log In',
            action: () => window.location.href = '/auth/login',
            primary: true,
            icon: <LogIn className="w-4 h-4" />,
          },
          ...commonActions,
        ];

      case AuthErrorType.NETWORK_ERROR:
      case AuthErrorType.UNKNOWN_ERROR:
        return [
          {
            label: 'Retry',
            action: () => window.location.reload(),
            primary: true,
            icon: <RefreshCw className="w-4 h-4" />,
          },
          ...commonActions,
        ];

      case AuthErrorType.AUTHORIZATION_FAILED:
      default:
        return commonActions;
    }
  }
}

/**
 * Properties for AuthErrorBoundary component
 */
interface AuthErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
}

/**
 * Authentication Error Boundary Component
 * 
 * Implements React Error Boundary pattern with SOLID principles:
 * - Single Responsibility: Only handles auth-related error boundaries
 * - Open/Closed: Extensible through props and error classification
 * - Liskov Substitution: Can be used anywhere React components are expected
 * - Interface Segregation: Clear, focused interface
 * - Dependency Injection: Configurable through props
 */
export class AuthErrorBoundary extends Component<AuthErrorBoundaryProps, IAuthErrorBoundaryState> {
  private readonly errorClassifier: IErrorClassifier;
  private readonly maxRetries: number;

  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    
    this.errorClassifier = new AuthErrorClassifier();
    this.maxRetries = props.maxRetries || 3;
    
    this.state = {
      hasError: false,
      errorType: AuthErrorType.UNKNOWN_ERROR,
      retryCount: 0,
    };
  }

  /**
   * Static method to derive state from error
   * 
   * Called by React when an error is caught.
   */
  static getDerivedStateFromError(error: Error): Partial<IAuthErrorBoundaryState> {
    const classifier = new AuthErrorClassifier();
    const errorType = classifier.classifyError(error);
    
    return {
      hasError: true,
      error,
      errorType,
    };
  }

  /**
   * Component lifecycle method for error handling
   * 
   * Called by React after an error has been caught.
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error for security monitoring
    this.logSecurityError(error, errorInfo);
    
    // Call optional error callback
    this.props.onError?.(error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });
  }

  /**
   * Log security-related errors
   */
  private async logSecurityError(error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      await rbacLogger.logSuspiciousActivity(
        'Authentication Error Boundary triggered',
        undefined, // userId might not be available in error state
        {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          componentStack: errorInfo.componentStack,
          errorType: this.state.errorType,
        }
      );
    } catch (loggingError) {
      // Fallback logging if rbacLogger fails
      console.error('[AuthErrorBoundary] Failed to log security error:', loggingError);
      console.error('[AuthErrorBoundary] Original error:', error, errorInfo);
    }
  }

  /**
   * Handle retry action
   */
  private handleRetry = (): void => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorType: AuthErrorType.UNKNOWN_ERROR,
        retryCount: prevState.retryCount + 1,
      }));
    } else {
      // Max retries exceeded, reload the page
      window.location.reload();
    }
  };

  /**
   * Render error UI
   */
  private renderErrorUI(): ReactNode {
    const { errorType, error, retryCount } = this.state;
    const isRecoverable = this.errorClassifier.isRecoverable(errorType);
    const errorMessage = this.errorClassifier.getErrorMessage(errorType);
    const recoveryActions = this.errorClassifier.getRecoveryActions(errorType);

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Authentication Error
            </h2>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Occurred</AlertTitle>
              <AlertDescription>
                {errorMessage}
              </AlertDescription>
            </Alert>

            {/* Error Details in Development */}
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mb-6 text-sm text-gray-600">
                <summary className="cursor-pointer font-medium">
                  Technical Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded border-l-4 border-red-500">
                  <p><strong>Error:</strong> {error.message}</p>
                  <p><strong>Type:</strong> {errorType}</p>
                  <p><strong>Retry Count:</strong> {retryCount}/{this.maxRetries}</p>
                </div>
              </details>
            )}

            {/* Recovery Actions */}
            <div className="space-y-3">
              {isRecoverable && retryCount < this.maxRetries && (
                <Button
                  onClick={this.handleRetry}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again ({this.maxRetries - retryCount} attempts left)
                </Button>
              )}

              {recoveryActions.map((action, index) => (
                <Button
                  key={index}
                  onClick={action.action}
                  variant={action.primary ? "default" : "outline"}
                  className="w-full"
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
            </div>

            {/* Additional Help */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                If the problem persists, please{' '}
                <Link 
                  href="/contact-support" 
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  contact support
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Main render method
   */
  render(): ReactNode {
    if (this.state.hasError) {
      // Return custom fallback if provided, otherwise render error UI
      return this.props.fallback || this.renderErrorUI();
    }

    return this.props.children;
  }
}

/**
 * Higher-Order Component for wrapping components with auth error boundary
 * 
 * Follows Higher-Order Component pattern for easy integration.
 */
export function withAuthErrorBoundary<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  errorBoundaryProps?: Omit<AuthErrorBoundaryProps, 'children'>
) {
  const ComponentWithErrorBoundary = (props: T) => {
    return (
      <AuthErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </AuthErrorBoundary>
    );
  };

  ComponentWithErrorBoundary.displayName = 
    `withAuthErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ComponentWithErrorBoundary;
}

/**
 * Hook for manually triggering error boundary
 * 
 * Useful for throwing errors in functional components that should be caught
 * by the AuthErrorBoundary.
 */
export function useAuthErrorHandler(): (error: Error) => void {
  return (error: Error) => {
    // This will be caught by the nearest error boundary
    throw error;
  };
}
