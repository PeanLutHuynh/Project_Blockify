import { body, query, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));

    throw new AppError(`Validation failed: ${errorMessages.map(e => e.message).join(', ')}`, 400);
  }
  
  next();
};

// User validation rules
export const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('full_name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  handleValidationErrors
];

export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Product validation rules
export const validateCreateProduct = [
  body('name')
    .isLength({ min: 1, max: 200 })
    .withMessage('Product name is required and must be less than 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('sale_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Sale price must be a positive number'),
  body('sku')
    .isLength({ min: 1, max: 50 })
    .withMessage('SKU is required and must be less than 50 characters'),
  body('stock_quantity')
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
  body('category_id')
    .isUUID()
    .withMessage('Category ID must be a valid UUID'),
  body('piece_count')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Piece count must be a positive integer'),
  handleValidationErrors
];

// Category validation rules
export const validateCreateCategory = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Category name is required and must be less than 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('slug')
    .optional()
    .isSlug()
    .withMessage('Slug must be a valid URL slug'),
  body('parent_id')
    .optional()
    .isUUID()
    .withMessage('Parent ID must be a valid UUID'),
  handleValidationErrors
];

// Cart validation rules
export const validateAddToCart = [
  body('product_id')
    .isUUID()
    .withMessage('Product ID must be a valid UUID'),
  body('quantity')
    .isInt({ min: 1, max: 99 })
    .withMessage('Quantity must be between 1 and 99'),
  handleValidationErrors
];

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// UUID parameter validation
export const validateUUIDParam = (paramName: string = 'id') => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID`),
  handleValidationErrors
];