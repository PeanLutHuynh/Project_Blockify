/**
 * Frontend Environment Configuration
 * Fetches config from backend API to avoid hardcoding sensitive values
 */

// Default local values (will be overridden by API)
export let ENV = {
  // API Configuration
  API_BASE_URL: 'http://127.0.0.1:3001',
  
  // Supabase Configuration (loaded from backend)
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  
  // Google OAuth Configuration (loaded from backend)
  GOOGLE_CLIENT_ID: '',
  
  // Environment
  NODE_ENV: 'development',
  
  // Frontend-specific configurations
  JWT_STORAGE_KEY: 'blockify_auth_token',
  USER_STORAGE_KEY: 'blockify_user',
  
  // Google OAuth - Full URL for Supabase redirect
  GOOGLE_OAUTH_REDIRECT_URL: 'http://127.0.0.1:3002/src/pages/AuthCallback.html',
  
  // API endpoints
  API_ENDPOINTS: {
    AUTH: {
      SIGN_UP: '/api/auth/signup',
      SIGN_IN: '/api/auth/signin',
      GOOGLE_AUTH: '/api/auth/google',
      VERIFY_TOKEN: '/api/auth/verify-token',
      ME: '/api/auth/me',
      REFRESH: '/api/auth/refresh'
    }
  }
};

/**
 * Load configuration from backend API
 * Call this during app initialization
 */
export async function loadConfig(): Promise<void> {
  try {
    const response = await fetch(`${ENV.API_BASE_URL}/api/v1/config`);
    
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      // Update ENV with values from backend
      ENV = {
        ...ENV,
        SUPABASE_URL: result.data.supabaseUrl || ENV.SUPABASE_URL,
        SUPABASE_ANON_KEY: result.data.supabaseAnonKey || ENV.SUPABASE_ANON_KEY,
        GOOGLE_CLIENT_ID: result.data.googleClientId || ENV.GOOGLE_CLIENT_ID,
        NODE_ENV: result.data.environment || ENV.NODE_ENV,
      };
      
      console.log('✅ Configuration loaded from backend');
    }
  } catch (error) {
    console.warn('⚠️ Failed to load config from backend, using defaults:', error);
    // Continue with default values if backend is unavailable
  }
}

// Helper functions
export const isDevelopment = () => ENV.NODE_ENV === 'development';
export const isProduction = () => ENV.NODE_ENV === 'production';

// Export API endpoints for convenience
export const API_ENDPOINTS = ENV.API_ENDPOINTS;