import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
;
import logger from '../utils/logger.js';
import { User } from '@petbuddy/shared';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required',
        },
      });
    }

    const decoded = jwt.verify(token, config.jwt.accessSecret);

    // Get user from database
    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found or inactive',
        },
      });
    }

    // Debug logging
    logger.info(
      `Auth middleware - User: ${user._id}, Role: ${user.role}, CompanyId: ${user.companyId}`
    );

    // Attach user to request
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      fullName: user.fullName,
      color: user.color,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired',
        },
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token',
        },
      });
    }

    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication error',
      },
    });
  }
};
