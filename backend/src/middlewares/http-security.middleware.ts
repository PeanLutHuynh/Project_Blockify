import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { logger } from '../config/logger';
import { ENV } from '../config/env';

export const httpsEnforcement = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'production') {
    const isSecure = req.secure || 
                    req.headers['x-forwarded-proto'] === 'https' ||
                    req.headers['x-forwarded-ssl'] === 'on' ||
                    req.headers['x-forwarded-scheme'] === 'https';
    
    if (!isSecure && req.method === 'GET') {
      const httpsUrl = `https://${req.headers.host}${req.originalUrl}`;
      
      logger.info('Redirecting HTTP to HTTPS', {
        originalUrl: req.originalUrl,
        httpsUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.redirect(301, httpsUrl);
    }
    
    if (!isSecure && req.method !== 'GET') {
      res.status(426).json({
        success: false,
        message: 'HTTPS Required',
        error: 'This endpoint requires a secure connection'
      });
      return;
    }
  }
  
  next();
};

export const enhancedCSP = (req: Request, res: Response, next: NextFunction): void => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const cspDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: isDevelopment 
      ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", "localhost:*"] 
      : ["'self'"],
    styleSrc: isDevelopment 
      ? ["'self'", "'unsafe-inline'", "fonts.googleapis.com"] 
      : ["'self'", "fonts.googleapis.com"],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    fontSrc: ["'self'", "fonts.gstatic.com", "data:"],
    connectSrc: isDevelopment 
      ? ["'self'", "localhost:*", "ws:", "wss:"] 
      : ["'self'"],
    mediaSrc: ["'self'"],
    objectSrc: ["'none'"],
    childSrc: ["'none'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined,
    reportUri: ["/api/v1/security/csp-violation"]
  };

  const cspString = Object.entries(cspDirectives)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => {
      const directive = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
      return Array.isArray(value) && value.length > 0 
        ? `${directive} ${value.join(' ')}` 
        : directive;
    })
    .join('; ');

  res.setHeader('Content-Security-Policy', cspString);
  next();
};

export const additionalSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  res.setHeader('X-Frame-Options', 'DENY');
  
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (formerly Feature Policy)
  const permissionsPolicy = [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'payment=()',
    'usb=()',
    'bluetooth=()',
    'midi=()',
    'sync-xhr=()'
  ].join(', ');
  
  res.setHeader('Permissions-Policy', permissionsPolicy);
  
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  
  if (req.path.includes('/api/v1/auth') || req.path.includes('/api/v1/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};

export const hstsConfig = helmet.hsts({
  maxAge: 31536000, // 1 year
  includeSubDomains: true,
  preload: true
});

export const clickjackingProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Allow framing for specific trusted domains in development
  const allowedOrigins = process.env.NODE_ENV === 'development' 
    ? ['http://localhost:3000', 'http://localhost:3001']
    : [];

  const origin = req.get('Origin');
  
  if (allowedOrigins.includes(origin || '')) {
    res.setHeader('X-Frame-Options', `ALLOW-FROM ${origin}`);
  } else {
    res.setHeader('X-Frame-Options', 'DENY');
  }
  
  next();
};

export const cspViolationReporter = (req: Request, res: Response, next: NextFunction): void => {
  if (req.path === '/api/v1/security/csp-violation' && req.method === 'POST') {
    logger.warn('CSP Violation Report', {
      report: req.body,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    res.status(204).end();
    return;
  }
  
  next();
};

export const validateSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  const originalSend = res.send.bind(res);
  
  res.send = function(data: any) {
    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Content-Security-Policy',
      'Referrer-Policy'
    ];
    
    const missingHeaders = requiredHeaders.filter(header => !res.getHeader(header));
    
    if (missingHeaders.length > 0) {
      logger.warn('Missing security headers', {
        missingHeaders,
        path: req.path,
        method: req.method
      });
    }
    
    return originalSend(data);
  };
  
  next();
};

export const helmetConfig = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: { policy: "require-corp" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
});

export const httpSecurityStack = [
  httpsEnforcement,
  helmetConfig,
  enhancedCSP,
  additionalSecurityHeaders,
  clickjackingProtection,
  cspViolationReporter,
  validateSecurityHeaders
];

export const conditionalSecurity = process.env.NODE_ENV === 'production' 
  ? httpSecurityStack 
  : [
      helmetConfig,
      enhancedCSP,
      additionalSecurityHeaders,
      cspViolationReporter
    ];

export default {
  httpsEnforcement,
  enhancedCSP,
  additionalSecurityHeaders,
  hstsConfig,
  clickjackingProtection,
  cspViolationReporter,
  validateSecurityHeaders,
  helmetConfig,
  httpSecurityStack,
  conditionalSecurity
};