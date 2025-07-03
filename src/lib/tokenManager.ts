/**
 * Token Management Utility
 * 
 * Centralized token storage and retrieval to handle backward compatibility
 * and ensure consistent token key naming across the application.
 */

const TOKEN_KEYS = {
  PRIMARY: 'token',
  LEGACY: ['auth_token', 'access_token'] // Backward compatibility
} as const;

export class TokenManager {
  /**
   * Store token in localStorage using the standard key
   */
  static setToken(token: string): void {
    if (typeof window === 'undefined') return;
    
    // Clear any legacy tokens first
    TokenManager.clearAllTokens();
    
    // Store with primary key
    localStorage.setItem(TOKEN_KEYS.PRIMARY, token);
    console.log('[TokenManager] Token stored with key:', TOKEN_KEYS.PRIMARY);
  }

  /**
   * Retrieve token from localStorage, checking all possible keys
   */
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    // Check primary key first
    let token = localStorage.getItem(TOKEN_KEYS.PRIMARY);
    if (token) {
      console.log('[TokenManager] Token found with primary key:', TOKEN_KEYS.PRIMARY);
      return token;
    }
    
    // Check legacy keys for backward compatibility
    for (const legacyKey of TOKEN_KEYS.LEGACY) {
      token = localStorage.getItem(legacyKey);
      if (token) {
        console.log('[TokenManager] Token found with legacy key:', legacyKey);
        // Migrate to primary key
        TokenManager.setToken(token);
        localStorage.removeItem(legacyKey);
        console.log('[TokenManager] Token migrated from', legacyKey, 'to', TOKEN_KEYS.PRIMARY);
        return token;
      }
    }
    
    console.log('[TokenManager] No token found in localStorage');
    return null;
  }

  /**
   * Remove token from localStorage
   */
  static removeToken(): void {
    if (typeof window === 'undefined') return;
    
    TokenManager.clearAllTokens();
    console.log('[TokenManager] All tokens cleared');
  }

  /**
   * Check if a valid token exists
   */
  static hasToken(): boolean {
    return TokenManager.getToken() !== null;
  }

  /**
   * Clear all tokens (primary and legacy)
   */
  private static clearAllTokens(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(TOKEN_KEYS.PRIMARY);
    TOKEN_KEYS.LEGACY.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Get token with prefix for debugging
   */
  static getTokenPreview(): string {
    const token = TokenManager.getToken();
    return token ? token.substring(0, 20) + '...' : 'No token';
  }

  /**
   * Migrate legacy tokens to the standard key
   */
  static migrateLegacyTokens(): void {
    const token = TokenManager.getToken(); // This automatically migrates
    if (token) {
      console.log('[TokenManager] Legacy token migration completed');
    }
  }
}

export default TokenManager;
