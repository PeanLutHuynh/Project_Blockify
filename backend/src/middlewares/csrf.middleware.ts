import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ApiResponse } from '../types/common';
import { logger } from '../config/logger';

declare global {
  namespace Express {
    interface Request {
      csrfToken?: () => string;
      csrfSecret?: string;
      cookies?: { [key: string]: string };
    }
  }
}

interface CSRFOptions {
  cookie?: {
    key?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
  };
  headerName?: string;
  fieldName?: string;
  ignoreMethods?: string[];
}

export class CSRFProtection {
  private options: Required<CSRFOptions>;

  constructor(options: CSRFOptions = {}) {
    this.options = {
      cookie: {
        key: '_csrf',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000, // 1 hour
        ...options.cookie
      },
      headerName: options.headerName || 'x-csrf-token',
      fieldName: options.fieldName || '_csrf',
      ignoreMethods: options.ignoreMethods || ['GET', 'HEAD', 'OPTIONS']
    };
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  private generateToken(secret: string): string {
    const hash = crypto.createHmac('sha256', secret);
    hash.update(crypto.randomBytes(16));
    return hash.digest('base64');
  }

  private verifyToken(secret: string, token: string): boolean {
    if (!secret || !token) return false;
    
    try {
      const expectedToken = this.generateToken(secret);
      
      const secretBuffer = Buffer.from(secret);
      const tokenBuffer = Buffer.from(token);
      
      if (secretBuffer.length !== tokenBuffer.length) {
        return false;
      }
      
      return crypto.timingSafeEqual(secretBuffer, tokenBuffer);
    } catch (error) {
      return false;
    }
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (this.options.ignoreMethods.includes(req.method)) {
        this.setupTokenGeneration(req, res);
        return next();
      }

      const cookieKey = this.options.cookie.key;
      const secret = req.cookies && cookieKey ? req.cookies[cookieKey] : undefined;
      
      if (!secret) {
        logger.warn('CSRF validation failed: No secret found', {
          ip: req.ip,
          method: req.method,
          url: req.originalUrl,
          userAgent: req.get('User-Agent')
        });

        const response: ApiResponse = {
          success: false,
          message: 'CSRF validation failed',
          error: 'CSRF token missing or invalid'
        };

        res.status(403).json(response);
        return;
      }

      const token = req.get(this.options.headerName) || 
                   req.body?.[this.options.fieldName] ||
                   req.query?.[this.options.fieldName];

      if (!token) {
        logger.warn('CSRF validation failed: No token provided', {
          ip: req.ip,
          method: req.method,
          url: req.originalUrl,
          userAgent: req.get('User-Agent')
        });

        const response: ApiResponse = {
          success: false,
          message: 'CSRF validation failed',
          error: 'CSRF token required'
        };

        res.status(403).json(response);
        return;
      }

      if (!this.verifyToken(secret, token)) {
        logger.warn('CSRF validation failed: Invalid token', {
          ip: req.ip,
          method: req.method,
          url: req.originalUrl,
          userAgent: req.get('User-Agent'),
          providedToken: token.substring(0, 10) + '...' // Log partial token for debugging
        });

        const response: ApiResponse = {
          success: false,
          message: 'CSRF validation failed',
          error: 'Invalid CSRF token'
        };

        res.status(403).json(response);
        return;
      }

      this.setupTokenGeneration(req, res);
      next();
    };
  }

  private setupTokenGeneration(req: Request, res: Response): void {
    const cookieKey = this.options.cookie.key;
    let secret = req.cookies && cookieKey ? req.cookies[cookieKey] : undefined;
    
    if (!secret) {
      secret = this.generateSecret();
      
      if (cookieKey) {
        res.cookie(cookieKey, secret, {
          httpOnly: this.options.cookie.httpOnly,
          secure: this.options.cookie.secure,
          sameSite: this.options.cookie.sameSite,
          maxAge: this.options.cookie.maxAge
        });
      }
    }

    req.csrfSecret = secret;
    
    req.csrfToken = () => {
      return this.generateToken(secret);
    };
  }

  tokenEndpoint() {
    return (req: Request, res: Response): void => {
      const token = req.csrfToken?.();
      
      if (!token) {
        const response: ApiResponse = {
          success: false,
          message: 'Unable to generate CSRF token',
          error: 'CSRF setup required'
        };

        res.status(500).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'CSRF token generated',
        data: {
          csrfToken: token,
          headerName: this.options.headerName,
          fieldName: this.options.fieldName
        }
      };

      res.json(response);
    };
  }
}

export const csrfProtection = new CSRFProtection();

export const csrfMiddleware = csrfProtection.middleware();
export const csrfTokenEndpoint = csrfProtection.tokenEndpoint();

export const createCSRFProtection = (options: CSRFOptions) => {
  const customCSRF = new CSRFProtection(options);
  return {
    middleware: customCSRF.middleware(),
    tokenEndpoint: customCSRF.tokenEndpoint()
  };
};

export const doubleSubmitCookie = (cookieName: string = 'csrf-token') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const token = crypto.randomBytes(32).toString('hex');
      
      res.cookie(cookieName, token, {
        httpOnly: false, // Must be accessible to JavaScript for double submit
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000 // 1 hour
      });
      
      return next();
    }

    const cookieToken = req.cookies?.[cookieName];
    const headerToken = req.get('X-CSRF-Token') || req.body?.csrfToken;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      logger.warn('Double submit CSRF validation failed', {
        ip: req.ip,
        method: req.method,
        url: req.originalUrl,
        hasCookie: !!cookieToken,
        hasHeader: !!headerToken,
        tokensMatch: cookieToken === headerToken
      });

      const response: ApiResponse = {
        success: false,
        message: 'CSRF validation failed',
        error: 'Invalid or missing CSRF token'
      };

      res.status(403).json(response);
      return;
    }

    next();
  };
};