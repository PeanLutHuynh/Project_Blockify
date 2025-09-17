import { Request, Response, NextFunction } from 'express';
import validator from 'validator';
import { ApiResponse } from '../types/common';
import { logger } from '../config/logger';

const simpleXssFilter = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/style\s*=/gi, '')
    .replace(/<\s*\/?\s*(script|iframe|object|embed|form|input)\b[^>]*>/gi, '');
};

export const enhancedSanitization = (req: Request, res: Response, next: NextFunction): void => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      let cleaned = simpleXssFilter(value);
      
      cleaned = validator.escape(cleaned);
      
      cleaned = cleaned.replace(
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
        ''
      );
      
      return cleaned.trim();
    }
    
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      Object.keys(value).forEach(key => {
        // Sanitize keys as well
        const cleanKey = sanitizeValue(key);
        sanitized[cleanKey] = sanitizeValue(value[key]);
      });
      return sanitized;
    }
    
    return value;
  };

  try {
    if (req.body) {
      req.body = sanitizeValue(req.body);
    }
    
    if (req.query) {
      req.query = sanitizeValue(req.query);
    }
    
    if (req.params) {
      req.params = sanitizeValue(req.params);
    }

    const dangerousHeaders = ['user-agent', 'referer', 'x-forwarded-for'];
    dangerousHeaders.forEach(header => {
      if (req.headers[header]) {
        req.headers[header] = sanitizeValue(req.headers[header]);
      }
    });

    logger.debug('Input sanitization completed', {
      method: req.method,
      url: req.originalUrl,
      sanitizedFields: Object.keys(req.body || {}).length
    });

    next();
  } catch (error) {
    logger.error('Error in input sanitization:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Input validation failed',
      error: 'Invalid input data detected'
    };
    
    res.status(400).json(response);
  }
};

export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction): void => {
  const checkSqlInjection = (value: any): boolean => {
    if (typeof value === 'string') {
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION)\b)/i,
        /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
        /'/,
        /--/,
        /\/\*/,
        /\*\//,
        /;\s*$/,
        /\b(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)\b/i
      ];
      
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    
    if (Array.isArray(value)) {
      return value.some(checkSqlInjection);
    }
    
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkSqlInjection);
    }
    
    return false;
  };

  const inputSources = [req.body, req.query, req.params];
  
  for (const source of inputSources) {
    if (source && checkSqlInjection(source)) {
      logger.warn('SQL injection attempt detected', {
        ip: req.ip,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        suspiciousInput: JSON.stringify(source)
      });
      
      const response: ApiResponse = {
        success: false,
        message: 'Security violation detected',
        error: 'Malicious input detected and blocked'
      };
      
    res.status(400).json(response);
    return;
    }
  }
  
  next();
};

export const cspViolationReporter = (req: Request, res: Response, next: NextFunction): void => {
  if (req.path === '/api/v1/security/csp-report') {
    logger.warn('CSP Violation Report', {
      report: req.body,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(204).end();
    return;
  }
  
  next();
};

export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  res.setHeader('X-Frame-Options', 'DENY');
  
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // Allow inline scripts for development
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "child-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "report-uri /api/v1/security/csp-report"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', cspDirectives);
  
  next();
};

export const httpsRedirect = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'production') {
    const isSecure = req.secure || 
                    req.headers['x-forwarded-proto'] === 'https' ||
                    req.headers['x-forwarded-ssl'] === 'on';
    
    if (!isSecure) {
      logger.info('Redirecting HTTP to HTTPS', {
        originalUrl: req.originalUrl,
        ip: req.ip
      });
      
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }
  }
  
  next();
};

export const suspiciousActivityDetection = (req: Request, res: Response, next: NextFunction): void => {
  const suspiciousPatterns = [
    /\.(php|asp|jsp|cgi)$/i, // Common file extensions for attacks
    /wp-admin|wp-login|phpmyadmin/i, // Common attack paths
    /\.\./i, // Directory traversal attempts
    /\/etc\/passwd|\/proc\/|\/var\/log/i, // File inclusion attempts
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(req.originalUrl) || 
    pattern.test(req.get('User-Agent') || '')
  );
  
  if (isSuspicious) {
    logger.warn('Suspicious activity detected', {
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent')
    });
    
    const response: ApiResponse = {
      success: false,
      message: 'Access denied',
      error: 'Suspicious activity detected'
    };
    
    res.status(403).json(response);
    return;
  }
  
  next();
};

export const requestSizeLimiter = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxSizeBytes = parseSize(maxSize);
    
    if (contentLength > maxSizeBytes) {
      logger.warn('Request size limit exceeded', {
        ip: req.ip,
        contentLength,
        maxSize: maxSizeBytes,
        url: req.originalUrl
      });
      
      const response: ApiResponse = {
        success: false,
        message: 'Request too large',
        error: `Maximum request size is ${maxSize}`
      };
      
      res.status(413).json(response);
      return;
    }
    
    next();
  };
};

const parseSize = (size: string): number => {
  const units: { [key: string]: number } = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/);
  if (!match) return 10 * 1024 * 1024; // Default 10MB
  
  const [, value, unit] = match;
  return parseInt(value) * units[unit];
};