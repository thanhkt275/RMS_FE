/**
 * Browser Compatibility Handler
 * Single Responsibility: Handle browser-specific compatibility issues for cross-tab communication
 * Provides detection and workarounds for various browser limitations
 */

/**
 * Browser detection results
 */
export interface BrowserInfo {
  name: string;
  version: string;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
  isIE: boolean;
}

/**
 * Compatibility features support
 */
export interface CompatibilitySupport {
  broadcastChannel: boolean;
  localStorage: boolean;
  storageEvents: boolean;
  indexedDB: boolean;
  sharedWorker: boolean;
  serviceWorker: boolean;
  webWorker: boolean;
  visibilityAPI: boolean;
  beforeUnload: boolean;
}

/**
 * Browser compatibility handler
 */
export class BrowserCompatibilityHandler {
  private browserInfo: BrowserInfo;
  private compatibilitySupport: CompatibilitySupport;

  constructor() {
    this.browserInfo = this.detectBrowser();
    this.compatibilitySupport = this.detectFeatureSupport();
  }

  /**
   * Detect browser information
   */
  private detectBrowser(): BrowserInfo {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    
    // Browser detection
    const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor || '');
    const isSafari = /Safari/.test(userAgent) && /Apple Computer/.test(navigator.vendor || '');
    const isFirefox = /Firefox/.test(userAgent);
    const isEdge = /Edge/.test(userAgent) || /Edg/.test(userAgent);
    const isIE = /MSIE|Trident/.test(userAgent);
    
    // Mobile detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    
    // Version extraction (simplified)
    let version = 'unknown';
    if (isChrome) {
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match ? match[1] : 'unknown';
    } else if (isSafari) {
      const match = userAgent.match(/Version\/(\d+)/);
      version = match ? match[1] : 'unknown';
    } else if (isFirefox) {
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match ? match[1] : 'unknown';
    }

    // Browser name
    let name = 'unknown';
    if (isChrome) name = 'chrome';
    else if (isSafari) name = 'safari';
    else if (isFirefox) name = 'firefox';
    else if (isEdge) name = 'edge';
    else if (isIE) name = 'ie';

    return {
      name,
      version,
      isMobile,
      isIOS,
      isAndroid,
      isSafari,
      isChrome,
      isFirefox,
      isEdge,
      isIE
    };
  }

  /**
   * Detect feature support
   */
  private detectFeatureSupport(): CompatibilitySupport {
    const support: CompatibilitySupport = {
      broadcastChannel: false,
      localStorage: false,
      storageEvents: false,
      indexedDB: false,
      sharedWorker: false,
      serviceWorker: false,
      webWorker: false,
      visibilityAPI: false,
      beforeUnload: false
    };

    if (typeof window === 'undefined') {
      return support;
    }

    // BroadcastChannel support
    support.broadcastChannel = typeof BroadcastChannel !== 'undefined';

    // LocalStorage support
    try {
      const testKey = '__test_localStorage__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      support.localStorage = true;
    } catch {
      support.localStorage = false;
    }

    // Storage events support (Safari has issues)
    support.storageEvents = support.localStorage && !this.browserInfo.isSafari;

    // IndexedDB support
    support.indexedDB = typeof indexedDB !== 'undefined';

    // SharedWorker support
    support.sharedWorker = typeof SharedWorker !== 'undefined';

    // ServiceWorker support
    support.serviceWorker = 'serviceWorker' in navigator;

    // WebWorker support
    support.webWorker = typeof Worker !== 'undefined';

    // Page Visibility API support
    support.visibilityAPI = typeof document !== 'undefined' && 
                           (typeof document.hidden !== 'undefined' || 
                            typeof (document as any).webkitHidden !== 'undefined');

    // beforeunload support
    support.beforeUnload = typeof window !== 'undefined' && 
                          typeof window.addEventListener !== 'undefined';

    return support;
  }

  /**
   * Get browser information
   */
  getBrowserInfo(): BrowserInfo {
    return { ...this.browserInfo };
  }

  /**
   * Get compatibility support information
   */
  getCompatibilitySupport(): CompatibilitySupport {
    return { ...this.compatibilitySupport };
  }

  /**
   * Get recommended fallback strategy
   */
  getRecommendedFallbackStrategy(): string[] {
    const strategies: string[] = [];

    // Primary strategy
    if (this.compatibilitySupport.broadcastChannel) {
      strategies.push('broadcastChannel');
    }

    // Fallback strategies based on browser capabilities
    if (this.compatibilitySupport.localStorage) {
      if (this.compatibilitySupport.storageEvents) {
        strategies.push('localStorage-events');
      } else {
        strategies.push('localStorage-polling');
      }
    }

    if (this.compatibilitySupport.indexedDB) {
      strategies.push('indexedDB');
    }

    if (this.compatibilitySupport.sharedWorker) {
      strategies.push('sharedWorker');
    }

    return strategies;
  }

  /**
   * Get browser-specific configuration
   */
  getBrowserSpecificConfig(): {
    pollingInterval: number;
    heartbeatInterval: number;
    messageTimeout: number;
    maxRetries: number;
    ackTimeout: number;
  } {
    const baseConfig = {
      pollingInterval: 1000,
      heartbeatInterval: 5000,
      messageTimeout: 300000,
      maxRetries: 3,
      ackTimeout: 5000
    };

    // Safari-specific adjustments
    if (this.browserInfo.isSafari) {
      return {
        ...baseConfig,
        pollingInterval: 500, // More frequent polling for Safari
        heartbeatInterval: 3000, // More frequent heartbeat
        ackTimeout: 3000 // Shorter timeout
      };
    }

    // Mobile browser adjustments
    if (this.browserInfo.isMobile) {
      return {
        ...baseConfig,
        pollingInterval: 2000, // Less frequent polling to save battery
        heartbeatInterval: 10000, // Less frequent heartbeat
        messageTimeout: 600000, // Longer timeout for background tabs
        ackTimeout: 10000 // Longer timeout for slower connections
      };
    }

    // IE adjustments
    if (this.browserInfo.isIE) {
      return {
        ...baseConfig,
        pollingInterval: 2000, // Less frequent polling
        maxRetries: 5, // More retries for unreliable IE
        ackTimeout: 10000 // Longer timeout
      };
    }

    return baseConfig;
  }

  /**
   * Check if browser has known issues with cross-tab communication
   */
  hasKnownIssues(): { hasIssues: boolean; issues: string[] } {
    const issues: string[] = [];

    // Safari storage event issues
    if (this.browserInfo.isSafari) {
      issues.push('Safari has limited storage event support');
      issues.push('Safari may not fire storage events in some cases');
    }

    // Mobile browser background limitations
    if (this.browserInfo.isMobile) {
      issues.push('Mobile browsers may throttle background tabs');
      issues.push('Background tab execution may be limited');
    }

    // IE compatibility issues
    if (this.browserInfo.isIE) {
      issues.push('Internet Explorer lacks BroadcastChannel support');
      issues.push('IE has limited modern JavaScript support');
    }

    // iOS specific issues
    if (this.browserInfo.isIOS) {
      issues.push('iOS Safari has strict background tab limitations');
      issues.push('iOS may suspend background tabs aggressively');
    }

    return {
      hasIssues: issues.length > 0,
      issues
    };
  }

  /**
   * Get workarounds for detected issues
   */
  getWorkarounds(): string[] {
    const workarounds: string[] = [];

    if (this.browserInfo.isSafari) {
      workarounds.push('Use polling mechanism instead of storage events');
      workarounds.push('Implement heartbeat system for tab detection');
    }

    if (this.browserInfo.isMobile) {
      workarounds.push('Increase polling intervals to save battery');
      workarounds.push('Use persistent storage for message queuing');
      workarounds.push('Implement tab visibility detection');
    }

    if (this.browserInfo.isIE) {
      workarounds.push('Use localStorage fallback exclusively');
      workarounds.push('Implement polyfills for modern features');
    }

    if (!this.compatibilitySupport.broadcastChannel) {
      workarounds.push('Use enhanced localStorage fallback');
      workarounds.push('Implement message deduplication');
    }

    return workarounds;
  }

  /**
   * Test cross-tab communication capability
   */
  async testCrossTabCommunication(): Promise<{
    success: boolean;
    method: string;
    latency: number;
    error?: string;
  }> {
    const startTime = Date.now();

    // Test BroadcastChannel
    if (this.compatibilitySupport.broadcastChannel) {
      try {
        const channel = new BroadcastChannel('test-channel');
        channel.close();
        return {
          success: true,
          method: 'BroadcastChannel',
          latency: Date.now() - startTime
        };
      } catch (error) {
        // Fall through to localStorage test
      }
    }

    // Test localStorage
    if (this.compatibilitySupport.localStorage) {
      try {
        const testKey = '__cross_tab_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        return {
          success: true,
          method: 'localStorage',
          latency: Date.now() - startTime
        };
      } catch (error) {
        return {
          success: false,
          method: 'localStorage',
          latency: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return {
      success: false,
      method: 'none',
      latency: Date.now() - startTime,
      error: 'No cross-tab communication method available'
    };
  }
}
