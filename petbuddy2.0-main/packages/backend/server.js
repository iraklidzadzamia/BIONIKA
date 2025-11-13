import { createServer } from 'http';
import app from './src/app.js';
import { connectDB, disconnectDB } from './src/config/database.js';
import { config } from './src/config/env.js';
import logger from './src/utils/logger.js';
import { startTokenRefreshJob } from './src/jobs/tokenRefreshJob.js';
import { initializeSocketServer } from './src/socket/socketServer.js';

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.io
    initializeSocketServer(httpServer);

    // Start server
    const server = httpServer.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
      logger.info(`Socket.io enabled for real-time messaging`);
    });

    // Start background jobs
    startTokenRefreshJob();

    // Graceful shutdown
    const gracefulShutdown = signal => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close database connection
          await disconnectDB();
          logger.info('Database connection closed');
        } catch (error) {
          logger.error('Error during shutdown:', error);
        }
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', error => {
      logger.error('Uncaught Exception:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    // Re-throw to allow host environment to handle exit
    throw error;
  }
};

startServer();
