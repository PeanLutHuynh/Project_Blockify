// Helper function to get environment variables
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  // In Vite, environment variables are available as import.meta.env.VITE_*
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[key] || defaultValue;
  }
  return defaultValue;
};

export const ENV = {
  // API Configuration
  API_BASE_URL: getEnvVar('VITE_API_BASE_URL', 'http://localhost:3001/api'),
  
  // Supabase Configuration (from shared .env)
  SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL', ''),
  SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY', ''),
  
  // Google OAuth Configuration (from shared .env)
  GOOGLE_CLIENT_ID: getEnvVar('VITE_GOOGLE_CLIENT_ID', ''),
  
  // Environment
  NODE_ENV: getEnvVar('VITE_NODE_ENV', 'development'),
  
  // Frontend-specific configurations
  JWT_STORAGE_KEY: 'blockify_auth_token',
  USER_STORAGE_KEY: 'blockify_user',
  
  // Google OAuth
  GOOGLE_OAUTH_REDIRECT_URL: getEnvVar('VITE_GOOGLE_OAUTH_REDIRECT_URL', '/src/pages/AuthCallback.html'),
  
  // API endpoints
  API_ENDPOINTS: {
    AUTH: {
      SIGN_UP: '/auth/signup',
      SIGN_IN: '/auth/signin',
      GOOGLE_AUTH: '/auth/google',
      VERIFY_TOKEN: '/auth/verify-token',
      ME: '/auth/me',
      REFRESH: '/auth/refresh'
    }
  }
};

// Helper functions
export const isDevelopment = () => getEnvVar('VITE_NODE_ENV', 'development') === 'development';
export const isProduction = () => getEnvVar('VITE_NODE_ENV', 'development') === 'production';

// Export API endpoints for convenience
export const API_ENDPOINTS = ENV.API_ENDPOINTS;