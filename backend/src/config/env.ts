import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',

  MAX_FILE_SIZE: 5242880,
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  RATE_LIMIT_WINDOW_MS: 900000,
  RATE_LIMIT_MAX_REQUESTS: 100,
  PORT: process.env.PORT || '3001',
  HOST: process.env.HOST || 'localhost',

  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  JWT_SECRET: process.env.JWT_SECRET || 'default-secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

export const isDevelopment = ENV.NODE_ENV === 'development';
export const isProduction = ENV.NODE_ENV === 'production';
export const isTest = ENV.NODE_ENV === 'test';