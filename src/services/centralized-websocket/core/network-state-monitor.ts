/**
 * Network State Monitor Implementation
 * Single Responsibility: Monitor network connectivity and changes
 * Provides network state information and quality metrics
 */

import {
  INetworkStateMonitor,
  NetworkState,
  NetworkType
} from '../interfaces/websocket-manager.interface';

/**
 * Network connection information (from Navigator API)
 */
interface NavigatorConnection {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  type?: string;
  addEventListener?: (type: string, listener: EventListener) => void;
  removeEventListener?: (type: string, listener: EventListener) => void;
}

/**
 * Network state monitor with comprehensive connectivity tracking
 */
export class NetworkStateMonitor implements INetworkStateMonitor {
  private currentNetworkState: NetworkState;
  private isMonitoring = false;
  
  // Event listeners
  private networkChangeCallbacks = new Set<(networkState: NetworkState) => void>();
  private onlineStatusCallbacks = new Set<(isOnline: boolean) => void>();
  
  // Browser event handlers
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;
  private connectionChangeHandler: ((event: Event) => void) | null = null;
  
  // Network quality tracking
  private latencyHistory: number[] = [];
  private bandwidthHistory: number[] = [];
  private readonly maxHistorySize = 10;

  constructor() {
    this.currentNetworkState = this.detectInitialNetworkState();
  }

  /**
   * Detect initial network state
   */
  private detectInitialNetworkState(): NetworkState {
    return {
      isOnline: navigator.onLine,
      connectionType: this.detectConnectionType(),
      effectiveType: this.getEffectiveType(),
      downlink: this.getDownlink(),
      rtt: this.getRTT(),
      saveData: this.getSaveData(),
      lastChange: Date.now()
    };
  }

  /**
   * Detect connection type
   */
  private detectConnectionType(): NetworkType {
    const connection = this.getConnection();
    
    if (!connection || !connection.type) {
      return 'unknown';
    }
    
    const type = connection.type.toLowerCase();
    
    if (type.includes('wifi')) return 'wifi';
    if (type.includes('cellular') || type.includes('mobile')) return 'cellular';
    if (type.includes('ethernet') || type.includes('wired')) return 'ethernet';
    
    return 'unknown';
  }

  /**
   * Get navigator connection object
   */
  private getConnection(): NavigatorConnection | null {
    const nav = navigator as any;
    return nav.connection || nav.mozConnection || nav.webkitConnection || null;
  }

  /**
   * Get effective connection type
   */
  private getEffectiveType(): string | undefined {
    const connection = this.getConnection();
    return connection?.effectiveType;
  }

  /**
   * Get downlink speed
   */
  private getDownlink(): number | undefined {
    const connection = this.getConnection();
    return connection?.downlink;
  }

  /**
   * Get round-trip time
   */
  private getRTT(): number | undefined {
    const connection = this.getConnection();
    return connection?.rtt;
  }

  /**
   * Get save data preference
   */
  private getSaveData(): boolean | undefined {
    const connection = this.getConnection();
    return connection?.saveData;
  }

  /**
   * Update network state and notify callbacks
   */
  private updateNetworkState(updates: Partial<NetworkState>): void {
    const oldState = { ...this.currentNetworkState };
    this.currentNetworkState = {
      ...this.currentNetworkState,
      ...updates,
      lastChange: Date.now()
    };

    // Notify network change callbacks
    this.networkChangeCallbacks.forEach(callback => {
      try {
        callback(this.currentNetworkState);
      } catch (error) {
        console.error('[NetworkStateMonitor] Error in network change callback:', error);
      }
    });

    // Notify online status change if it changed
    if (oldState.isOnline !== this.currentNetworkState.isOnline) {
      this.onlineStatusCallbacks.forEach(callback => {
        try {
          callback(this.currentNetworkState.isOnline);
        } catch (error) {
          console.error('[NetworkStateMonitor] Error in online status callback:', error);
        }
      });
    }
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    console.log('[NetworkStateMonitor] Network came online');
    this.updateNetworkState({
      isOnline: true,
      connectionType: this.detectConnectionType(),
      effectiveType: this.getEffectiveType(),
      downlink: this.getDownlink(),
      rtt: this.getRTT()
    });
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    console.log('[NetworkStateMonitor] Network went offline');
    this.updateNetworkState({
      isOnline: false
    });
  };

  /**
   * Handle connection change event
   */
  private handleConnectionChange = (event: Event): void => {
    console.log('[NetworkStateMonitor] Network connection changed');
    this.updateNetworkState({
      connectionType: this.detectConnectionType(),
      effectiveType: this.getEffectiveType(),
      downlink: this.getDownlink(),
      rtt: this.getRTT(),
      saveData: this.getSaveData()
    });
  };

  /**
   * Add value to history array with size limit
   */
  private addToHistory(history: number[], value: number): void {
    history.push(value);
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  /**
   * Calculate average from history
   */
  private calculateAverage(history: number[]): number {
    if (history.length === 0) return 0;
    return history.reduce((sum, value) => sum + value, 0) / history.length;
  }

  // Public interface implementation

  /**
   * Get current network state
   */
  getNetworkState(): NetworkState {
    return { ...this.currentNetworkState };
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return this.currentNetworkState.isOnline;
  }

  /**
   * Get connection type
   */
  getConnectionType(): NetworkType {
    return this.currentNetworkState.connectionType;
  }

  /**
   * Start network monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Setup online/offline event listeners
    this.onlineHandler = this.handleOnline;
    this.offlineHandler = this.handleOffline;
    
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);

    // Setup connection change listener
    const connection = this.getConnection();
    if (connection && connection.addEventListener) {
      this.connectionChangeHandler = this.handleConnectionChange;
      connection.addEventListener('change', this.connectionChangeHandler);
    }

    console.log('[NetworkStateMonitor] Started monitoring network state');
  }

  /**
   * Stop network monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    // Remove online/offline event listeners
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }
    
    if (this.offlineHandler) {
      window.removeEventListener('offline', this.offlineHandler);
      this.offlineHandler = null;
    }

    // Remove connection change listener
    const connection = this.getConnection();
    if (connection && connection.removeEventListener && this.connectionChangeHandler) {
      connection.removeEventListener('change', this.connectionChangeHandler);
      this.connectionChangeHandler = null;
    }

    console.log('[NetworkStateMonitor] Stopped monitoring network state');
  }

  /**
   * Register network change callback
   */
  onNetworkChange(callback: (networkState: NetworkState) => void): () => void {
    this.networkChangeCallbacks.add(callback);
    
    return () => {
      this.networkChangeCallbacks.delete(callback);
    };
  }

  /**
   * Register online status change callback
   */
  onOnlineStatusChange(callback: (isOnline: boolean) => void): () => void {
    this.onlineStatusCallbacks.add(callback);
    
    return () => {
      this.onlineStatusCallbacks.delete(callback);
    };
  }

  /**
   * Measure network latency
   */
  async measureLatency(): Promise<number> {
    const startTime = performance.now();
    
    try {
      // Use a small image or endpoint for latency measurement
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      this.addToHistory(this.latencyHistory, latency);
      
      return latency;
    } catch (error) {
      console.error('[NetworkStateMonitor] Error measuring latency:', error);
      return -1;
    }
  }

  /**
   * Estimate bandwidth (simplified implementation)
   */
  async estimateBandwidth(): Promise<number> {
    const connection = this.getConnection();
    
    if (connection && connection.downlink) {
      const bandwidth = connection.downlink * 1000; // Convert to kbps
      this.addToHistory(this.bandwidthHistory, bandwidth);
      return bandwidth;
    }
    
    // Fallback: simple bandwidth test
    try {
      const testSize = 1024; // 1KB test
      const startTime = performance.now();
      
      const response = await fetch('/favicon.ico', {
        cache: 'no-cache'
      });
      
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000; // Convert to seconds
      const bandwidth = (testSize * 8) / duration; // bits per second
      
      this.addToHistory(this.bandwidthHistory, bandwidth);
      
      return bandwidth;
    } catch (error) {
      console.error('[NetworkStateMonitor] Error estimating bandwidth:', error);
      return -1;
    }
  }

  /**
   * Get connection quality assessment
   */
  getConnectionQuality(): 'poor' | 'fair' | 'good' | 'excellent' {
    const effectiveType = this.currentNetworkState.effectiveType;
    const rtt = this.currentNetworkState.rtt;
    const downlink = this.currentNetworkState.downlink;
    
    // Use effective type if available
    if (effectiveType) {
      switch (effectiveType) {
        case 'slow-2g':
        case '2g':
          return 'poor';
        case '3g':
          return 'fair';
        case '4g':
          return 'good';
        default:
          return 'excellent';
      }
    }
    
    // Use RTT and downlink if available
    if (rtt !== undefined && downlink !== undefined) {
      if (rtt > 1000 || downlink < 0.5) return 'poor';
      if (rtt > 500 || downlink < 1.5) return 'fair';
      if (rtt > 200 || downlink < 5) return 'good';
      return 'excellent';
    }
    
    // Fallback to online status
    return this.currentNetworkState.isOnline ? 'good' : 'poor';
  }

  /**
   * Get average latency from history
   */
  getAverageLatency(): number {
    return this.calculateAverage(this.latencyHistory);
  }

  /**
   * Get average bandwidth from history
   */
  getAverageBandwidth(): number {
    return this.calculateAverage(this.bandwidthHistory);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.networkChangeCallbacks.clear();
    this.onlineStatusCallbacks.clear();
    this.latencyHistory = [];
    this.bandwidthHistory = [];
  }
}
