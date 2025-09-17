import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import validator from 'validator';
import { ApiResponse, ValidationErrors } from '../types/common';
import { logger } from '../config/logger';

const advancedSanitization = (input: string): string => {
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '')
    .replace(/<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi, '');

  sanitized = sanitized
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '');

  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  sanitized = sanitized.replace(
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT|DECLARE|CAST|CONVERT)\b)/gi,
    ''
  );

  sanitized = sanitized
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  sanitized = validator.escape(sanitized);

  return sanitized.trim();
};

const checkInputSizes = (
  obj: any, 
  maxInputSize: number, 
  maxSearchSize: number
): { field: string; maxAllowed: number } | null => {
  const searchFields = ['search', 'query', 'q', 'keyword', 'term'];
  
  const checkRecursive = (data: any, path: string = ''): { field: string; maxAllowed: number } | null => {
    if (typeof data === 'string') {
      const currentPath = path || 'input';
      const isSearchField = searchFields.some(field => 
        currentPath.toLowerCase().includes(field.toLowerCase())
      );
      
      const maxAllowed = isSearchField ? maxSearchSize : maxInputSize;
      
      if (data.length > maxAllowed) {
        return { field: currentPath, maxAllowed };
      }
    } else if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        const result = checkRecursive(data[i], `${path}[${i}]`);
        if (result) return result;
      }
    } else if (data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        const currentPath = path ? `${path}.${key}` : key;
        const result = checkRecursive(value, currentPath);
        if (result) return result;
      }
    }
    
    return null;
  };
  
  return checkRecursive(obj);
};

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors: ValidationErrors = {};
    
    errors.array().forEach((error) => {
      const field = error.type === 'field' ? error.path : 'general';
      
      if (formattedErrors[field]) {
        if (Array.isArray(formattedErrors[field])) {
          (formattedErrors[field] as string[]).push(error.msg);
        } else {
          formattedErrors[field] = [formattedErrors[field] as string, error.msg];
        }
      } else {
        formattedErrors[field] = error.msg;
      }
    });

    logger.warn('Validation failed:', {
      method: req.method,
      url: req.originalUrl,
      errors: formattedErrors,
      body: req.body
    });

    const response: ApiResponse = {
      success: false,
      message: 'Validation failed',
      error: 'Invalid input data',
      errors: formattedErrors
    };

    res.status(400).json(response);
    return;
  }

  next();
};

export const sanitizeRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Check for oversized requests to prevent DoS attacks
  const maxInputSize = 1000; // 1000 characters max per field
  const maxSearchSize = 200; // 200 characters max for search queries
  
  // Check request body size limits
  if (req.body && typeof req.body === 'object') {
    const oversizedField = checkInputSizes(req.body, maxInputSize, maxSearchSize);
    if (oversizedField) {
      const response: ApiResponse = {
        success: false,
        message: 'Input too large',
        error: `Field '${oversizedField.field}' exceeds maximum length of ${oversizedField.maxAllowed} characters`
      };
      res.status(400).json(response);
      return;
    }
    req.body = sanitizeObject(req.body);
  }

  // Check query parameters size limits (including search)
  if (req.query && typeof req.query === 'object') {
    const oversizedField = checkInputSizes(req.query, maxInputSize, maxSearchSize);
    if (oversizedField) {
      const response: ApiResponse = {
        success: false,
        message: 'Query parameter too large',
        error: `Parameter '${oversizedField.field}' exceeds maximum length of ${oversizedField.maxAllowed} characters`
      };
      res.status(400).json(response);
      return;
    }
    req.query = sanitizeObject(req.query);
  }

  next();
};

const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject).filter(item => item !== undefined);
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    Object.keys(obj).forEach(key => {
      // Sanitize keys as well to prevent key-based attacks
      const cleanKey = typeof key === 'string' ? advancedSanitization(key) : key;
      const value = obj[key];
      
      if (value !== undefined) {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed !== '') {
            // Apply enhanced sanitization to string values
            sanitized[cleanKey] = advancedSanitization(trimmed);
          }
        } else {
          sanitized[cleanKey] = sanitizeObject(value);
        }
      }
    });
    
    return sanitized;
  }

  if (typeof obj === 'string') {
    return advancedSanitization(obj);
  }

  return obj;
};

export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  if (page < 1) {
    const response: ApiResponse = {
      success: false,
      message: 'Invalid pagination parameters',
      error: 'Page must be greater than 0'
    };
    res.status(400).json(response);
    return;
  }

  if (limit < 1 || limit > 100) {
    const response: ApiResponse = {
      success: false,
      message: 'Invalid pagination parameters',
      error: 'Limit must be between 1 and 100'
    };
    res.status(400).json(response);
    return;
  }

  req.query.page = page.toString();
  req.query.limit = limit.toString();

  next();
};

export const validateFileUpload = (
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp'],
  maxSize: number = 5 * 1024 * 1024 // 5MB
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const file = req.file;

    if (!file) {
      next();
      return;
    }

    if (!allowedTypes.includes(file.mimetype)) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid file type',
        error: `Allowed types: ${allowedTypes.join(', ')}`
      };
      res.status(400).json(response);
      return;
    }

    if (file.size > maxSize) {
      const response: ApiResponse = {
        success: false,
        message: 'File too large',
        error: `Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`
      };
      res.status(400).json(response);
      return;
    }

    next();
  };
};

export const validateUUID = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const uuidParam = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidParam || !uuidRegex.test(uuidParam)) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid ID format',
        error: `${paramName} must be a valid UUID`
      };
      res.status(400).json(response);
      return;
    }

    next();
  };
};