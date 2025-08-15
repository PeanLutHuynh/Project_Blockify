import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Import routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import cartRoutes from './routes/cart';
import orderRoutes from './routes/orders';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';

// Import middlewares
import { errorHandler } from './middlewares/errorHandler';
import { notFoundHandler } from './middlewares/errorHandler';

// Load environment variables
dotenv.config();

class App {
  public app: express.Application;
  private readonly port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000', 10);
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
      }
    });
    this.app.use('/api/', limiter);

    // Logging
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined'));
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Static files
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
    this.app.use(express.static(path.join(__dirname, '../../frontend/public')));
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'Project Blockify API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/products', productRoutes);
    this.app.use('/api/categories', categoryRoutes);
    this.app.use('/api/cart', cartRoutes);
    this.app.use('/api/orders', orderRoutes);
    this.app.use('/api/admin', adminRoutes);
    this.app.use('/api/upload', uploadRoutes);

    // Serve frontend
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../../frontend/views/pages/index.html'));
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);
    
    // Global error handler
    this.app.use(errorHandler);
  }

  public listen(): void {
    this.app.listen(this.port, () => {
      console.log(`🚀 Project Blockify API Server is running on port ${this.port}`);
      console.log(`📖 API Documentation: http://localhost:${this.port}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const app = new App();
  app.listen();
}

export default App;