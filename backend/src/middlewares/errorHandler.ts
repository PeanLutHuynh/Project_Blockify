import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/API';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  }

  if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  }

  if (error.code === '23505') { // PostgreSQL unique constraint
    statusCode = 409;
    message = 'Resource already exists';
  }

  if (error.code === '23503') { // PostgreSQL foreign key constraint
    statusCode = 400;
    message = 'Invalid reference to related resource';
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: error.message,
      stack: error.stack,
      statusCode,
      path: req.path,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query
    });
  }

  const response: ApiResponse = {
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  };

  res.status(statusCode).json(response);
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};