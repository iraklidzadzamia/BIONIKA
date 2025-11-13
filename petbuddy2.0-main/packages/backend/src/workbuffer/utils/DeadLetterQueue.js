/**
 * DeadLetterQueue - Management interface for poison messages
 *
 * Provides tools to inspect, retry, or permanently delete messages
 * that have been moved to the dead letter queue.
 *
 * @module workbuffer/utils/DeadLetterQueue
 */

import BufferMessage from '../models/BufferMessage.js';
import { MESSAGE_STATE } from '../config/bufferConfig.js';
import logger from '../../utils/logger.js';

/**
 * DeadLetterQueue class
 */
export class DeadLetterQueue {
  constructor(options = {}) {
    this.logPrefix = '[DeadLetterQueue]';
  }

  /**
   * Get all messages in the DLQ
   *
   * @param {Object} [options={}] - Query options
   * @param {number} [options.limit=100] - Maximum messages to fetch
   * @param {number} [options.skip=0] - Number of messages to skip
   * @param {string} [options.type] - Filter by message type
   * @param {Date} [options.since] - Only messages after this date
   * @returns {Promise<Array<Object>>} DLQ messages
   */
  async list(options = {}) {
    const {
      limit = 100,
      skip = 0,
      type = null,
      since = null,
    } = options;

    const query = { state: MESSAGE_STATE.DLQ };
    if (type) {
      query.type = type;
    }
    if (since) {
      query.createdAt = { $gte: since };
    }

    const messages = await BufferMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    return messages;
  }

  /**
   * Count messages in the DLQ
   *
   * @param {string} [type] - Filter by message type
   * @returns {Promise<number>} Count of DLQ messages
   */
  async count(type = null) {
    const query = { state: MESSAGE_STATE.DLQ };
    if (type) {
      query.type = type;
    }

    return BufferMessage.countDocuments(query).exec();
  }

  /**
   * Get a specific DLQ message by ID
   *
   * @param {string} messageId - Message ID
   * @returns {Promise<Object|null>} Message or null
   */
  async get(messageId) {
    return BufferMessage.findOne({
      messageId,
      state: MESSAGE_STATE.DLQ,
    })
      .lean()
      .exec();
  }

  /**
   * Retry a message from the DLQ
   *
   * Moves the message back to pending state with reset attempt count.
   *
   * @param {string} messageId - Message ID
   * @param {Object} [options={}] - Retry options
   * @param {boolean} [options.resetAttempts=true] - Reset attempt count
   * @param {number} [options.maxRetries] - Override max retries
   * @param {number} [options.visibilityDelayMs=0] - Delay before retry
   * @returns {Promise<Object|null>} Updated message or null
   */
  async retry(messageId, options = {}) {
    const {
      resetAttempts = true,
      maxRetries = null,
      visibilityDelayMs = 0,
    } = options;

    const message = await BufferMessage.findOne({
      messageId,
      state: MESSAGE_STATE.DLQ,
    }).exec();

    if (!message) {
      logger.warn(`${this.logPrefix} Message not found in DLQ`, { messageId });
      return null;
    }

    // Reset for retry
    message.state = MESSAGE_STATE.PENDING;
    message.processingStartedAt = null;
    message.workerId = null;
    message.visibleAt = new Date(Date.now() + visibilityDelayMs);

    if (resetAttempts) {
      message.attemptCount = 0;
    }

    if (maxRetries !== null) {
      message.maxRetries = maxRetries;
    }

    await message.save();

    logger.info(`${this.logPrefix} Message retried from DLQ`, {
      messageId,
      type: message.type,
      resetAttempts,
      maxRetries: message.maxRetries,
    });

    return message;
  }

  /**
   * Retry multiple messages from the DLQ
   *
   * @param {string[]} messageIds - Array of message IDs
   * @param {Object} [options={}] - Retry options
   * @returns {Promise<{succeeded: number, failed: number}>}
   */
  async retryBatch(messageIds, options = {}) {
    let succeeded = 0;
    let failed = 0;

    for (const messageId of messageIds) {
      try {
        const result = await this.retry(messageId, options);
        if (result) {
          succeeded++;
        } else {
          failed++;
        }
      } catch (error) {
        logger.error(`${this.logPrefix} Failed to retry message`, {
          messageId,
          error,
        });
        failed++;
      }
    }

    logger.info(`${this.logPrefix} Batch retry completed`, {
      total: messageIds.length,
      succeeded,
      failed,
    });

    return { succeeded, failed };
  }

  /**
   * Retry all messages of a specific type
   *
   * @param {string} type - Message type
   * @param {Object} [options={}] - Retry options
   * @returns {Promise<{succeeded: number, failed: number}>}
   */
  async retryByType(type, options = {}) {
    const messages = await BufferMessage.find({
      state: MESSAGE_STATE.DLQ,
      type,
    })
      .select('messageId')
      .lean()
      .exec();

    const messageIds = messages.map((m) => m.messageId);
    return this.retryBatch(messageIds, options);
  }

  /**
   * Permanently delete a message from the DLQ
   *
   * @param {string} messageId - Message ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(messageId) {
    const result = await BufferMessage.deleteOne({
      messageId,
      state: MESSAGE_STATE.DLQ,
    }).exec();

    const deleted = result.deletedCount > 0;

    if (deleted) {
      logger.info(`${this.logPrefix} Message deleted from DLQ`, { messageId });
    } else {
      logger.warn(`${this.logPrefix} Message not found in DLQ for deletion`, {
        messageId,
      });
    }

    return deleted;
  }

  /**
   * Delete multiple messages from the DLQ
   *
   * @param {string[]} messageIds - Array of message IDs
   * @returns {Promise<number>} Number of deleted messages
   */
  async deleteBatch(messageIds) {
    const result = await BufferMessage.deleteMany({
      messageId: { $in: messageIds },
      state: MESSAGE_STATE.DLQ,
    }).exec();

    logger.info(`${this.logPrefix} Batch delete completed`, {
      requested: messageIds.length,
      deleted: result.deletedCount,
    });

    return result.deletedCount;
  }

  /**
   * Delete all messages of a specific type
   *
   * @param {string} type - Message type
   * @returns {Promise<number>} Number of deleted messages
   */
  async deleteByType(type) {
    const result = await BufferMessage.deleteMany({
      state: MESSAGE_STATE.DLQ,
      type,
    }).exec();

    logger.info(`${this.logPrefix} Deleted messages by type`, {
      type,
      deleted: result.deletedCount,
    });

    return result.deletedCount;
  }

  /**
   * Delete old DLQ messages
   *
   * @param {number} olderThanMs - Delete messages older than this (milliseconds)
   * @returns {Promise<number>} Number of deleted messages
   */
  async deleteOld(olderThanMs = 604800000) {
    // Default: 7 days
    const cutoffDate = new Date(Date.now() - olderThanMs);

    const result = await BufferMessage.deleteMany({
      state: MESSAGE_STATE.DLQ,
      createdAt: { $lte: cutoffDate },
    }).exec();

    logger.info(`${this.logPrefix} Deleted old DLQ messages`, {
      cutoffDate,
      deleted: result.deletedCount,
    });

    return result.deletedCount;
  }

  /**
   * Get statistics about DLQ messages
   *
   * @returns {Promise<Object>} DLQ statistics
   */
  async getStats() {
    const [total, byType, oldestMessage] = await Promise.all([
      BufferMessage.countDocuments({ state: MESSAGE_STATE.DLQ }).exec(),
      BufferMessage.aggregate([
        { $match: { state: MESSAGE_STATE.DLQ } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]).exec(),
      BufferMessage.findOne({ state: MESSAGE_STATE.DLQ })
        .sort({ createdAt: 1 })
        .select('createdAt')
        .lean()
        .exec(),
    ]);

    const byTypeMap = {};
    for (const { _id, count } of byType) {
      byTypeMap[_id] = count;
    }

    return {
      total,
      byType: byTypeMap,
      oldestMessageAge: oldestMessage
        ? Date.now() - oldestMessage.createdAt.getTime()
        : null,
    };
  }

  /**
   * Get common error patterns in DLQ
   *
   * Analyzes error messages to identify common failure reasons.
   *
   * @param {number} [limit=10] - Top N error patterns
   * @returns {Promise<Array<Object>>} Error patterns with counts
   */
  async getErrorPatterns(limit = 10) {
    const patterns = await BufferMessage.aggregate([
      { $match: { state: MESSAGE_STATE.DLQ } },
      {
        $group: {
          _id: {
            errorCode: '$lastError.code',
            errorMessage: '$lastError.message',
          },
          count: { $sum: 1 },
          messageIds: { $push: '$messageId' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]).exec();

    return patterns.map((p) => ({
      errorCode: p._id.errorCode,
      errorMessage: p._id.errorMessage,
      count: p.count,
      sampleMessageIds: p.messageIds.slice(0, 3),
    }));
  }

  /**
   * Export DLQ messages to JSON
   *
   * @param {Object} [options={}] - Export options
   * @param {string} [options.type] - Filter by message type
   * @returns {Promise<string>} JSON string
   */
  async export(options = {}) {
    const messages = await this.list({
      limit: 10000,
      type: options.type,
    });

    return JSON.stringify(
      {
        exportedAt: new Date(),
        count: messages.length,
        messages,
      },
      null,
      2
    );
  }
}

export default DeadLetterQueue;
