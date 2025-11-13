import { config } from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Middleware to authenticate internal service requests using API key
 * Used for service-to-service communication (e.g., MetaAndAI -> Backend)
 */
export const authenticateInternalService = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      logger.warn('Internal service request missing API key', {
        ip: req.ip,
        path: req.path,
      });
      return res.status(401).json({
        success: false,
        error: 'API key is required',
        code: 'MISSING_API_KEY',
      });
    }

    // Check if API key matches the configured internal service key
    if (apiKey !== config.internalServiceApiKey) {
      logger.warn('Internal service request with invalid API key', {
        ip: req.ip,
        path: req.path,
      });
      return res.status(403).json({
        success: false,
        error: 'Invalid API key',
        code: 'INVALID_API_KEY',
      });
    }

    logger.debug('Internal service authenticated successfully', {
      path: req.path,
    });

    // Mark request as internal service
    req.isInternalService = true;
    next();
  } catch (error) {
    logger.error('Internal auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      code: 'INTERNAL_ERROR',
    });
  }
};
