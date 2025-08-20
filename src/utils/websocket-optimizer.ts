/**
 * WebSocket Optimization Utility
 * Provides tools for monitoring and debugging WebSocket performance
 */

interface WebSocketMetrics {
  totalEmissions: number;
  preventedEmissions: number;
  lastEmissionTime: number;
  duplicatesPrevented: number;
  debounceHits: number;
  rateLimitHits: number;
}

class WebSocketOptimizer {
  private metrics: Map<string, WebSocketMetrics> = new Map();
  private debugMode: boolean = false;

  constructor(debugMode = false) {
    this.debugMode = debugMode;
  }

  /**
   * Track an emission attempt
   */
  trackEmission(eventType: string, prevented = false, reason?: string): void {
    const current = this.metrics.get(eventType) || {
      totalEmissions: 0,
      preventedEmissions: 0,
      lastEmissionTime: 0,
      duplicatesPrevented: 0,
      debounceHits: 0,
      rateLimitHits: 0
    };

    if (prevented) {
      current.preventedEmissions++;
      
      switch (reason) {
        case 'duplicate':
          current.duplicatesPrevented++;
          break;
        case 'debounce':
          current.debounceHits++;
          break;
        case 'rateLimit':
          current.rateLimitHits++;
          break;
      }

      if (this.debugMode) {
        console.log(`[WebSocketOptimizer] Prevented ${eventType} emission: ${reason}`);
      }
    } else {
      current.totalEmissions++;
      current.lastEmissionTime = Date.now();
      
      if (this.debugMode) {
        console.log(`[WebSocketOptimizer] Allowed ${eventType} emission`);
      }
    }

    this.metrics.set(eventType, current);
  }

  /**
   * Get optimization statistics
   */
  getStats(): { [eventType: string]: WebSocketMetrics & { efficiencyRatio: number } } {
    const stats: { [eventType: string]: WebSocketMetrics & { efficiencyRatio: number } } = {};

    this.metrics.forEach((metrics, eventType) => {
      const total = metrics.totalEmissions + metrics.preventedEmissions;
      const efficiencyRatio = total > 0 ? metrics.preventedEmissions / total : 0;

      stats[eventType] = {
        ...metrics,
        efficiencyRatio
      };
    });

    return stats;
  }

  /**
   * Get overall optimization summary
   */
  getSummary(): {
    totalEvents: number;
    totalPrevented: number;
    overallEfficiency: number;
    topOptimizedEvents: Array<{ eventType: string; preventedCount: number; efficiency: number }>;
  } {
    let totalEvents = 0;
    let totalPrevented = 0;
    const eventEfficiencies: Array<{ eventType: string; preventedCount: number; efficiency: number }> = [];

    this.metrics.forEach((metrics, eventType) => {
      const eventTotal = metrics.totalEmissions + metrics.preventedEmissions;
      totalEvents += eventTotal;
      totalPrevented += metrics.preventedEmissions;

      const efficiency = eventTotal > 0 ? metrics.preventedEmissions / eventTotal : 0;
      eventEfficiencies.push({
        eventType,
        preventedCount: metrics.preventedEmissions,
        efficiency
      });
    });

    // Sort by prevented count descending
    eventEfficiencies.sort((a, b) => b.preventedCount - a.preventedCount);

    return {
      totalEvents,
      totalPrevented,
      overallEfficiency: totalEvents > 0 ? totalPrevented / totalEvents : 0,
      topOptimizedEvents: eventEfficiencies.slice(0, 5) // Top 5
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics.clear();
    if (this.debugMode) {
      console.log('[WebSocketOptimizer] Metrics reset');
    }
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Log current statistics to console
   */
  logStats(): void {
    const summary = this.getSummary();
    const stats = this.getStats();

    console.group('[WebSocket Optimization Report]');
    console.log(`Total Events: ${summary.totalEvents}`);
    console.log(`Total Prevented: ${summary.totalPrevented}`);
    console.log(`Overall Efficiency: ${(summary.overallEfficiency * 100).toFixed(2)}%`);
    
    console.group('Top Optimized Events:');
    summary.topOptimizedEvents.forEach(event => {
      console.log(`${event.eventType}: ${event.preventedCount} prevented (${(event.efficiency * 100).toFixed(2)}% efficiency)`);
    });
    console.groupEnd();

    console.group('Detailed Stats:');
    Object.entries(stats).forEach(([eventType, metrics]) => {
      console.group(eventType);
      console.log(`Total Emissions: ${metrics.totalEmissions}`);
      console.log(`Prevented: ${metrics.preventedEmissions}`);
      console.log(`Duplicates Prevented: ${metrics.duplicatesPrevented}`);
      console.log(`Debounce Hits: ${metrics.debounceHits}`);
      console.log(`Rate Limit Hits: ${metrics.rateLimitHits}`);
      console.log(`Efficiency: ${(metrics.efficiencyRatio * 100).toFixed(2)}%`);
      console.groupEnd();
    });
    console.groupEnd();
    
    console.groupEnd();
  }

  /**
   * Check if an event type has been optimized recently
   */
  isRecentlyOptimized(eventType: string, withinMs = 5000): boolean {
    const metrics = this.metrics.get(eventType);
    if (!metrics) return false;

    const now = Date.now();
    return metrics.preventedEmissions > 0 && (now - metrics.lastEmissionTime) < withinMs;
  }

  /**
   * Get efficiency rating for an event type
   */
  getEfficiencyRating(eventType: string): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' {
    const stats = this.getStats();
    const eventStats = stats[eventType];
    
    if (!eventStats) return 'unknown';

    const efficiency = eventStats.efficiencyRatio;
    
    if (efficiency >= 0.8) return 'excellent';
    if (efficiency >= 0.6) return 'good';
    if (efficiency >= 0.4) return 'fair';
    return 'poor';
  }
}

// Export singleton instance
export const webSocketOptimizer = new WebSocketOptimizer(process.env.NODE_ENV === 'development');
export default webSocketOptimizer;

// Export utility functions
export const trackWebSocketEmission = (eventType: string, prevented = false, reason?: string) => {
  webSocketOptimizer.trackEmission(eventType, prevented, reason);
};

export const getWebSocketStats = () => webSocketOptimizer.getStats();
export const getWebSocketSummary = () => webSocketOptimizer.getSummary();
export const logWebSocketStats = () => webSocketOptimizer.logStats();
