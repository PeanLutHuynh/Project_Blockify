import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/common';
import { logger } from '../config/logger';
import { ENV, isDevelopment } from '../config/env';
import { 
  BaseError, 
  ValidationError, 
  DatabaseError, 
  NotFoundError 
} from '../types/base';

export class HttpError extends BaseError {
  public isOperational = true;

  constructor(message: string, public statusCode: number, cause?: Error) {
    super(message, cause);
  }

  toJSON(): object {
    return {
      type: 'HttpError',
      message: this.message,
      statusCode: this.statusCode
    };
  }
}

export const createApiError = {
  badRequest: (message = 'Bad Request') => new HttpError(message, 400),
  unauthorized: (message = 'Unauthorized') => new HttpError(message, 401),
  forbidden: (message = 'Forbidden') => new HttpError(message, 403),
  notFound: (message = 'Not Found') => new NotFoundError(message),
  conflict: (message = 'Conflict') => new HttpError(message, 409),
  unprocessableEntity: (message = 'Unprocessable Entity') => new HttpError(message, 422),
  tooManyRequests: (message = 'Too Many Requests') => new HttpError(message, 429),
  internalServer: (message = 'Internal Server Error') => new DatabaseError(message),
  badGateway: (message = 'Bad Gateway') => new HttpError(message, 502),
  serviceUnavailable: (message = 'Service Unavailable') => new HttpError(message, 503)
};

const handleCastError = (err: any): BaseError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new ValidationError(message, { [err.path]: err.value });
};

const handleDuplicateFieldsDB = (err: any): BaseError => {
  const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new HttpError(message, 400);
};

const handleValidationErrorDB = (err: any): BaseError => {
  const errors = Object.values(err.errors).map((el: any) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  const validationErrors: any = {};
  Object.keys(err.errors).forEach(key => {
    validationErrors[key] = err.errors[key].message;
  });
  return new ValidationError(message, validationErrors);
};

const handleJWTError = (): BaseError =>
  new HttpError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = (): BaseError =>
  new HttpError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err: BaseError, res: Response): void => {
  const response: ApiResponse = {
    success: false,
    message: err.message,
    error: err.message,
    meta: {
      statusCode: err.statusCode,
      stack: err.stack,
      isOperational: err.isOperational,
      type: err.constructor.name
    }
  };

  res.status(err.statusCode).json(response);
};

const sendErrorProd = (err: BaseError, res: Response): void => {
  if (err.isOperational) {
    const response: ApiResponse = {
      success: false,
      message: err.message,
      error: err.message
    };

    res.status(err.statusCode).json(response);
  } else {
    logger.error('ERROR', err);

    const response: ApiResponse = {
      success: false,
      message: 'Something went wrong!',
      error: 'Internal server error'
    };

    res.status(500).json(response);
  }
};

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  const logLevel = err.statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]('Request error:', {
    message: err.message,
    statusCode: err.statusCode,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.userId,
    stack: isDevelopment ? err.stack : undefined
  });

  let error = { ...err };
  error.message = err.message;

  if (error.name === 'CastError') error = handleCastError(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

  if (error.code?.startsWith('PGRST')) {
    error = new DatabaseError('Database operation failed');
  }

  if (error.code === '23505') {
    error = new HttpError('Duplicate value. Resource already exists.', 409);
  }
  if (error.code === '23503') {
    error = new HttpError('Referenced resource does not exist.', 400);
  }
  if (error.code === '23514') {
    error = new HttpError('Data violates check constraint.', 400);
  }

  if (isDevelopment) {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  logger.warn('Route not found:', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer') || 'Direct access',
    timestamp: new Date().toISOString()
  });

  const suspiciousPatterns = [
    /\.\./,                    // Directory traversal
    /\/etc\/passwd/,           // Linux system files
    /\/proc\//,                // Linux process files
    /\/admin/i,                // Admin access attempts
    /\/wp-admin/i,             // WordPress admin
    /\/phpmyadmin/i,           // Database admin tools
    /\.php$/i,                 // PHP file extensions
    /\.asp$/i,                 // ASP file extensions
    /\.jsp$/i,                 // JSP file extensions
    /\/config\./i,             // Config files
    /\/\.env/i,                // Environment files
    /\/backup/i,               // Backup directories
    /\/database/i,             // Database directories
    /shell/i,                  // Shell access attempts
    /cmd/i,                    // Command execution attempts
    /<script/i,                // XSS in URL
    /javascript:/i,            // JavaScript protocol
    /data:/i,                  // Data protocol
    /%[0-9a-f]{2}/i           // URL encoded characters (potential encoding attacks)
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(req.originalUrl));
  
  if (isSuspicious) {
    logger.error('Suspicious URL access attempt:', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'HIGH',
      type: 'POTENTIAL_ATTACK'
    });
    
    const response: ApiResponse = {
      success: false,
      message: 'Access denied',
      error: 'Invalid request'
    };
    
    res.status(403).json(response);
    return;
  }

  const response: ApiResponse = {
    success: false,
    message: 'Endpoint not found',
    error: `Route ${req.originalUrl} does not exist`,
    meta: {
      method: req.method,
      availableEndpoints: [
        'GET /health',
        'GET /api/v1',
        'GET /api/v1/security/csrf-token',
        'POST /api/v1/security/csp-violation'
      ]
    }
  };

  res.status(404).json(response);
};

export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

export const gracefulShutdown = (server: any) => {
  const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

  signals.forEach((signal) => {
    process.on(signal, () => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      server.close((err: any) => {
        if (err) {
          logger.error('Error during server close:', err);
          process.exit(1);
        }
        
        logger.info('Server closed gracefully');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    });
  });

  process.on('uncaughtException', (err: Error) => {
    logger.error('UNCAUGHT EXCEPTION! Shutting down...', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (err: Error) => {
    logger.error('UNHANDLED REJECTION! Shutting down...', err);
    server.close(() => {
      process.exit(1);
    });
  });
};