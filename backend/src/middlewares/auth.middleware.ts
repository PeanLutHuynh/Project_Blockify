import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/database';
import { ENV } from '../config/env';
import { AuthenticatedRequest, JwtPayload, ApiResponse } from '../types/common';
import { logger } from '../config/logger';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      const response: ApiResponse = {
        success: false,
        message: 'Access token required',
        error: 'No token provided'
      };
      res.status(401).json(response);
      return;
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
    
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, username, full_name, role, avatar_url, phone, address, is_active, created_at, updated_at')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      logger.warn(`Authentication failed: User not found for token`, { userId: decoded.userId });
      const response: ApiResponse = {
        success: false,
        message: 'Invalid token',
        error: 'User not found'
      };
      res.status(401).json(response);
      return;
    }

    if (!user.is_active) {
      logger.warn(`Authentication failed: User account deactivated`, { userId: user.id });
      const response: ApiResponse = {
        success: false,
        message: 'Account deactivated',
        error: 'User account is not active'
      };
      res.status(401).json(response);
      return;
    }

    req.user = user;

    logger.debug(`User authenticated successfully`, { userId: user.id, username: user.username });
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    let message = 'Invalid token';
    if (error instanceof jwt.TokenExpiredError) {
      message = 'Token expired';
    } else if (error instanceof jwt.JsonWebTokenError) {
      message = 'Invalid token format';
    }

    const response: ApiResponse = {
      success: false,
      message,
      error: 'Authentication failed'
    };
    res.status(401).json(response);
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    const response: ApiResponse = {
      success: false,
      message: 'Authentication required',
      error: 'No user in request'
    };
    res.status(401).json(response);
    return;
  }

  if (req.user.role !== 'admin') {
    logger.warn(`Access denied: User ${req.user.username} attempted admin action`);
    const response: ApiResponse = {
      success: false,
      message: 'Admin access required',
      error: 'Insufficient permissions'
    };
    res.status(403).json(response);
    return;
  }

  next();
};

export const requireUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    const response: ApiResponse = {
      success: false,
      message: 'Authentication required',
      error: 'No user in request'
    };
    res.status(401).json(response);
    return;
  }

  if (!['user', 'admin'].includes(req.user.role)) {
    logger.warn(`Access denied: Invalid role ${req.user.role} for user ${req.user.username}`);
    const response: ApiResponse = {
      success: false,
      message: 'Invalid user role',
      error: 'User role not recognized'
    };
    res.status(403).json(response);
    return;
  }

  next();
};

export const requireOwnerOrAdmin = (resourceIdParam = 'id') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required',
        error: 'No user in request'
      };
      res.status(401).json(response);
      return;
    }

    const resourceId = req.params[resourceIdParam];
    const isOwner = req.user.id === resourceId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      logger.warn(`Access denied: User ${req.user.username} attempted to access resource ${resourceId}`);
      const response: ApiResponse = {
        success: false,
        message: 'Access denied',
        error: 'You can only access your own resources'
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
    
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, username, full_name, role, avatar_url, phone, address, is_active, created_at, updated_at')
      .eq('id', decoded.userId)
      .single();

    if (!error && user && user.is_active) {
      req.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name || '',
        role: user.role,
        avatar_url: user.avatar_url,
        phone: user.phone,
        address: user.address,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at
      };
    }

    next();
  } catch (error) {
    // Not throwing error for optional auth, continue without user
    next();
  }
};