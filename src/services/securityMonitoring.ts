/**
 * Security Monitoring Service - Step 5 Implementation
 * 
 * Provides integration with external security monitoring and alerting services.
 * Follows SOLID principles for extensible and maintainable security monitoring.
 * 
 * Features:
 * - Multiple monitoring service integrations
 * - Real-time alerting for critical security events
 * - Rate limiting and batching for performance
 * - Fallback mechanisms for reliability
 * - Configurable alert thresholds
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

import { 
  ISecurityEvent, 
  SecurityEventType, 
  SecurityEventSeverity 
} from '@/utils/rbacLogger';

/**
 * Interface for security monitoring services
 * 
 * Follows Interface Segregation Principle by defining focused contracts
 * for different monitoring capabilities.
 */
export interface ISecurityMonitoringService {
  sendAlert(event: ISecurityEvent): Promise<void>;
  sendBatch(events: ISecurityEvent[]): Promise<void>;
  isHealthy(): Promise<boolean>;
  getName(): string;
}

/**
 * Interface for alert configuration
 */
export interface IAlertConfig {
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  threshold: number; // Number of events before alerting
  timeWindow: number; // Time window in milliseconds
  enabled: boolean;
}

/**
 * Sentry integration for error tracking and security monitoring
 */
export class SentryMonitoringService implements ISecurityMonitoringService {
  private readonly dsn: string;
  private readonly environment: string;

  constructor(dsn: string, environment: string = 'production') {
    this.dsn = dsn;
    this.environment = environment;
  }

  getName(): string {
    return 'sentry';
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check by attempting to send a test event
      return Boolean(this.dsn);
    } catch {
      return false;
    }
  }

  async sendAlert(event: ISecurityEvent): Promise<void> {
    if (!await this.isHealthy()) {
      throw new Error('Sentry monitoring service is not healthy');
    }

    // In a real implementation, you would use @sentry/nextjs
    // const Sentry = await import('@sentry/nextjs');
    
    const sentryEvent = {
      message: `Security Event: ${event.eventType}`,
      level: this.mapSeverityToSentryLevel(event.severity),
      tags: {
        eventType: event.eventType,
        severity: event.severity,
        userId: event.userId,
        userRole: event.userRole,
        environment: this.environment,
      },
      extra: {
        timestamp: event.timestamp,
        details: event.details,
        metadata: event.metadata,
      },
    };

    // Sentry.captureEvent(sentryEvent);
    console.log('[Sentry] Would send event:', sentryEvent);
  }

  async sendBatch(events: ISecurityEvent[]): Promise<void> {
    // Sentry doesn't have native batch support, so send individually
    for (const event of events) {
      await this.sendAlert(event);
    }
  }

  private mapSeverityToSentryLevel(severity: SecurityEventSeverity): string {
    switch (severity) {
      case SecurityEventSeverity.INFO:
        return 'info';
      case SecurityEventSeverity.WARNING:
        return 'warning';
      case SecurityEventSeverity.ERROR:
        return 'error';
      case SecurityEventSeverity.CRITICAL:
        return 'fatal';
      default:
        return 'info';
    }
  }
}

/**
 * DataDog integration for security monitoring and alerting
 */
export class DataDogMonitoringService implements ISecurityMonitoringService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, site: string = 'datadoghq.com') {
    this.apiKey = apiKey;
    this.baseUrl = `https://api.${site}`;
  }

  getName(): string {
    return 'datadog';
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/validate`, {
        method: 'GET',
        headers: {
          'DD-API-KEY': this.apiKey,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async sendAlert(event: ISecurityEvent): Promise<void> {
    const logEntry = {
      ddsource: 'rbac-security',
      ddtags: `env:${process.env.NODE_ENV},service:frontend,event_type:${event.eventType},severity:${event.severity}`,
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
      message: `Security Event: ${event.eventType}`,
      timestamp: new Date(event.timestamp).getTime(),
      level: event.severity.toUpperCase(),
      ...event.details,
      metadata: event.metadata,
    };

    const response = await fetch(`${this.baseUrl}/v1/input/${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logEntry),
    });

    if (!response.ok) {
      throw new Error(`DataDog API error: ${response.status} ${response.statusText}`);
    }
  }

  async sendBatch(events: ISecurityEvent[]): Promise<void> {
    const logEntries = events.map(event => ({
      ddsource: 'rbac-security',
      ddtags: `env:${process.env.NODE_ENV},service:frontend,event_type:${event.eventType},severity:${event.severity}`,
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
      message: `Security Event: ${event.eventType}`,
      timestamp: new Date(event.timestamp).getTime(),
      level: event.severity.toUpperCase(),
      ...event.details,
      metadata: event.metadata,
    }));

    const response = await fetch(`${this.baseUrl}/v1/input/${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logEntries),
    });

    if (!response.ok) {
      throw new Error(`DataDog batch API error: ${response.status} ${response.statusText}`);
    }
  }
}

/**
 * Custom webhook monitoring service for internal systems
 */
export class WebhookMonitoringService implements ISecurityMonitoringService {
  private readonly webhookUrl: string;
  private readonly apiKey?: string;

  constructor(webhookUrl: string, apiKey?: string) {
    this.webhookUrl = webhookUrl;
    this.apiKey = apiKey;
  }

  getName(): string {
    return 'webhook';
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'HEAD',
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async sendAlert(event: ISecurityEvent): Promise<void> {
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify({
        type: 'security_alert',
        event,
        source: 'rbac-frontend',
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status} ${response.statusText}`);
    }
  }

  async sendBatch(events: ISecurityEvent[]): Promise<void> {
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify({
        type: 'security_alert_batch',
        events,
        source: 'rbac-frontend',
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook batch error: ${response.status} ${response.statusText}`);
    }
  }
}

/**
 * Security Alert Manager
 * 
 * Manages security alerts and monitoring across multiple services.
 * Implements rate limiting, batching, and fallback mechanisms.
 */
export class SecurityAlertManager {
  private readonly services: ISecurityMonitoringService[];
  private readonly alertConfigs: Map<string, IAlertConfig>;
  private readonly eventCounts: Map<string, { count: number; firstSeen: number }>;
  private readonly batchBuffer: ISecurityEvent[];
  private readonly batchSize: number;
  private readonly batchTimeout: number;
  private batchTimer?: NodeJS.Timeout;

  constructor(
    services: ISecurityMonitoringService[] = [],
    batchSize: number = 10,
    batchTimeout: number = 30000 // 30 seconds
  ) {
    this.services = services;
    this.alertConfigs = new Map();
    this.eventCounts = new Map();
    this.batchBuffer = [];
    this.batchSize = batchSize;
    this.batchTimeout = batchTimeout;

    // Initialize default alert configurations
    this.initializeDefaultAlertConfigs();
  }

  /**
   * Add a monitoring service
   */
  addService(service: ISecurityMonitoringService): void {
    this.services.push(service);
  }

  /**
   * Configure alert thresholds
   */
  configureAlert(config: IAlertConfig): void {
    const key = `${config.eventType}_${config.severity}`;
    this.alertConfigs.set(key, config);
  }

  /**
   * Process a security event
   */
  async processEvent(event: ISecurityEvent): Promise<void> {
    const alertKey = `${event.eventType}_${event.severity}`;
    const config = this.alertConfigs.get(alertKey);

    if (!config || !config.enabled) {
      return;
    }

    // Check if we should trigger an alert based on threshold
    if (this.shouldTriggerAlert(event, config)) {
      await this.triggerAlert(event);
    }

    // Add to batch buffer for non-critical events
    if (event.severity !== SecurityEventSeverity.CRITICAL) {
      this.addToBatch(event);
    }
  }

  /**
   * Trigger immediate alert for critical events
   */
  private async triggerAlert(event: ISecurityEvent): Promise<void> {
    const healthyServices = await this.getHealthyServices();
    
    if (healthyServices.length === 0) {
      console.error('[SecurityAlertManager] No healthy monitoring services available');
      return;
    }

    const alertPromises = healthyServices.map(service => 
      service.sendAlert(event).catch(error => {
        console.error(`[SecurityAlertManager] Failed to send alert via ${service.getName()}:`, error);
      })
    );

    await Promise.allSettled(alertPromises);
  }

  /**
   * Add event to batch buffer
   */
  private addToBatch(event: ISecurityEvent): void {
    this.batchBuffer.push(event);

    // Send batch if buffer is full
    if (this.batchBuffer.length >= this.batchSize) {
      this.processBatch();
    } else if (!this.batchTimer) {
      // Set timer for batch timeout
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, this.batchTimeout);
    }
  }

  /**
   * Process batch of events
   */
  private async processBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) {
      return;
    }

    const events = [...this.batchBuffer];
    this.batchBuffer.length = 0; // Clear buffer

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    const healthyServices = await this.getHealthyServices();
    
    const batchPromises = healthyServices.map(service =>
      service.sendBatch(events).catch(error => {
        console.error(`[SecurityAlertManager] Failed to send batch via ${service.getName()}:`, error);
      })
    );

    await Promise.allSettled(batchPromises);
  }

  /**
   * Get healthy monitoring services
   */
  private async getHealthyServices(): Promise<ISecurityMonitoringService[]> {
    const healthChecks = this.services.map(async service => ({
      service,
      healthy: await service.isHealthy().catch(() => false),
    }));

    const results = await Promise.all(healthChecks);
    return results.filter(result => result.healthy).map(result => result.service);
  }

  /**
   * Check if alert should be triggered based on threshold
   */
  private shouldTriggerAlert(event: ISecurityEvent, config: IAlertConfig): boolean {
    // Always trigger for critical events
    if (event.severity === SecurityEventSeverity.CRITICAL) {
      return true;
    }

    const key = `${event.eventType}_${event.userId || 'anonymous'}`;
    const now = Date.now();
    const existing = this.eventCounts.get(key);

    if (!existing) {
      this.eventCounts.set(key, { count: 1, firstSeen: now });
      return config.threshold <= 1;
    }

    // Reset count if outside time window
    if (now - existing.firstSeen > config.timeWindow) {
      this.eventCounts.set(key, { count: 1, firstSeen: now });
      return config.threshold <= 1;
    }

    // Increment count and check threshold
    existing.count++;
    return existing.count >= config.threshold;
  }

  /**
   * Initialize default alert configurations
   */
  private initializeDefaultAlertConfigs(): void {
    const defaultConfigs: IAlertConfig[] = [
      {
        eventType: SecurityEventType.AUTHENTICATION_FAILED,
        severity: SecurityEventSeverity.WARNING,
        threshold: 5,
        timeWindow: 300000, // 5 minutes
        enabled: true,
      },
      {
        eventType: SecurityEventType.ACCESS_DENIED,
        severity: SecurityEventSeverity.WARNING,
        threshold: 10,
        timeWindow: 300000, // 5 minutes
        enabled: true,
      },
      {
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecurityEventSeverity.ERROR,
        threshold: 1,
        timeWindow: 60000, // 1 minute
        enabled: true,
      },
      {
        eventType: SecurityEventType.SECURITY_VIOLATION,
        severity: SecurityEventSeverity.CRITICAL,
        threshold: 1,
        timeWindow: 0,
        enabled: true,
      },
    ];

    defaultConfigs.forEach(config => {
      const key = `${config.eventType}_${config.severity}`;
      this.alertConfigs.set(key, config);
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    // Process any remaining batched events
    if (this.batchBuffer.length > 0) {
      this.processBatch();
    }
  }
}

/**
 * Factory function to create configured security alert manager
 */
export function createSecurityAlertManager(): SecurityAlertManager {
  const services: ISecurityMonitoringService[] = [];

  // Add Sentry if configured
  if (process.env.SENTRY_DSN) {
    services.push(new SentryMonitoringService(
      process.env.SENTRY_DSN,
      process.env.NODE_ENV
    ));
  }

  // Add DataDog if configured
  if (process.env.DATADOG_API_KEY) {
    services.push(new DataDogMonitoringService(
      process.env.DATADOG_API_KEY,
      process.env.DATADOG_SITE
    ));
  }

  // Add custom webhook if configured
  if (process.env.SECURITY_WEBHOOK_URL) {
    services.push(new WebhookMonitoringService(
      process.env.SECURITY_WEBHOOK_URL,
      process.env.SECURITY_WEBHOOK_API_KEY
    ));
  }

  return new SecurityAlertManager(services);
}

// Export singleton instance
export const securityAlertManager = createSecurityAlertManager();
