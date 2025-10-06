import { Router } from '../../../infrastructure/http/Router';
import { ENV } from '../../../config/env';
import type { HttpRequest, HttpResponse } from '../../../infrastructure/http/types';

/**
 * Config routes - Provide public configuration to frontend
 * IMPORTANT: Only expose public/safe values (no secrets!)
 */
export const configRoutes = new Router();

/**
 * GET /api/v1/config
 * Returns public configuration for frontend
 */
configRoutes.get('/config', async (req: HttpRequest, res: HttpResponse) => {
  try {
    // Only expose public, non-sensitive configuration
    const publicConfig = {
      supabaseUrl: ENV.SUPABASE_URL,
      supabaseAnonKey: ENV.SUPABASE_ANON_KEY, // Anon key is safe to expose (it's public)
      googleClientId: ENV.GOOGLE_CLIENT_ID,
      apiBaseUrl: `http://${ENV.HOST}:${ENV.PORT}`,
      environment: ENV.NODE_ENV,
    };

    res.status(200).json({
      success: true,
      data: publicConfig,
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_ERROR',
        message: 'Failed to fetch configuration',
      },
    });
  }
});
