import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { ENV } from '../config/env';
import { ApiResponse } from '../types/common';
import { logger } from '../config/logger';

const generateKey = (req: Request): string => {
  const user = (req as any).user;
  return user ? `user:${user.userId}` : `ip:${req.ip}`;
};

const rateLimitHandler = (req: Request, res: Response): void => {
  const user = (req as any).user;
  const identifier = user ? `user ${user.username}` : `IP ${req.ip}`;
  
  logger.warn(`Rate limit exceeded for ${identifier}`, {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent')
  });

  const response: ApiResponse = {
    success: false,
    message: 'Too many requests',
    error: 'Rate limit exceeded. Please try again later.'
  };

  res.status(429).json(response);
};

export const generalRateLimit = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS, 
  max: ENV.RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests',
    error: 'Rate limit exceeded. Please try again later.'
  }
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  keyGenerator: (req: Request) => {
    return `auth:${req.ip}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn(`Auth rate limit exceeded for IP ${req.ip}`, {
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      body: req.body ? Object.keys(req.body) : []
    });

    const response: ApiResponse = {
      success: false,
      message: 'Too many authentication attempts',
      error: 'Please wait 15 minutes before trying again.'
    };

    res.status(429).json(response);
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, 
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    const user = (req as any).user;
    return user && user.role === 'admin';
  }
});

export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 20, 
  keyGenerator: generateKey,
  handler: (req: Request, res: Response) => {
    const user = (req as any).user;
    const identifier = user ? `user ${user.username}` : `IP ${req.ip}`;
    
    logger.warn(`Upload rate limit exceeded for ${identifier}`, {
      method: req.method,
      url: req.originalUrl
    });

    const response: ApiResponse = {
      success: false,
      message: 'Too many file uploads',
      error: 'Upload limit exceeded. Please try again in an hour.'
    };

    res.status(429).json(response);
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const searchRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 30, 
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false
});

export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 3, 
  keyGenerator: (req: Request) => `password-reset:${req.ip}`,
  handler: (req: Request, res: Response) => {
    logger.warn(`Password reset rate limit exceeded for IP ${req.ip}`);

    const response: ApiResponse = {
      success: false,
      message: 'Too many password reset attempts',
      error: 'Please wait an hour before requesting another password reset.'
    };

    res.status(429).json(response);
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 5,
  keyGenerator: (req: Request) => `registration:${req.ip}`,
  handler: (req: Request, res: Response) => {
    logger.warn(`Registration rate limit exceeded for IP ${req.ip}`);

    const response: ApiResponse = {
      success: false,
      message: 'Too many registration attempts',
      error: 'Please wait an hour before creating another account.'
    };

    res.status(429).json(response);
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const dynamicRateLimit = (userLimits: { [role: string]: number } = {}) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: (req: Request) => {
      const user = (req as any).user;
      if (!user) return 100;

      return userLimits[user.role] || 500; 
    },
    keyGenerator: generateKey,
    handler: rateLimitHandler,
    standardHeaders: true,
    legacyHeaders: false
  });
};

export const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 50, 
  keyGenerator: (req: Request) => `public:${req.ip}`,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false
});