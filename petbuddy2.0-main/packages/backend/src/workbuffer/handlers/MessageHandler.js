/**
 * MessageHandler - Abstract base class for message handlers
 *
 * Defines the interface that all message handlers must implement.
 * Follows the Strategy pattern for extensible message processing.
 *
 * @module workbuffer/handlers/MessageHandler
 */

import logger from '../../utils/logger.js';

/**
 * Abstract MessageHandler class
 *
 * All message handlers must extend this class and implement the process() method.
 *
 * @example
 * class EmailHandler extends MessageHandler {
 *   constructor() {
 *     super('email', { timeout: 30000 });
 *   }
 *
 *   async process(message) {
 *     await sendEmail(message.payload);
 *     return { sent: true };
 *   }
 * }
 */
export class MessageHandler {
  /**
   * @param {string} type - Message type this handler processes
   * @param {Object} [options={}] - Handler options
   * @param {number} [options.timeout=30000] - Processing timeout in milliseconds
   * @param {boolean} [options.idempotent=true] - Whether handler is idempotent
   * @param {number} [options.maxRetries=5] - Maximum retry attempts
   */
  constructor(type, options = {}) {
    if (!type) {
      throw new Error('Message handler must specify a type');
    }

    this.type = type;
    this.timeout = options.timeout ?? 30000;
    this.idempotent = options.idempotent ?? true;
    this.maxRetries = options.maxRetries ?? 5;
    this.logPrefix = `[${this.constructor.name}]`;
  }

  /**
   * Process a message
   *
   * Must be implemented by subclasses. Should be idempotent if possible.
   *
   * @param {Object} message - Message to process
   * @param {string} message.messageId - Unique message ID
   * @param {string} message.type - Message type
   * @param {*} message.payload - Message payload
   * @param {Object} message.metadata - Message metadata
   * @param {number} message.attemptCount - Current attempt number
   * @param {Object} context - Processing context
   * @param {AbortSignal} context.signal - Abort signal for cancellation
   * @returns {Promise<*>} Processing result (optional)
   * @throws {Error} If processing fails
   */
  async process(message, context) {
    throw new Error(`Handler ${this.type} must implement process() method`);
  }

  /**
   * Validate message payload before processing
   *
   * Override in subclass to add custom validation.
   *
   * @param {*} payload - Message payload
   * @returns {Promise<boolean>} True if valid
   * @throws {Error} If validation fails
   */
  async validate(payload) {
    return true;
  }

  /**
   * Handle processing error
   *
   * Override in subclass to add custom error handling logic.
   * Return true to retry, false to move to DLQ immediately.
   *
   * @param {Error} error - The error that occurred
   * @param {Object} message - The message being processed
   * @returns {Promise<boolean>} True to retry, false to DLQ
   */
  async onError(error, message) {
    // Default: retry on transient errors, DLQ on permanent errors
    const transientErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'];
    return transientErrors.includes(error.code);
  }

  /**
   * Called before processing starts
   *
   * Override in subclass for custom pre-processing logic.
   *
   * @param {Object} message - Message about to be processed
   */
  async onBeforeProcess(message) {
    logger.debug(`${this.logPrefix} Processing message`, {
      messageId: message.messageId,
      attemptCount: message.attemptCount,
    });
  }

  /**
   * Called after successful processing
   *
   * Override in subclass for custom post-processing logic.
   *
   * @param {Object} message - Processed message
   * @param {*} result - Processing result
   */
  async onAfterProcess(message, result) {
    logger.info(`${this.logPrefix} Message processed successfully`, {
      messageId: message.messageId,
      attemptCount: message.attemptCount,
    });
  }

  /**
   * Get handler metadata
   * @returns {Object}
   */
  getMetadata() {
    return {
      type: this.type,
      timeout: this.timeout,
      idempotent: this.idempotent,
      maxRetries: this.maxRetries,
    };
  }
}

export default MessageHandler;
