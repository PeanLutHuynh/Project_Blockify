import { Response } from 'express';
import { ApiResponse, PaginationInfo } from '../types/common';
import { logger } from '../config/logger';

/**
 * Utility class for standardized API responses
 * Ensures consistent response format across all endpoints
 */
export class ResponseUtil {
  static success<T>(
    res: Response,
    data?: T,
    message: string = 'Success',
    statusCode: number = 200,
    pagination?: PaginationInfo,
    meta?: Record<string, any>
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      pagination,
      meta
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send created response (201)
   */
  static created<T>(
    res: Response,
    data?: T,
    message: string = 'Resource created successfully'
  ): void {
    ResponseUtil.success(res, data, message, 201);
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message: string = 'An error occurred',
    statusCode: number = 500,
    error?: string,
    errors?: Record<string, string | string[]>
  ): void {
    const response: ApiResponse = {
      success: false,
      message,
      error,
      errors
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send bad request response (400)
   */
  static badRequest(
    res: Response,
    message: string = 'Bad request',
    error?: string,
    errors?: Record<string, string | string[]>
  ): void {
    ResponseUtil.error(res, message, 400, error, errors);
  }

  /**
   * Send unauthorized response (401)
   */
  static unauthorized(
    res: Response,
    message: string = 'Unauthorized',
    error?: string
  ): void {
    ResponseUtil.error(res, message, 401, error);
  }

  /**
   * Send forbidden response (403)
   */
  static forbidden(
    res: Response,
    message: string = 'Forbidden',
    error?: string
  ): void {
    ResponseUtil.error(res, message, 403, error);
  }

  /**
   * Send not found response (404)
   */
  static notFound(
    res: Response,
    message: string = 'Resource not found',
    error?: string
  ): void {
    ResponseUtil.error(res, message, 404, error);
  }

  /**
   * Send conflict response (409)
   */
  static conflict(
    res: Response,
    message: string = 'Resource conflict',
    error?: string
  ): void {
    ResponseUtil.error(res, message, 409, error);
  }

  /**
   * Send validation error response (422)
   */
  static validationError(
    res: Response,
    errors: Record<string, string | string[]>,
    message: string = 'Validation failed'
  ): void {
    ResponseUtil.error(res, message, 422, 'Invalid input data', errors);
  }

  /**
   * Send internal server error response (500)
   */
  static internalError(
    res: Response,
    message: string = 'Internal server error',
    error?: string
  ): void {
    ResponseUtil.error(res, message, 500, error);
  }

  /**
   * Send paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationInfo,
    message: string = 'Data retrieved successfully'
  ): void {
    ResponseUtil.success(res, data, message, 200, pagination);
  }

  /**
   * Send no content response (204)
   */
  static noContent(res: Response): void {
    res.status(204).send();
  }

  /**
   * Log and send error response
   */
  static logAndError(
    res: Response,
    error: any,
    message: string = 'An error occurred',
    statusCode: number = 500
  ): void {
    logger.error('Response error:', {
      message: error.message || error,
      stack: error.stack,
      statusCode
    });

    ResponseUtil.error(res, message, statusCode, error.message || 'Internal server error');
  }
}

/**
 * Helper functions for common response patterns
 */

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode?: number,
  pagination?: PaginationInfo
) => ResponseUtil.success(res, data, message, statusCode, pagination);

export const sendError = (
  res: Response,
  message?: string,
  statusCode?: number,
  error?: string,
  errors?: Record<string, string | string[]>
) => ResponseUtil.error(res, message, statusCode, error, errors);

export const sendCreated = <T>(res: Response, data?: T, message?: string) =>
  ResponseUtil.created(res, data, message);

export const sendBadRequest = (
  res: Response,
  message?: string,
  error?: string,
  errors?: Record<string, string | string[]>
) => ResponseUtil.badRequest(res, message, error, errors);

export const sendNotFound = (res: Response, message?: string, error?: string) =>
  ResponseUtil.notFound(res, message, error);

export const sendUnauthorized = (res: Response, message?: string, error?: string) =>
  ResponseUtil.unauthorized(res, message, error);

export const sendForbidden = (res: Response, message?: string, error?: string) =>
  ResponseUtil.forbidden(res, message, error);

export const sendConflict = (res: Response, message?: string, error?: string) =>
  ResponseUtil.conflict(res, message, error);

export const sendValidationError = (
  res: Response,
  errors: Record<string, string | string[]>,
  message?: string
) => ResponseUtil.validationError(res, errors, message);

export const sendInternalError = (res: Response, message?: string, error?: string) =>
  ResponseUtil.internalError(res, message, error);

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  pagination: PaginationInfo,
  message?: string
) => ResponseUtil.paginated(res, data, pagination, message);

export const sendNoContent = (res: Response) => ResponseUtil.noContent(res);