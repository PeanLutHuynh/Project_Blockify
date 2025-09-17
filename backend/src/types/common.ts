import { Request } from 'express';
import multer from 'multer';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: ValidationErrors;
  pagination?: PaginationInfo;
  meta?: Record<string, any>;
}

export interface ValidationErrors {
  [field: string]: string | string[];
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

// Request Types
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface FileUploadRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}

// Database Types
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface TimestampEntity {
  created_at: string;
  updated_at: string;
}

// Auth Types
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export type UserRole = 'user' | 'admin';

// Product Types
export interface ProductFilters {
  category_id?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  is_featured?: boolean;
  tags?: string[];
  search?: string;
  age_range?: string;
  difficulty_level?: DifficultyLevel;
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

// Error Types
export interface ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
}

// Service Response Types
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationErrors;
}

// File Upload Types
export interface UploadedFile {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
}

export interface ImageVariant {
  thumbnail: string;
  medium: string;
  large: string;
  original: string;
}