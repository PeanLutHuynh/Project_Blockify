import { Middleware } from '../http/types';
import { JWT } from '../security/JWT';
import { ENV } from '../../config/env';

/**
 * Custom Auth Middleware
 */

// Create JWT instance
const jwt = new JWT(ENV.JWT_SECRET || '');

/**
 * Authenticate token middleware - can be used directly
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

    // Verify token
    const result = jwt.verify(token);

    if (!result.valid) {
      res.status(401);
      res.json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: result.error || 'Invalid or expired token',
        },
      });
      return;
    }

    // Attach user to request
    (req as any).user = result.payload;

    await next();
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
