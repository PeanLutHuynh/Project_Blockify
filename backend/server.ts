import { HttpServer } from './src/infrastructure/http/HttpServer';
import { Router } from './src/infrastructure/http/Router';
import {
  corsMiddleware,
  securityHeadersMiddleware,
  bodySizeLimitMiddleware,
  loggerMiddleware,
} from './src/infrastructure/http/middlewares';
import { RateLimiter, XSSProtection, SQLInjectionProtection } from './src/infrastructure/security';
import { ENV } from './src/config/env';
import { logger } from './src/config/logger';
import { testDatabaseConnection } from './src/config/database';

// Import routes
import { createUserRouter } from './src/modules/user/presentation/userRoutes';
import { authRoutes } from './src/modules/auth/presentation/authRoutes';
import { configRoutes } from './src/modules/config/presentation/configRoutes';

/**
 * Bootstrap application with custom HTTP server
 */
async function bootstrap() {
  try {
    // Test database connection
    await testDatabaseConnection();
    logger.info('✅ Database connection successful');

    // Create HTTP server
    const server = new HttpServer(
      Number(ENV.PORT) || 3001,
      ENV.HOST || 'localhost'
    );

    // Global middlewares
    server.use(
      corsMiddleware({
        origin: (origin: string) => {
          const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3002',
            'http://localhost:5173',
            'http://localhost:4173',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3002',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:4173',
            ENV.FRONTEND_URL,
          ].filter(Boolean);

          return !origin || allowedOrigins.includes(origin);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-CSRF-Token',
          'X-Requested-With',
        ],
        exposedHeaders: ['X-CSRF-Token'],
      })
    );

    server.use(securityHeadersMiddleware());
    server.use(bodySizeLimitMiddleware(10 * 1024 * 1024)); // 10MB
    server.use(loggerMiddleware((message) => logger.info(message)));

    // Rate limiter middleware
    const rateLimiter = new RateLimiter(60000, 100); // 100 requests per minute
    server.use(async (req, res, next) => {
      const identifier = req.headers['x-forwarded-for'] || req.raw.socket.remoteAddress || 'unknown';
      
      if (!rateLimiter.isAllowed(identifier as string)) {
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
          },
        });
        return;
      }

      await next();
    });

    // XSS Protection middleware
    server.use(async (req, res, next) => {
      // Sanitize query parameters
      Object.keys(req.query).forEach((key) => {
        const value = req.query[key];
        if (typeof value === 'string') {
          req.query[key] = XSSProtection.escapeHtml(value);
        }
      });

      // Sanitize body
      if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach((key) => {
          const value = req.body[key];
          if (typeof value === 'string') {
            req.body[key] = XSSProtection.sanitize(value);
          }
        });
      }

      await next();
    });

    // SQL Injection Protection middleware
    server.use(async (req, res, next) => {
      // Check query parameters
      for (const value of Object.values(req.query)) {
        if (typeof value === 'string' && SQLInjectionProtection.containsSQLInjection(value)) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'Invalid input detected',
            },
          });
          return;
        }
      }

      // Check body
      if (req.body && typeof req.body === 'object') {
        for (const value of Object.values(req.body)) {
          if (typeof value === 'string' && SQLInjectionProtection.containsSQLInjection(value)) {
            res.status(400).json({
              success: false,
              error: {
                code: 'INVALID_INPUT',
                message: 'Invalid input detected',
              },
            });
            return;
          }
        }
      }

      await next();
    });

    // Root endpoint
    server.get('/', async (req, res) => {
      res.json({
        success: true,
        message: 'Welcome to Blockify API',
        version: '1.0.0',
        documentation: 'https://api-docs.blockify.com',
        endpoints: {
          health: '/health',
          apiInfo: '/api/v1',
          auth: '/api/auth',
          users: '/api/v1/users',
        },
      });
    });

    // Health check endpoint
    server.get('/health', async (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Blockify Backend API',
        version: '1.0.0',
        security: {
          https: ENV.NODE_ENV === 'production',
          csrf: true,
          rateLimit: true,
          sanitization: true,
        },
      });
    });

    // API routes
    server.get('/api/v1', async (req, res) => {
      res.json({
        message: 'Blockify API v1',
        endpoints: {
          config: '/api/v1/config',
          users: '/api/v1/users',
          auth: '/api/auth',
          products: '/api/v1/products (coming soon)',
          categories: '/api/v1/categories (coming soon)',
          orders: '/api/v1/orders (coming soon)',
        },
        documentation: 'https://api-docs.blockify.com',
      });
    });

    // Mount config routes (public configuration for frontend)
    server.useRouter('/api/v1', configRoutes);

    // Mount routers
    const userRouter = createUserRouter();

    server.useRouter('/api/v1/users', userRouter);
    server.useRouter('/api/auth', authRoutes);

    // Debug: Log all registered routes
    console.log('📋 Registered routes:');
    const allRoutes = server.getRouter().getRoutes();
    allRoutes.forEach(route => {
      console.log(`  ${route.method} ${route.path}`);
    });

    // Start server
    server.listen(() => {
      const displayHost = ENV.HOST === '0.0.0.0' ? '127.0.0.1' : ENV.HOST;
      logger.info(`🚀 Server running on http://${displayHost}:${ENV.PORT}`);
      logger.info(`📝 Environment: ${ENV.NODE_ENV}`);
      logger.info(`🏥 Health check: http://${displayHost}:${ENV.PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start application
bootstrap();