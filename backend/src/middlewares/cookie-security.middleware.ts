import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/common';
import { logger } from '../config/logger';

interface CookieSecurityOptions {
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  domain?: string;
  path?: string;
  signed?: boolean;
}

export const cookieSecurityConfig = (options: CookieSecurityOptions = {}) => {
  const defaultOptions: CookieSecurityOptions = {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
    signed: false,
    ...options
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    const originalCookie = res.cookie.bind(res);
    
    res.cookie = function(name: string, value: any, options: any = {}) {
      const secureOptions = {
        ...defaultOptions,
        ...options,
        secure: defaultOptions.secure,
        httpOnly: options.httpOnly !== false ? defaultOptions.httpOnly : false,
        sameSite: defaultOptions.sameSite
      };

      logger.debug('Setting secure cookie', {
        name,
        options: secureOptions,
        ip: req.ip
      });

      return originalCookie(name, value, secureOptions);
    };

    next();
  };
};

export const sessionHijackingProtection = (req: Request, res: Response, next: NextFunction): void => {
  const sessionId = req.sessionID || req.cookies?.sessionId;
  const userAgent = req.get('User-Agent');
  const ip = req.ip;

  if (req.session) {
    const fingerprint = {
      userAgent: userAgent?.substring(0, 100), // Limit length
      ip: ip,
      created: req.session.created || Date.now()
    };

    if (req.session.fingerprint) {
      const storedFingerprint = req.session.fingerprint;
      
      const ipChanged = storedFingerprint.ip !== ip;
      const userAgentChanged = storedFingerprint.userAgent !== fingerprint.userAgent;
      
      if (userAgentChanged || (ipChanged && process.env.NODE_ENV === 'production')) {
        logger.warn('Potential session hijacking detected', {
          sessionId,
          oldFingerprint: storedFingerprint,
          newFingerprint: fingerprint,
          url: req.originalUrl
        });

        req.session.destroy((err: any) => {
          if (err) {
            logger.error('Error destroying suspicious session:', err);
          }
        });

        const response: ApiResponse = {
          success: false,
          message: 'Session security violation',
          error: 'Please log in again'
        };

        res.status(401).json(response);
        return;
      }
    } else {
      // First time - set fingerprint
      req.session.fingerprint = fingerprint;
    }
  }

  next();
};

export const cookieTamperingDetection = (criticalCookies: string[] = ['sessionId', 'authToken', '_csrf']) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.cookies) {
      return next();
    }

    for (const cookieName of criticalCookies) {
      const cookieValue = req.cookies[cookieName];
      
      if (cookieValue) {
        const suspiciousPatterns = [
          /<script/i,           // XSS attempts
          /javascript:/i,       // JavaScript protocol
          /data:/i,            // Data URLs
          /vbscript:/i,        // VBScript protocol
          /(SELECT|INSERT|UPDATE|DELETE|DROP)/i, // SQL injection
          /\.\./,              // Directory traversal
          /null|undefined/i    // Null byte injection attempts
        ];

        const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(cookieValue));
        
        if (isSuspicious) {
          logger.warn('Cookie tampering detected', {
            cookieName,
            cookieValue: cookieValue.substring(0, 50) + '...',
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl
          });

          res.clearCookie(cookieName);
          
          const response: ApiResponse = {
            success: false,
            message: 'Security violation detected',
            error: 'Malicious cookie detected and removed'
          };

          res.status(400).json(response);
          return;
        }

        if (cookieValue.length > 4096) {
          logger.warn('Oversized cookie detected', {
            cookieName,
            cookieLength: cookieValue.length,
            ip: req.ip
          });

          res.clearCookie(cookieName);
          
          const response: ApiResponse = {
            success: false,
            message: 'Cookie size violation',
            error: 'Cookie exceeds maximum allowed size'
          };

          res.status(400).json(response);
          return;
        }
      }
    }

    next();
  };
};

export const secureCookieCleanup = (cookiesToClean: string[] = ['sessionId', 'authToken', '_csrf', 'refreshToken']) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.clearSecureCookies = function() {
      cookiesToClean.forEach(cookieName => {
        res.clearCookie(cookieName, {
          path: '/',
          domain: process.env.COOKIE_DOMAIN,
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          sameSite: 'strict'
        });
      });

      logger.info('Secure cookies cleared', {
        cookies: cookiesToClean,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    };

    next();
  };
};

export const cookieConsentManagement = (req: Request, res: Response, next: NextFunction): void => {
  const consentCookie = req.cookies?.cookieConsent;
  
  req.hasCookieConsent = () => {
    return consentCookie === 'accepted';
  };

  res.setCookieConsent = (consent: boolean) => {
    const value = consent ? 'accepted' : 'rejected';
    res.cookie('cookieConsent', value, {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      httpOnly: false, // Allow JavaScript access for UI
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    logger.info('Cookie consent updated', {
      consent: value,
      ip: req.ip
    });
  };

  next();
};

export const secureSessionConfig = {
  name: 'sessionId', // Don't use default 'connect.sid'
  secret: process.env.SESSION_SECRET || 'your-super-secure-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiry on activity
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' as const
  },
  genid: () => {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
};

declare global {
  namespace Express {
    interface Request {
      hasCookieConsent?: () => boolean;
      sessionID?: string;
      session?: any;
    }
    
    interface Response {
      clearSecureCookies?: () => void;
      setCookieConsent?: (consent: boolean) => void;
    }
  }
}

export const cookieSecurity = {
  config: cookieSecurityConfig,
  hijackingProtection: sessionHijackingProtection,
  tamperingDetection: cookieTamperingDetection,
  cleanup: secureCookieCleanup,
  consentManagement: cookieConsentManagement,
  sessionConfig: secureSessionConfig
};