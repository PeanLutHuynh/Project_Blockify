import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ENV } from './src/config/env';
import { logger } from './src/config/logger';
import { enhancedSanitization, sqlInjectionProtection, suspiciousActivityDetection } from './src/middlewares/security.middleware';
import { csrfMiddleware, csrfTokenEndpoint } from './src/middlewares/csrf.middleware';
import { cookieSecurity } from './src/middlewares/cookie-security.middleware';
import { sanitizeRequest } from './src/middlewares/validation.middleware';
import { conditionalSecurity, cspViolationReporter } from './src/middlewares/http-security.middleware';
import { generalRateLimit } from './src/middlewares/rate-limit.middleware';
import { urlSecurityCheck, parameterValidation, httpMethodValidation } from './src/middlewares/url-security.middleware';
import { globalErrorHandler, notFoundHandler } from './src/middlewares/error.middleware';
import { xmlParserMiddleware, responseFormatMiddleware } from './src/middlewares/xml.middleware';
import userRoutes from './src/modules/user/presentation/userRoutes';

const app = express();

app.use(cookieParser());
app.use(httpMethodValidation);
app.use(urlSecurityCheck);
app.use(parameterValidation);
app.use(conditionalSecurity);
app.use(suspiciousActivityDetection);
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

app.use(xmlParserMiddleware());
app.use(responseFormatMiddleware);
// app.use(sanitizeRequest); => Problem
// app.use(enhancedSanitization) => Problem;
app.use(sqlInjectionProtection);
app.use(cookieSecurity.config());
app.use(cookieSecurity.tamperingDetection());
app.use(cookieSecurity.consentManagement);
app.use(csrfMiddleware);

app.use(morgan('combined', { 
  stream: { write: message => logger.info(message.trim()) },
  skip: (req) => req.path === '/health' // Skip health check logs
}));

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
app.use('/api/v1/users', userRoutes);

app.use('/api/v1', (req, res) => {
  res.json({ 
    message: 'Blockify API v1',
    endpoints: {
      users: '/api/v1/users',
      auth: '/api/v1/auth (coming soon)',
      products: '/api/v1/products (coming soon)',
      categories: '/api/v1/categories (coming soon)'
    },
    documentation: {
      users: {
        'GET /api/v1/users': 'Get all users',
        'GET /api/v1/users/active': 'Get active users',
        'GET /api/v1/users/:id': 'Get user by ID',
        'GET /api/v1/users/email/:email': 'Get user by email',
        'POST /api/v1/users': 'Create new user',
        'PUT /api/v1/users/:id': 'Update user',
        'PATCH /api/v1/users/:id/profile': 'Update user profile',
        'PATCH /api/v1/users/:id/deactivate': 'Deactivate user',
        'DELETE /api/v1/users/:id': 'Delete user'
      }
    }
  });
});

// Future routes will be added here
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/products', productRoutes);
// app.use('/api/v1/categories', categoryRoutes);

// 404 handler for unmatched routes
app.use((req, res, next) => {
  notFoundHandler(req, res, next);
});

// Global error handler
app.use(globalErrorHandler);

export default app;