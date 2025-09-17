import app from './app';
import { ENV } from './src/config/env';
import { logger } from './src/config/logger';
import { testDatabaseConnection } from './src/config/database';

const PORT = Number(ENV.PORT) || 3001;
const HOST = ENV.HOST || 'localhost';

async function startServer() {
  try {
    // Test database connection
    await testDatabaseConnection();
    logger.info('Database connection successful');

    // Start server
    const server = app.listen(PORT, HOST, () => {
      logger.info(`Server running on http://${HOST}:${PORT}`);
      logger.info(`Environment: ${ENV.NODE_ENV}`);
      logger.info(`Health check: http://${HOST}:${PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();