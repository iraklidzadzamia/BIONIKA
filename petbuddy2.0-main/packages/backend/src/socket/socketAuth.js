import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';
import { User } from '@petbuddy/shared';
;

/**
 * Socket.io authentication middleware
 * Verifies JWT token from handshake auth or cookies
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    console.log('🔐 [SOCKET AUTH] Authentication attempt from:', socket.handshake.address);
    console.log('🔐 [SOCKET AUTH] Has auth.token:', !!socket.handshake.auth.token);
    console.log('🔐 [SOCKET AUTH] Has cookie:', !!socket.handshake.headers.cookie);

    // Try to get token from auth header or cookies
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.cookie
        ?.split('; ')
        .find(c => c.startsWith('token='))
        ?.split('=')[1];

    if (!token) {
      console.log('❌ [SOCKET AUTH] No token found!');
      logger.warn('Socket connection attempt without token', {
        socketId: socket.id,
        ip: socket.handshake.address,
      });
      return next(new Error('Authentication required'));
    }

    console.log('✅ [SOCKET AUTH] Token found, verifying...');

    // Verify JWT token (use access token secret)
    const decoded = jwt.verify(token, config.jwt.accessSecret);

    // Load user from DB to obtain company and role (access token only has userId)
    const user = await User.findById(decoded.userId).select('companyId role isActive').lean();

    if (!user || !user.isActive) {
      logger.warn('Socket authentication failed - user not found or inactive', {
        socketId: socket.id,
        userId: decoded.userId,
      });
      return next(new Error('Unauthorized'));
    }

    // Attach user info to socket
    socket.userId = decoded.userId;
    socket.companyId = user.companyId?.toString();
    socket.role = user.role;

    logger.info('Socket authenticated successfully', {
      socketId: socket.id,
      userId: socket.userId,
      companyId: socket.companyId,
      role: socket.role,
    });

    next();
  } catch (error) {
    logger.error('Socket authentication failed', {
      socketId: socket.id,
      error: error.message,
    });
    next(new Error('Invalid token'));
  }
};
