import { Middleware } from '../http/types';

/**
 * CORS Middleware - Custom implementation
 */
export function corsMiddleware(options: {
  origin: string | string[] | ((origin: string) => boolean);
  credentials?: boolean;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
}): Middleware {
  return async (req, res, next) => {
    const origin = req.headers.origin || req.headers.referer || '';
    
    // Check if origin is allowed
    let allowOrigin = false;
    
    if (typeof options.origin === 'string') {
      allowOrigin = origin === options.origin || options.origin === '*';
    } else if (Array.isArray(options.origin)) {
      allowOrigin = options.origin.includes(origin);
    } else if (typeof options.origin === 'function') {
      allowOrigin = options.origin(origin);
    }
    
    // Set CORS headers
    if (allowOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    } else if (options.origin === '*') {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    if (options.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    if (options.methods) {
      res.setHeader('Access-Control-Allow-Methods', options.methods.join(', '));
    }
    
    if (options.allowedHeaders) {
      res.setHeader('Access-Control-Allow-Headers', options.allowedHeaders.join(', '));
    }
    
    if (options.exposedHeaders) {
      res.setHeader('Access-Control-Expose-Headers', options.exposedHeaders.join(', '));
    }
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).send('');
      return;
    }
    
    await next();
  };
}

/**
 * Security Headers Middleware - Replaces Helmet
 */
export function securityHeadersMiddleware(): Middleware {
  return async (req, res, next) => {
    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // X-Frame-Options
    res.setHeader('X-Frame-Options', 'DENY');
    
    // X-XSS-Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Strict-Transport-Security
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Content-Security-Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'"
    );
    
    // Referrer-Policy
    res.setHeader('Referrer-Policy', 'no-referrer');
    
    // Permissions-Policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    await next();
  };
}

/**
 * Body Size Limit Middleware
 */
export function bodySizeLimitMiddleware(maxSize: number = 10 * 1024 * 1024): Middleware {
  return async (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > maxSize) {
      res.status(413).json({
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `Request body exceeds ${maxSize} bytes`
        }
      });
      return;
    }
    
    await next();
  };
}

/**
 * Logger Middleware - Replaces Morgan
 */
export function loggerMiddleware(
  logFn: (message: string) => void = console.log
): Middleware {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Wait for response
    const originalJson = res.json;
    const originalSend = res.send;
    
    res.json = function(data: any) {
      const duration = Date.now() - startTime;
      logFn(
        `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`
      );
      return originalJson.call(this, data);
    };
    
    res.send = function(data: string | Buffer) {
      const duration = Date.now() - startTime;
      logFn(
        `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`
      );
      return originalSend.call(this, data);
    };
    
    await next();
  };
}

/**
 * Compression Middleware - Simple gzip compression
 */
export function compressionMiddleware(): Middleware {
  return async (req, res, next) => {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    if (acceptEncoding.includes('gzip')) {
      res.setHeader('Content-Encoding', 'gzip');
    }
    
    await next();
  };
}
