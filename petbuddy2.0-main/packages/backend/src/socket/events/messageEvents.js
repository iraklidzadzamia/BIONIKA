import logger from '../../utils/logger.js';

/**
 * Emit a new message event to all clients in a company room
 * @param {SocketIO.Server} io - Socket.io server instance
 * @param {string} companyId - Company ID
 * @param {object} messageData - Message data to emit
 */
export const emitNewMessage = (io, companyId, messageData) => {
  try {
    const roomName = `company:${companyId}`;

    console.log('📡 [SOCKET EMIT] Emitting to room:', roomName);
    console.log('📡 [SOCKET EMIT] Message data:', {
      conversationId: messageData.conversationId,
      messageId: messageData.message?.id,
      direction: messageData.message?.direction,
      content: messageData.message?.content?.substring(0, 50),
    });

    logger.info('Emitting new message event', {
      room: roomName,
      conversationId: messageData.conversationId,
      direction: messageData.message?.direction,
    });

    io.to(roomName).emit('message:new', messageData);

    console.log('✅ [SOCKET EMIT] Event emitted to room:', roomName);
  } catch (error) {
    console.error('❌ [SOCKET EMIT] Error:', error);
    logger.error('Error emitting new message event', {
      companyId,
      error: error.message,
    });
  }
};

/**
 * Emit a message status update (read, delivered)
 * @param {SocketIO.Server} io - Socket.io server instance
 * @param {string} companyId - Company ID
 * @param {object} statusData - Status update data
 */
export const emitMessageStatus = (io, companyId, statusData) => {
  try {
    const roomName = `company:${companyId}`;

    io.to(roomName).emit('message:status', statusData);
  } catch (error) {
    logger.error('Error emitting message status event', {
      companyId,
      error: error.message,
    });
  }
};
