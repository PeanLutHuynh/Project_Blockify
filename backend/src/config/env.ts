import dotenv from 'dotenv';
import path from 'path';

// Only load .env file in development
if (process.env.NODE_ENV !== 'production') {
  // Load shared .env from project root
  const envPath = path.resolve(process.cwd(), '../.env');
  console.log('Loading .env from:', envPath);
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    console.warn('Warning: Could not load .env file:', result.error.message);
  } else {
    console.log('✅ Successfully loaded shared environment configuration');
  }
} else {
  console.log('🚀 Running in PRODUCTION mode - using environment variables from hosting platform');
}

// Validate critical environment variables
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY loaded');
} else {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing!');
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Auto-select URLs based on environment
  FRONTEND_URL: process.env.NODE_ENV === 'production' 
    ? (process.env.FRONTEND_URL || process.env.PRODUCTION_FRONTEND_URL || 'https://blockify-vn.vercel.app')
    : (process.env.FRONTEND_URL || 'http://127.0.0.1:3002'),
    
  EMAIL_REDIRECT_URL: process.env.NODE_ENV === 'production'
    ? (process.env.EMAIL_REDIRECT_URL || process.env.PRODUCTION_EMAIL_REDIRECT_URL || 'https://blockify-vn.vercel.app/pages/EmailVerified.html')
    : (process.env.EMAIL_REDIRECT_URL || 'http://127.0.0.1:3002/src/pages/EmailVerified.html'),

  MAX_FILE_SIZE: 5242880,
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  RATE_LIMIT_MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  PORT: process.env.PORT || (process.env.NODE_ENV === 'production' ? '10000' : '3001'),
  HOST: process.env.HOST || '0.0.0.0',

  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',

  JWT_SECRET: process.env.JWT_SECRET || 'default-secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRE_IN || '24h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRE_IN || '7d',

  // Payment Configuration (VietQR)
  PAYMENT_BANK_ID: process.env.PAYMENT_BANK_ID || 'VCB',
  PAYMENT_BANK_BIN: process.env.PAYMENT_BANK_BIN || '970422',
  PAYMENT_ACCOUNT_NO: process.env.PAYMENT_ACCOUNT_NO || '0935205238',
  PAYMENT_ACCOUNT_NAME: process.env.PAYMENT_ACCOUNT_NAME || 'BLOCKIFY',

  // Sepay Configuration
  SEPAY_API_KEY: process.env.SEPAY_API_KEY || '',
  SEPAY_WEBHOOK_SECRET: process.env.SEPAY_WEBHOOK_SECRET || '',
  SEPAY_MERCHANT_ID: process.env.SEPAY_MERCHANT_ID || '',
  SEPAY_SECRET_KEY: process.env.SEPAY_SECRET_KEY || '',

  // Ngrok URL for webhooks (development only)
  NGROK_URL: process.env.NGROK_URL || ''
};

export const isDevelopment = ENV.NODE_ENV === 'development';
export const isProduction = ENV.NODE_ENV === 'production';
export const isTest = ENV.NODE_ENV === 'test';