import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { ENV } from './src/config/env';
import { logger } from './src/config/logger';

// Import security middleware
import { enhancedSanitization, sqlInjectionProtection, suspiciousActivityDetection } from './src/middlewares/security.middleware';
import { csrfMiddleware, csrfTokenEndpoint } from './src/middlewares/csrf.middleware';
import { cookieSecurity } from './src/middlewares/cookie-security.middleware';
import { sanitizeRequest } from './src/middlewares/validation.middleware';
import { conditionalSecurity, cspViolationReporter } from './src/middlewares/http-security.middleware';
import { generalRateLimit } from './src/middlewares/rate-limit.middleware';
import { urlSecurityCheck, parameterValidation, httpMethodValidation } from './src/middlewares/url-security.middleware';
import { globalErrorHandler, notFoundHandler } from './src/middlewares/error.middleware';

const app = express();

// Cookie parsing (required for CSRF and session security)
app.use(cookieParser());

// HTTP method validation (only allow safe methods)
app.use(httpMethodValidation);

// URL security checks (path traversal, suspicious patterns, etc.)
app.use(urlSecurityCheck);

// Parameter validation (prevent parameter pollution)
app.use(parameterValidation);

// HTTP Security Headers (HTTPS, CSP, HSTS, Clickjacking protection)
app.use(conditionalSecurity);

// Suspicious activity detection (before other processing)
app.use(suspiciousActivityDetection);

// Rate limiting (DDoS protection)
app.use(generalRateLimit);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token']
}));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request sanitization (XSS and SQL injection protection)
app.use(sanitizeRequest);
app.use(enhancedSanitization);
app.use(sqlInjectionProtection);

// Cookie security configuration
app.use(cookieSecurity.config());
app.use(cookieSecurity.tamperingDetection());
app.use(cookieSecurity.consentManagement);

// CSRF Protection (after cookie parsing)
app.use(csrfMiddleware);

// Logging (after sanitization to log clean data)
app.use(morgan('combined', { 
  stream: { write: message => logger.info(message.trim()) },
  skip: (req) => req.path === '/health' // Skip health check logs
}));

// Security endpoints
app.get('/api/v1/security/csrf-token', csrfTokenEndpoint);
app.post('/api/v1/security/csp-violation', cspViolationReporter);

// Health check endpoint (minimal logging)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Blockify Backend API',
    version: '1.0.0',
    security: {
      https: process.env.NODE_ENV === 'production',
      csrf: true,
      rateLimit: true,
      sanitization: true
    }
  });
});

// Main API routes
app.use('/api/v1', (req, res) => {
  res.json({ 
    message: 'Blockify API v1 - Coming Soon',
    endpoints: {
      auth: '/api/v1/auth',
      products: '/api/v1/products',
      categories: '/api/v1/categories',
      users: '/api/v1/users'
    }
  });
});

// Future routes will be added here
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/products', productRoutes);
// app.use('/api/v1/categories', categoryRoutes);

// 404 handler for unmatched routes
app.use('*', notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

export default app;