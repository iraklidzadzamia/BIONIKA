/**
 * BufferStore - MongoDB persistence layer for work buffer
 *
 * Provides durable storage for messages with transactional guarantees.
 * Implements the Repository pattern for clean separation of concerns.
 *
 * @module workbuffer/storage/BufferStore
 */

import { v4 as uuidv4 } from 'uuid';
import BufferMessage from '../models/BufferMessage.js';
import { MESSAGE_STATE, ERROR_CODES } from '../config/bufferConfig.js';
import logger from '../../utils/logger.js';

/**
 * BufferStore class - Manages persistence of work buffer messages
 */
export class BufferStore {
  /**
   * @param {Object} options - Configuration options
   * @param {string} [options.logPrefix='[BufferStore]'] - Prefix for log messages
   * @param {boolean} [options.enableIdempotency=true] - Enable idempotency checking
   */
  constructor(options = {}) {
    this.logPrefix = options.logPrefix || '[BufferStore]';
    this.enableIdempotency = options.enableIdempotency ?? true;
  }

  /**
   * Store a new message in the buffer
   *
   * @param {Object} message - Message to store
   * @param {string} message.type - Message type/handler name
   * @param {*} message.payload - Message payload
   * @param {number} [message.priority=2] - Priority level
   * @param {Object} [message.metadata] - Optional metadata
   * @param {string} [message.idempotencyKey] - Optional idempotency key
   * @param {number} [message.maxRetries=5] - Maximum retry attempts
   * @param {number} [message.visibilityDelayMs=0] - Delay before message is visible
   * @returns {Promise<Object>} Created message document
   * @throws {Error} If message already exists (duplicate idempotency key)
   */
  async create(message) {
    try {
      const messageId = uuidv4();
      const now = new Date();

      // Check for duplicate if idempotency is enabled
      if (this.enableIdempotency && message.idempotencyKey) {
        const existing = await this.findByIdempotencyKey(message.idempotencyKey);
        if (existing) {
          logger.warn(`${this.logPrefix} Duplicate message detected`, {
            messageId: existing.messageId,
            idempotencyKey: message.idempotencyKey,
          });
          throw new Error(ERROR_CODES.DUPLICATE_MESSAGE);
        }
      }

      const doc = new BufferMessage({
        messageId,
        type: message.type,
        priority: message.priority ?? 2,
        state: MESSAGE_STATE.PENDING,
        payload: message.payload,
        metadata: message.metadata || {},
        attemptCount: 0,
        maxRetries: message.maxRetries ?? 5,
        visibleAt: new Date(now.getTime() + (message.visibilityDelayMs || 0)),
        idempotencyKey: message.idempotencyKey || null,
        errors: [],
      });

      await doc.save();

      logger.debug(`${this.logPrefix} Message created`, {
        messageId: doc.messageId,
        type: doc.type,
        priority: doc.priority,
      });

      return doc;
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error
        logger.warn(`${this.logPrefix} Duplicate message ID detected`, { error });
        throw new Error(ERROR_CODES.DUPLICATE_MESSAGE);
      }
      logger.error(`${this.logPrefix} Failed to create message`, { error });
      throw error;
    }
  }

  /**
   * Find message by ID
   * @param {string} messageId - Message ID
   * @returns {Promise<Object|null>} Message document or null
   */
  async findById(messageId) {
    return BufferMessage.findOne({ messageId }).exec();
  }

  /**
   * Find message by idempotency key
   * @param {string} idempotencyKey - Idempotency key
   * @returns {Promise<Object|null>} Message document or null
   */
  async findByIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey) return null;
    return BufferMessage.findOne({ idempotencyKey }).exec();
  }

  /**
   * Fetch next batch of messages ready for processing
   *
   * Uses atomic findAndModify to prevent race conditions between workers.
   *
   * @param {number} limit - Maximum messages to fetch
   * @param {string} workerId - ID of the worker claiming these messages
   * @param {number} visibilityTimeoutMs - How long to hide messages during processing
   * @returns {Promise<Array<Object>>} Array of claimed messages
   */
  async claimNextBatch(limit = 10, workerId, visibilityTimeoutMs = 60000) {
    const messages = [];
    const now = new Date();

    // Find messages that are visible and pending
    const candidates = await BufferMessage.find({
      state: MESSAGE_STATE.PENDING,
      visibleAt: { $lte: now },
    })
      .sort({ priority: 1, createdAt: 1 })
      .limit(limit)
      .exec();

    // Atomically claim each message
    for (const candidate of candidates) {
      try {
        // Use findOneAndUpdate with version check to prevent double-claiming
        const claimed = await BufferMessage.findOneAndUpdate(
          {
            messageId: candidate.messageId,
            state: MESSAGE_STATE.PENDING,
            visibleAt: { $lte: now },
          },
          {
            $set: {
              state: MESSAGE_STATE.PROCESSING,
              processingStartedAt: now,
              workerId,
              visibleAt: new Date(now.getTime() + visibilityTimeoutMs),
            },
            $inc: { attemptCount: 1 },
          },
          {
            new: true,
            runValidators: true,
          }
        ).exec();

        if (claimed) {
          messages.push(claimed);
        }
      } catch (error) {
        logger.error(`${this.logPrefix} Failed to claim message`, {
          messageId: candidate.messageId,
          error,
        });
      }
    }

    logger.debug(`${this.logPrefix} Claimed ${messages.length} messages`, {
      workerId,
      requested: limit,
      claimed: messages.length,
    });

    return messages;
  }

  /**
   * Mark message as successfully completed
   *
   * @param {string} messageId - Message ID
   * @param {*} [result] - Processing result
   * @returns {Promise<Object|null>} Updated message or null
   */
  async markCompleted(messageId, result = null) {
    try {
      const message = await this.findById(messageId);
      if (!message) {
        logger.warn(`${this.logPrefix} Message not found for completion`, { messageId });
        return null;
      }

      message.markCompleted(result);
      await message.save();

      logger.info(`${this.logPrefix} Message completed`, {
        messageId,
        type: message.type,
        attemptCount: message.attemptCount,
        processingTime: message.completedAt - message.processingStartedAt,
      });

      return message;
    } catch (error) {
      logger.error(`${this.logPrefix} Failed to mark message as completed`, {
        messageId,
        error,
      });
      throw error;
    }
  }

  /**
   * Mark message as failed and schedule retry or move to DLQ
   *
   * @param {string} messageId - Message ID
   * @param {Error} error - Error that caused the failure
   * @param {number} retryDelayMs - Delay before retry (if applicable)
   * @returns {Promise<{willRetry: boolean, message: Object}>}
   */
  async markFailed(messageId, error, retryDelayMs = 0) {
    try {
      const message = await this.findById(messageId);
      if (!message) {
        logger.warn(`${this.logPrefix} Message not found for failure`, { messageId });
        return { willRetry: false, message: null };
      }

      const willRetry = message.markFailed(error, retryDelayMs);
      await message.save();

      if (willRetry) {
        logger.warn(`${this.logPrefix} Message failed, will retry`, {
          messageId,
          type: message.type,
          attemptCount: message.attemptCount,
          maxRetries: message.maxRetries,
          retryDelayMs,
          error: error.message,
        });
      } else {
        logger.error(`${this.logPrefix} Message failed permanently`, {
          messageId,
          type: message.type,
          attemptCount: message.attemptCount,
          error: error.message,
        });
      }

      return { willRetry, message };
    } catch (err) {
      logger.error(`${this.logPrefix} Failed to mark message as failed`, {
        messageId,
        error: err,
      });
      throw err;
    }
  }

  /**
   * Move message to dead letter queue
   *
   * @param {string} messageId - Message ID
   * @param {string} reason - Reason for moving to DLQ
   * @returns {Promise<Object|null>} Updated message or null
   */
  async moveToDLQ(messageId, reason) {
    try {
      const message = await this.findById(messageId);
      if (!message) {
        logger.warn(`${this.logPrefix} Message not found for DLQ`, { messageId });
        return null;
      }

      message.moveToDLQ(reason);
      await message.save();

      logger.error(`${this.logPrefix} Message moved to DLQ`, {
        messageId,
        type: message.type,
        reason,
        attemptCount: message.attemptCount,
      });

      return message;
    } catch (error) {
      logger.error(`${this.logPrefix} Failed to move message to DLQ`, {
        messageId,
        error,
      });
      throw error;
    }
  }

  /**
   * Release stuck messages back to the queue
   *
   * Finds messages that have been processing too long and resets them.
   *
   * @param {number} timeoutMs - Processing timeout in milliseconds
   * @returns {Promise<number>} Number of messages released
   */
  async releaseStuckMessages(timeoutMs = 60000) {
    try {
      const stuckMessages = await BufferMessage.findStuckMessages(timeoutMs);

      let releasedCount = 0;
      for (const message of stuckMessages) {
        const error = new Error('Processing timeout');
        error.code = ERROR_CODES.MESSAGE_TIMEOUT;

        const { willRetry } = await this.markFailed(message.messageId, error, 5000);
        if (willRetry) {
          releasedCount++;
        }
      }

      if (releasedCount > 0) {
        logger.warn(`${this.logPrefix} Released ${releasedCount} stuck messages`, {
          timeoutMs,
          total: stuckMessages.length,
        });
      }

      return releasedCount;
    } catch (error) {
      logger.error(`${this.logPrefix} Failed to release stuck messages`, { error });
      throw error;
    }
  }

  /**
   * Get queue statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getStats() {
    return BufferMessage.getStats();
  }

  /**
   * Get messages by state
   * @param {string} state - Message state
   * @param {number} [limit=100] - Maximum messages to fetch
   * @returns {Promise<Array<Object>>} Array of messages
   */
  async findByState(state, limit = 100) {
    return BufferMessage.find({ state }).limit(limit).sort({ createdAt: -1 }).exec();
  }

  /**
   * Get messages by type
   * @param {string} type - Message type
   * @param {number} [limit=100] - Maximum messages to fetch
   * @returns {Promise<Array<Object>>} Array of messages
   */
  async findByType(type, limit = 100) {
    return BufferMessage.find({ type }).limit(limit).sort({ createdAt: -1 }).exec();
  }

  /**
   * Delete message by ID
   * @param {string} messageId - Message ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteById(messageId) {
    const result = await BufferMessage.deleteOne({ messageId }).exec();
    return result.deletedCount > 0;
  }

  /**
   * Clean up old completed/failed messages
   * @param {number} [olderThanMs=86400000] - Delete messages older than this (default 24 hours)
   * @returns {Promise<number>} Number of deleted messages
   */
  async cleanup(olderThanMs = 86400000) {
    const deletedCount = await BufferMessage.cleanup(olderThanMs);
    if (deletedCount > 0) {
      logger.info(`${this.logPrefix} Cleaned up ${deletedCount} old messages`, {
        olderThanMs,
      });
    }
    return deletedCount;
  }

  /**
   * Count messages by state
   * @returns {Promise<Object>} Object with counts per state
   */
  async countByState() {
    const stats = await this.getStats();
    return {
      pending: stats.pending,
      processing: stats.processing,
      completed: stats.completed,
      failed: stats.failed,
      dlq: stats.dlq,
      total: stats.total,
    };
  }

  /**
   * Get oldest pending message age
   * @returns {Promise<number|null>} Age in milliseconds or null
   */
  async getOldestPendingAge() {
    const oldest = await BufferMessage.findOne({ state: MESSAGE_STATE.PENDING })
      .sort({ createdAt: 1 })
      .exec();

    return oldest ? Date.now() - oldest.createdAt.getTime() : null;
  }

  /**
   * Close the store (cleanup resources)
   */
  async close() {
    // MongoDB connection is managed globally, nothing to close here
    logger.info(`${this.logPrefix} Store closed`);
  }
}

export default BufferStore;
