import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JWTPayload } from '../types/API';
import { UserModel } from '../models/User';
import { AppError } from './errorHandler';

const userModel = new UserModel();

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access token is required', 401);
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      throw new AppError('JWT secret is not configured', 500);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    
    const user = await userModel.findById(decoded.userId);
    
    if (!user) {
      throw new AppError('User not found', 401);
    }

    if (!user.is_active) {
      throw new AppError('Account is deactivated', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid access token', 401));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403);
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
        const user = await userModel.findById(decoded.userId);
        
        if (user && user.is_active) {
          req.user = user;
        }
      }
    }
    
    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};