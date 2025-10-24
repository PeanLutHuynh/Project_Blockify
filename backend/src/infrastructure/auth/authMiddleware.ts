import { Middleware } from '../http/types';
import { JWT } from '../security/JWT';
import { ENV } from '../../config/env';
import { createClient } from '@supabase/supabase-js';

/**
 * Custom Auth Middleware
 */

// Create JWT instance
const jwt = new JWT(ENV.JWT_SECRET || '');

// Create Supabase client for token verification
const supabase = createClient(ENV.SUPABASE_URL || '', ENV.SUPABASE_ANON_KEY || '');

/**
 * Authenticate token middleware - can be used directly
 * Accepts both backend JWT tokens and Supabase access tokens
 */
export const authenticateToken: Middleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      res.status(401);
      res.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required',
        },
      });
      return;
    }

    // Try to verify as backend JWT first
    const jwtResult = jwt.verify(token);

    if (jwtResult.valid) {
      // Backend JWT token - attach user to request
      (req as any).user = jwtResult.payload;
      await next();
      return;
    }

    // If JWT verification failed, try Supabase token
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        res.status(401);
        res.json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
          },
        });
        return;
      }

      // Supabase token is valid - query database to get user ID
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('user_id, email, full_name, username')
        .eq('auth_uid', user.id)
        .single();

      if (dbError || !dbUser) {
        console.error('❌ Failed to fetch user from database:', dbError?.message);
        console.log('🔍 Looking for auth_uid:', user.id);
        res.status(401);
        res.json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found in database',
          },
        });
        return;
      }

      // Attach user with proper userId to request
      (req as any).user = {
        userId: dbUser.user_id,
        user_id: dbUser.user_id,
        id: dbUser.user_id,
        authUid: user.id,
        email: user.email || dbUser.email,
        fullName: dbUser.full_name,
        username: dbUser.username,
        role: 'user', // Regular users don't have role in users table
        supabaseUser: user,
      };

      console.log('✅ Supabase auth - userId:', dbUser.user_id, 'email:', dbUser.email);

      await next();
    } catch (supabaseError: any) {
      res.status(401);
      res.json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: supabaseError.message || 'Invalid or expired token',
        },
      });
    }
  } catch (error: any) {
    res.status(401);
    res.json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: error.message || 'Authentication failed',
      },
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth: Middleware = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (token) {
      const result = jwt.verify(token);
      if (result.valid) {
        (req as any).user = result.payload;
      }
    }

    await next();
  } catch (error) {
    // Ignore errors in optional auth
    await next();
  }
};

/**
 * Require specific roles
 */
export function requireRoles(...roles: string[]): Middleware {
  return async (req, res, next) => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const userRole = user.role || user.user_role;

    if (!roles.includes(userRole)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
      return;
    }

    await next();
  };
}

/**
 * Refresh token helper
 */
export function generateToken(payload: any, expiresIn?: number): string {
  return jwt.sign(payload, expiresIn || 3600); // Default 1 hour
}

/**
 * Verify token helper
 */
export function verifyToken(token: string) {
  return jwt.verify(token);
}
