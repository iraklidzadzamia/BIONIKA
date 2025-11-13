/**
 * MongoDB model for persisted work buffer messages
 *
 * Provides durability and recovery capabilities for the work buffer.
 * Messages are stored here for at-least-once delivery guarantees.
 *
 * @module workbuffer/models/BufferMessage
 */

import mongoose from 'mongoose';
import { MESSAGE_STATE } from '../config/bufferConfig.js';

const bufferMessageSchema = new mongoose.Schema(
  {
    // Unique identifier for the message (for idempotency)
    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Message type determines which handler processes it
    type: {
      type: String,
      required: true,
      index: true,
    },

    // Priority for processing order
    priority: {
      type: Number,
      required: true,
      default: 2, // NORMAL
      index: true,
    },

    // Current state of the message
    state: {
      type: String,
      enum: Object.values(MESSAGE_STATE),
      required: true,
      default: MESSAGE_STATE.PENDING,
      index: true,
    },

    // Actual message payload
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // Metadata for tracing and debugging
    metadata: {
      correlationId: String,
      source: String,
      userId: String,
      companyId: String,
      traceId: String,
      custom: mongoose.Schema.Types.Mixed,
    },

    // Retry tracking
    attemptCount: {
      type: Number,
      required: true,
      default: 0,
    },

    maxRetries: {
      type: Number,
      required: true,
      default: 5,
    },

    // Processing information
    processingStartedAt: {
      type: Date,
      index: true,
    },

    lastProcessedAt: Date,

    completedAt: Date,

    // When message becomes visible for processing
    visibleAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // Worker that picked up the message
    workerId: String,

    // Error tracking
    errors: [
      {
        message: String,
        code: String,
        stack: String,
        timestamp: { type: Date, default: Date.now },
        attemptNumber: Number,
      },
    ],

    lastError: {
      message: String,
      code: String,
      timestamp: Date,
    },

    // Idempotency key (optional, alternative to messageId)
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },

    // Result of successful processing (optional)
    result: mongoose.Schema.Types.Mixed,

    // TTL for automatic cleanup
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'work_buffer_messages',
  }
);

// Compound indexes for efficient queries
bufferMessageSchema.index({ state: 1, priority: 1, visibleAt: 1 });
bufferMessageSchema.index({ type: 1, state: 1 });
bufferMessageSchema.index({ createdAt: 1, state: 1 });
bufferMessageSchema.index({ 'metadata.companyId': 1, state: 1 });

// TTL index for automatic cleanup of completed/failed messages
bufferMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for message age
bufferMessageSchema.virtual('ageMs').get(function () {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for whether message is overdue
bufferMessageSchema.virtual('isOverdue').get(function () {
  if (!this.processingStartedAt) return false;
  const processingTime = Date.now() - this.processingStartedAt.getTime();
  return processingTime > 60000; // 1 minute
});

// Instance methods

/**
 * Mark message as picked up for processing
 * @param {string} workerId - ID of the worker processing this message
 * @param {number} visibilityTimeoutMs - How long to hide the message
 */
bufferMessageSchema.methods.markProcessing = function (workerId, visibilityTimeoutMs = 60000) {
  this.state = MESSAGE_STATE.PROCESSING;
  this.processingStartedAt = new Date();
  this.workerId = workerId;
  this.visibleAt = new Date(Date.now() + visibilityTimeoutMs);
  this.attemptCount += 1;
};

/**
 * Mark message as successfully completed
 * @param {*} result - Processing result (optional)
 */
bufferMessageSchema.methods.markCompleted = function (result = null) {
  this.state = MESSAGE_STATE.COMPLETED;
  this.completedAt = new Date();
  this.lastProcessedAt = new Date();
  if (result !== null) {
    this.result = result;
  }
  // Set expiration for 24 hours from now
  this.expiresAt = new Date(Date.now() + 86400000);
};

/**
 * Mark message as failed and prepare for retry
 * @param {Error} error - The error that caused the failure
 * @param {number} retryDelayMs - Delay before next retry
 * @returns {boolean} True if will retry, false if moved to DLQ
 */
bufferMessageSchema.methods.markFailed = function (error, retryDelayMs = 0) {
  this.lastProcessedAt = new Date();

  // Record the error
  const errorRecord = {
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    stack: error.stack,
    timestamp: new Date(),
    attemptNumber: this.attemptCount,
  };
  this.errors.push(errorRecord);
  this.lastError = {
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    timestamp: new Date(),
  };

  // Check if we should retry
  if (this.attemptCount >= this.maxRetries) {
    this.state = MESSAGE_STATE.FAILED;
    this.expiresAt = new Date(Date.now() + 604800000); // Keep failed messages for 7 days
    return false;
  }

  // Schedule for retry
  this.state = MESSAGE_STATE.PENDING;
  this.visibleAt = new Date(Date.now() + retryDelayMs);
  this.processingStartedAt = null;
  this.workerId = null;
  return true;
};

/**
 * Move message to dead letter queue
 * @param {string} reason - Reason for DLQ
 */
bufferMessageSchema.methods.moveToDLQ = function (reason) {
  this.state = MESSAGE_STATE.DLQ;
  this.lastError = {
    message: reason,
    code: 'MOVED_TO_DLQ',
    timestamp: new Date(),
  };
  // Keep DLQ messages indefinitely (manual cleanup required)
};

/**
 * Check if message is visible for processing
 * @returns {boolean}
 */
bufferMessageSchema.methods.isVisible = function () {
  return this.state === MESSAGE_STATE.PENDING && this.visibleAt <= new Date();
};

// Static methods

/**
 * Find next batch of messages to process
 * @param {number} limit - Maximum messages to fetch
 * @returns {Promise<Array>} Array of messages
 */
bufferMessageSchema.statics.findNextBatch = function (limit = 10) {
  return this.find({
    state: MESSAGE_STATE.PENDING,
    visibleAt: { $lte: new Date() },
  })
    .sort({ priority: 1, createdAt: 1 }) // Lower priority number = higher priority
    .limit(limit)
    .exec();
};

/**
 * Find stuck messages (processing too long)
 * @param {number} timeoutMs - Processing timeout in milliseconds
 * @returns {Promise<Array>} Array of stuck messages
 */
bufferMessageSchema.statics.findStuckMessages = function (timeoutMs = 60000) {
  return this.find({
    state: MESSAGE_STATE.PROCESSING,
    processingStartedAt: { $lte: new Date(Date.now() - timeoutMs) },
  }).exec();
};

/**
 * Get queue statistics
 * @returns {Promise<Object>} Statistics object
 */
bufferMessageSchema.statics.getStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$state',
        count: { $sum: 1 },
        oldestMessage: { $min: '$createdAt' },
      },
    },
  ]);

  const result = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    dlq: 0,
    total: 0,
    oldestPendingAge: null,
  };

  stats.forEach((stat) => {
    result[stat._id] = stat.count;
    result.total += stat.count;
    if (stat._id === MESSAGE_STATE.PENDING && stat.oldestMessage) {
      result.oldestPendingAge = Date.now() - stat.oldestMessage.getTime();
    }
  });

  return result;
};

/**
 * Clean up old completed/failed messages
 * @param {number} olderThanMs - Delete messages older than this
 * @returns {Promise<number>} Number of deleted messages
 */
bufferMessageSchema.statics.cleanup = async function (olderThanMs = 86400000) {
  const cutoffDate = new Date(Date.now() - olderThanMs);
  const result = await this.deleteMany({
    state: { $in: [MESSAGE_STATE.COMPLETED, MESSAGE_STATE.FAILED] },
    completedAt: { $lte: cutoffDate },
  });
  return result.deletedCount;
};

const BufferMessage = mongoose.model('BufferMessage', bufferMessageSchema);

export default BufferMessage;
