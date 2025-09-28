import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { ENV } from '../config/env';
import { JwtPayload } from '../types/common';

export const generateRandomString = (length: number = 32): string =>
  crypto.randomBytes(length).toString('hex');

export const generateRandomCode = (length: number = 6): string => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
};

export const hashString = (str: string): string =>
  crypto.createHash('sha256').update(str).digest('hex');

export const generateApiKey = (): string =>
  'ak_' + crypto.randomBytes(32).toString('hex');

export const generateJwtToken = (payload: JwtPayload): string =>
  jwt.sign(payload, ENV.JWT_SECRET!, {
    expiresIn: ENV.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });

export const generateRefreshToken = (payload: JwtPayload): string =>
  jwt.sign(payload, ENV.JWT_REFRESH_SECRET!, {
    expiresIn: ENV.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  });

export const verifyJwtToken = <T>(token: string, secret: string): T | null => {
  try {
    return jwt.verify(token, secret) as T;
  } catch {
    return null;
  }
};

export const deepClone = <T>(obj: T): T =>
  JSON.parse(JSON.stringify(obj));

export const removeEmptyValues = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const result: Partial<T> = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== '') {
      result[key as keyof T] = value;
    }
  });
  return result;
};

export const toSnakeCase = <T extends Record<string, any>>(obj: T): Record<string, any> => {
  const result: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  });
  return result;
};

export const toCamelCase = <T extends Record<string, any>>(obj: T): Record<string, any> => {
  const result: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  });
  return result;
};

export const createSlug = (text: string, maxLength: number = 100): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, maxLength);

export const maskEmail = (email: string): string => {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) return `${localPart[0]}***@${domain}`;
  return `${localPart.substring(0, 2)}***@${domain}`;
};

export const maskPhone = (phone: string): string =>
  phone.length <= 4 ? phone : `***${phone.slice(-4)}`;

export const isValidJSON = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

export const truncateString = (str: string, maxLength: number): string =>
  str.length <= maxLength ? str : str.substring(0, maxLength - 3) + '...';

export const generateUniqueFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop() || '';
  const baseName = originalName.split('.').slice(0, -1).join('.');

  const sanitizedBaseName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);

  return `${sanitizedBaseName}-${timestamp}-${random}.${extension}`;
};

export const getFileExtension = (filename: string): string =>
  filename.split('.').pop()?.toLowerCase() || '';

export const isImageFile = (filename: string): boolean => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  return imageExtensions.includes(getFileExtension(filename));
};

export const formatPrice = (price: number, currency: string = 'VND'): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(price);

export const formatDate = (date: Date | string, locale: string = 'vi-VN'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
};

export const formatDateTime = (date: Date | string, locale: string = 'vi-VN'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const calculatePagination = (page: number, limit: number, total: number) => {
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    offset,
  };
};

export const parsePaginationParams = (query: any): { page: number; limit: number } => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  return { page, limit };
};

export const timeAgo = (date: Date | string): string => {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
): Promise<T> => {
  let lastError: Error;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt === maxAttempts) throw lastError;
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
  throw lastError!;
};

export const validateRequiredEnvVars = (requiredVars: string[]): void => {
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

export const createError = (message: string, statusCode: number = 500, context?: any): Error => {
  const error = new Error(message) as any;
  error.statusCode = statusCode;
  error.context = context;
  return error;
};
