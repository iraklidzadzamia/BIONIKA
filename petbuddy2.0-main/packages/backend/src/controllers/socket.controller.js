import { getSocketInstance } from '../socket/socketServer.js';
import { emitNewMessage } from '../socket/events/messageEvents.js';
import logger from '../utils/logger.js';

/**
 * Emit a new message event via Socket.io (INTERNAL SERVICE ENDPOINT)
 * This endpoint is called by internal services (MetaAndAI) to trigger real-time updates
 * Authentication: Uses API key (x-api-key header)
 */
export const emitMessageEventInternal = async (req, res) => {
  try {
    console.log('🔵 [SOCKET INTERNAL] Request received');
    console.log('🔵 [SOCKET INTERNAL] Headers:', {
      hasApiKey: !!req.headers['x-api-key'],
      apiKeyLength: req.headers['x-api-key']?.length,
    });
    console.log('🔵 [SOCKET INTERNAL] isInternalService:', req.isInternalService);

    const { companyId, conversationId, message } = req.body;

    console.log('🔵 [SOCKET INTERNAL] Body:', {
      companyId,
      conversationId,
      messageId: message?.id,
      direction: message?.direction,
      content: message?.content?.substring(0, 50),
    });

    // Validate required fields
    if (!companyId || !conversationId || !message) {
      console.log('❌ [SOCKET INTERNAL] Validation failed - missing fields');
      logger.warn('Internal socket emission missing required fields', {
        hasCompanyId: !!companyId,
        hasConversationId: !!conversationId,
        hasMessage: !!message,
      });
      return res.status(400).json({
        success: false,
        error: 'companyId, conversationId, and message are required',
        code: 'MISSING_REQUIRED_FIELDS',
      });
    }

    // Validate message structure
    if (!message.id || !message.contactId || message.direction === undefined) {
      logger.warn('Internal socket emission has invalid message structure', {
        hasId: !!message.id,
        hasContactId: !!message.contactId,
        hasDirection: message.direction !== undefined,
      });
      return res.status(400).json({
        success: false,
        error: 'Message must include id, contactId, and direction',
        code: 'INVALID_MESSAGE_STRUCTURE',
      });
    }

    console.log('✅ [SOCKET INTERNAL] Validation passed, emitting event...');

    logger.info('Emitting socket event via internal service', {
      companyId,
      conversationId,
      messageId: message.id,
      direction: message.direction,
      isInternalService: req.isInternalService,
    });

    // Get Socket.io instance and emit event
    const io = getSocketInstance();
    console.log('🔵 [SOCKET INTERNAL] Socket instance obtained:', !!io);

    emitNewMessage(io, companyId, {
      conversationId,
      message,
    });

    console.log('✅ [SOCKET INTERNAL] Socket event emitted!');

    logger.info('Socket event emitted successfully', {
      companyId,
      conversationId,
      messageId: message.id,
    });

    res.status(200).json({
      success: true,
      message: 'Event emitted successfully',
      data: {
        companyId,
        conversationId,
        messageId: message.id,
      },
    });
  } catch (error) {
    logger.error('Error emitting socket event from internal service', {
      error: error.message,
      stack: error.stack,
      companyId: req.body?.companyId,
      conversationId: req.body?.conversationId,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to emit socket event',
      details: error.message,
      code: 'SOCKET_EMISSION_FAILED',
    });
  }
};

/**
 * Emit a new message event via Socket.io (AUTHENTICATED USER ENDPOINT)
 * This endpoint is called by authenticated frontend users
 * Authentication: Uses JWT token
 * @deprecated - Consider using direct socket emission from message.controller.js
 */
export const emitMessageEvent = async (req, res) => {
  try {
    const { companyId, conversationId, message } = req.body;

    // Validate required fields
    if (!companyId || !conversationId || !message) {
      return res.status(400).json({
        success: false,
        error: 'companyId, conversationId, and message are required',
      });
    }

    logger.info('Emitting socket event via HTTP (authenticated)', {
      companyId,
      conversationId,
      direction: message.direction,
      userId: req.user?.id,
    });

    // Get Socket.io instance and emit event
    const io = getSocketInstance();
    emitNewMessage(io, companyId, {
      conversationId,
      message,
    });

    res.status(200).json({
      success: true,
      message: 'Event emitted successfully',
    });
  } catch (error) {
    logger.error('Error emitting socket event', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to emit socket event',
      details: error.message,
    });
  }
};
