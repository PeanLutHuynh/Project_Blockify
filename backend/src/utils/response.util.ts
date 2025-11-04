import { HttpResponse } from '../infrastructure/http/types';
import { ApiResponse, PaginationInfo } from '../types/common';
import { logger } from '../config/logger';

/**
 * Utility class for standardized API responses
 * Ensures consistent response format across all endpoints
 */
export class ResponseUtil {
  static success<T>(
    res: HttpResponse,
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

    res.status(statusCode);
    res.json(response);
  }

  /**
   * Send created response (201)
   */
  static created<T>(
    res: HttpResponse,
    data?: T,
    message: string = 'Resource created successfully'
  ): void {
    ResponseUtil.success(res, data, message, 201);
  }

  /**
   * Send error response
   */
  static error(
    res: HttpResponse,
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

    res.status(statusCode);
    res.json(response);
  }

  /**
   * Send bad request response (400)
   */
  static badRequest(
    res: HttpResponse,
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
    res: HttpResponse,
    message: string = 'Unauthorized',
    error?: string
  ): void {
    ResponseUtil.error(res, message, 401, error);
  }

  /**
   * Send forbidden response (403)
   */
  static forbidden(
    res: HttpResponse,
    message: string = 'Forbidden',
    error?: string
  ): void {
    ResponseUtil.error(res, message, 403, error);
  }

  /**
   * Send not found response (404)
   */
  static notFound(
    res: HttpResponse,
    message: string = 'Resource not found',
    error?: string
  ): void {
    ResponseUtil.error(res, message, 404, error);
  }

  /**
   * Send conflict response (409)
   */
  static conflict(
    res: HttpResponse,
    message: string = 'Resource conflict',
    error?: string
  ): void {
    ResponseUtil.error(res, message, 409, error);
  }

  /**
   * Send validation error response (422)
   */
  static validationError(
    res: HttpResponse,
    errors: Record<string, string | string[]>,
    message: string = 'Validation failed'
  ): void {
    ResponseUtil.error(res, message, 422, 'Invalid input data', errors);
  }

  /**
   * Send internal server error response (500)
   */
  static internalError(
    res: HttpResponse,
    message: string = 'Internal server error',
    error?: string
  ): void {
    ResponseUtil.error(res, message, 500, error);
  }

  /**
   * Send paginated response
   */
  static paginated<T>(
    res: HttpResponse,
    data: T[],
    pagination: PaginationInfo,
    message: string = 'Data retrieved successfully'
  ): void {
    ResponseUtil.success(res, data, message, 200, pagination);
  }

  /**
   * Send no content response (204)
   */
  static noContent(res: HttpResponse): void {
    res.status(204);
    res.send('');
  }

  /**
   * Log and send error response
   */
  static logAndError(
    res: HttpResponse,
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
  res: HttpResponse,
  data?: T,
  message?: string,
  statusCode?: number,
  pagination?: PaginationInfo
) => ResponseUtil.success(res, data, message, statusCode, pagination);

export const sendError = (
  res: HttpResponse,
  message?: string,
  statusCode?: number,
  error?: string,
  errors?: Record<string, string | string[]>
) => ResponseUtil.error(res, message, statusCode, error, errors);

export const sendCreated = <T>(res: HttpResponse, data?: T, message?: string) =>
  ResponseUtil.created(res, data, message);

export const sendBadRequest = (
  res: HttpResponse,
  message?: string,
  error?: string,
  errors?: Record<string, string | string[]>
) => ResponseUtil.badRequest(res, message, error, errors);

export const sendNotFound = (res: HttpResponse, message?: string, error?: string) =>
  ResponseUtil.notFound(res, message, error);

export const sendUnauthorized = (res: HttpResponse, message?: string, error?: string) =>
  ResponseUtil.unauthorized(res, message, error);

export const sendForbidden = (res: HttpResponse, message?: string, error?: string) =>
  ResponseUtil.forbidden(res, message, error);

export const sendConflict = (res: HttpResponse, message?: string, error?: string) =>
  ResponseUtil.conflict(res, message, error);

export const sendValidationError = (
  res: HttpResponse,
  errors: Record<string, string | string[]>,
  message?: string
) => ResponseUtil.validationError(res, errors, message);

export const sendInternalError = (res: HttpResponse, message?: string, error?: string) =>
  ResponseUtil.internalError(res, message, error);

export const sendPaginated = <T>(
  res: HttpResponse,
  data: T[],
  pagination: PaginationInfo,
  message?: string
) => ResponseUtil.paginated(res, data, pagination, message);

export const sendNoContent = (res: HttpResponse) => ResponseUtil.noContent(res);