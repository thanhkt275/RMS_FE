/**
 * RBAC Security Logging Utility
 * 
 * 
 * Features:
 * - Interface-driven design for extensibility
 * - Configurable log levels and destinations
 * - Support for external monitoring services
 * - Structured logging for better analysis
 * - Security-focused event types
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

/**
 * Interface for security event data structure
 * 
 * Follows Interface Segregation Principle by defining a focused contract
 * for security event information.
 */
export interface ISecurityEvent {
  readonly timestamp: string;
  readonly eventType: SecurityEventType;
  readonly severity: SecurityEventSeverity;
  readonly userId?: string;
  readonly userRole?: string;
  readonly sessionId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly details: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Security event types for categorization
 */
export enum SecurityEventType {
  AUTHENTICATION_SUCCESS = 'authentication_success',
  AUTHENTICATION_FAILED = 'authentication_failed',
  ACCESS_DENIED = 'access_denied',
  ACCESS_GRANTED = 'access_granted',
  ROLE_CHECK = 'role_check',
  LOGOUT = 'logout',
  SESSION_EXPIRED = 'session_expired',
  REGISTRATION_ATTEMPT = 'registration_attempt',
  REGISTRATION_SUCCESS = 'registration_success',
  REGISTRATION_FAILED = 'registration_failed',
  PASSWORD_CHANGE = 'password_change',
  ACCOUNT_LOCKED = 'account_locked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SECURITY_VIOLATION = 'security_violation',
  // Team-specific events
  TEAM_ACCESS_DENIED = 'team_access_denied',
  TEAM_ACCESS_GRANTED = 'team_access_granted',
  TEAM_OPERATION_DENIED = 'team_operation_denied',
  TEAM_DATA_ACCESS_DENIED = 'team_data_access_denied',
}

/**
 * Security event severity levels
 */
export enum SecurityEventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Interface for security logger implementations
 * 
 * Follows Dependency Inversion Principle by defining an abstraction
 * that allows different logging implementations.
 */
export interface ISecurityLogger {
  logEvent(event: ISecurityEvent): Promise<void>;
  logAuthenticationSuccess(userId: string, role: string, sessionId?: string): Promise<void>;
  logAuthenticationFailed(identifier: string, reason: string, ipAddress?: string): Promise<void>;
  logAccessDenied(userId: string | null, role: string | null, resource: string, reason?: string): Promise<void>;
  logAccessGranted(userId: string, role: string, resource: string): Promise<void>;
  logRoleCheck(userId: string, role: string, requiredRoles: string[], result: boolean): Promise<void>;
  logLogout(userId: string, role: string, reason?: string): Promise<void>;
  logSessionExpired(userId: string, sessionId: string): Promise<void>;
  logSuspiciousActivity(description: string, userId?: string, details?: Record<string, unknown>): Promise<void>;
  registrationAttempt(username: string, success: boolean, error?: string): Promise<void>;
  // Team-specific logging methods
  logTeamAccessDenied(userId: string | null, role: string | null, teamId: string, operation: string, reason?: string): Promise<void>;
  logTeamAccessGranted(userId: string, role: string, teamId: string, operation: string): Promise<void>;
  logTeamOperationDenied(userId: string | null, role: string | null, operation: string, teamId?: string, reason?: string): Promise<void>;
  logTeamDataAccessDenied(userId: string | null, role: string | null, teamId: string, dataType: string, reason?: string): Promise<void>;
  // Backward compatibility aliases
  logout(userId: string, role: string, reason?: string): Promise<void>;
  roleCheck(userId: string, role: string, requiredRoles: string[]): Promise<void>;
}

/**
 * Interface for log destination handlers
 * 
 * Allows different destinations (console, file, external service)
 * following the Strategy pattern.
 */
export interface ILogDestination {
  write(event: ISecurityEvent): Promise<void>;
  isAvailable(): boolean;
  getName(): string;
}

/**
 * Console log destination implementation
 */
class ConsoleLogDestination implements ILogDestination {
  getName(): string {
    return 'console';
  }

  isAvailable(): boolean {
    return true;
  }

  async write(event: ISecurityEvent): Promise<void> {
    const logLevel = this.getConsoleLogLevel(event.severity);
    const message = `[RBAC Security] ${event.eventType}`;
    
    logLevel(message, {
      timestamp: event.timestamp,
      userId: event.userId,
      userRole: event.userRole,
      details: event.details,
      ...(event.metadata && { metadata: event.metadata }),
    });
  }

  private getConsoleLogLevel(severity: SecurityEventSeverity): typeof console.log {
    switch (severity) {
      case SecurityEventSeverity.INFO:
        return console.log;
      case SecurityEventSeverity.WARNING:
        return console.warn;
      case SecurityEventSeverity.ERROR:
      case SecurityEventSeverity.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }
}

/**
 * External monitoring service destination (placeholder for production services)
 */
class MonitoringServiceDestination implements ILogDestination {
  private readonly serviceUrl: string;
  private readonly apiKey: string;

  constructor(serviceUrl: string, apiKey: string) {
    this.serviceUrl = serviceUrl;
    this.apiKey = apiKey;
  }

  getName(): string {
    return 'monitoring-service';
  }

  isAvailable(): boolean {
    return Boolean(this.serviceUrl && this.apiKey);
  }

  async write(event: ISecurityEvent): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      // In production, integrate with services like Sentry, LogRocket, DataDog, etc.
      await fetch(this.serviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      // Fallback to console if external service fails
      console.error('[RBAC Security] Failed to send to monitoring service:', error);
      console.warn('[RBAC Security] Event:', event);
    }
  }
}

/**
 * RBAC Security Logger Implementation
 * 
 * Main security logger that follows SOLID principles:
 * - Single Responsibility: Only handles security logging
 * - Open/Closed: Extensible through configuration and destinations
 * - Liskov Substitution: Implements ISecurityLogger interface
 * - Interface Segregation: Uses focused interfaces
 * - Dependency Injection: Configurable destinations
 */
class RBACSecurityLogger implements ISecurityLogger {
  private readonly destinations: ILogDestination[];
  private readonly environment: string;

  constructor(destinations: ILogDestination[] = []) {
    this.destinations = destinations.length > 0 
      ? destinations 
      : [new ConsoleLogDestination()];
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Add a new log destination
   */
  addDestination(destination: ILogDestination): void {
    this.destinations.push(destination);
  }

  /**
   * Create a security event with standard metadata
   */
  private createSecurityEvent(
    eventType: SecurityEventType,
    severity: SecurityEventSeverity,
    details: Record<string, unknown>,
    userId?: string,
    userRole?: string,
  ): ISecurityEvent {
    return {
      timestamp: new Date().toISOString(),
      eventType,
      severity,
      userId,
      userRole,
      details,
      metadata: {
        environment: this.environment,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      },
    };
  }

  /**
   * Log a security event to all configured destinations
   */
  async logEvent(event: ISecurityEvent): Promise<void> {
    const writePromises = this.destinations
      .filter(destination => destination.isAvailable())
      .map(destination => destination.write(event).catch(error => {
        console.error(`Failed to write to ${destination.getName()}:`, error);
      }));

    await Promise.allSettled(writePromises);
  }

  /**
   * Log successful authentication
   */
  async logAuthenticationSuccess(userId: string, role: string, sessionId?: string): Promise<void> {
    const event = this.createSecurityEvent(
      SecurityEventType.AUTHENTICATION_SUCCESS,
      SecurityEventSeverity.INFO,
      { sessionId },
      userId,
      role
    );

    await this.logEvent(event);
  }

  /**
   * Log failed authentication attempts
   */
  async logAuthenticationFailed(identifier: string, reason: string, ipAddress?: string): Promise<void> {
    const event = this.createSecurityEvent(
      SecurityEventType.AUTHENTICATION_FAILED,
      SecurityEventSeverity.WARNING,
      { 
        identifier: identifier.substring(0, 10) + '...', // Truncate for privacy
        reason,
        ipAddress,
      }
    );

    await this.logEvent(event);
  }

  /**
   * Log access denied events
   */
  async logAccessDenied(
    userId: string | null, 
    role: string | null, 
    resource: string, 
    reason?: string
  ): Promise<void> {
    const event = this.createSecurityEvent(
      SecurityEventType.ACCESS_DENIED,
      SecurityEventSeverity.WARNING,
      { 
        resource,
        reason: reason || 'Insufficient permissions',
      },
      userId || undefined,
      role || undefined
    );

    await this.logEvent(event);
  }

  /**
   * Log successful access grants
   */
  async logAccessGranted(userId: string, role: string, resource: string): Promise<void> {
    // Only log in development to avoid noise in production
    if (this.environment === 'development') {
      const event = this.createSecurityEvent(
        SecurityEventType.ACCESS_GRANTED,
        SecurityEventSeverity.INFO,
        { resource },
        userId,
        role
      );

      await this.logEvent(event);
    }
  }

  /**
   * Log role validation checks
   */
  async logRoleCheck(
    userId: string, 
    role: string, 
    requiredRoles: string[], 
    result: boolean
  ): Promise<void> {
    // Only log in development for debugging
    if (this.environment === 'development') {
      const event = this.createSecurityEvent(
        SecurityEventType.ROLE_CHECK,
        SecurityEventSeverity.INFO,
        { 
          requiredRoles,
          result,
        },
        userId,
        role
      );

      await this.logEvent(event);
    }
  }

  /**
   * Log logout events
   */
  async logLogout(userId: string, role: string, reason?: string): Promise<void> {
    const event = this.createSecurityEvent(
      SecurityEventType.LOGOUT,
      SecurityEventSeverity.INFO,
      { reason: reason || 'User initiated' },
      userId,
      role
    );

    await this.logEvent(event);
  }

  /**
   * Log session expiration events
   */
  async logSessionExpired(userId: string, sessionId: string): Promise<void> {
    const event = this.createSecurityEvent(
      SecurityEventType.SESSION_EXPIRED,
      SecurityEventSeverity.INFO,
      { sessionId },
      userId
    );

    await this.logEvent(event);
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    description: string, 
    userId?: string, 
    details?: Record<string, unknown>
  ): Promise<void> {
    const event = this.createSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecurityEventSeverity.ERROR,
      { 
        description,
        ...details,
      },
      userId
    );

    await this.logEvent(event);
  }

  /**
   * Log registration attempts
   */
  async registrationAttempt(username: string, success: boolean, error?: string): Promise<void> {
    const eventType = success ? SecurityEventType.REGISTRATION_SUCCESS : SecurityEventType.REGISTRATION_FAILED;
    const severity = success ? SecurityEventSeverity.INFO : SecurityEventSeverity.WARNING;
    
    const event = this.createSecurityEvent(
      eventType,
      severity,
      { 
        username: username.substring(0, 10) + '...', // Truncate for privacy
        success,
        ...(error && { error }),
      }
    );

    await this.logEvent(event);
  }

  /**
   * Backward compatibility alias for logout
   */
  async logout(userId: string, role: string, reason?: string): Promise<void> {
    return this.logLogout(userId, role, reason);
  }

  /**
   * Log team access denied events
   */
  async logTeamAccessDenied(
    userId: string | null, 
    role: string | null, 
    teamId: string, 
    operation: string, 
    reason?: string
  ): Promise<void> {
    const event = this.createSecurityEvent(
      SecurityEventType.TEAM_ACCESS_DENIED,
      SecurityEventSeverity.WARNING,
      { 
        teamId,
        operation,
        reason: reason || 'Insufficient permissions for team access',
      },
      userId || undefined,
      role || undefined
    );

    await this.logEvent(event);
  }

  /**
   * Log successful team access grants
   */
  async logTeamAccessGranted(userId: string, role: string, teamId: string, operation: string): Promise<void> {
    // Only log in development to avoid noise in production
    if (this.environment === 'development') {
      const event = this.createSecurityEvent(
        SecurityEventType.TEAM_ACCESS_GRANTED,
        SecurityEventSeverity.INFO,
        { teamId, operation },
        userId,
        role
      );

      await this.logEvent(event);
    }
  }

  /**
   * Log team operation denied events
   */
  async logTeamOperationDenied(
    userId: string | null, 
    role: string | null, 
    operation: string, 
    teamId?: string, 
    reason?: string
  ): Promise<void> {
    const event = this.createSecurityEvent(
      SecurityEventType.TEAM_OPERATION_DENIED,
      SecurityEventSeverity.WARNING,
      { 
        operation,
        teamId,
        reason: reason || `Insufficient permissions for team operation: ${operation}`,
      },
      userId || undefined,
      role || undefined
    );

    await this.logEvent(event);
  }

  /**
   * Log team data access denied events
   */
  async logTeamDataAccessDenied(
    userId: string | null, 
    role: string | null, 
    teamId: string, 
    dataType: string, 
    reason?: string
  ): Promise<void> {
    const event = this.createSecurityEvent(
      SecurityEventType.TEAM_DATA_ACCESS_DENIED,
      SecurityEventSeverity.WARNING,
      { 
        teamId,
        dataType,
        reason: reason || `Insufficient permissions to access team data: ${dataType}`,
      },
      userId || undefined,
      role || undefined
    );

    await this.logEvent(event);
  }

  /**
   * Backward compatibility alias for role check
   */
  async roleCheck(userId: string, role: string, requiredRoles: string[]): Promise<void> {
    // Determine if user has permission based on role check
    const hasPermission = requiredRoles.includes(role);
    return this.logRoleCheck(userId, role, requiredRoles, hasPermission);
  }
}

/**
 * Factory function to create configured logger instance
 * 
 * Follows Factory pattern for easier testing and configuration.
 */
export function createSecurityLogger(config?: {
  enableMonitoring?: boolean;
  monitoringServiceUrl?: string;
  monitoringApiKey?: string;
}): ISecurityLogger {
  const destinations: ILogDestination[] = [new ConsoleLogDestination()];

  // Add monitoring service if configured
  if (config?.enableMonitoring && config.monitoringServiceUrl && config.monitoringApiKey) {
    destinations.push(new MonitoringServiceDestination(
      config.monitoringServiceUrl,
      config.monitoringApiKey
    ));
  }

  return new RBACSecurityLogger(destinations);
}

// Export configured singleton instance for backwards compatibility
export const rbacLogger = createSecurityLogger({
  enableMonitoring: process.env.NODE_ENV === 'production',
  monitoringServiceUrl: process.env.SECURITY_MONITORING_URL,
  monitoringApiKey: process.env.SECURITY_MONITORING_API_KEY,
});
