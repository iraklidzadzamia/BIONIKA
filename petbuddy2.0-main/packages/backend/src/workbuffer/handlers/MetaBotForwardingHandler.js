/**
 * MetaBotForwardingHandler - Handler for forwarding messages to Meta Bot
 *
 * Processes messages that need to be forwarded to the Meta Bot server.
 * Integrates with the existing message forwarding service.
 *
 * @module workbuffer/handlers/MetaBotForwardingHandler
 */

import { MessageHandler } from './MessageHandler.js';
import axios from 'axios';
import logger from '../../utils/logger.js';

/**
 * Handler for Meta Bot message forwarding
 *
 * Payload structure:
 * {
 *   messageId: string,
 *   companyId: string,
 *   contactId: string,
 *   text: string,
 *   platform: 'facebook' | 'instagram',
 *   direction: 'outbound',
 *   role: 'operator'
 * }
 */
export class MetaBotForwardingHandler extends MessageHandler {
  constructor() {
    super('metabot-forwarding', {
      timeout: 10000, // 10 second timeout for external API
      idempotent: true, // Forwarding is idempotent (Meta Bot handles duplicates)
      maxRetries: 5,
    });

    this.metaBotUrl = process.env.META_BOT_URL || 'http://localhost:4000';
  }

  /**
   * Validate forwarding payload
   * @param {Object} payload
   * @returns {Promise<boolean>}
   */
  async validate(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload must be an object');
    }

    const required = ['messageId', 'companyId', 'contactId', 'text', 'platform'];
    for (const field of required) {
      if (!payload[field]) {
        throw new Error(`Payload must include ${field}`);
      }
    }

    const validPlatforms = ['facebook', 'instagram'];
    if (!validPlatforms.includes(payload.platform)) {
      throw new Error(`Invalid platform: ${payload.platform}`);
    }

    return true;
  }

  /**
   * Process Meta Bot forwarding
   * @param {Object} message
   * @param {Object} context
   * @returns {Promise<Object>}
   */
  async process(message, context) {
    const { payload } = message;

    try {
      // Forward to Meta Bot server
      const response = await axios.post(
        `${this.metaBotUrl}/api/messages/forward`,
        {
          message_id: payload.messageId,
          company_id: payload.companyId,
          contact_id: payload.contactId,
          text: payload.text,
          platform: payload.platform,
          direction: payload.direction || 'outbound',
          role: payload.role || 'operator',
        },
        {
          timeout: this.timeout,
          signal: context.signal, // Support cancellation
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Request': 'true',
          },
        }
      );

      logger.info(`${this.logPrefix} Message forwarded to Meta Bot`, {
        messageId: message.messageId,
        originalMessageId: payload.messageId,
        platform: payload.platform,
        statusCode: response.status,
      });

      return {
        forwarded: true,
        platform: payload.platform,
        statusCode: response.status,
        timestamp: new Date(),
      };
    } catch (error) {
      // Enhance error with more context
      const enhancedError = new Error(
        `Meta Bot forwarding failed: ${error.message}`
      );
      enhancedError.code = error.code || 'FORWARDING_ERROR';
      enhancedError.statusCode = error.response?.status;
      enhancedError.originalError = error;

      logger.error(`${this.logPrefix} Failed to forward to Meta Bot`, {
        messageId: message.messageId,
        originalMessageId: payload.messageId,
        platform: payload.platform,
        error: error.message,
        statusCode: error.response?.status,
      });

      throw enhancedError;
    }
  }

  /**
   * Determine if error is retryable
   * @param {Error} error
   * @param {Object} message
   * @returns {Promise<boolean>}
   */
  async onError(error, message) {
    // Don't retry validation errors or 4xx client errors
    if (error.message.includes('Invalid') || error.message.includes('must')) {
      return false;
    }

    const statusCode = error.statusCode;
    if (statusCode) {
      // Retry on 5xx server errors and network errors
      if (statusCode >= 500) return true;
      // Don't retry 4xx client errors (except 408, 429)
      if (statusCode >= 400 && statusCode < 500) {
        return statusCode === 408 || statusCode === 429;
      }
    }

    // Retry on network errors
    const retryableErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNRESET',
      'ENETUNREACH',
    ];
    return retryableErrors.includes(error.code);
  }
}

export default MetaBotForwardingHandler;
