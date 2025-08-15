import { Request } from 'express';
import { User } from './User';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface FileUploadResult {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimetype: string;
  url: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface DatabaseError {
  code: string;
  message: string;
  details?: string;
}

export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  pagination?: PaginationParams;
}