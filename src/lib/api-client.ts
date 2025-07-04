const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
import TokenManager from './tokenManager';
 
/**
 * API client for making requests to the backend
 */
class ApiClient {
  /**
   * Makes a GET request to the API
   */
  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>('GET', endpoint);
  }

  /**
   * Makes a POST request to the API
   */
  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>('POST', endpoint, data);
  }

  /**
   * Makes a PUT request to the API
   */
  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>('PUT', endpoint, data);
  }

  /**
   * Makes a PATCH request to the API
   */
  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>('PATCH', endpoint, data);
  }

  /**
   * Makes a DELETE request to the API
   */
  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>('DELETE', endpoint);
  }

  /**
   * Makes a POST request with FormData (for file uploads)
   */
  async postFormData<T = any>(endpoint: string, formData: FormData): Promise<T> {
    return this.requestFormData<T>('POST', endpoint, formData);
  }

  /**
   * Makes a POST request that returns a Blob (for file downloads)
   */
  async postBlob(endpoint: string, data?: any): Promise<Blob> {
    return this.requestBlob('POST', endpoint, data);
  }

  /**
   * Makes a GET request that returns a Blob (for file downloads)
   */
  async getBlob(endpoint: string): Promise<Blob> {
    return this.requestBlob('GET', endpoint);
  }

  /**
   * Makes a request to the API with the specified method
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<T> {
    // Fix URL construction to prevent double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    const url = `${API_URL}/${cleanEndpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if token exists in localStorage (client-side only)
    const token = TokenManager.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('[API] Adding Authorization header with token:', TokenManager.getTokenPreview());
    } else {
      console.log('[API] No token found for Authorization header');
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: 'include', // Important: This ensures cookies are sent with requests
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    try {
      console.log(`[API] ${method} ${url}`, data ? { data } : '');
      
      // For sensitive operations, log additional debug info
      if (url.includes('bulk-role') || url.includes('bulk-delete')) {
        console.log(`[API] DEBUG - Cookies:`, document.cookie);
        console.log(`[API] DEBUG - Headers:`, headers);
        console.log(`[API] DEBUG - Config:`, config);
      }
      
      const response = await fetch(url, config);
      
      // Handle non-JSON responses (like 429 rate limit responses)
      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        responseData = { message: response.statusText || 'Request failed' };
      }

      console.log(`[API] ${method} ${url} -> ${response.status}`, responseData);

      if (!response.ok) {
        // Handle API errors with proper status code propagation
        const error = new Error(
          responseData.message || `HTTP ${response.status}: ${response.statusText}`
        ) as Error & { status?: number; response?: { status: number; data: any } };
        error.status = response.status;
        error.response = {
          status: response.status,
          data: responseData
        };
        
        // Special handling for authentication errors
        if (response.status === 401) {
          console.warn(`[API] Unauthorized access to ${url}. This might be expected for initial auth checks.`);
        }
        
        throw error;
      }

      return responseData;
    } catch (error: any) {
      // Add more context to fetch errors
      if (!error.status) {
        console.error(`[API] Network error while accessing: ${url}`, {
          error: error.message,
          url,
          method,
          data
        });
        
        // Check if it's a connection error
        if (error.message?.includes('Failed to fetch') || 
            error.message?.includes('NetworkError') ||
            error.message?.includes('ERR_NETWORK')) {
          throw new Error(`Unable to connect to the API server at ${API_URL}. Please ensure:
1. The backend server is running
2. The API URL is correct: ${API_URL}
3. CORS is properly configured
4. No firewall is blocking the connection`);
        }
        
        throw new Error(`Network error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Makes a request with FormData (for file uploads)
   */
  private async requestFormData<T>(
    method: string,
    endpoint: string,
    formData: FormData
  ): Promise<T> {
    // Fix URL construction to prevent double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    const url = `${API_URL}/${cleanEndpoint}`;
    
    const headers: HeadersInit = {};

    // Add Authorization header if token exists in localStorage (client-side only)
    const token = TokenManager.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: 'include',
      body: formData,
    };

    try {
      console.log(`[API] ${method} ${url} (FormData)`);
      
      const response = await fetch(url, config);
      
      // Handle non-JSON responses
      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        responseData = { message: response.statusText || 'Request failed' };
      }

      console.log(`[API] ${method} ${url} -> ${response.status}`, responseData);

      if (!response.ok) {
        const error = new Error(
          responseData.message || `HTTP ${response.status}: ${response.statusText}`
        ) as Error & { status?: number; response?: { status: number; data: any } };
        error.status = response.status;
        error.response = {
          status: response.status,
          data: responseData
        };
        throw error;
      }

      return responseData;
    } catch (error: any) {
      if (!error.status) {
        console.error(`[API] Network error while accessing: ${url}`, {
          error: error.message,
          url,
          method
        });
        throw new Error(`Network error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Makes a request that returns a Blob (for file downloads)
   */
  private async requestBlob(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<Blob> {
    // Fix URL construction to prevent double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    const url = `${API_URL}/${cleanEndpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if token exists in localStorage (client-side only)
    const token = TokenManager.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: 'include',
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    try {
      console.log(`[API] ${method} ${url} (Blob response)`, data ? { data } : '');
      
      const response = await fetch(url, config);

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return response.blob();
    } catch (error: any) {
      console.error(`[API] Error while accessing: ${url}`, {
        error: error.message,
        url,
        method,
        data
      });
      throw error;
    }
  }
}

export const apiClient = new ApiClient();