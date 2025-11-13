import { Server } from 'socket.io';
import { socketAuthMiddleware } from './socketAuth.js';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

let io = null;

/**
 * Initialize Socket.io server
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {SocketIO.Server} Socket.io server instance
 */
export const initializeSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.frontendUrl || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  // Handle connections
  io.on('connection', (socket) => {
    console.log('🔌 [SOCKET CONNECTION] New client connected!');
    console.log('🔌 [SOCKET CONNECTION] Socket ID:', socket.id);
    console.log('🔌 [SOCKET CONNECTION] User ID:', socket.userId);
    console.log('🔌 [SOCKET CONNECTION] Company ID:', socket.companyId);

    logger.info('Client connected', {
      socketId: socket.id,
      userId: socket.userId,
      companyId: socket.companyId,
    });

    // Join company-specific room
    const companyRoom = `company:${socket.companyId}`;
    socket.join(companyRoom);

    console.log('✅ [SOCKET CONNECTION] Client joined room:', companyRoom);

    logger.info('Client joined company room', {
      socketId: socket.id,
      room: companyRoom,
    });

    // Handle joining conversation-specific rooms
    socket.on('conversation:join', (data) => {
      const { conversationId } = data;
      if (!conversationId) {
        logger.warn('Conversation join attempted without conversationId', {
          socketId: socket.id,
        });
        return;
      }

      const conversationRoom = `conversation:${conversationId}`;
      socket.join(conversationRoom);

      logger.info('Client joined conversation room', {
        socketId: socket.id,
        conversationId,
        room: conversationRoom,
      });
    });

    // Handle leaving conversation-specific rooms
    socket.on('conversation:leave', (data) => {
      const { conversationId } = data;
      if (!conversationId) {
        logger.warn('Conversation leave attempted without conversationId', {
          socketId: socket.id,
        });
        return;
      }

      const conversationRoom = `conversation:${conversationId}`;
      socket.leave(conversationRoom);

      logger.info('Client left conversation room', {
        socketId: socket.id,
        conversationId,
        room: conversationRoom,
      });
    });

    // Handle typing indicators
    socket.on('typing:start', (data) => {
      const { conversationId } = data;
      if (!conversationId) {
        logger.warn('Typing start without conversationId', {
          socketId: socket.id,
        });
        return;
      }

      const conversationRoom = `conversation:${conversationId}`;

      // Broadcast to others in the conversation (except sender)
      socket.to(conversationRoom).emit('typing:indicator', {
        conversationId,
        userId: socket.userId,
        isTyping: true,
      });

      logger.debug('User started typing', {
        socketId: socket.id,
        userId: socket.userId,
        conversationId,
      });
    });

    socket.on('typing:stop', (data) => {
      const { conversationId } = data;
      if (!conversationId) {
        logger.warn('Typing stop without conversationId', {
          socketId: socket.id,
        });
        return;
      }

      const conversationRoom = `conversation:${conversationId}`;

      // Broadcast to others in the conversation (except sender)
      socket.to(conversationRoom).emit('typing:indicator', {
        conversationId,
        userId: socket.userId,
        isTyping: false,
      });

      logger.debug('User stopped typing', {
        socketId: socket.id,
        userId: socket.userId,
        conversationId,
      });
    });

    // Handle message read acknowledgment
    socket.on('message:read', (data) => {
      const { conversationId, messageIds } = data;

      if (!conversationId || !messageIds || !Array.isArray(messageIds)) {
        logger.warn('Invalid message:read data', {
          socketId: socket.id,
          hasConversationId: !!conversationId,
          hasMessageIds: !!messageIds,
          isArray: Array.isArray(messageIds),
        });
        return;
      }

      // Broadcast read status to company room
      io.to(companyRoom).emit('message:status', {
        conversationId,
        messageIds,
        status: 'read',
        userId: socket.userId,
        timestamp: new Date(),
      });

      logger.debug('Messages marked as read', {
        socketId: socket.id,
        userId: socket.userId,
        conversationId,
        messageCount: messageIds.length,
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info('Client disconnected', {
        socketId: socket.id,
        userId: socket.userId,
        reason,
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error', {
        socketId: socket.id,
        error: error.message,
      });
    });
  });

  logger.info('Socket.io server initialized');
  return io;
};

/**
 * Get Socket.io server instance
 * @returns {SocketIO.Server} Socket.io server instance
 */
export const getSocketInstance = () => {
  if (!io) {
    throw new Error('Socket.io server not initialized');
  }
  return io;
};
