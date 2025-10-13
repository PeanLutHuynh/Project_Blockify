/**
 * Custom HTTP Client using native Fetch API
 */

import type { ApiResponse } from '@/types';
import { ENV } from '../config/env.js';

export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  withCredentials?: boolean;
}

export class FetchHttpClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private defaultTimeout: number;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    this.defaultTimeout = 30000; // 30 seconds
  }

  /**
   * Get auth token from localStorage
   */
  private getAuthToken(): string | null {
    return localStorage.getItem(ENV.JWT_STORAGE_KEY) || null;
  }

  /**
   * Build complete URL
   */
  private buildUrl(endpoint: string): string {
    // Remove leading slash from endpoint
    const cleanEndpoint = endpoint.replace(/^\//, '');
    // Remove trailing slash from baseURL
    const cleanBaseUrl = this.baseURL.replace(/\/$/, '');

    return cleanBaseUrl ? `${cleanBaseUrl}/${cleanEndpoint}` : cleanEndpoint;
  }

  /**
   * Build headers
   */
  private buildHeaders(customHeaders?: Record<string, string>): HeadersInit {
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...customHeaders,
    };

    // Add auth token if available
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: 'include', // For cookies
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Handle response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');

    let data: any;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // If response is not ok, throw error
    if (!response.ok) {
      const errorMessage =
        data?.error?.message || data?.message || 'Request failed';

      throw {
        success: false,
        message: errorMessage,
        error: errorMessage,
        status: response.status,
      };
    }

    // If data is already in ApiResponse format
    if (typeof data === 'object' && 'success' in data) {
      return data as ApiResponse<T>;
    }

    // Wrap data in ApiResponse format
    return {
      success: true,
      message: 'Success',
      data: data as T,
    };
  }

  /**
   * Generic GET request
   */
  async get<T = any>(
    endpoint: string,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    const headers = this.buildHeaders(config?.headers);
    const timeout = config?.timeout || this.defaultTimeout;

    try {
      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'GET',
          headers,
        },
        timeout
      );

      return await this.handleResponse<T>(response);
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Generic POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    const headers = this.buildHeaders(config?.headers);
    const timeout = config?.timeout || this.defaultTimeout;

    try {
      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
        },
        timeout
      );

      return await this.handleResponse<T>(response);
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Generic PUT request
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    const headers = this.buildHeaders(config?.headers);
    const timeout = config?.timeout || this.defaultTimeout;

    try {
      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify(data),
        },
        timeout
      );

      return await this.handleResponse<T>(response);
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Generic PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    const headers = this.buildHeaders(config?.headers);
    const timeout = config?.timeout || this.defaultTimeout;

    try {
      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify(data),
        },
        timeout
      );

      return await this.handleResponse<T>(response);
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Generic DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    const headers = this.buildHeaders(config?.headers);
    const timeout = config?.timeout || this.defaultTimeout;

    try {
      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'DELETE',
          headers,
        },
        timeout
      );

      return await this.handleResponse<T>(response);
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Upload file
   */
  async uploadFile<T = any>(
    endpoint: string,
    file: File,
    fieldName: string = 'file',
    additionalData?: Record<string, any>,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    const formData = new FormData();

    formData.append(fieldName, file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    try {
      // Custom headers without Content-Type (let browser set it with boundary)
      const headers: Record<string, string> = {};
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const xhr = new XMLHttpRequest();

      return await new Promise<ApiResponse<T>>((resolve, reject) => {
        // Progress handler
        if (onProgress) {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              onProgress(progress);
            }
          });
        }

        // Load handler
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch {
              resolve({
                success: true,
                message: 'Upload successful',
                data: xhr.responseText as any,
              });
            }
          } else {
            reject({
              success: false,
              message: xhr.statusText || 'Upload failed',
              error: xhr.statusText || 'Upload failed',
            });
          }
        });

        // Error handler
        xhr.addEventListener('error', () => {
          reject({
            success: false,
            message: 'Network error during upload',
            error: 'Network error during upload',
          });
        });

        // Open and send
        xhr.open('POST', url);

        // Set headers
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });

        xhr.withCredentials = true;
        xhr.send(formData);
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: any): ApiResponse {
    console.error('HTTP Client Error:', error);

    if (error.success === false && error.message) {
      return error;
    }

    const errorMessage = error.message || 'An unknown error occurred';
    return {
      success: false,
      message: errorMessage,
      error: errorMessage,
    };
  }

  /**
   * Set auth token
   */
  setAuthToken(token: string): void {
    localStorage.setItem(ENV.JWT_STORAGE_KEY, token);
  }

  /**
   * Clear auth token
   */
  clearAuthToken(): void {
    localStorage.removeItem(ENV.JWT_STORAGE_KEY);
    localStorage.removeItem('refreshToken');
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }
}

// Get API URL from environment or use default
const getApiBaseUrl = (): string => {
  // Try to get from global config
  if (typeof window !== 'undefined' && (window as any).APP_CONFIG?.API_BASE_URL) {
    return (window as any).APP_CONFIG.API_BASE_URL;
  }
  return 'http://localhost:3001';
};

// Create singleton instance
export const httpClient = new FetchHttpClient(getApiBaseUrl());

// Export convenience methods
export const {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  patch: apiPatch,
  delete: apiDelete,
  uploadFile,
} = httpClient;
